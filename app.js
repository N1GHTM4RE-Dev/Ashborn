const SUPABASE_URL = "https://rclpgqrwcygjzqgeurie.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2BWb4LK4GWC8-S4SVPIlvA_iX41QQqg";
const IMAGE_BUCKET = "ashborn-images";
const MASTER_LOGIN_EMAIL = "ashborn-system@ashborn.local";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let sessionUser = null;
let activeRecordFilter = "Alle";
let activeRecordImageFilter = false;
let recordSortMode = "newest";
let currentRecordId = null;
let pendingImages = [];
let recordsCache = [];
let sellPricesCache = [];
let buyPricesCache = [];
let internalCache = [];
let internalSearchQuery = "";
let internalCategoryFilter = "Alle";
let internalSortMode = "newest";
let cashCache = [];
let cashTypeFilter = "Alle";
let cashRangeFilter = "all";
let cashSortMode = "newest";
let cashSearchQuery = "";
let isBusy = false;
let dashboardGlobalSearchQuery = "";

const $ = (id) => document.getElementById(id);
const landingPage = $("landingPage");
const logoButton = $("logoButton");
const landingLoginBtn = $("landingLoginBtn");
const loginBox = $("loginBox");
const closeLoginBtn = $("closeLoginBtn");
const passwordInput = $("passwordInput");
const loginBtn = $("loginBtn");
const loginError = $("loginError");
const smokeTransition = $("smokeTransition");
const aktenSystem = $("aktenSystem");
const logoutBtn = $("logoutBtn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabContents = document.querySelectorAll(".tab-content");
const recordFilterButtons = document.querySelectorAll("[data-record-filter]");
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const recordFields = {
  id: $("recordId"),
  name: $("recordName"),
  type: $("recordType"),
  location: $("recordLocation"),
  telegram: $("recordTelegram"),
  description: $("recordDescription"),
  images: $("recordImages")
};

function on(element, eventName, handler) {
  if (!element) return;
  element.addEventListener(eventName, handler);
}

document.addEventListener("DOMContentLoaded", async () => {
  startAmbientEmbers();
  bindHeroParallax();
  bindEvents();

  const { data } = await supabaseClient.auth.getSession();
  if (data.session?.user) {
    sessionUser = data.session.user;
    showSystem();
    await loadAllData();
  } else {
    showLanding();
  }
});

function bindEvents() {
  on(logoButton, "click", showLogin);
  on(landingLoginBtn, "click", showLogin);
  on(closeLoginBtn, "click", hideLogin);
  on(loginBtn, "click", login);

  on(passwordInput, "keydown", (event) => {
    if (event.key === "Enter") login();
    if (event.key === "Escape") hideLogin();
  });
  on(logoutBtn, "click", logout);

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  });

  recordFilterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      activeRecordFilter = button.dataset.recordFilter;
      recordFilterButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.recordFilter === activeRecordFilter));
      renderRecords();
    });
  });

  on($("recordSearchInput"), "input", renderRecords);
  on($("recordSortSelect"), "change", (event) => {
    recordSortMode = event.target.value || "newest";
    renderRecords();
  });
  on($("toggleImageFilterBtn"), "click", () => {
    activeRecordImageFilter = !activeRecordImageFilter;
    $("toggleImageFilterBtn").classList.toggle("active", activeRecordImageFilter);
    $("toggleImageFilterBtn").textContent = activeRecordImageFilter ? "Alle Bilder anzeigen" : "Nur mit Bildern";
    renderRecords();
  });
  on($("clearRecordSearchBtn"), "click", () => {
    $("recordSearchInput").value = "";
    activeRecordFilter = "Alle";
    activeRecordImageFilter = false;
    recordSortMode = "newest";
    if ($("recordSortSelect")) $("recordSortSelect").value = "newest";
    recordFilterButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.recordFilter === "Alle"));
    if ($("toggleImageFilterBtn")) {
      $("toggleImageFilterBtn").classList.remove("active");
      $("toggleImageFilterBtn").textContent = "Nur mit Bildern";
    }
    renderRecords();
  });
  on($("exportRecordsCsvBtn"), "click", exportRecordsCsv);
  on($("saveRecordBtn"), "click", saveRecord);
  on($("resetRecordBtn"), "click", () => {
    clearRecordForm();
    setRecordMessage("Felder wurden geleert.", "neutral");
  });
  on($("cancelRecordEditBtn"), "click", () => {
    clearRecordForm();
    setRecordMessage("Bearbeitung wurde abgebrochen.", "neutral");
  });
  on(recordFields.images, "change", handleImageSelection);

  on($("recordList"), "click", (event) => {
    const editBtn = event.target.closest("[data-edit-record]");
    const deleteBtn = event.target.closest("[data-delete-record]");
    const card = event.target.closest(".akten-card");

    if (editBtn) {
      event.stopPropagation();
      const record = recordsCache.find((item) => item.id === editBtn.dataset.editRecord);
      if (record) loadRecordIntoForm(record);
      return;
    }

    if (deleteBtn) {
      event.stopPropagation();
      deleteRecord(deleteBtn.dataset.deleteRecord);
      return;
    }

    if (card && card.dataset.id && !card.disabled) {
      const record = recordsCache.find((item) => item.id === card.dataset.id);
      if (record) openDetail(record);
    }
  });

  on($("detailBackdrop"), "click", closeDetail);
  on($("closeDetailBtn"), "click", closeDetail);
  on($("editRecordBtn"), "click", () => {
    const record = recordsCache.find((item) => item.id === currentRecordId);
    if (record) {
      closeDetail();
      loadRecordIntoForm(record);
    }
  });
  on($("deleteRecordBtn"), "click", () => deleteRecord(currentRecordId));
  on($("copyTelegramBtn"), "click", copyCurrentTelegram);

  setupPriceModule("sell");
  setupPriceModule("buy");
  on($("saveInternalBtn"), "click", saveInternalNote);
  on($("resetInternalBtn"), "click", () => {
    clearInternalForm();
    setInternalMessage("Felder wurden geleert.", "neutral");
  });
  on($("cancelInternalEditBtn"), "click", () => {
    clearInternalForm();
    setInternalMessage("Bearbeitung wurde abgebrochen.", "neutral");
  });
  on($("clearInternalBtn"), "click", clearInternalNotes);
  on($("internalSearchInput"), "input", (event) => {
    internalSearchQuery = event.target.value.trim().toLowerCase();
    renderInternal();
  });
  on($("internalCategoryFilter"), "change", (event) => {
    internalCategoryFilter = event.target.value || "Alle";
    renderInternal();
  });
  on($("internalSortSelect"), "change", (event) => {
    internalSortMode = event.target.value || "newest";
    renderInternal();
  });
  on($("clearInternalSearchBtn"), "click", clearInternalSearch);
  on($("exportInternalCsvBtn"), "click", exportInternalCsv);

  document.querySelectorAll("[data-internal-overview-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      internalCategoryFilter = button.dataset.internalOverviewFilter || "Alle";
      if ($("internalCategoryFilter")) $("internalCategoryFilter").value = internalCategoryFilter;
      renderInternal();
    });
  });
  on($("saveCashBtn"), "click", saveCashEntry);
  on($("clearCashBtn"), "click", clearCashEntries);
  on($("cashSearchInput"), "input", (event) => {
    cashSearchQuery = event.target.value.trim().toLowerCase();
    renderCash();
  });
  on($("cashTypeFilter"), "change", (event) => {
    cashTypeFilter = event.target.value || "Alle";
    renderCash();
  });
  on($("cashRangeFilter"), "change", (event) => {
    cashRangeFilter = event.target.value || "all";
    renderCash();
  });
  on($("cashSortSelect"), "change", (event) => {
    cashSortMode = event.target.value || "newest";
    renderCash();
  });
  on($("clearCashSearchBtn"), "click", () => {
    cashSearchQuery = "";
    cashTypeFilter = "Alle";
    cashRangeFilter = "all";
    cashSortMode = "newest";
    if ($("cashSearchInput")) $("cashSearchInput").value = "";
    if ($("cashTypeFilter")) $("cashTypeFilter").value = "Alle";
    if ($("cashRangeFilter")) $("cashRangeFilter").value = "all";
    if ($("cashSortSelect")) $("cashSortSelect").value = "newest";
    renderCash();
  });
  on($("exportCashCsvBtn"), "click", exportCashCsv);
  on($("cashList"), "click", (event) => {
    const reverseBtn = event.target.closest("[data-reverse-cash]");
    if (reverseBtn) reverseCashEntry(reverseBtn.dataset.reverseCash);
  });
  on($("clearAllDataBtn"), "click", clearAllData);
  on($("exportDataBtn"), "click", exportData);
  on($("reloadAllDataBtn"), "click", loadAllData);
  on($("exportAllCsvBtn"), "click", exportAllCsv);
  document.querySelectorAll("[data-system-open]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.systemOpen));
  });
  document.querySelectorAll("[data-dashboard-open]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.dashboardOpen));
  });
  on($("dashboardReloadBtn"), "click", loadAllData);
  on($("dashboardGlobalSearchInput"), "input", (event) => {
    dashboardGlobalSearchQuery = (event.target.value || "").trim().toLowerCase();
    renderDashboardGlobalSearch();
  });
  on($("dashboardGlobalSearchClearBtn"), "click", () => {
    dashboardGlobalSearchQuery = "";
    if ($("dashboardGlobalSearchInput")) $("dashboardGlobalSearchInput").value = "";
    renderDashboardGlobalSearch();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (!$("detailModal").classList.contains("hidden")) return closeDetail();
    if (loginBox.classList.contains("show")) hideLogin();
  });
}

