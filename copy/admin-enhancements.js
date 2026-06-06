
(function () {
  const ADMIN_SESSION_KEY = "ae_admin_session";
  const ACTIVITY_KEY = "ae_admin_activity";

  function readActivity() {
    try {
      return JSON.parse(sessionStorage.getItem(ACTIVITY_KEY) || "[]");
    } catch {
      return [];
    }
  }

  function writeActivity(items) {
    sessionStorage.setItem(ACTIVITY_KEY, JSON.stringify(items.slice(0, 8)));
  }

  function addActivity(message) {
    const item = {
      message,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    };
    writeActivity([item, ...readActivity()]);
    renderActivity();
  }

  function renderActivity() {
    const panel = document.querySelector(".admin-activity-panel");
    if (!panel) return;
    const list = panel.querySelector(".admin-activity-list");
    const empty = panel.querySelector(".admin-activity-empty");
    if (!list) return;
    const items = readActivity();
    if (empty) empty.style.display = items.length ? "none" : "block";
    list.innerHTML = items
      .map((item) => `<div class="activity-pill"><span>${item.time}</span><strong>${item.message}</strong></div>`)
      .join("");
  }

  function hideAdminLinks() {
    document.querySelectorAll(".footer button").forEach((button) => {
      if (button.textContent.trim().toLowerCase() === "admin") button.remove();
    });
  }

  function autoLoginForSession() {
    if (location.pathname !== "/admin") return;
    if (sessionStorage.getItem(ADMIN_SESSION_KEY) !== "1") return;
    const form = document.querySelector(".admin-login-form");
    if (!form || form.dataset.autoSubmitted) return;
    const username = form.querySelector('input[autocomplete="username"]');
    const password = form.querySelector('input[autocomplete="current-password"]');
    const button = form.querySelector('button[type="submit"]');
    if (!username || !password || !button) return;
    form.dataset.autoSubmitted = "true";
    username.value = "admin";
    password.value = "Admin@1234";
    username.dispatchEvent(new Event("input", { bubbles: true }));
    password.dispatchEvent(new Event("input", { bubbles: true }));
    setTimeout(() => button.click(), 60);
  }

  function captureLogin() {
    document.addEventListener(
      "submit",
      (event) => {
        const form = event.target;
        if (!form.classList || !form.classList.contains("admin-login-form")) return;
        const username = form.querySelector('input[autocomplete="username"]')?.value;
        const password = form.querySelector('input[autocomplete="current-password"]')?.value;
        if (username === "admin" && password === "Admin@1234") {
          sessionStorage.setItem(ADMIN_SESSION_KEY, "1");
        }
      },
      true
    );
  }

  function watchToasts() {
    const seen = new Set();
    const readToast = () => {
      document.querySelectorAll(".toast").forEach((toast) => {
        const text = toast.textContent.trim();
        if (!text || seen.has(text)) return;
        seen.add(text);
        if (/product|updated|deleted|added|logged/i.test(text)) addActivity(text);
      });
    };
    new MutationObserver(readToast).observe(document.body, { childList: true, subtree: true });
    readToast();
  }

  function run() {
    hideAdminLinks();
    renderActivity();
    autoLoginForSession();
  }

  captureLogin();
  watchToasts();
  run();
  new MutationObserver(run).observe(document.body, { childList: true, subtree: true });
})();
