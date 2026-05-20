const SYSTEM_PASSWORD = "System";
const STORAGE_KEY = "ashborn_akten";
const SESSION_KEY = "ashborn_logged_in";

const landingPage = document.getElementById("landingPage");
const logoButton = document.getElementById("logoButton");
const loginBox = document.getElementById("loginBox");
const closeLoginBtn = document.getElementById("closeLoginBtn");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const aktenSystem = document.getElementById("aktenSystem");
const logoutBtn = document.getElementById("logoutBtn");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const searchInput = document.getElementById("searchInput");
const aktenList = document.getElementById("aktenList");
const totalAktenCount = document.getElementById("totalAktenCount");
const filteredAktenCount = document.getElementById("filteredAktenCount");

const akteTitle = document.getElementById("akteTitle");
const akteCategory = document.getElementById("akteCategory");
const akteDescription = document.getElementById("akteDescription");
const akteContent = document.getElementById("akteContent");
const saveAkteBtn = document.getElementById("saveAkteBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const saveInfo = document.getElementById("saveInfo");

const clearLocalDataBtn = document.getElementById("clearLocalDataBtn");
const createDemoDataBtn = document.getElementById("createDemoDataBtn");

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === "true";

  if (isLoggedIn) {
    openAktenSystem();
  } else {
    renderAkten();
  }
});

logoButton.addEventListener("click", () => {
  showLogin();
});

closeLoginBtn.addEventListener("click", () => {
  hideLogin();
});

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }

  if (event.key === "Escape") {
    hideLogin();
  }
});

function showLogin() {
  loginError.textContent = "";
  loginBox.classList.add("show");
  loginBox.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    passwordInput.focus();
  }, 150);
}

function hideLogin() {
  loginBox.classList.remove("show");
  loginBox.setAttribute("aria-hidden", "true");
  passwordInput.value = "";
  loginError.textContent = "";
}

function login() {
  const password = passwordInput.value.trim();

  if (password === SYSTEM_PASSWORD) {
    sessionStorage.setItem(SESSION_KEY, "true");
    loginError.textContent = "";
    openAktenSystem();
    return;
  }

  loginError.textContent = "Falsches Kennwort.";
  passwordInput.value = "";
  passwordInput.focus();

  loginBox.classList.remove("shake");
  void loginBox.offsetWidth;
  loginBox.classList.add("shake");
}

function openAktenSystem() {
  landingPage.classList.add("hidden");
  aktenSystem.classList.remove("hidden");
  renderAkten();
}

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  passwordInput.value = "";
  hideLogin();
  aktenSystem.classList.add("hidden");
  landingPage.classList.remove("hidden");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);

    if (button.dataset.tab === "searchTab") {
      renderAkten();
      setTimeout(() => searchInput.focus(), 80);
    }
  });
});

function switchTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === tabId);
  });
}

function getAkten() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Akten konnten nicht gelesen werden:", error);
    return [];
  }
}

function saveAkten(akten) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(akten));
}

saveAkteBtn.addEventListener("click", () => {
  createAkte();
});

resetFormBtn.addEventListener("click", () => {
  clearForm();
  setSaveMessage("Felder wurden geleert.", "neutral");
});

function createAkte() {
  const title = akteTitle.value.trim();
  const category = akteCategory.value.trim();
  const description = akteDescription.value.trim();
  const content = akteContent.value.trim();

  if (!title || !content) {
    setSaveMessage("Bitte mindestens Aktenname und Akteninhalt ausfüllen.", "error");
    return;
  }

  const akten = getAkten();

  const newAkte = {
    id: createId(),
    title,
    category,
    description,
    content,
    createdAt: new Date().toLocaleString("de-DE"),
    status: "Aktiv"
  };

  akten.unshift(newAkte);
  saveAkten(akten);

  clearForm();
  setSaveMessage("Akte wurde versiegelt.", "success");

  switchTab("searchTab");
  renderAkten();
}

function clearForm() {
  akteTitle.value = "";
  akteCategory.value = "";
  akteDescription.value = "";
  akteContent.value = "";
}

