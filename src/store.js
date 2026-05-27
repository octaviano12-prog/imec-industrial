const fs = require("node:fs/promises");
const path = require("node:path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");
const session = require("express-session");
const { defaults, normalizeContent } = require("./content-model");

const root = path.join(__dirname, "..");
const storage = path.join(root, "storage");

class FileStore {
  constructor() {
    this.driver = "file";
    this.contentPath = path.join(storage, "content.json");
    this.usersPath = path.join(storage, "users.local.json");
    this.messagesPath = path.join(storage, "messages.local.json");
    this.mediaPath = path.join(storage, "media.local.json");
  }

  async init() {
    await fs.mkdir(storage, { recursive: true });
    await ensureJson(this.contentPath, defaults);
    await ensureJson(this.messagesPath, []);
    await ensureJson(this.mediaPath, []);

    const email = process.env.ADMIN_EMAIL || "admin@imec.local";
    const password = process.env.ADMIN_PASSWORD || "imec-preview";
    const currentUsers = await readJson(this.usersPath, []);
    if (!currentUsers.length) {
      const passwordHash = await bcrypt.hash(password, 12);
      await writeJson(this.usersPath, [{ id: 1, email, passwordHash }]);
    }
    this.previewCredentials = { email, password };
  }

  async getContent() {
    return normalizeContent(await readJson(this.contentPath, defaults));
  }

  async saveContent(content) {
    const normalized = normalizeContent(content);
    await writeJson(this.contentPath, normalized);
    return normalized;
  }

  async authenticate(email, password) {
    const users = await readJson(this.usersPath, []);
    const user = users.find((candidate) => candidate.email.toLowerCase() === String(email).toLowerCase());
    if (!user || !(await bcrypt.compare(String(password), user.passwordHash))) {
      return null;
    }
    return { id: user.id, email: user.email };
  }

  async addMessage(message) {
    const messages = await readJson(this.messagesPath, []);
    messages.unshift({ id: Date.now(), ...message, createdAt: new Date().toISOString() });
    await writeJson(this.messagesPath, messages);
  }

  async getMessages() {
    return readJson(this.messagesPath, []);
  }

  async addMedia(media) {
    const mediaItems = await readJson(this.mediaPath, []);
    mediaItems.unshift({ id: Date.now(), ...media, createdAt: new Date().toISOString() });
    await writeJson(this.mediaPath, mediaItems);
  }
}

class MySqlStore {
  constructor() {
    this.driver = "mysql";
    this.pool = mysql.createPool({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      database: process.env.MYSQL_DATABASE,
      user: process.env.MYSQL_USER,
      password: process.env.MYSQL_PASSWORD,
      connectionLimit: 10,
      charset: "utf8mb4"
    });
  }

  async init() {
    const schema = await fs.readFile(path.join(root, "database", "schema.sql"), "utf8");
    for (const statement of schema.split(";").map((line) => line.trim()).filter(Boolean)) {
      await this.pool.query(statement);
    }
    const [contentRows] = await this.pool.query("SELECT id FROM site_content WHERE id = 1");
    if (!contentRows.length) {
      await this.pool.query("INSERT INTO site_content (id, content) VALUES (1, ?)", [JSON.stringify(defaults)]);
    }
    if (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD) {
      const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
      await this.pool.query(
        "INSERT INTO admin_users (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE email = VALUES(email)",
        [process.env.ADMIN_EMAIL, passwordHash]
      );
    }
  }

  async getContent() {
    const [rows] = await this.pool.query("SELECT content FROM site_content WHERE id = 1");
    const value = typeof rows[0].content === "string" ? JSON.parse(rows[0].content) : rows[0].content;
    return normalizeContent(value);
  }

  async saveContent(content) {
    const normalized = normalizeContent(content);
    await this.pool.query("UPDATE site_content SET content = ? WHERE id = 1", [JSON.stringify(normalized)]);
    return normalized;
  }

  async authenticate(email, password) {
    const [rows] = await this.pool.query("SELECT id, email, password_hash FROM admin_users WHERE email = ?", [email]);
    if (!rows.length || !(await bcrypt.compare(String(password), rows[0].password_hash))) {
      return null;
    }
    return { id: rows[0].id, email: rows[0].email };
  }

  async addMessage(message) {
    await this.pool.query(
      "INSERT INTO contact_messages (name, email, phone, company, subject, message) VALUES (?, ?, ?, ?, ?, ?)",
      [message.name, message.email, message.phone, message.company, message.subject, message.message]
    );
  }

  async getMessages() {
    const [rows] = await this.pool.query(
      "SELECT id, name, email, phone, company, subject, message, created_at AS createdAt FROM contact_messages ORDER BY created_at DESC LIMIT 100"
    );
    return rows;
  }

  async addMedia(media) {
    await this.pool.query(
      "INSERT INTO media_library (original_name, file_name, mime_type, file_size, public_path) VALUES (?, ?, ?, ?, ?)",
      [media.originalName, media.fileName, media.mimeType, media.size, media.path]
    );
  }

  createSessionStore() {
    return new MySqlSessionStore(this.pool);
  }
}

class MySqlSessionStore extends session.Store {
  constructor(pool) {
    super();
    this.pool = pool;
  }

  get(sessionId, callback) {
    this.pool
      .query("SELECT data FROM admin_sessions WHERE session_id = ? AND expires_at > NOW()", [sessionId])
      .then(([rows]) => callback(null, rows.length ? parseJson(rows[0].data) : null))
      .catch(callback);
  }

  set(sessionId, sessionData, callback) {
    const expires = sessionData.cookie?.expires || new Date(Date.now() + 8 * 60 * 60 * 1000);
    this.pool
      .query(
        "INSERT INTO admin_sessions (session_id, data, expires_at) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE data = VALUES(data), expires_at = VALUES(expires_at)",
        [sessionId, JSON.stringify(sessionData), expires]
      )
      .then(() => callback && callback())
      .catch((error) => callback && callback(error));
  }

  destroy(sessionId, callback) {
    this.pool
      .query("DELETE FROM admin_sessions WHERE session_id = ?", [sessionId])
      .then(() => callback && callback())
      .catch((error) => callback && callback(error));
  }

  touch(sessionId, sessionData, callback) {
    this.set(sessionId, sessionData, callback);
  }
}

async function ensureJson(filePath, fallback) {
  try {
    await fs.access(filePath);
  } catch (error) {
    await writeJson(filePath, fallback);
  }
}

async function readJson(filePath, fallback) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    return structuredClone(fallback);
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function parseJson(value) {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function createStore() {
  return process.env.DATA_DRIVER === "mysql" ? new MySqlStore() : new FileStore();
}

module.exports = { createStore };
