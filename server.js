require("dotenv").config();

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const multer = require("multer");
const rateLimit = require("express-rate-limit");
const { createStore } = require("./src/store");
const { normalizeContent, safeString } = require("./src/content-model");

const app = express();
const root = __dirname;
const port = Number(process.env.PORT || 4180);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
const uploadDirectory = path.join(root, "storage", "uploads");
const store = createStore();

fs.mkdirSync(uploadDirectory, { recursive: true });

app.set("view engine", "ejs");
app.set("views", path.join(root, "views"));
app.set("trust proxy", 1);

app.use(
  helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "media-src": ["'self'", "blob:", "https:"],
        "style-src": ["'self'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "script-src": ["'self'"]
      }
    }
  })
);
app.use("/assets", express.static(path.join(root, "assets"), { maxAge: "7d" }));
app.use("/static", express.static(path.join(root, "public"), { maxAge: "1h" }));
app.use("/uploads", express.static(uploadDirectory, { maxAge: "1d" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));
app.use(express.json({ limit: "3mb" }));

const sessionOptions = {
  secret: process.env.SESSION_SECRET || "imec-local-preview-change-before-production",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 8 * 60 * 60 * 1000
  }
};
if (store.driver === "mysql") {
  sessionOptions.store = store.createSessionStore();
}
app.use(session(sessionOptions));

app.use((request, response, next) => {
  if (!request.session.csrfToken) {
    request.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  response.locals.csrfToken = request.session.csrfToken;
  response.locals.adminUser = request.session.adminUser || null;
  response.locals.flash = request.session.flash || null;
  delete request.session.flash;
  next();
});

app.use(async (request, response, next) => {
  try {
    response.locals.site = await store.getContent();
    next();
  } catch (error) {
    next(error);
  }
});

const contactLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 6, standardHeaders: true });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (request, file, callback) => {
      const extension = path.extname(file.originalname).toLowerCase();
      callback(null, `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${extension}`);
    }
  }),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (request, file, callback) => {
    const accepted = file.mimetype.startsWith("image/") || file.mimetype.startsWith("video/");
    callback(accepted ? null : new Error("Envie apenas imagens ou vídeos."), accepted);
  }
});

function page(name, title, active) {
  return async (request, response) => {
    response.render(name, {
      title,
      active,
      sent: request.query.enviado === "1"
    });
  };
}

function requireCsrf(request, response, next) {
  const token = request.get("x-csrf-token") || request.body?._csrf;
  const expected = request.session.csrfToken || "";
  const valid =
    token &&
    token.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  if (!valid) {
    return response.status(403).send("Solicitação inválida. Atualize a página e tente novamente.");
  }
  next();
}

function requireAdmin(request, response, next) {
  if (!request.session.adminUser) {
    return response.redirect("/admin/login");
  }
  next();
}

function setFlash(request, type, message) {
  request.session.flash = { type, message };
}

app.get("/", page("home", "Engenharia para açúcar e etanol", "home"));
app.get("/empresa", page("company", "Empresa", "company"));
app.get("/equipamentos", page("solutions", "Equipamentos", "solutions"));
app.get("/reformas-servicos", page("services", "Reformas e Serviços", "services"));
app.get("/servicos/:slug", (request, response, next) => {
  const service = response.locals.site.servicesPage.services.find(
    (item) => item.slug === request.params.slug
  );
  if (!service) {
    return next();
  }
  response.render("service-detail", {
    title: service.title,
    active: "services",
    service
  });
});
app.get("/setores-clientes", page("markets", "Setores e Clientes", "markets"));
app.get("/projetos", page("projects", "Projetos", "projects"));
app.get("/contato", page("contact", "Contato", "contact"));

app.post("/contato", contactLimiter, requireCsrf, async (request, response) => {
  const message = {
    name: safeString(request.body.name, "", 150),
    email: safeString(request.body.email, "", 190),
    phone: safeString(request.body.phone, "", 40),
    company: safeString(request.body.company, "", 160),
    subject: safeString(request.body.subject, "Cotação", 80),
    message: safeString(request.body.message, "", 5000)
  };
  if (!message.name || !message.email || !message.message) {
    setFlash(request, "error", "Preencha nome, e-mail e mensagem.");
    return response.redirect("/contato");
  }
  await store.addMessage(message);
  response.redirect("/contato?enviado=1");
});

app.get("/admin/login", (request, response) => {
  if (request.session.adminUser) {
    return response.redirect("/admin");
  }
  response.render("admin/login", {
    title: "Acesso administrativo",
    previewCredentials: store.driver === "file" ? store.previewCredentials : null
  });
});

app.post("/admin/login", loginLimiter, requireCsrf, async (request, response) => {
  const user = await store.authenticate(request.body.email, request.body.password);
  if (!user) {
    setFlash(request, "error", "E-mail ou senha inválidos.");
    return response.redirect("/admin/login");
  }
  request.session.adminUser = user;
  request.session.csrfToken = crypto.randomBytes(24).toString("hex");
  response.redirect("/admin");
});

app.post("/admin/logout", requireAdmin, requireCsrf, (request, response) => {
  request.session.destroy(() => response.redirect("/admin/login"));
});

app.get("/admin", requireAdmin, async (request, response) => {
  response.render("admin/dashboard", {
    title: "Painel administrativo",
    contentJson: JSON.stringify(response.locals.site).replaceAll("<", "\\u003c"),
    messages: await store.getMessages(),
    storageDriver: store.driver
  });
});

app.put("/admin/api/content", requireAdmin, requireCsrf, async (request, response) => {
  const content = normalizeContent(request.body);
  const saved = await store.saveContent(content);
  response.json({ success: true, content: saved });
});

app.post("/admin/api/upload", requireAdmin, requireCsrf, upload.single("file"), async (request, response) => {
  if (!request.file) {
    return response.status(400).json({ error: "Selecione uma imagem ou vídeo." });
  }
  const media = {
    originalName: request.file.originalname,
    fileName: request.file.filename,
    mimeType: request.file.mimetype,
    size: request.file.size,
    path: `/uploads/${request.file.filename}`
  };
  await store.addMedia(media);
  response.json({ success: true, media });
});

app.use((error, request, response, next) => {
  if (error instanceof multer.MulterError || error.message === "Envie apenas imagens ou vídeos.") {
    return response.status(400).json({ error: error.message });
  }
  console.error(error);
  if (request.path.startsWith("/admin/api/")) {
    const message =
      process.env.NODE_ENV === "production" ? "Não foi possível concluir a operação." : error.message;
    return response.status(500).json({ error: message });
  }
  response.status(500).render("error", {
    title: "Não foi possível concluir",
    message: "Ocorreu um problema inesperado. Tente novamente."
  });
});

async function start() {
  await store.init();
  app.listen(port, host, () => {
    console.log(`IMEC disponível em http://127.0.0.1:${port}`);
    console.log(`Persistência: ${store.driver}`);
  });
}

start().catch((error) => {
  console.error("Falha ao iniciar a aplicação:", error);
  process.exitCode = 1;
});