function setSaveMessage(message, type) {
  saveInfo.textContent = message;

  if (type === "success") {
    saveInfo.style.color = "#a8ffbf";
  } else if (type === "error") {
    saveInfo.style.color = "#ff9a8a";
  } else {
    saveInfo.style.color = "#fff0bf";
  }
}

searchInput.addEventListener("input", renderAkten);

function renderAkten() {
  const akten = getAkten();
  const query = searchInput.value.trim().toLowerCase();

  const filteredAkten = akten.filter((akte) => {
    const searchableText = [
      akte.title,
      akte.category,
      akte.description,
      akte.content,
      akte.createdAt,
      akte.status
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
  });

  totalAktenCount.textContent = String(akten.length);
  filteredAktenCount.textContent = String(filteredAkten.length);

  if (filteredAkten.length === 0) {
    aktenList.innerHTML = `
      <article class="akte-card">
        <h3>Keine Akten gefunden</h3>
        <div class="akte-meta">
          <span class="badge">Archiv leer</span>
          <span class="badge">Suchtreffer: 0</span>
        </div>
        <p>Erstelle eine neue Akte oder ändere deine Suche.</p>
      </article>
    `;
    return;
  }

  aktenList.innerHTML = filteredAkten.map((akte) => {
    return `
      <article class="akte-card">
        <h3>${escapeHtml(akte.title)}</h3>

        <div class="akte-meta">
          <span class="badge">Kategorie: ${escapeHtml(akte.category || "Keine Kategorie")}</span>
          <span class="badge">Status: ${escapeHtml(akte.status || "Aktiv")}</span>
          <span class="badge">Erstellt: ${escapeHtml(akte.createdAt)}</span>
        </div>

        <p><strong>Beschreibung:</strong> ${escapeHtml(akte.description || "Keine Beschreibung")}</p>
        <p>${escapeHtml(akte.content)}</p>
      </article>
    `;
  }).join("");
}

clearLocalDataBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Willst du wirklich alle lokalen Test-Akten löschen?");

  if (!confirmDelete) {
    return;
  }

  localStorage.removeItem(STORAGE_KEY);
  renderAkten();
});

createDemoDataBtn.addEventListener("click", () => {
  const existing = getAkten();

  const demoAkten = [
    {
      id: createId(),
      title: "Fraktionsbericht: Ashborn",
      category: "Fraktion",
      description: "Interner Bericht über Struktur, Aufgaben und aktuelle Lage.",
      content: "Diese Beispielakte zeigt, dass die Suche nicht nur den Aktennamen, sondern auch den kompletten Akteninhalt durchsucht. Begriffe wie Phoenix, Archiv, Handel oder Vorfall werden ebenfalls gefunden.",
      createdAt: new Date().toLocaleString("de-DE"),
      status: "Aktiv"
    },
    {
      id: createId(),
      title: "Vorfallakte: Valentine",
      category: "Vorfälle",
      description: "Ein vorbereiteter Testeintrag für spätere Archiv- und Filterfunktionen.",
      content: "Ort: Valentine. Beteiligte: unbekannt. Diese Akte kann später mit Personen, Status, Anhängen, Rollen und Rechten erweitert werden.",
      createdAt: new Date().toLocaleString("de-DE"),
      status: "Aktiv"
    },
    {
      id: createId(),
      title: "Handelsakte: Kontaktperson",
      category: "Handel",
      description: "Testakte für Handel, Kontakte und spätere Transaktionsnotizen.",
      content: "Diese Akte ist ein Platzhalter für spätere Handelskontakte, Notizen, Preise, Treffen und Verlauf. Das System ist vorbereitet, um später an eine echte Datenbank angeschlossen zu werden.",
      createdAt: new Date().toLocaleString("de-DE"),
      status: "Aktiv"
    }
  ];

  saveAkten([...demoAkten, ...existing]);
  switchTab("searchTab");
  renderAkten();
});

function createId() {
  if (window.crypto && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `akte-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
