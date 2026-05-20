const SYSTEM_PASSWORD = "Zwerg";
const STORAGE_KEY = "ashborn_akten";
const SESSION_KEY = "ashborn_logged_in";

let activeFilter = "Alle";
let currentDetailId = null;

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
const filterButtons = document.querySelectorAll(".filter-btn");

const totalAktenCount = document.getElementById("totalAktenCount");
const filteredAktenCount = document.getElementById("filteredAktenCount");
const secretAktenCount = document.getElementById("secretAktenCount");
const archivedAktenCount = document.getElementById("archivedAktenCount");

const searchInput = document.getElementById("searchInput");
const aktenList = document.getElementById("aktenList");

const formTitle = document.getElementById("formTitle");
const editAkteId = document.getElementById("editAkteId");
const akteTitle = document.getElementById("akteTitle");
const akteCategory = document.getElementById("akteCategory");
const akteStatus = document.getElementById("akteStatus");
const akteDescription = document.getElementById("akteDescription");
const akteContent = document.getElementById("akteContent");
const saveAkteBtn = document.getElementById("saveAkteBtn");
const saveButtonText = document.getElementById("saveButtonText");
const resetFormBtn = document.getElementById("resetFormBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
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

const editDetailBtn = document.getElementById("editDetailBtn");
const archiveDetailBtn = document.getElementById("archiveDetailBtn");
const deleteDetailBtn = document.getElementById("deleteDetailBtn");

const statusModal = document.getElementById("statusModal");
const statusBackdrop = document.getElementById("statusBackdrop");
const closeStatusBtn = document.getElementById("closeStatusBtn");
const statusChoices = document.querySelectorAll(".status-choice");

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
  closeStatusModal();
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

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;

    filterButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.filter === activeFilter);
    });

    renderAkten();
  });
});

searchInput.addEventListener("input", renderAkten);
saveAkteBtn.addEventListener("click", saveAkteFromForm);

resetFormBtn.addEventListener("click", () => {
  clearForm();
  setSaveMessage("Felder wurden geleert.", "neutral");
});

cancelEditBtn.addEventListener("click", () => {
  clearForm();
  setCreateMode();
  setSaveMessage("Bearbeitung wurde abgebrochen.", "neutral");
});

clearLocalDataBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Willst du wirklich alle lokalen Test-Akten löschen?");
  if (!confirmDelete) return;

  localStorage.removeItem(STORAGE_KEY);
  closeDetail();
  closeStatusModal();
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
      createdAt: new Date().toLocaleString("de-DE"),
      updatedAt: ""
    },
    {
      id: createId(),
      title: "Dossier: Vorfall im Handelsbezirk",
      category: "Vorfälle",
      status: "Geheim",
      description: "Unvollständige Fallakte über einen internen Konflikt im Handelsumfeld.",
      content: "Ort: Handelsbezirk. Beteiligte: nicht vollständig bestätigt. Diese Akte ist als geheim markiert und dient als Demo für Status-Siegel, Detailansicht und spätere Rechteverwaltung.",
      createdAt: new Date().toLocaleString("de-DE"),
      updatedAt: ""
    },
    {
      id: createId(),
      title: "Akte: Beobachtung einer Kontaktperson",
      category: "Beobachtung",
      status: "Beobachtung",
      description: "Testakte für spätere Rollen, Verlauf und detaillierte Beobachtungsberichte.",
      content: "Diese Demo-Fallakte ist vorbereitet, damit das System später mit erweiterten Notizen, Ereignisverlauf und Anhängen ausgestattet werden kann.",
      createdAt: new Date().toLocaleString("de-DE"),
      updatedAt: ""
    }
  ];

  saveAkten([...demoAkten, ...existing]);
  switchTab("searchTab");
  renderAkten();
});

aktenList.addEventListener("click", (event) => {
  const card = event.target.closest(".akten-card");
  if (!card || card.disabled) return;

  const id = card.dataset.id;
  if (!id) return;

  const akte = getAkten().find((entry) => entry.id === id);

  if (akte) {
    openDetail(akte);
  }
});

detailBackdrop.addEventListener("click", closeDetail);
closeDetailBtn.addEventListener("click", closeDetail);

editDetailBtn.addEventListener("click", () => {
  if (!currentDetailId) return;

  const akte = getAkten().find((entry) => entry.id === currentDetailId);
  if (!akte) return;

  closeDetail();
  loadAkteIntoForm(akte);
});

archiveDetailBtn.addEventListener("click", () => {
  if (!currentDetailId) return;
  openStatusModal();
});

deleteDetailBtn.addEventListener("click", () => {
  if (!currentDetailId) return;

  const akte = getAkten().find((entry) => entry.id === currentDetailId);
  if (!akte) return;

  const confirmDelete = confirm(`Willst du die Akte "${akte.title}" wirklich löschen?`);

  if (!confirmDelete) return;

  const updatedAkten = getAkten().filter((entry) => entry.id !== currentDetailId);
  saveAkten(updatedAkten);

  closeDetail();
  closeStatusModal();
  renderAkten();
});

statusBackdrop.addEventListener("click", closeStatusModal);
closeStatusBtn.addEventListener("click", closeStatusModal);

