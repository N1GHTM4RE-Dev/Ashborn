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
const smokeTransition = document.getElementById("smokeTransition");

const aktenSystem = document.getElementById("aktenSystem");
const logoutBtn = document.getElementById("logoutBtn");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const totalAktenCount = document.getElementById("totalAktenCount");
const filteredAktenCount = document.getElementById("filteredAktenCount");
const searchInput = document.getElementById("searchInput");
const aktenList = document.getElementById("aktenList");

const akteTitle = document.getElementById("akteTitle");
const akteCategory = document.getElementById("akteCategory");
const akteStatus = document.getElementById("akteStatus");
const akteDescription = document.getElementById("akteDescription");
const akteContent = document.getElementById("akteContent");
const saveAkteBtn = document.getElementById("saveAkteBtn");
const resetFormBtn = document.getElementById("resetFormBtn");
const saveInfo = document.getElementById("saveInfo");

const clearLocalDataBtn = document.getElementById("clearLocalDataBtn");
const createDemoDataBtn = document.getElementById("createDemoDataBtn");

const detailModal = document.getElementById("detailModal");
const detailBackdrop = document.getElementById("detailBackdrop");
const closeDetailBtn = document.getElementById("closeDetailBtn");
const detailStatus = document.getElementById("detailStatus");
const detailTitle = document.getElementById("detailTitle");
const detailCategory = document.getElementById("detailCategory");
const detailDate = document.getElementById("detailDate");
const detailDescription = document.getElementById("detailDescription");
const detailContent = document.getElementById("detailContent");

document.addEventListener("DOMContentLoaded", () => {
  const isLoggedIn = sessionStorage.getItem(SESSION_KEY) === "true";

  if (isLoggedIn) {
    landingPage.classList.add("hidden");
    aktenSystem.classList.remove("hidden");
  }

  renderAkten();
});

logoButton.addEventListener("click", showLogin);
closeLoginBtn.addEventListener("click", hideLogin);
loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }

  if (event.key === "Escape") {
    hideLogin();
  }
});

logoutBtn.addEventListener("click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  closeDetail();
  aktenSystem.classList.add("hidden");
  landingPage.classList.remove("hidden");
  hideLogin();
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

searchInput.addEventListener("input", renderAkten);

saveAkteBtn.addEventListener("click", createAkte);

resetFormBtn.addEventListener("click", () => {
  clearForm();
  setSaveMessage("Felder wurden geleert.", "neutral");
});

clearLocalDataBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Willst du wirklich alle lokalen Test-Akten löschen?");
  if (!confirmDelete) return;

  localStorage.removeItem(STORAGE_KEY);
  closeDetail();
  renderAkten();
});

createDemoDataBtn.addEventListener("click", () => {
  const existing = getAkten();

  const demoAkten = [
    {
      id: createId(),
      title: "Fallakte: Interner Fraktionsbericht",
      category: "Fraktion",
      status: "Aktiv",
      description: "Bericht über aktuelle Struktur, Zuständigkeiten und interne Entwicklung.",
      content: "Diese Beispielakte dient als Test für die Suche. Sie zeigt, dass Begriffe nicht nur im Namen, sondern auch im gesamten Akteninhalt gefunden werden. Themen: Archiv, Mafia, Bericht, Struktur, Kontrolle.",
      createdAt: new Date().toLocaleString("de-DE")
    },
    {
      id: createId(),
      title: "Dossier: Vorfall im Handelsbezirk",
      category: "Vorfälle",
      status: "Geheim",
      description: "Unvollständige Fallakte über einen internen Konflikt im Handelsumfeld.",
      content: "Ort: Handelsbezirk. Beteiligte: nicht vollständig bestätigt. Diese Akte ist als geheim markiert und dient als Demo für Status-Siegel, Detailansicht und spätere Rechteverwaltung.",
      createdAt: new Date().toLocaleString("de-DE")
    },
    {
      id: createId(),
      title: "Akte: Beobachtung einer Kontaktperson",
      category: "Beobachtung",
      status: "Beobachtung",
      description: "Testakte für spätere Rollen, Verlauf und detaillierte Beobachtungsberichte.",
      content: "Diese Demo-Fallakte ist vorbereitet, damit das System später mit erweiterten Notizen, Ereignisverlauf und Anhängen ausgestattet werden kann.",
      createdAt: new Date().toLocaleString("de-DE")
    }
  ];

  saveAkten([...demoAkten, ...existing]);
  switchTab("searchTab");
  renderAkten();
});

aktenList.addEventListener("click", (event) => {
  const card = event.target.closest(".akten-card");
  if (!card) return;

  const id = card.dataset.id;
  if (!id) return;

  const akten = getAkten();
  const akte = akten.find((entry) => entry.id === id);

  if (akte) {
    openDetail(akte);
  }
});

detailBackdrop.addEventListener("click", closeDetail);
closeDetailBtn.addEventListener("click", closeDetail);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!detailModal.classList.contains("hidden")) {
      closeDetail();
      return;
    }

    if (loginBox.classList.contains("show")) {
      hideLogin();
    }
  }
});

