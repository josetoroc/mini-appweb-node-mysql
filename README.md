# mini-appweb-node-mysql

Mini app web con **frontend estático (HTML/CSS/JS)** y **backend Node.js/Express** conectado a **MySQL (RDS)**.
- Login por email/contraseña (bcrypt).
- Si es correcto: landing con **"Bienbenido, <nombre>"**.
- Servir frontend con **Nginx** en EC2 y proxyear `/api` al backend.

## Estructura
```
mini-appweb-node-mysql/
├─ frontend/           # index.html, styles.css, app.js
└─ backend/
   ├─ server.js        # API mínima /api/login, /api/me, /api/logout
   ├─ scripts/seed-user.js
   ├─ package.json
   └─ .env.example
```

## 1) Base de datos (MySQL)
Ejecuta una vez:
```sql
CREATE DATABASE IF NOT EXISTS appdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE appdb;
CREATE TABLE IF NOT EXISTS users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) NOT NULL UNIQUE,
  name  VARCHAR(100) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```
> En RDS: subred privada, **Publicly Accessible: NO**. SG-RDS: puerto **3306** solo **desde SG de tu EC2**.

## 2) Backend (local)
```bash
cd backend
cp .env.example .env   # completa tus datos
npm install
npm run seed           # crea usuario demo (demo@example.com / Demo1234!)
npm start              # levanta API en :3001
```

## 3) Frontend (local)
Abre `frontend/index.html` en el navegador **si** el frontend está detrás de Nginx que proxya `/api` → `127.0.0.1:3001`.
Para pruebas sin Nginx, usa una extensión de "Live Server" y configura proxy, o sirve todo desde Nginx/EC2.

## 4) Nginx (ejemplo de config en EC2)
Guarda como `/etc/nginx/conf.d/mini.conf`:
```
server {
  listen 80;
  server_name _;

  # Frontend estático
  root /var/www/frontend;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  # Proxy a la API Node
  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```
Luego:
```bash
sudo nginx -t && sudo systemctl reload nginx
```

## 5) EC2 (Amazon Linux 2023) paso a paso
```bash
# Conectarse por SSH, luego:
sudo dnf -y update
sudo dnf -y install git nginx

# Node via nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.nvm/nvm.sh
nvm install --lts

# FRONTEND
sudo mkdir -p /var/www/frontend
sudo chown ec2-user:ec2-user /var/www/frontend
cd /var/www/frontend
# Clona o sube los archivos del frontend:
# git clone https://github.com/<tu-usuario>/mini-appweb-node-mysql.git .
# cp -r frontend/* .

# BACKEND
cd ~
git clone https://github.com/<tu-usuario>/mini-appweb-node-mysql.git
cd mini-appweb-node-mysql/backend
cp .env.example .env   # edita con tu RDS
npm install
npm run seed
npm install -g pm2
pm2 start server.js --name mini-app-backend
pm2 save
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Nginx
sudo tee /etc/nginx/conf.d/mini.conf > /dev/null <<'NGX'
server {
  listen 80;
  server_name _;

  root /var/www/frontend;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }

  location /api/ {
    proxy_pass http://127.0.0.1:3001/;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
NGX
sudo systemctl enable --now nginx
sudo nginx -t && sudo systemctl reload nginx
```
Abre en el navegador: `http://<IP-publica-EC2>/`

## 6) Subir a GitHub
```bash
# Desde esta carpeta (repo raíz):
git init
git add .
git commit -m "Mini app web Node + MySQL"
git branch -M main
git remote add origin https://github.com/<tu-usuario>/mini-appweb-node-mysql.git
git push -u origin main
```

## 7) Notas
- Este proyecto es **didáctico y mínimo**. Para producción: HTTPS (ALB/ACM), rotación de secretos (Secrets Manager), logs/metrics (CloudWatch), WAF/Shield, etc.
- Nunca subas tu `.env` a GitHub.