statusChoices.forEach((button) => {
  button.addEventListener("click", () => {
    const newStatus = button.dataset.status;
    updateCurrentAkteStatus(newStatus);
  });
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  if (!statusModal.classList.contains("hidden")) {
    closeStatusModal();
    return;
  }

  if (!detailModal.classList.contains("hidden")) {
    closeDetail();
    return;
  }

  if (loginBox.classList.contains("show")) {
    hideLogin();
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

function saveAkteFromForm() {
  const id = editAkteId.value.trim();
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

  if (id) {
    const index = akten.findIndex((entry) => entry.id === id);

    if (index === -1) {
      setSaveMessage("Diese Akte konnte nicht gefunden werden.", "error");
      return;
    }

    akten[index] = {
      ...akten[index],
      title,
      category,
      status,
      description,
      content,
      updatedAt: new Date().toLocaleString("de-DE")
    };

    saveAkten(akten);
    clearForm();
    setCreateMode();
    setSaveMessage("Akte wurde aktualisiert.", "success");
    switchTab("searchTab");
    renderAkten();
    return;
  }

  const newAkte = {
    id: createId(),
    title,
    category,
    status,
    description,
    content,
    createdAt: new Date().toLocaleString("de-DE"),
    updatedAt: ""
  };

  akten.unshift(newAkte);
  saveAkten(akten);

  clearForm();
  setSaveMessage("Akte wurde versiegelt.", "success");
  switchTab("searchTab");
  renderAkten();
}

function loadAkteIntoForm(akte) {
  editAkteId.value = akte.id || "";
  akteTitle.value = akte.title || "";
  akteCategory.value = akte.category || "";
  akteStatus.value = akte.status || "Aktiv";
  akteDescription.value = akte.description || "";
  akteContent.value = akte.content || "";

  formTitle.textContent = "Akte bearbeiten";
  saveButtonText.textContent = "Änderungen speichern";
  cancelEditBtn.classList.remove("hidden");

  switchTab("createTab");
  setSaveMessage("Bearbeitungsmodus aktiv.", "neutral");

  setTimeout(() => {
    akteTitle.focus();
  }, 80);
}

function setCreateMode() {
  editAkteId.value = "";
  formTitle.textContent = "Akte erstellen";
  saveButtonText.textContent = "Akte versiegeln";
  cancelEditBtn.classList.add("hidden");
}

function clearForm() {
  editAkteId.value = "";
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
    const matchesFilter = activeFilter === "Alle" || String(akte.status || "Aktiv") === activeFilter;

    const searchableText = [
      akte.title,
      akte.category,
      akte.status,
      akte.description,
      akte.content,
      akte.createdAt,
      akte.updatedAt
    ].join(" ").toLowerCase();

    return matchesFilter && searchableText.includes(query);
  });

  totalAktenCount.textContent = String(akten.length);
  filteredAktenCount.textContent = String(filteredAkten.length);
  secretAktenCount.textContent = String(akten.filter((akte) => akte.status === "Geheim").length);
  archivedAktenCount.textContent = String(akten.filter((akte) => akte.status === "Archiviert").length);

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
    const dateText = akte.updatedAt
      ? `Bearbeitet: ${akte.updatedAt}`
      : `Erstellt: ${akte.createdAt || "-"}`;

    return `
      <button class="akten-card" type="button" data-id="${escapeHtml(akte.id)}">
        <div class="folder-chip-row">
          <span class="folder-chip">${escapeHtml(akte.category || "Keine Kategorie")}</span>
          <span class="folder-chip ${statusClass}">${escapeHtml(akte.status || "Aktiv")}</span>
          <span class="folder-chip">${escapeHtml(dateText)}</span>
        </div>
        <h3>${escapeHtml(akte.title)}</h3>
        <p><strong>Beschreibung:</strong> ${escapeHtml(akte.description || "Keine Beschreibung")}</p>
        <p class="akten-preview">${escapeHtml(akte.content)}</p>
      </button>
    `;
  }).join("");
}

function openDetail(akte) {
  currentDetailId = akte.id || null;

  detailTitle.textContent = akte.title || "-";
  detailCategory.textContent = akte.category || "Keine Kategorie";

  const dateText = akte.updatedAt
    ? `${akte.createdAt || "-"} · Bearbeitet: ${akte.updatedAt}`
    : akte.createdAt || "-";

  detailDate.textContent = dateText;
  detailDescription.textContent = akte.description || "Keine Beschreibung";
  detailContent.textContent = akte.content || "-";
  detailStatus.textContent = akte.status || "Aktiv";

  detailStatus.className = `detail-status-seal ${createStatusClass(akte.status)}`;
  detailModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeDetail() {
  detailModal.classList.add("hidden");
  currentDetailId = null;

  if (statusModal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function openStatusModal() {
  statusModal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function closeStatusModal() {
  statusModal.classList.add("hidden");

  if (detailModal.classList.contains("hidden")) {
    document.body.style.overflow = "";
  }
}

function updateCurrentAkteStatus(newStatus) {
  if (!currentDetailId) return;

  const akten = getAkten();
  const index = akten.findIndex((entry) => entry.id === currentDetailId);

  if (index === -1) return;

  akten[index].status = newStatus;
  akten[index].updatedAt = new Date().toLocaleString("de-DE");

  saveAkten(akten);

  closeStatusModal();
  openDetail(akten[index]);
  renderAkten();
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