function showLogin() {
  loginError.textContent = "";
  landingPage.classList.add("login-open");
  loginBox.classList.add("show");
  loginBox.setAttribute("aria-hidden", "false");
  setTimeout(() => passwordInput?.focus(), 120);
}

function hideLogin() {
  landingPage.classList.remove("login-open");
  loginBox.classList.remove("show");
  loginBox.setAttribute("aria-hidden", "true");
  loginError.textContent = "";
  if (passwordInput) passwordInput.value = "";
}

async function login() {
  const password = passwordInput.value.trim();

  if (!password) {
    loginError.textContent = "Bitte Systemkennwort eintragen.";
    passwordInput.focus();
    return;
  }

  setBusy(true, "System wird entsiegelt...");

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: MASTER_LOGIN_EMAIL,
    password
  });

  setBusy(false);

  if (error || !data.session?.user) {
    loginError.textContent = "Falsches Systemkennwort.";
    passwordInput.value = "";
    passwordInput.focus();
    loginBox.classList.remove("shake");
    void loginBox.offsetWidth;
    loginBox.classList.add("shake");
    return;
  }

  sessionUser = data.session.user;

  playSmokeTransition(async () => {
    showSystem();
    hideLogin();
    await loadAllData();
  });
}

async function logout() {
  await supabaseClient.auth.signOut();
  sessionUser = null;
  recordsCache = [];
  sellPricesCache = [];
  buyPricesCache = [];
  internalCache = [];
  cashCache = [];
  closeDetail();
  showLanding();
  hideLogin();
}

function showSystem() {
  landingPage.classList.add("hidden");
  aktenSystem.classList.remove("hidden");
  switchTab("dashboardTab");
}

function showLanding() {
  aktenSystem.classList.add("hidden");
  landingPage.classList.remove("hidden");
}

function playSmokeTransition(callback) {
  smokeTransition.classList.remove("active");
  void smokeTransition.offsetWidth;
  smokeTransition.classList.add("active");
  setTimeout(callback, 320);
  setTimeout(() => smokeTransition.classList.remove("active"), 920);
}

function switchTab(tabId) {
  tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
  tabContents.forEach((content) => content.classList.toggle("active", content.id === tabId));
}

