const SYSTEM_PASSWORD = "System";
const STORAGE_KEY = "ashborn_akten";

const landingPage = document.getElementById("landingPage");
const mainLogo = document.getElementById("mainLogo");
const loginBox = document.getElementById("loginBox");
const passwordInput = document.getElementById("passwordInput");
const loginBtn = document.getElementById("loginBtn");
const loginError = document.getElementById("loginError");

const aktenSystem = document.getElementById("aktenSystem");
const logoutBtn = document.getElementById("logoutBtn");

const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");

const searchInput = document.getElementById("searchInput");
const aktenList = document.getElementById("aktenList");

const akteTitle = document.getElementById("akteTitle");
const akteCategory = document.getElementById("akteCategory");
const akteDescription = document.getElementById("akteDescription");
const akteContent = document.getElementById("akteContent");
const saveAkteBtn = document.getElementById("saveAkteBtn");
const saveInfo = document.getElementById("saveInfo");

const clearLocalDataBtn = document.getElementById("clearLocalDataBtn");

mainLogo.addEventListener("click", () => {
  loginBox.classList.add("show");
  passwordInput.focus();
});

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    login();
  }
});

function login() {
  const password = passwordInput.value.trim();

  if (password === SYSTEM_PASSWORD) {
    loginError.textContent = "";
    openAktenSystem();
  } else {
    loginError.textContent = "Falsches Kennwort.";
    passwordInput.value = "";
    passwordInput.focus();
  }
}

function openAktenSystem() {
  landingPage.classList.add("hidden");
  aktenSystem.classList.remove("hidden");
  renderAkten();
}

logoutBtn.addEventListener("click", () => {
  passwordInput.value = "";
  loginBox.classList.remove("show");
  aktenSystem.classList.add("hidden");
  landingPage.classList.remove("hidden");
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetTab = button.dataset.tab;

    tabButtons.forEach((btn) => btn.classList.remove("active"));
    tabContents.forEach((content) => content.classList.remove("active"));

    button.classList.add("active");
    document.getElementById(targetTab).classList.add("active");

    if (targetTab === "searchTab") {
      renderAkten();
    }
  });
});

function getAkten() {
  const saved = localStorage.getItem(STORAGE_KEY);

  if (!saved) {
    return [];
  }

  try {
    return JSON.parse(saved);
  } catch (error) {
    console.error("Akten konnten nicht gelesen werden:", error);
    return [];
  }
}

function saveAkten(akten) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(akten));
}

saveAkteBtn.addEventListener("click", () => {
  const title = akteTitle.value.trim();
  const category = akteCategory.value.trim();
  const description = akteDescription.value.trim();
  const content = akteContent.value.trim();

  if (!title || !content) {
    saveInfo.textContent = "Bitte mindestens Aktenname und Akteninhalt ausfüllen.";
    saveInfo.style.color = "#ff9a8a";
    return;
  }

  const akten = getAkten();

  const newAkte = {
    id: crypto.randomUUID(),
    title,
    category,
    description,
    content,
    createdAt: new Date().toLocaleString("de-DE")
  };

  akten.unshift(newAkte);
  saveAkten(akten);

  akteTitle.value = "";
  akteCategory.value = "";
  akteDescription.value = "";
  akteContent.value = "";

  saveInfo.textContent = "Akte wurde gespeichert.";
  saveInfo.style.color = "#a8ffbf";

  renderAkten();
});

searchInput.addEventListener("input", renderAkten);

function renderAkten() {
  const akten = getAkten();
  const query = searchInput.value.trim().toLowerCase();

  const filteredAkten = akten.filter((akte) => {
    const searchableText = `
      ${akte.title}
      ${akte.category}
      ${akte.description}
      ${akte.content}
      ${akte.createdAt}
    `.toLowerCase();

    return searchableText.includes(query);
  });

  if (filteredAkten.length === 0) {
    aktenList.innerHTML = `
      <div class="akte-card">
        <h3>Keine Akten gefunden</h3>
        <p>Erstelle eine neue Akte oder ändere deine Suche.</p>
      </div>
    `;
    return;
  }

  aktenList.innerHTML = filteredAkten.map((akte) => {
    return `
      <article class="akte-card">
        <h3>${escapeHtml(akte.title)}</h3>

        <div class="akte-meta">
          Kategorie: ${escapeHtml(akte.category || "Keine Kategorie")} |
          Erstellt: ${escapeHtml(akte.createdAt)}
        </div>

        <p><strong>Beschreibung:</strong> ${escapeHtml(akte.description || "Keine Beschreibung")}</p>
        <p>${escapeHtml(akte.content)}</p>
      </article>
    `;
  }).join("");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

clearLocalDataBtn.addEventListener("click", () => {
  const confirmDelete = confirm("Willst du wirklich alle lokalen Test-Akten löschen?");

  if (!confirmDelete) return;

  localStorage.removeItem(STORAGE_KEY);
  renderAkten();
});
