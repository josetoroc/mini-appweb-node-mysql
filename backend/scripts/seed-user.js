// scripts/seed-user.js
// Crea tabla 'users' si no existe e inserta un usuario demo.

const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
require("dotenv").config();

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      email VARCHAR(255) NOT NULL UNIQUE,
      name  VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const email = "jose.toro.c@gmail.com";
  const name = "Jose Toro";
  const plain = "Demo1234!";
  const hash = await bcrypt.hash(plain, 10);

  await conn.execute(
    "INSERT IGNORE INTO users (email, name, password_hash) VALUES (?, ?, ?)",
    [email, name, hash]
  );

  console.log("Usuario demo creado (o ya existía):", email, "clave:", plain);
  await conn.end();
})();
