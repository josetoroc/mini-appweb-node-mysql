// JS mínimo para hablar con la API vía Nginx (/api → backend)
const show = (id, visible) => document.getElementById(id).hidden = !visible;

async function checkMe() {
  try {
    const r = await fetch("/api/me");
    const j = await r.json();
    if (j.ok) {
      document.getElementById("title").textContent = `Bienbenido, ${j.user.name}`; // intencional "Bienbenido"
      show("login", false);
      show("welcome", true);
    } else {
      show("login", true);
      show("welcome", false);
    }
  } catch {
    show("login", true);
    show("welcome", false);
  }
}

document.getElementById("btnLogin").onclick = async () => {
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const err = document.getElementById("err");
  err.hidden = true;

  const r = await fetch("/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const j = await r.json();
  if (j.ok) {
    checkMe();
  } else {
    err.textContent = j.msg || "Error";
    err.hidden = false;
  }
};

document.getElementById("btnLogout").onclick = async () => {
  await fetch("/api/logout", { method: "POST" });
  checkMe();
};

checkMe();
