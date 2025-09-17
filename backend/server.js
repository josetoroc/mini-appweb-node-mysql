// server.js
// API mínima: POST /api/login, GET /api/me, POST /api/logout
// Conexión a MySQL (RDS), sesiones en memoria (para demo) y bcrypt para contraseñas.
// Mantiene el código al mínimo para aprendizaje.

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

// Pool MySQL (usa variables de entorno desde .env)
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10
}).promise();

// Middlewares
app.use(express.json()); // leer JSON del frontend
app.use(session({
  secret: process.env.SESSION_SECRET || "dev-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,   // más seguro: JS no puede leer la cookie
    sameSite: "lax",  // suficiente para este demo detrás de Nginx
    secure: false     // en producción con HTTPS, cámbialo a true
  }
}));

// Login: valida email/clave y crea sesión
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ ok: false, msg: "Faltan datos" });

  try {
    const [rows] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ?",
      [email]
    );
    if (!rows.length) return res.status(401).json({ ok: false, msg: "Credenciales inválidas" });

    const u = rows[0];
    const ok = await bcrypt.compare(password, u.password_hash);
    if (!ok) return res.status(401).json({ ok: false, msg: "Credenciales inválidas" });

    req.session.user = { id: u.id, name: u.name, email: u.email };
    return res.json({ ok: true });
  } catch (e) {
    console.error("login error:", e);
    return res.status(500).json({ ok: false, msg: "Error interno" });
  }
});

// Me: devuelve el usuario en sesión
app.get("/api/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ ok: false });
  return res.json({ ok: true, user: req.session.user });
});

// Logout: destruye sesión
app.post("/api/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Arrancar servidor
const port = process.env.PORT || 3001;
app.listen(port, () => console.log(`API escuchando en http://127.0.0.1:${port}`));