async function loadAllData() {
  try {
    setBusy(true, "Daten werden geladen...");
    await Promise.all([
      loadRecords(),
      loadPriceItems("sell"),
      loadPriceItems("buy"),
      loadInternalNotes(),
      loadCashEntries()
    ]);
    renderAll();
  } catch (error) {
    console.error(error);
    alert(`Daten konnten nicht geladen werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

function renderAll() {
  renderRecords();
  renderPriceModule("sell");
  renderPriceModule("buy");
  renderInternal();
  renderCash();
  renderSystemDashboard();
  renderDashboard();
}

function renderSystemDashboard() {
  setText("sysRecordsCount", recordsCache.length);
  setText("sysSellCount", sellPricesCache.length);
  setText("sysBuyCount", buyPricesCache.length);
  setText("sysInternalCount", internalCache.length);
  setText("sysCashCount", cashCache.length);
  setText("sysBalanceValue", formatMoney(calculateCashBalance(cashCache)));
  setText("sysProjectUrl", SUPABASE_URL.replace("https://", ""));
  setText("systemConnectionStatus", sessionUser ? "Supabase verbunden" : "Nicht angemeldet");

  const newest = getNewestDate([
    ...recordsCache.flatMap((entry) => [entry.createdAtRaw, entry.updatedAtRaw]),
    ...sellPricesCache.flatMap((entry) => [entry.createdAtRaw, entry.updatedAtRaw]),
    ...buyPricesCache.flatMap((entry) => [entry.createdAtRaw, entry.updatedAtRaw]),
    ...internalCache.flatMap((entry) => [entry.createdAtRaw, entry.updatedAtRaw]),
    ...cashCache.map((entry) => entry.createdAtRaw)
  ]);

  setText("sysLastUpdate", newest ? formatDate(newest) : "Noch keine Daten vorhanden.");
}


function renderDashboard() {
  const imageCount = recordsCache.filter((entry) => Array.isArray(entry.images) && entry.images.length > 0).length;
  const income = cashCache
    .filter((entry) => entry.type === "einzahlung")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const expense = cashCache
    .filter((entry) => entry.type === "auszahlung")
    .reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  const movement = income + expense;

  setText("dashBalanceValue", formatMoney(calculateCashBalance(cashCache)));
  setText("dashRecordsCount", recordsCache.length);
  setText("dashImageCount", `${imageCount} mit Bildern`);
  setText("dashSellCount", sellPricesCache.length);
  setText("dashBuyCount", buyPricesCache.length);
  setText("dashInternalCount", internalCache.length);
  setText("dashCashCount", cashCache.length);
  setText("dashCashMovement", `${formatMoney(movement)} Bewegung`);
  setText("dashIncomeValue", formatMoney(income));
  setText("dashExpenseValue", formatMoney(expense));
  setText("dashboardStatusPill", sessionUser ? "System verbunden" : "Nicht angemeldet");

  const lastCash = [...cashCache].sort((a, b) => new Date(b.createdAtRaw || 0) - new Date(a.createdAtRaw || 0))[0];
  setText("dashLastCashDate", lastCash ? formatDate(lastCash.createdAtRaw) : "-");

  setText("dashPersonCount", countRecordsByType("Person"));
  setText("dashOrgCount", countRecordsByType("Organisation"));
  setText("dashRouteCount", countRecordsByType("Route"));
  setText("dashPlaceCount", countRecordsByType("Ort"));
  setText("dashObjectCount", countRecordsByType("Gegenstand"));

  renderDashboardRecentList();
  renderDashboardGlobalSearch();
}


function renderDashboardGlobalSearch() {
  const target = $("dashboardGlobalSearchResults");
  if (!target) return;

  const input = $("dashboardGlobalSearchInput");
  const query = dashboardGlobalSearchQuery || (input?.value || "").trim().toLowerCase();

  if (!query) {
    setText("dashboardGlobalSearchCount", "0 Treffer");
    target.innerHTML = `<p class="system-text">Gib etwas ein, um alle Bereiche gleichzeitig zu durchsuchen.</p>`;
    return;
  }

  const results = buildDashboardGlobalSearchIndex()
    .filter((entry) => entry.searchText.includes(query))
    .sort((a, b) => new Date(b.dateRaw || 0) - new Date(a.dateRaw || 0))
    .slice(0, 40);

  setText("dashboardGlobalSearchCount", `${results.length} Treffer`);

  if (!results.length) {
    target.innerHTML = `<p class="system-text">Keine Treffer gefunden. Prüfe Schreibweise oder suche nach einem anderen Begriff.</p>`;
    return;
  }

  target.innerHTML = results.map((entry) => `
    <button class="dashboard-global-result" type="button" data-global-open="${escapeHtml(entry.tab)}" data-global-id="${escapeHtml(entry.id || "")}" data-global-kind="${escapeHtml(entry.kind)}">
      <div class="folder-chip-row">
        <span class="folder-chip ${createStatusClass(entry.badge)}">${escapeHtml(entry.area)}</span>
        ${entry.badge ? `<span class="folder-chip">${escapeHtml(entry.badge)}</span>` : ""}
        ${entry.dateLabel ? `<span class="folder-chip">${escapeHtml(entry.dateLabel)}</span>` : ""}
      </div>
      <strong>${escapeHtml(entry.title || "Ohne Titel")}</strong>
      <p>${escapeHtml(entry.preview || "Keine weiteren Informationen")}</p>
    </button>
  `).join("");

  target.querySelectorAll("[data-global-open]").forEach((button) => {
    button.addEventListener("click", () => openGlobalSearchResult(button.dataset.globalOpen, button.dataset.globalKind, button.dataset.globalId));
  });
}

function buildDashboardGlobalSearchIndex() {
  const toSearch = (...values) => values.join(" ").toLowerCase();

  return [
    ...recordsCache.map((entry) => ({
      kind: "record",
      id: entry.id,
      area: "Großes Aktensystem",
      tab: "dataTab",
      badge: entry.type || "Datensatz",
      title: entry.name,
      preview: [entry.location ? `Wo: ${entry.location}` : "", entry.telegram ? `Telegramm: ${entry.telegram}` : "", entry.description || ""].filter(Boolean).join(" · "),
      dateRaw: entry.updatedAtRaw || entry.createdAtRaw,
      dateLabel: entry.updatedAt ? `Bearbeitet: ${entry.updatedAt}` : entry.createdAt ? `Erstellt: ${entry.createdAt}` : "",
      searchText: toSearch(entry.name, entry.type, entry.location, entry.telegram, entry.description, entry.createdAt, entry.updatedAt, "großes aktensystem datensatz")
    })),
    ...sellPricesCache.map((entry) => ({
      kind: "sell",
      id: entry.id,
      area: "Preisliste Verkauf",
      tab: "sellTab",
      badge: entry.category || "Verkauf",
      title: entry.name,
      preview: [formatMoney(entry.price), entry.unit || "", entry.note || ""].filter(Boolean).join(" · "),
      dateRaw: entry.updatedAtRaw || entry.createdAtRaw,
      dateLabel: entry.updatedAt ? `Bearbeitet: ${entry.updatedAt}` : entry.createdAt ? `Erstellt: ${entry.createdAt}` : "",
      searchText: toSearch(entry.name, entry.category, entry.unit, entry.note, entry.price, entry.createdAt, entry.updatedAt, "preisliste verkauf preis artikel")
    })),
    ...buyPricesCache.map((entry) => ({
      kind: "buy",
      id: entry.id,
      area: "Preisliste Kauf",
      tab: "buyTab",
      badge: entry.category || "Kauf",
      title: entry.name,
      preview: [formatMoney(entry.price), entry.unit || "", entry.note || ""].filter(Boolean).join(" · "),
      dateRaw: entry.updatedAtRaw || entry.createdAtRaw,
      dateLabel: entry.updatedAt ? `Bearbeitet: ${entry.updatedAt}` : entry.createdAt ? `Erstellt: ${entry.createdAt}` : "",
      searchText: toSearch(entry.name, entry.category, entry.unit, entry.note, entry.price, entry.createdAt, entry.updatedAt, "preisliste kauf preis artikel")
    })),
    ...internalCache.map((entry) => ({
      kind: "internal",
      id: entry.id,
      area: "Ashborn Intern",
      tab: "internTab",
      badge: entry.category || "Intern",
      title: entry.title,
      preview: entry.content || "Keine zusätzliche Information",
      dateRaw: entry.updatedAtRaw || entry.createdAtRaw,
      dateLabel: entry.updatedAt ? `Bearbeitet: ${entry.updatedAt}` : entry.createdAt ? `Erstellt: ${entry.createdAt}` : "",
      searchText: toSearch(entry.title, entry.category, entry.content, entry.createdAt, entry.updatedAt, "ashborn intern info regel rollen pläne")
    })),
    ...cashCache.map((entry) => ({
      kind: "cash",
      id: entry.id,
      area: "Buchhaltung",
      tab: "cashTab",
      badge: entry.type === "einzahlung" ? "Einzahlung" : "Auszahlung",
      title: entry.reason || "Buchung",
      preview: formatMoney(entry.amount || 0),
      dateRaw: entry.createdAtRaw,
      dateLabel: entry.createdAt ? `Gebucht: ${entry.createdAt}` : "",
      searchText: toSearch(entry.type, entry.reason, entry.amount, entry.createdAt, "buchhaltung kontostand einzahlung auszahlung")
    }))
  ];
}

function openGlobalSearchResult(tabId, kind, id) {
  switchTab(tabId);

  if (kind === "record" && id) {
    const record = recordsCache.find((entry) => entry.id === id);
    if (record) setTimeout(() => openDetail(record), 80);
    return;
  }

  if (kind === "sell" && id) {
    if ($("sellPriceSearchInput")) $("sellPriceSearchInput").value = "";
    loadPriceIntoForm("sell", id);
    return;
  }

  if (kind === "buy" && id) {
    if ($("buyPriceSearchInput")) $("buyPriceSearchInput").value = "";
    loadPriceIntoForm("buy", id);
    return;
  }

  if (kind === "internal" && id) {
    const note = internalCache.find((entry) => entry.id === id);
    if (note) loadInternalIntoForm(note);
    return;
  }

  if (kind === "cash" && id) {
    cashSearchQuery = "";
    if ($("cashSearchInput")) $("cashSearchInput").value = "";
    const row = document.querySelector(`[data-cash-id="${CSS.escape(id)}"]`);
    if (row) row.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

function countRecordsByType(type) {
  return recordsCache.filter((entry) => String(entry.type || "") === type).length;
}

function renderDashboardRecentList() {
  const target = $("dashboardRecentList");
  if (!target) return;

  const activities = [
    ...recordsCache.map((entry) => ({
      date: entry.updatedAtRaw || entry.createdAtRaw,
      label: "Datensatz",
      title: entry.name || "Ohne Name",
      info: entry.type || "Nicht festgelegt",
      tab: "dataTab"
    })),
    ...sellPricesCache.map((entry) => ({
      date: entry.updatedAtRaw || entry.createdAtRaw,
      label: "Verkauf",
      title: entry.name || "Artikel",
      info: formatMoney(entry.price || 0),
      tab: "sellTab"
    })),
    ...buyPricesCache.map((entry) => ({
      date: entry.updatedAtRaw || entry.createdAtRaw,
      label: "Kauf",
      title: entry.name || "Artikel",
      info: formatMoney(entry.price || 0),
      tab: "buyTab"
    })),
    ...internalCache.map((entry) => ({
      date: entry.updatedAtRaw || entry.createdAtRaw,
      label: "Intern",
      title: entry.title || "Interne Info",
      info: entry.category || "Allgemein",
      tab: "internTab"
    })),
    ...cashCache.map((entry) => ({
      date: entry.createdAtRaw,
      label: entry.type === "einzahlung" ? "Einzahlung" : "Auszahlung",
      title: entry.reason || "Buchung",
      info: formatMoney(entry.amount || 0),
      tab: "cashTab"
    }))
  ]
    .filter((entry) => entry.date)
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 7);

  if (activities.length === 0) {
    target.innerHTML = `<p class="system-text">Noch keine Aktivitäten vorhanden.</p>`;
    return;
  }

  target.innerHTML = activities.map((entry) => `
    <button class="dashboard-recent-item" type="button" data-dashboard-open="${escapeHtml(entry.tab)}">
      <span>${escapeHtml(entry.label)}</span>
      <strong>${escapeHtml(entry.title)}</strong>
      <small>${escapeHtml(entry.info)} · ${escapeHtml(formatDate(entry.date))}</small>
    </button>
  `).join("");

  target.querySelectorAll("[data-dashboard-open]").forEach((button) => {
    button.addEventListener("click", () => switchTab(button.dataset.dashboardOpen));
  });
}

function getNewestDate(values) {
  const timestamps = values
    .filter(Boolean)
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

async function loadRecords() {
  const { data, error } = await supabaseClient
    .from("ashborn_entries")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  recordsCache = await Promise.all((data || []).map(normalizeRecord));
}

async function normalizeRecord(row) {
  const images = await withSignedImageUrls(Array.isArray(row.images) ? row.images : []);
  return {
    id: row.id,
    name: row.name || "",
    type: row.type || "",
    location: row.find_location || "",
    telegram: row.telegram_number || "",
    description: row.description || "",
    images,
    createdAt: formatDate(row.created_at),
    updatedAt: row.updated_at ? formatDate(row.updated_at) : "",
    createdAtRaw: row.created_at || "",
    updatedAtRaw: row.updated_at || row.created_at || ""
  };
}

async function withSignedImageUrls(images) {
  return Promise.all(images.map(async (image) => {
    if (!image.path) return image;
    const { data } = await supabaseClient.storage.from(IMAGE_BUCKET).createSignedUrl(image.path, 60 * 60 * 24);
    return { ...image, src: data?.signedUrl || "" };
  }));
}

async function saveRecord() {
  if (isBusy) return;
  const name = recordFields.name.value.trim();
  if (!name) {
    setRecordMessage("Bitte mindestens den Namen eintragen.", "error");
    recordFields.name.focus();
    return;
  }

  try {
    setBusy(true, "Datensatz wird gespeichert...");
    const id = recordFields.id.value.trim() || crypto.randomUUID();
    const uploadedImages = await uploadPendingImages(id);
    const payload = {
      id,
      name,
      type: recordFields.type.value || null,
      find_location: recordFields.location.value.trim() || null,
      telegram_number: recordFields.telegram.value.trim() || null,
      description: recordFields.description.value.trim() || null,
      images: uploadedImages.map((image) => ({ name: image.name || "Bild", path: image.path })),
      updated_at: new Date().toISOString()
    };

    if (!recordFields.id.value.trim()) {
      payload.created_by = sessionUser?.id || null;
    }

    const { error } = await supabaseClient.from("ashborn_entries").upsert(payload, { onConflict: "id" });
    if (error) throw error;

    clearRecordForm();
    setRecordMessage("Datensatz wurde in Supabase gespeichert.", "success");
    await loadRecords();
    renderRecords();
  } catch (error) {
    console.error(error);
    setRecordMessage(`Speichern fehlgeschlagen: ${error.message || error}`, "error");
  } finally {
    setBusy(false);
  }
}

async function uploadPendingImages(recordId) {
  const result = [];
  for (const image of pendingImages) {
    if (!image.file) {
      result.push(image);
      continue;
    }
    const extension = getFileExtension(image.file.name);
    const safeName = sanitizeFileName(image.file.name.replace(/\.[^/.]+$/, ""));
    const path = `${sessionUser.id}/${recordId}/${Date.now()}-${Math.random().toString(16).slice(2)}-${safeName}${extension}`;
    const { error } = await supabaseClient.storage.from(IMAGE_BUCKET).upload(path, image.file, {
      cacheControl: "3600",
      upsert: false
    });
    if (error) throw error;
    result.push({ name: image.name || image.file.name, path });
  }
  return result;
}

function loadRecordIntoForm(record) {
  recordFields.id.value = record.id || "";
  recordFields.name.value = record.name || "";
  recordFields.type.value = record.type || "";
  recordFields.location.value = record.location || "";
  recordFields.telegram.value = record.telegram || "";
  recordFields.description.value = record.description || "";
  pendingImages = Array.isArray(record.images) ? record.images.map((img) => ({ ...img })) : [];
  $("dataFormTitle").textContent = "Daten bearbeiten";
  $("recordSaveText").textContent = "Änderungen speichern";
  $("cancelRecordEditBtn").classList.remove("hidden");
  renderImagePreview();
  switchTab("dataTab");
  setRecordMessage("Bearbeitungsmodus aktiv.", "neutral");
  setTimeout(() => recordFields.name.focus(), 80);
}

function clearRecordForm() {
  recordFields.id.value = "";
  recordFields.name.value = "";
  recordFields.type.value = "";
  recordFields.location.value = "";
  recordFields.telegram.value = "";
  recordFields.description.value = "";
  recordFields.images.value = "";
  pendingImages = [];
  $("dataFormTitle").textContent = "Daten erfassen";
  $("recordSaveText").textContent = "Daten speichern";
  $("cancelRecordEditBtn").classList.add("hidden");
  renderImagePreview();
}

async function handleImageSelection(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;
  const images = await Promise.all(files.map(fileToPreviewImage));
  pendingImages = [...pendingImages, ...images];
  renderImagePreview();
}

function fileToPreviewImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, src: reader.result, file });
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function renderImagePreview() {
  const preview = $("imagePreview");
  if (!preview) return;
  if (!pendingImages.length) {
    preview.innerHTML = `<p class="field-hint">Noch keine Bilder ausgewählt.</p>`;
    return;
  }
  preview.innerHTML = pendingImages.map((image, index) => `
    <div class="image-preview-item">
      ${image.src ? `<img src="${image.src}" alt="${escapeHtml(image.name || "Bild")}" />` : `<div class="image-placeholder">Bild</div>`}
      <button type="button" class="danger-btn mini-btn" data-remove-image="${index}">Entfernen</button>
    </div>
  `).join("");
  preview.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.addEventListener("click", () => {
      pendingImages.splice(Number(button.dataset.removeImage), 1);
      renderImagePreview();
    });
  });
}

function renderRecords() {
  const list = $("recordList");
  if (!list) return;
  const query = ($("recordSearchInput")?.value || "").trim().toLowerCase();
  const filtered = recordsCache
    .filter((record) => {
      const matchesType = activeRecordFilter === "Alle" || record.type === activeRecordFilter;
      const hasImages = Array.isArray(record.images) && record.images.length > 0;
      const matchesImages = !activeRecordImageFilter || hasImages;
      const haystack = [record.name, record.type, record.location, record.telegram, record.description, record.createdAt, record.updatedAt].join(" ").toLowerCase();
      return matchesType && matchesImages && haystack.includes(query);
    })
    .sort(sortRecords);

  setText("totalRecordsCount", recordsCache.length);
  setText("filteredRecordsCount", filtered.length);
  setText("imageRecordsCount", recordsCache.filter((item) => Array.isArray(item.images) && item.images.length).length);
  if (!filtered.length) {
    list.innerHTML = `<button class="akten-card" type="button" disabled><div class="folder-chip-row"><span class="folder-chip">Keine Daten</span><span class="folder-chip">0 Treffer</span></div><h3>Keine Einträge gefunden</h3><p>Erstelle einen neuen Datensatz oder ändere deine Suche.</p></button>`;
    return;
  }

  list.innerHTML = filtered.map((record) => {
    const firstImage = Array.isArray(record.images) ? record.images.find((img) => img.src) : null;
    return `
      <button class="akten-card record-card" type="button" data-id="${escapeHtml(record.id)}">
        <div class="record-card-main">
          <div class="record-thumb ${firstImage ? "has-image" : ""}">
            ${firstImage ? `<img src="${firstImage.src}" alt="${escapeHtml(firstImage.name || record.name)}" />` : `<span>${escapeHtml((record.type || "A").slice(0, 1))}</span>`}
          </div>
          <div class="record-card-body">
            <div class="folder-chip-row">
              <span class="folder-chip ${createStatusClass(record.type)}">${escapeHtml(record.type || "Nicht festgelegt")}</span>
              <span class="folder-chip">${escapeHtml(record.updatedAt ? `Bearbeitet: ${record.updatedAt}` : `Erstellt: ${record.createdAt || "-"}`)}</span>
              <span class="folder-chip">${Array.isArray(record.images) ? record.images.length : 0} Bild(er)</span>
            </div>
            <h3>${escapeHtml(record.name)}</h3>
            <p><strong>Wo?</strong> ${escapeHtml(record.location || "Nicht eingetragen")}</p>
            <p><strong>Telegramm:</strong> ${escapeHtml(record.telegram || "Nicht eingetragen")}</p>
            <p class="akten-preview">${escapeHtml(record.description || "Keine Beschreibung")}</p>
            <div class="card-actions">
              <span class="secondary-btn mini-btn" data-edit-record="${escapeHtml(record.id)}">Bearbeiten</span>
              <span class="danger-btn mini-btn" data-delete-record="${escapeHtml(record.id)}">Löschen</span>
            </div>
          </div>
        </div>
      </button>
    `;
  }).join("");
}

function sortRecords(a, b) {
  if (recordSortMode === "oldest") return new Date(a.createdAtRaw || 0) - new Date(b.createdAtRaw || 0);
  if (recordSortMode === "name") return String(a.name || "").localeCompare(String(b.name || ""), "de");
  if (recordSortMode === "type") return String(a.type || "").localeCompare(String(b.type || ""), "de") || String(a.name || "").localeCompare(String(b.name || ""), "de");
  return new Date(b.updatedAtRaw || b.createdAtRaw || 0) - new Date(a.updatedAtRaw || a.createdAtRaw || 0);
}

function openDetail(record) {
  currentRecordId = record.id;
  setText("detailTitle", record.name || "-");
  setText("detailType", record.type || "Nicht festgelegt");
  setText("detailLocation", record.location || "-");
  setText("detailTelegram", record.telegram || "-");
  setText("detailDescription", record.description || "Keine Beschreibung eingetragen.");
  setText("detailCreatedAt", record.createdAt || "-");
  setText("detailUpdatedAt", record.updatedAt || "Noch nicht bearbeitet");
  if ($("copyTelegramBtn")) $("copyTelegramBtn").disabled = !record.telegram;
  const images = Array.isArray(record.images) ? record.images : [];
  $("detailImages").innerHTML = images.length
    ? images.map((img) => img.src ? `<a href="${img.src}" target="_blank" rel="noopener"><img src="${img.src}" alt="${escapeHtml(img.name || "Bild")}" /></a>` : "").join("")
    : `<p class="system-text">Keine Bilder hinterlegt.</p>`;
  $("detailModal").classList.remove("hidden");
}

function closeDetail() {
  currentRecordId = null;
  $("detailModal").classList.add("hidden");
}

async function deleteRecord(id) {
  if (!id || isBusy) return;
  const record = recordsCache.find((item) => item.id === id);
  if (!record) return;
  if (!confirm(`Datensatz "${record.name}" wirklich löschen?`)) return;

  try {
    setBusy(true, "Datensatz wird gelöscht...");
    const paths = (record.images || []).map((img) => img.path).filter(Boolean);
    if (paths.length) await supabaseClient.storage.from(IMAGE_BUCKET).remove(paths);
    const { error } = await supabaseClient.from("ashborn_entries").delete().eq("id", id);
    if (error) throw error;
    closeDetail();
    clearRecordForm();
    await loadRecords();
    renderRecords();
  } catch (error) {
    alert(`Löschen fehlgeschlagen: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

async function copyCurrentTelegram() {
  const record = recordsCache.find((item) => item.id === currentRecordId);
  if (!record?.telegram) return;
  try {
    await navigator.clipboard.writeText(record.telegram);
    const btn = $("copyTelegramBtn");
    if (!btn) return;
    const oldText = btn.textContent;
    btn.textContent = "Kopiert";
    setTimeout(() => { btn.textContent = oldText; }, 1200);
  } catch (error) {
    alert(`Kopieren fehlgeschlagen: ${error.message || error}`);
  }
}

function exportRecordsCsv() {
  if (!recordsCache.length) {
    alert("Keine Datensätze zum Exportieren vorhanden.");
    return;
  }
  const headers = ["Name", "Was", "Wo finde ich es", "Telegramm Nummer", "Beschreibung", "Bilder", "Erstellt", "Bearbeitet"];
  const rows = recordsCache.map((record) => [
    record.name,
    record.type,
    record.location,
    record.telegram,
    record.description,
    Array.isArray(record.images) ? record.images.length : 0,
    record.createdAt,
    record.updatedAt
  ]);
  const csv = [headers, ...rows]
    .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(";"))
    .join("\n");
  downloadTextFile(`ashborn-datensaetze-${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
}


function setupPriceModule(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const label = type === "sell" ? "Verkaufs" : "Kauf";

  on($(`${prefix}PriceForm`), "submit", (event) => {
    event.preventDefault();
    savePriceItem(type);
  });
  on($(`${prefix}CalculatorItem`), "change", () => updateCalculator(type));
  on($(`${prefix}CalculatorQty`), "input", () => updateCalculator(type));
  on($(`${prefix}CalculatorAdjust`), "input", () => updateCalculator(type));
  on($(`${prefix}PriceSearchInput`), "input", () => renderPriceModule(type));
  on($(`${prefix}PriceSortSelect`), "change", () => renderPriceModule(type));
  on($(`clear${capitalize(prefix)}PriceSearchBtn`), "click", () => {
    if ($(`${prefix}PriceSearchInput`)) $(`${prefix}PriceSearchInput`).value = "";
    if ($(`${prefix}PriceSortSelect`)) $(`${prefix}PriceSortSelect`).value = "name";
    renderPriceModule(type);
  });
  on($(`export${capitalize(prefix)}PricesCsvBtn`), "click", () => exportPriceCsv(type));
  on($(`cancel${capitalize(prefix)}PriceEditBtn`), "click", () => {
    clearPriceForm(type);
    alert(`${label}artikel-Bearbeitung wurde abgebrochen.`);
  });
  on($(`clear${capitalize(prefix)}PricesBtn`), "click", () => clearPriceItems(type));
}

async function loadPriceItems(type) {
  const table = type === "sell" ? "price_sale" : "price_purchase";
  const { data, error } = await supabaseClient.from(table).select("*").order("created_at", { ascending: false });
  if (error) throw error;
  const normalized = (data || []).map((row) => ({
    id: row.id,
    name: row.item_name || "",
    category: row.category || "",
    unit: row.unit || "",
    price: Number(row.price || 0),
    note: row.note || "",
    createdAtRaw: row.created_at || "",
    updatedAtRaw: row.updated_at || "",
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at)
  }));
  if (type === "sell") sellPricesCache = normalized;
  else buyPricesCache = normalized;
}

async function savePriceItem(type) {
  if (isBusy) return;
  const prefix = type === "sell" ? "sell" : "buy";
  const table = type === "sell" ? "price_sale" : "price_purchase";
  const id = $(`${prefix}PriceId`)?.value.trim();
  const name = $(`${prefix}ItemName`).value.trim();
  const category = $(`${prefix}ItemCategory`)?.value.trim() || "";
  const price = Number($(`${prefix}ItemPrice`).value || 0);
  const unit = $(`${prefix}ItemUnit`).value.trim();
  const note = $(`${prefix}ItemNote`).value.trim();

  if (!name || price <= 0) {
    alert("Bitte mindestens Artikel und Preis eintragen.");
    return;
  }

  const payload = {
    item_name: name,
    category: category || null,
    price,
    unit: unit || null,
    note: note || null,
    updated_at: new Date().toISOString()
  };

  try {
    setBusy(true, id ? "Preis wird aktualisiert..." : "Preis wird gespeichert...");
    const request = id
      ? supabaseClient.from(table).update(payload).eq("id", id)
      : supabaseClient.from(table).insert(payload);
    const { error } = await request;
    if (error) throw error;
    clearPriceForm(type);
    await loadPriceItems(type);
    renderPriceModule(type);
  } catch (error) {
    alert(`Preis konnte nicht gespeichert werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

function getVisiblePriceItems(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = [...(type === "sell" ? sellPricesCache : buyPricesCache)];
  const query = ($(`${prefix}PriceSearchInput`)?.value || "").trim().toLowerCase();
  const sortMode = $(`${prefix}PriceSortSelect`)?.value || "name";

  const filtered = query
    ? items.filter((item) => [item.name, item.category, item.unit, item.note, String(item.price)].join(" ").toLowerCase().includes(query))
    : items;

  filtered.sort((a, b) => {
    if (sortMode === "priceAsc") return a.price - b.price;
    if (sortMode === "priceDesc") return b.price - a.price;
    if (sortMode === "category") return `${a.category || "zzz"}${a.name}`.localeCompare(`${b.category || "zzz"}${b.name}`, "de");
    if (sortMode === "newest") return String(b.createdAtRaw).localeCompare(String(a.createdAtRaw));
    return a.name.localeCompare(b.name, "de");
  });

  return filtered;
}

function renderPriceModule(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const allItems = type === "sell" ? sellPricesCache : buyPricesCache;
  const items = getVisiblePriceItems(type);
  const list = $(`${prefix}PriceList`);
  const select = $(`${prefix}CalculatorItem`);
  if (!list || !select) return;

  const calculatorItems = [...allItems].sort((a, b) => a.name.localeCompare(b.name, "de"));
  select.innerHTML = calculatorItems.length
    ? calculatorItems.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} — ${formatMoney(item.price)}</option>`).join("")
    : `<option value="">Keine Artikel vorhanden</option>`;

  list.innerHTML = items.length
    ? items.map((item) => `
      <div class="price-row enhanced-price-row">
        <div class="price-main">
          <div class="folder-chip-row">
            <span class="folder-chip">${escapeHtml(item.category || "Keine Kategorie")}</span>
            <span class="folder-chip">${escapeHtml(item.unit || "Keine Einheit")}</span>
          </div>
          <strong>${escapeHtml(item.name)}</strong>
          <span>${item.note ? escapeHtml(item.note) : "Keine Notiz"}</span>
        </div>
        <div class="price-value">${formatMoney(item.price)}</div>
        <div class="price-actions">
          <button class="secondary-btn mini-btn" type="button" data-edit-price="${escapeHtml(item.id)}">Bearbeiten</button>
          <button class="danger-btn mini-btn" type="button" data-delete-price="${escapeHtml(item.id)}">Löschen</button>
        </div>
      </div>
    `).join("")
    : `<div class="price-row"><div><strong>Keine Artikel gefunden</strong><span>Lege neue Artikel an oder ändere deine Suche.</span></div></div>`;

  list.querySelectorAll("[data-edit-price]").forEach((button) => {
    button.addEventListener("click", () => loadPriceIntoForm(type, button.dataset.editPrice));
  });
  list.querySelectorAll("[data-delete-price]").forEach((button) => {
    button.addEventListener("click", () => deletePriceItem(type, button.dataset.deletePrice));
  });
  updateCalculator(type);
}

function loadPriceIntoForm(type, id) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = type === "sell" ? sellPricesCache : buyPricesCache;
  const item = items.find((entry) => entry.id === id);
  if (!item) return;

  $(`${prefix}PriceId`).value = item.id;
  $(`${prefix}ItemName`).value = item.name;
  if ($(`${prefix}ItemCategory`)) $(`${prefix}ItemCategory`).value = item.category || "";
  $(`${prefix}ItemPrice`).value = item.price;
  $(`${prefix}ItemUnit`).value = item.unit || "";
  $(`${prefix}ItemNote`).value = item.note || "";

  setText(`${prefix}PriceFormTitle`, type === "sell" ? "Verkaufsartikel bearbeiten" : "Kaufartikel bearbeiten");
  setText(`${prefix}PriceSaveText`, "Änderungen speichern");
  $(`cancel${capitalize(prefix)}PriceEditBtn`)?.classList.remove("hidden");
  $(`${prefix}ItemName`)?.focus();
}

function clearPriceForm(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  $(`${prefix}PriceForm`)?.reset();
  if ($(`${prefix}PriceId`)) $(`${prefix}PriceId`).value = "";
  setText(`${prefix}PriceFormTitle`, type === "sell" ? "Verkaufsartikel anlegen" : "Kaufartikel anlegen");
  setText(`${prefix}PriceSaveText`, "Artikel speichern");
  $(`cancel${capitalize(prefix)}PriceEditBtn`)?.classList.add("hidden");
}

async function deletePriceItem(type, id) {
  if (!id || isBusy) return;
  const table = type === "sell" ? "price_sale" : "price_purchase";
  if (!confirm("Diesen Artikel wirklich löschen?")) return;
  try {
    setBusy(true, "Preis wird gelöscht...");
    const { error } = await supabaseClient.from(table).delete().eq("id", id);
    if (error) throw error;
    clearPriceForm(type);
    await loadPriceItems(type);
    renderPriceModule(type);
  } catch (error) {
    alert(`Preis konnte nicht gelöscht werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

async function clearPriceItems(type) {
  if (!confirm("Diese komplette Preisliste wirklich leeren?")) return;
  const table = type === "sell" ? "price_sale" : "price_purchase";
  try {
    setBusy(true, "Preisliste wird geleert...");
    const { error } = await supabaseClient.from(table).delete().not("id", "is", null);
    if (error) throw error;
    clearPriceForm(type);
    await loadPriceItems(type);
    renderPriceModule(type);
  } catch (error) {
    alert(`Preisliste konnte nicht geleert werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

function updateCalculator(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = type === "sell" ? sellPricesCache : buyPricesCache;
  const selectedId = $(`${prefix}CalculatorItem`)?.value;
  const qty = Number($(`${prefix}CalculatorQty`)?.value || 0);
  const adjustment = Number($(`${prefix}CalculatorAdjust`)?.value || 0);
  const item = items.find((entry) => entry.id === selectedId);
  if (!item) {
    setText(`${prefix}CalculatorSingle`, "0 $");
    setText(`${prefix}CalculatorResult`, "0 $");
    return;
  }
  const adjustedSingle = item.price * (1 + adjustment / 100);
  setText(`${prefix}CalculatorSingle`, formatMoney(adjustedSingle));
  setText(`${prefix}CalculatorResult`, formatMoney(adjustedSingle * qty));
}

function exportPriceCsv(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = getVisiblePriceItems(type);
  const rows = [["Artikel", "Kategorie", "Einheit", "Preis", "Notiz", "Erstellt"]];
  items.forEach((item) => rows.push([item.name, item.category, item.unit, String(item.price).replace(".", ","), item.note, item.createdAt]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(";")).join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashborn_${prefix}_preisliste.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

async function loadInternalNotes() {
  const { data, error } = await supabaseClient.from("internal_notes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  internalCache = (data || []).map((row) => ({
    id: row.id,
    title: row.title || "",
    content: row.content || "",
    category: row.category || "Allgemein",
    createdAtRaw: row.created_at,
    updatedAtRaw: row.updated_at,
    createdAt: formatDate(row.created_at),
    updatedAt: formatDate(row.updated_at)
  }));
}

async function saveInternalNote() {
  if (isBusy) return;
  const id = $("internalId")?.value.trim() || "";
  const title = $("internalTitle")?.value.trim() || "";
  const category = $("internalCategory")?.value || "Allgemein";
  const content = $("internalContent")?.value.trim() || "";

  if (!title) {
    setInternalMessage("Bitte eine Überschrift eintragen.", "error");
    return;
  }

  try {
    setBusy(true, id ? "Information wird aktualisiert..." : "Information wird gespeichert...");

    const payload = {
      title,
      category,
      content: content || null,
      updated_at: new Date().toISOString()
    };

    const result = id
      ? await supabaseClient.from("internal_notes").update(payload).eq("id", id)
      : await supabaseClient.from("internal_notes").insert({ ...payload, created_by: sessionUser?.id || null });

    if (result.error) throw result.error;

    clearInternalForm();
    await loadInternalNotes();
    renderInternal();
    setInternalMessage(id ? "Interne Information wurde aktualisiert." : "Interne Information wurde gespeichert.", "success");
  } catch (error) {
    setInternalMessage(`Information konnte nicht gespeichert werden: ${error.message || error}`, "error");
  } finally {
    setBusy(false);
  }
}

function getVisibleInternalNotes() {
  let notes = [...internalCache];

  if (internalCategoryFilter !== "Alle") {
    notes = notes.filter((note) => String(note.category || "Allgemein") === internalCategoryFilter);
  }

  if (internalSearchQuery) {
    notes = notes.filter((note) => [note.title, note.category, note.content, note.createdAt, note.updatedAt]
      .join(" ")
      .toLowerCase()
      .includes(internalSearchQuery));
  }

  notes.sort((a, b) => {
    if (internalSortMode === "oldest") return new Date(a.createdAtRaw || 0) - new Date(b.createdAtRaw || 0);
    if (internalSortMode === "title") return String(a.title || "").localeCompare(String(b.title || ""), "de");
    if (internalSortMode === "category") return String(a.category || "").localeCompare(String(b.category || ""), "de");
    return new Date(b.createdAtRaw || 0) - new Date(a.createdAtRaw || 0);
  });

  return notes;
}

function renderInternal() {
  const list = $("internalList");
  if (!list) return;

  const notes = getVisibleInternalNotes();
  const total = internalCache.length;
  const countByCategory = (category) => internalCache.filter((note) => String(note.category || "Allgemein") === category).length;

  setText("internalTotalCount", String(total));
  setText("internalRulesCount", String(countByCategory("Regeln")));
  setText("internalRolesCount", String(countByCategory("Rollen")));
  setText("internalMembersCount", String(countByCategory("Mitglieder")));
  setText("internalPlansCount", String(countByCategory("Pläne")));
  setText("internalAllianceCount", String(countByCategory("Bündnisse")));
  setText("internalHintsCount", String(countByCategory("Hinweise")));
  setText("internalVisibleCount", `${notes.length} sichtbar`);

  document.querySelectorAll("[data-internal-overview-filter]").forEach((button) => {
    button.classList.toggle("active", (button.dataset.internalOverviewFilter || "Alle") === internalCategoryFilter);
  });

  list.innerHTML = notes.length
    ? notes.map((note) => {
      const created = note.createdAt || "-";
      const updated = note.updatedAt && note.updatedAt !== note.createdAt ? note.updatedAt : "";
      const preview = note.content || "Keine zusätzliche Information hinterlegt.";
      return `
        <article class="internal-note-card-v11" data-internal-card="${escapeHtml(note.id)}">
          <div class="folder-chip-row internal-chip-row-v11">
            <span class="folder-chip ${createStatusClass(note.category)}">${escapeHtml(note.category || "Allgemein")}</span>
            <span class="folder-chip">Erstellt: ${escapeHtml(created)}</span>
            ${updated ? `<span class="folder-chip">Bearbeitet: ${escapeHtml(updated)}</span>` : ""}
          </div>

          <h3>${escapeHtml(note.title)}</h3>
          <div class="internal-note-content-v11">${escapeHtml(preview)}</div>

          <div class="internal-actions-v11">
            <button class="primary-btn mini-btn" data-edit-internal="${escapeHtml(note.id)}" type="button">Bearbeiten</button>
            <button class="secondary-btn mini-btn" data-copy-internal="${escapeHtml(note.id)}" type="button">Kopieren</button>
            <button class="danger-btn mini-btn" data-delete-internal="${escapeHtml(note.id)}" type="button">Löschen</button>
          </div>
        </article>
      `;
    }).join("")
    : `<article class="internal-note-card-v11 empty-internal-v11"><h3>Noch keine internen Informationen</h3><p>Lege Regeln, Rollen, Hinweise, Pläne oder Bündnisse an. Über Suche und Kategorie findest du sie später schnell wieder.</p></article>`;

  list.querySelectorAll("[data-edit-internal]").forEach((button) => {
    button.addEventListener("click", () => {
      const note = internalCache.find((entry) => entry.id === button.dataset.editInternal);
      if (note) loadInternalIntoForm(note);
    });
  });

  list.querySelectorAll("[data-copy-internal]").forEach((button) => {
    button.addEventListener("click", async () => {
      const note = internalCache.find((entry) => entry.id === button.dataset.copyInternal);
      if (!note) return;
      const text = [note.title, note.category ? `Kategorie: ${note.category}` : "", note.content || ""].filter(Boolean).join("\n");
      try {
        await navigator.clipboard.writeText(text);
        setInternalMessage("Interne Information wurde kopiert.", "success");
      } catch (error) {
        setInternalMessage("Kopieren wurde vom Browser blockiert.", "error");
      }
    });
  });

  list.querySelectorAll("[data-delete-internal]").forEach((button) => {
    button.addEventListener("click", () => deleteInternalNote(button.dataset.deleteInternal));
  });
}

function loadInternalIntoForm(note) {
  if (!note) return;
  $("internalId").value = note.id || "";
  $("internalTitle").value = note.title || "";
  $("internalCategory").value = note.category || "Allgemein";
  $("internalContent").value = note.content || "";
  setText("internalSaveButtonText", "Änderungen speichern");
  setText("internalEditorTitle", "Interne Information bearbeiten");
  $("cancelInternalEditBtn")?.classList.remove("hidden");
  setInternalMessage("Bearbeitungsmodus aktiv.", "neutral");
  setTimeout(() => $("internalTitle")?.focus(), 80);
}

function clearInternalForm() {
  if ($("internalId")) $("internalId").value = "";
  if ($("internalTitle")) $("internalTitle").value = "";
  if ($("internalCategory")) $("internalCategory").value = "Allgemein";
  if ($("internalContent")) $("internalContent").value = "";
  setText("internalSaveButtonText", "Information speichern");
  setText("internalEditorTitle", "Interne Information anlegen");
  $("cancelInternalEditBtn")?.classList.add("hidden");
}

function setInternalMessage(message, type) {
  const el = $("internalSaveInfo");
  if (!el) return;
  el.textContent = message;
  el.style.color = type === "success" ? "#b8ffca" : type === "error" ? "#ff9ca1" : "#f2d796";
}

function clearInternalSearch() {
  internalSearchQuery = "";
  internalCategoryFilter = "Alle";
  internalSortMode = "newest";
  if ($("internalSearchInput")) $("internalSearchInput").value = "";
  if ($("internalCategoryFilter")) $("internalCategoryFilter").value = "Alle";
  if ($("internalSortSelect")) $("internalSortSelect").value = "newest";
  renderInternal();
}

function exportInternalCsv() {
  const notes = getVisibleInternalNotes();
  const rows = [["Überschrift", "Kategorie", "Information", "Erstellt", "Bearbeitet"]];
  notes.forEach((note) => rows.push([note.title, note.category, note.content, note.createdAt, note.updatedAt]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell || "").replaceAll('"', '""')}"`).join(";")).join("\n");
  downloadTextFile(`ashborn_intern_${new Date().toISOString().slice(0, 10)}.csv`, "\ufeff" + csv, "text/csv;charset=utf-8");
}

async function deleteInternalNote(id) {
  if (!id || isBusy) return;
  if (!confirm("Diese interne Information wirklich löschen?")) return;
  try {
    setBusy(true, "Information wird gelöscht...");
    const { error } = await supabaseClient.from("internal_notes").delete().eq("id", id);
    if (error) throw error;
    clearInternalForm();
    await loadInternalNotes();
    renderInternal();
    setInternalMessage("Interne Information wurde gelöscht.", "success");
  } catch (error) {
    setInternalMessage(`Information konnte nicht gelöscht werden: ${error.message || error}`, "error");
  } finally {
    setBusy(false);
  }
}

async function clearInternalNotes() {
  if (!confirm("Alle internen Informationen löschen?")) return;
  try {
    setBusy(true, "Interne Informationen werden gelöscht...");
    const { error } = await supabaseClient.from("internal_notes").delete().not("id", "is", null);
    if (error) throw error;
    clearInternalForm();
    await loadInternalNotes();
    renderInternal();
    setInternalMessage("Interne Informationen wurden gelöscht.", "success");
  } catch (error) {
    setInternalMessage(`Interne Informationen konnten nicht gelöscht werden: ${error.message || error}`, "error");
  } finally {
    setBusy(false);
  }
}

async function loadCashEntries() {
  const { data, error } = await supabaseClient.from("accounting_transactions").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  cashCache = (data || []).map((row) => ({
    id: row.id,
    type: row.transaction_type,
    amount: Number(row.amount || 0),
    reason: row.reason || "",
    createdAtRaw: row.created_at,
    createdAt: formatDate(row.created_at)
  }));
}

async function saveCashEntry() {
  if (isBusy) return;
  const type = $("cashType").value === "withdraw" ? "auszahlung" : "einzahlung";
  const amount = Number($("cashAmount").value || 0);
  const reason = $("cashReason").value.trim();
  if (amount <= 0) return alert("Bitte einen Betrag größer als 0 eintragen.");
  if (!reason) return alert("Bitte eine Begründung eintragen.");
  try {
    setBusy(true, "Buchung wird gespeichert...");
    const { error } = await supabaseClient.from("accounting_transactions").insert({
      transaction_type: type,
      amount,
      reason,
      created_by: sessionUser?.id || null
    });
    if (error) throw error;
    $("cashAmount").value = "";
    $("cashReason").value = "";
    await loadCashEntries();
    renderCash();
  } catch (error) {
    alert(`Buchung konnte nicht gespeichert werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

function getVisibleCashEntries() {
  const now = Date.now();
  const rangeDays = cashRangeFilter === "7" ? 7 : cashRangeFilter === "30" ? 30 : cashRangeFilter === "90" ? 90 : null;
  let entries = [...cashCache];

  entries = entries.filter((entry) => {
    const matchesType = cashTypeFilter === "Alle" || entry.type === cashTypeFilter;
    const haystack = [entry.type, entry.amount, entry.reason, entry.createdAt].join(" ").toLowerCase();
    const matchesSearch = !cashSearchQuery || haystack.includes(cashSearchQuery);
    let matchesRange = true;

    if (rangeDays) {
      const time = new Date(entry.createdAtRaw || entry.createdAt).getTime();
      matchesRange = Number.isFinite(time) && now - time <= rangeDays * 24 * 60 * 60 * 1000;
    }

    return matchesType && matchesSearch && matchesRange;
  });

  entries.sort((a, b) => {
    if (cashSortMode === "oldest") return new Date(a.createdAtRaw) - new Date(b.createdAtRaw);
    if (cashSortMode === "amountAsc") return Number(a.amount || 0) - Number(b.amount || 0);
    if (cashSortMode === "amountDesc") return Number(b.amount || 0) - Number(a.amount || 0);
    return new Date(b.createdAtRaw) - new Date(a.createdAtRaw);
  });

  return entries;
}

function calculateCashBalance(entries = []) {
  const deposits = entries.filter((e) => e.type === "einzahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const withdraws = entries.filter((e) => e.type === "auszahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  return deposits - withdraws;
}

function renderCash() {
  const deposits = cashCache.filter((e) => e.type === "einzahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const withdraws = cashCache.filter((e) => e.type === "auszahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const visibleEntries = getVisibleCashEntries();
  const visibleDeposits = visibleEntries.filter((e) => e.type === "einzahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const visibleWithdraws = visibleEntries.filter((e) => e.type === "auszahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);

  setText("currentBalance", formatMoney(deposits - withdraws));
  setText("depositTotal", formatMoney(deposits));
  setText("withdrawTotal", formatMoney(withdraws));
  setText("cashBookingCount", String(cashCache.length));
  setText("cashFilteredBalance", formatMoney(visibleDeposits - visibleWithdraws));

  const list = $("cashList");
  if (!list) return;
  list.innerHTML = visibleEntries.length
    ? visibleEntries.map((entry) => {
      const isStorno = String(entry.reason || "").trim().toUpperCase().startsWith("STORNO");
      return `
      <div class="price-row cash-row ${isStorno ? "cash-row-storno" : ""}" data-cash-id="${escapeHtml(entry.id)}">
        <div>
          <strong>${entry.type === "einzahlung" ? "Einzahlung" : "Auszahlung"} · ${escapeHtml(entry.createdAt)}</strong>
          <span>${escapeHtml(entry.reason)}</span>
          <small>Buchungs-ID: ${escapeHtml(String(entry.id || "").slice(0, 8))}${isStorno ? " · Gegenbuchung" : ""}</small>
        </div>
        <div class="cash-row-actions">
          <div class="price-value ${entry.type === "auszahlung" ? "negative" : "positive"}">${entry.type === "auszahlung" ? "-" : "+"}${formatMoney(entry.amount)}</div>
          ${isStorno
            ? `<span class="storno-badge">STORNIERT</span>`
            : `<button class="danger-btn mini-btn cash-storno-btn" data-reverse-cash="${escapeHtml(entry.id)}" type="button">Buchung stornieren</button>`}
        </div>
      </div>`;
    }).join("")
    : `<div class="price-row"><div><strong>Keine Buchungen gefunden</strong><span>Ändere Suche, Filter oder Zeitraum.</span></div></div>`;
}

async function reverseCashEntry(id) {
  if (!id || isBusy) return;
  const entry = cashCache.find((item) => item.id === id);
  if (!entry) return;
  if (String(entry.reason || "").trim().toUpperCase().startsWith("STORNO")) {
    alert("Diese Buchung ist bereits eine Storno-Gegenbuchung und kann nicht erneut storniert werden.");
    return;
  }
  const reverseType = entry.type === "einzahlung" ? "auszahlung" : "einzahlung";
  const label = entry.type === "einzahlung" ? "Einzahlung" : "Auszahlung";
  const reverseLabel = reverseType === "einzahlung" ? "Einzahlung" : "Auszahlung";
  if (!confirm(`${label} über ${formatMoney(entry.amount)} wirklich stornieren?

Es wird automatisch eine neue Gegenbuchung als ${reverseLabel} erstellt. Die ursprüngliche Buchung bleibt im Verlauf sichtbar.`)) return;

  try {
    setBusy(true, "Storno wird gespeichert...");
    const { error } = await supabaseClient.from("accounting_transactions").insert({
      transaction_type: reverseType,
      amount: Number(entry.amount || 0),
      reason: `STORNO zu ${label} vom ${entry.createdAt}: ${entry.reason}`,
      created_by: sessionUser?.id || null
    });
    if (error) throw error;
    await loadCashEntries();
    renderCash();
  } catch (error) {
    alert(`Storno konnte nicht gespeichert werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

function exportCashCsv() {
  const entries = getVisibleCashEntries();
  if (!entries.length) return alert("Keine Buchungen zum Exportieren vorhanden.");
  const rows = [["Datum", "Art", "Betrag", "Begründung", "Buchungs-ID"]];
  entries.forEach((entry) => rows.push([
    entry.createdAt,
    entry.type === "einzahlung" ? "Einzahlung" : "Auszahlung",
    String(entry.amount).replace(".", ","),
    entry.reason,
    entry.id
  ]));
  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
  downloadTextFile(`ashborn-buchhaltung-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}

async function clearCashEntries() {
  if (!confirm("Buchhaltung wirklich leeren?")) return;
  try {
    setBusy(true, "Buchhaltung wird geleert...");
    const { error } = await supabaseClient.from("accounting_transactions").delete().not("id", "is", null);
    if (error) throw error;
    await loadCashEntries();
    renderCash();
  } catch (error) {
    alert(`Buchhaltung konnte nicht geleert werden. Eventuell fehlt noch die Delete-Policy: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

async function clearAllData() {
  if (!confirm("Wirklich ALLE Ashborn-Daten in Supabase löschen?")) return;
  const confirmation = prompt("Zur Sicherheit bitte ASHBORN eingeben, um alle Systemdaten zu löschen:");
  if (confirmation !== "ASHBORN") {
    alert("Löschung abgebrochen. Bestätigung war nicht korrekt.");
    return;
  }

  try {
    setBusy(true, "Systemdaten werden gelöscht...");
    const tables = ["ashborn_entries", "price_sale", "price_purchase", "internal_notes", "accounting_transactions"];
    for (const table of tables) {
      const { error } = await supabaseClient.from(table).delete().not("id", "is", null);
      if (error) throw error;
    }
    recordsCache = [];
    sellPricesCache = [];
    buyPricesCache = [];
    internalCache = [];
    cashCache = [];
    clearRecordForm();
    renderAll();
  } catch (error) {
    alert(`Nicht alles konnte gelöscht werden: ${error.message || error}`);
  } finally {
    setBusy(false);
  }
}

function downloadTextFile(filename, content, mimeType = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportData() {
  const data = {
    records: recordsCache,
    sellPrices: sellPricesCache,
    buyPrices: buyPricesCache,
    internal: internalCache,
    cash: cashCache,
    exportedAt: new Date().toISOString()
  };
  downloadTextFile(`ashborn-export-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2), "application/json;charset=utf-8");
}

function exportAllCsv() {
  const rows = [
    ["Bereich", "Name/Titel", "Kategorie/Typ", "Wert", "Beschreibung/Grund", "Erstellt"],
    ...recordsCache.map((entry) => ["Aktensystem", entry.name, entry.type, entry.find_location || entry.telegram_number || "", entry.description || "", formatDate(entry.created_at)]),
    ...sellPricesCache.map((entry) => ["Verkauf", entry.item_name, entry.category || "", formatMoney(entry.price), entry.note || "", formatDate(entry.created_at)]),
    ...buyPricesCache.map((entry) => ["Kauf", entry.item_name, entry.category || "", formatMoney(entry.price), entry.note || "", formatDate(entry.created_at)]),
    ...internalCache.map((entry) => ["Intern", entry.title, entry.category || "", "", entry.content || "", formatDate(entry.created_at)]),
    ...cashCache.map((entry) => ["Buchhaltung", entry.transaction_type, "", formatMoney(entry.amount), entry.reason || "", formatDate(entry.created_at)])
  ];

  const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
  downloadTextFile(`ashborn-gesamt-export-${new Date().toISOString().slice(0, 10)}.csv`, "﻿" + csv, "text/csv;charset=utf-8");
}

function setBusy(state, message = "") {
  isBusy = state;
  if (loginBtn) loginBtn.disabled = state;
  const saveRecordBtn = $("saveRecordBtn");
  if (saveRecordBtn) saveRecordBtn.disabled = state;
  if (message) console.log(message);
}

function setText(id, value) {
  const el = $(id);
  if (el) el.textContent = String(value);
}

function setRecordMessage(message, type) {
  const el = $("recordSaveInfo");
  if (!el) return;
  el.textContent = message;
  el.style.color = type === "success" ? "#b8ffca" : type === "error" ? "#ff9ca1" : "#f2d796";
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}

function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("de-DE", { maximumFractionDigits: 2 })} $`;
}

function formatDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("de-DE");
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function createStatusClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("person")) return "status-geheim";
  if (normalized.includes("organisation")) return "status-beobachtung";
  if (normalized.includes("route")) return "status-beobachtung";
  if (normalized.includes("ort")) return "status-archiviert";
  return "";
}

function sanitizeFileName(value) {
  return String(value || "bild").toLowerCase().replace(/[^a-z0-9-_]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "bild";
}

function getFileExtension(filename) {
  const match = String(filename || "").match(/\.[a-zA-Z0-9]+$/);
  return match ? match[0].toLowerCase() : ".jpg";
}

function startAmbientEmbers() {
  const emberLayer = document.querySelector(".bg-embers");
  if (!emberLayer || prefersReducedMotion) return;
  setInterval(() => {
    const ember = document.createElement("span");
    ember.className = "ember-particle";
    ember.style.setProperty("--ember-left", `${Math.random() * 100}%`);
    ember.style.setProperty("--ember-size", `${2 + Math.random() * 4}px`);
    ember.style.setProperty("--ember-duration", `${6 + Math.random() * 7}s`);
    ember.style.setProperty("--ember-drift", `${-40 + Math.random() * 80}px`);
    emberLayer.appendChild(ember);
    setTimeout(() => ember.remove(), 14000);
  }, 620);
}

function bindHeroParallax() {
  const scene = document.querySelector(".bg-scene");
  if (!scene || prefersReducedMotion) return;
  window.addEventListener("pointermove", (event) => {
    const x = (event.clientX / window.innerWidth - 0.5) * 1.6;
    const y = (event.clientY / window.innerHeight - 0.5) * 1.6;
    scene.style.transform = `scale(1.035) translate3d(${x}%, ${y}%, 0)`;
  }, { passive: true });
}
