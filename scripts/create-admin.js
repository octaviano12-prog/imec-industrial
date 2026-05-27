require("dotenv").config();

const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function main() {
  if (process.env.DATA_DRIVER !== "mysql") {
    throw new Error("Defina DATA_DRIVER=mysql no arquivo .env antes de criar o administrador.");
  }
  if (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD) {
    throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD no arquivo .env.");
  }

  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    database: process.env.MYSQL_DATABASE,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    charset: "utf8mb4"
  });
  const passwordHash = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(190) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await connection.query(
    "INSERT INTO admin_users (email, password_hash) VALUES (?, ?) ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash)",
    [process.env.ADMIN_EMAIL, passwordHash]
  );
  await connection.end();
  console.log(`Administrador configurado: ${process.env.ADMIN_EMAIL}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
