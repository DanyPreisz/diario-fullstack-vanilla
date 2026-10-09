import { api, setSession, clearSession, getToken } from "./api.js";
const MOODS = { bien: "Bien", normal: "Normal", mal: "Mal" };
const authView = document.querySelector("#auth-view");
const appView = document.querySelector("#app-view");
const authForm = document.querySelector("#auth-form");
const authError = document.querySelector("#auth-error");
const authSubmit = document.querySelector("#auth-submit");
const listEl = document.querySelector("#list");
const form = document.querySelector("#entry-form");
const formError = document.querySelector("#form-error");
const removeBtn = document.querySelector("#remove");
let mode = "login";
let query = "";
let selected = null;
let timer;
const showError = (el, message) => { el.hidden = !message; el.textContent = message || ""; };

function setMode(next) {
  mode = next;
  document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.mode === mode));
  authSubmit.textContent = mode === "login" ? "Entrar" : "Crear cuenta";
}
function fill(entry) {
  selected = entry;
  document.querySelector("#day").value = entry.day;
  document.querySelector("#title").value = entry.title;
  document.querySelector("#mood").value = entry.mood;
  document.querySelector("#body").value = entry.body;
  removeBtn.hidden = false;
}
async function refresh() {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  const data = await api(`/api/entries?${params}`);
  if (!document.querySelector("#day").value) document.querySelector("#day").value = data.today;
  listEl.innerHTML = "";
  if (!data.entries.length) {
    const empty = document.createElement("li");
    empty.textContent = "Todavia no hay entradas.";
    listEl.append(empty);
    return;
  }
  data.entries.forEach((entry) => {
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "item";
    const title = document.createElement("strong");
    title.textContent = entry.title || entry.day;
    const meta = document.createElement("small");
    meta.textContent = [entry.day, MOODS[entry.mood]].filter(Boolean).join(" \u00b7 ");
    button.append(title, document.createElement("br"), meta);
    button.addEventListener("click", () => fill(entry));
    li.append(button);
    listEl.append(li);
  });
}
async function boot() {
  if (!getToken()) return;
  try {
    const { user } = await api("/api/auth/me");
    authView.classList.add("hidden");
    appView.classList.remove("hidden");
    document.querySelector("#user-name").textContent = user.username;
    await refresh();
  } catch { clearSession(); }
}
document.querySelectorAll(".tab").forEach((tab) => tab.addEventListener("click", () => setMode(tab.dataset.mode)));
authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(authError, "");
  const fd = new FormData(authForm);
  try {
    const data = await api(mode === "login" ? "/api/auth/login" : "/api/auth/register", { method: "POST", body: JSON.stringify({ username: fd.get("username"), password: fd.get("password") }) });
    setSession(data.token);
    authForm.reset();
    await boot();
  } catch (err) { showError(authError, err.message); }
});
document.querySelector("#logout").addEventListener("click", () => { clearSession(); appView.classList.add("hidden"); authView.classList.remove("hidden"); });
document.querySelector("#search").addEventListener("input", (event) => { clearTimeout(timer); timer = setTimeout(async () => { query = event.target.value.trim(); await refresh(); }, 200); });
document.querySelector("#day").addEventListener("change", () => { selected = null; removeBtn.hidden = true; });
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  showError(formError, "");
  try {
    await api("/api/entries", { method: "POST", body: JSON.stringify({ day: document.querySelector("#day").value, title: document.querySelector("#title").value.trim(), mood: document.querySelector("#mood").value, body: document.querySelector("#body").value.trim() }) });
    selected = null;
    removeBtn.hidden = true;
    document.querySelector("#title").value = "";
    document.querySelector("#body").value = "";
    await refresh();
  } catch (err) { showError(formError, err.message); }
});
removeBtn.addEventListener("click", async () => {
  if (!selected) return;
  await api(`/api/entries/${selected.id}`, { method: "DELETE" });
  selected = null;
  removeBtn.hidden = true;
  form.reset();
  await refresh();
});
boot();