function showLogin() {
  loginError.textContent = "";
  loginBox.classList.add("show");
  loginBox.setAttribute("aria-hidden", "false");

  setTimeout(() => {
    passwordInput.focus();
  }, 120);
}

function hideLogin() {
  loginBox.classList.remove("show");
  loginBox.setAttribute("aria-hidden", "true");
  loginError.textContent = "";
  passwordInput.value = "";
}

function login() {
  const password = passwordInput.value.trim();

  if (password === SYSTEM_PASSWORD) {
    loginError.textContent = "";
    sessionStorage.setItem(SESSION_KEY, "true");

    playSmokeTransition(() => {
      landingPage.classList.add("hidden");
      aktenSystem.classList.remove("hidden");
      hideLogin();
      renderAkten();
    });

    return;
  }

  loginError.textContent = "Falsches Kennwort.";
  passwordInput.value = "";
  passwordInput.focus();

  loginBox.classList.remove("shake");
  void loginBox.offsetWidth;
  loginBox.classList.add("shake");
}

function playSmokeTransition(callback) {
  smokeTransition.classList.remove("active");
  void smokeTransition.offsetWidth;
  smokeTransition.classList.add("active");

  setTimeout(() => {
    callback();
  }, 320);

  setTimeout(() => {
    smokeTransition.classList.remove("active");
  }, 920);
}

function switchTab(tabId) {
  tabButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === tabId);
  });

  tabContents.forEach((content) => {
    content.classList.toggle("active", content.id === tabId);
  });
}

function createAkte() {
  const title = akteTitle.value.trim();
  const category = akteCategory.value.trim();
  const status = akteStatus.value;
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
    status,
    description,
    content,
    createdAt: new Date().toLocaleString("de-DE")
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
  akteStatus.value = "Aktiv";
  akteDescription.value = "";
  akteContent.value = "";
}

function setSaveMessage(message, type) {
  saveInfo.textContent = message;

  if (type === "success") {
    saveInfo.style.color = "#b8ffca";
  } else if (type === "error") {
    saveInfo.style.color = "#ff9ca1";
  } else {
    saveInfo.style.color = "#f2d796";
  }
}

function getAkten() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) return [];

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

function renderAkten() {
  const akten = getAkten();
  const query = (searchInput.value || "").trim().toLowerCase();

  const filteredAkten = akten.filter((akte) => {
    const searchableText = [
      akte.title,
      akte.category,
      akte.status,
      akte.description,
      akte.content,
      akte.createdAt
    ].join(" ").toLowerCase();

    return searchableText.includes(query);
  });

  totalAktenCount.textContent = String(akten.length);
  filteredAktenCount.textContent = String(filteredAkten.length);

  if (filteredAkten.length === 0) {
    aktenList.innerHTML = `
      <button class="akten-card" type="button" disabled>
        <div class="folder-chip-row">
          <span class="folder-chip">Archiv leer</span>
          <span class="folder-chip">0 Treffer</span>
        </div>
        <h3>Keine Akten gefunden</h3>
        <p>Erstelle eine neue Fallakte oder ändere deine Suche.</p>
      </button>
    `;
    return;
  }

  aktenList.innerHTML = filteredAkten.map((akte) => {
    const statusClass = createStatusClass(akte.status);

    return `
      <button class="akten-card" type="button" data-id="${escapeHtml(akte.id)}">
        <div class="folder-chip-row">
          <span class="folder-chip">${escapeHtml(akte.category || "Keine Kategorie")}</span>
          <span class="folder-chip ${statusClass}">${escapeHtml(akte.status || "Aktiv")}</span>
          <span class="folder-chip">${escapeHtml(akte.createdAt || "-")}</span>
        </div>
        <h3>${escapeHtml(akte.title)}</h3>
        <p><strong>Beschreibung:</strong> ${escapeHtml(akte.description || "Keine Beschreibung")}</p>
        <p class="akten-preview">${escapeHtml(akte.content)}</p>
      </button>
    `;
  }).join("");
}

function openDetail(akte) {
  detailTitle.textContent = akte.title || "-";
  detailCategory.textContent = akte.category || "Keine Kategorie";
  detailDate.textContent = akte.createdAt || "-";
  detailDescription.textContent = akte.description || "Keine Beschreibung";
  detailContent.textContent = akte.content || "-";
  detailStatus.textContent = akte.status || "Aktiv";

  detailStatus.className = `detail-status-seal ${createStatusClass(akte.status)}`;
  detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  detailModal.classList.add("hidden");
  document.body.style.overflow = "";
}

function createStatusClass(status) {
  const value = String(status || "").trim().toLowerCase();

  if (value === "geheim") return "status-geheim";
  if (value === "beobachtung") return "status-beobachtung";
  if (value === "archiviert") return "status-archiviert";
  return "status-aktiv";
}

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
