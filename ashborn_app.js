const SYSTEM_PASSWORD = "Zwerg";
const SESSION_KEY = "ashborn_logged_in";
const STORAGE = {
  records: "ashborn_records_v2",
  sellPrices: "ashborn_sell_prices_v1",
  buyPrices: "ashborn_buy_prices_v1",
  internal: "ashborn_internal_v1",
  cash: "ashborn_cash_v1"
};

let activeRecordFilter = "Alle";
let currentRecordId = null;
let pendingImages = [];

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

document.addEventListener("DOMContentLoaded", () => {
  if (sessionStorage.getItem(SESSION_KEY) === "true") {
    landingPage.classList.add("hidden");
    aktenSystem.classList.remove("hidden");
  }

  renderAll();
  startAmbientEmbers();
  bindHeroParallax();
});

on(logoButton, "click", showLogin);
on(landingLoginBtn, "click", showLogin);
on(closeLoginBtn, "click", hideLogin);
on(loginBtn, "click", login);
on(passwordInput, "keydown", (event) => {
  if (event.key === "Enter") login();
  if (event.key === "Escape") hideLogin();
});

on(logoutBtn, "click", () => {
  sessionStorage.removeItem(SESSION_KEY);
  closeDetail();
  aktenSystem.classList.add("hidden");
  landingPage.classList.remove("hidden");
  hideLogin();
});

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    switchTab(button.dataset.tab);
    renderAll();
  });
});

recordFilterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeRecordFilter = button.dataset.recordFilter;
    recordFilterButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.recordFilter === activeRecordFilter));
    renderRecords();
  });
});

on($("recordSearchInput"), "input", renderRecords);
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
    const record = getRecords().find((item) => item.id === editBtn.dataset.editRecord);
    if (record) loadRecordIntoForm(record);
    return;
  }

  if (deleteBtn) {
    event.stopPropagation();
    deleteRecord(deleteBtn.dataset.deleteRecord);
    return;
  }

  if (card && card.dataset.id && !card.disabled) {
    const record = getRecords().find((item) => item.id === card.dataset.id);
    if (record) openDetail(record);
  }
});

on($("detailBackdrop"), "click", closeDetail);
on($("closeDetailBtn"), "click", closeDetail);
on($("editRecordBtn"), "click", () => {
  const record = getRecords().find((item) => item.id === currentRecordId);
  if (record) {
    closeDetail();
    loadRecordIntoForm(record);
  }
});
on($("deleteRecordBtn"), "click", () => deleteRecord(currentRecordId));

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("detailModal").classList.contains("hidden")) return closeDetail();
  if (loginBox.classList.contains("show")) hideLogin();
});

setupPriceModule("sell");
setupPriceModule("buy");
on($("saveInternalBtn"), "click", saveInternalNote);
on($("clearInternalBtn"), "click", () => {
  if (!confirm("Alle internen Informationen löschen?")) return;
  localStorage.removeItem(STORAGE.internal);
  renderInternal();
});
on($("saveCashBtn"), "click", saveCashEntry);
on($("clearCashBtn"), "click", () => {
  if (!confirm("Buchhaltung wirklich leeren?")) return;
  localStorage.removeItem(STORAGE.cash);
  renderCash();
});
on($("clearAllDataBtn"), "click", clearAllData);
on($("exportDataBtn"), "click", exportData);

function showLogin() {
  loginError.textContent = "";
  landingPage.classList.add("login-open");
  loginBox.classList.add("show");
  loginBox.setAttribute("aria-hidden", "false");
  setTimeout(() => passwordInput.focus(), 120);
}

function hideLogin() {
  landingPage.classList.remove("login-open");
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
      renderAll();
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
  setTimeout(callback, 320);
  setTimeout(() => smokeTransition.classList.remove("active"), 920);
}

function switchTab(tabId) {
  tabButtons.forEach((button) => button.classList.toggle("active", button.dataset.tab === tabId));
  tabContents.forEach((content) => content.classList.toggle("active", content.id === tabId));
}

function renderAll() {
  renderRecords();
  renderPriceModule("sell");
  renderPriceModule("buy");
  renderInternal();
  renderCash();
}

function saveRecord() {
  const name = recordFields.name.value.trim();
  if (!name) {
    setRecordMessage("Bitte mindestens den Namen eintragen.", "error");
    recordFields.name.focus();
    return;
  }

  const records = getRecords();
  const id = recordFields.id.value.trim();
  const payload = {
    name,
    type: recordFields.type.value,
    location: recordFields.location.value.trim(),
    telegram: recordFields.telegram.value.trim(),
    description: recordFields.description.value.trim(),
    images: pendingImages,
    updatedAt: new Date().toLocaleString("de-DE")
  };

  if (id) {
    const index = records.findIndex((item) => item.id === id);
    if (index === -1) {
      setRecordMessage("Dieser Datensatz konnte nicht gefunden werden.", "error");
      return;
    }
    records[index] = { ...records[index], ...payload };
    saveRecords(records);
    clearRecordForm();
    setRecordMessage("Datensatz wurde aktualisiert.", "success");
    renderRecords();
    return;
  }

  records.unshift({ id: createId(), ...payload, createdAt: new Date().toLocaleString("de-DE") });
  saveRecords(records);
  clearRecordForm();
  setRecordMessage("Datensatz wurde gespeichert.", "success");
  renderRecords();
}

function loadRecordIntoForm(record) {
  recordFields.id.value = record.id || "";
  recordFields.name.value = record.name || "";
  recordFields.type.value = record.type || "";
  recordFields.location.value = record.location || "";
  recordFields.telegram.value = record.telegram || "";
  recordFields.description.value = record.description || "";
  pendingImages = Array.isArray(record.images) ? record.images : [];
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

function handleImageSelection(event) {
  const files = Array.from(event.target.files || []);
  if (!files.length) return;

  Promise.all(files.map(fileToDataUrl)).then((images) => {
    pendingImages = [...pendingImages, ...images];
    renderImagePreview();
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, src: reader.result });
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
      <img src="${image.src}" alt="${escapeHtml(image.name || "Bild")}" />
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
  const records = getRecords();
  const query = ($("recordSearchInput")?.value || "").trim().toLowerCase();
  const filtered = records.filter((record) => {
    const matchesType = activeRecordFilter === "Alle" || record.type === activeRecordFilter;
    const haystack = [record.name, record.type, record.location, record.telegram, record.description, record.createdAt, record.updatedAt].join(" ").toLowerCase();
    return matchesType && haystack.includes(query);
  });

  setText("totalRecordsCount", records.length);
  setText("filteredRecordsCount", filtered.length);
  setText("imageRecordsCount", records.filter((item) => Array.isArray(item.images) && item.images.length).length);

  if (!filtered.length) {
    list.innerHTML = `<button class="akten-card" type="button" disabled><div class="folder-chip-row"><span class="folder-chip">Keine Daten</span><span class="folder-chip">0 Treffer</span></div><h3>Keine Einträge gefunden</h3><p>Erstelle einen neuen Datensatz oder ändere deine Suche.</p></button>`;
    return;
  }

  list.innerHTML = filtered.map((record) => `
    <button class="akten-card" type="button" data-id="${escapeHtml(record.id)}">
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
    </button>
  `).join("");
}

function openDetail(record) {
  currentRecordId = record.id;
  setText("detailTitle", record.name || "-");
  setText("detailType", record.type || "Nicht festgelegt");
  setText("detailLocation", record.location || "-");
  setText("detailTelegram", record.telegram || "-");
  setText("detailDescription", record.description || "Keine Beschreibung eingetragen.");
  const images = Array.isArray(record.images) ? record.images : [];
  $("detailImages").innerHTML = images.length
    ? images.map((img) => `<a href="${img.src}" target="_blank" rel="noopener"><img src="${img.src}" alt="${escapeHtml(img.name || "Bild")}" /></a>`).join("")
    : `<p class="system-text">Keine Bilder hinterlegt.</p>`;
  $("detailModal").classList.remove("hidden");
}

function closeDetail() {
  currentRecordId = null;
  $("detailModal").classList.add("hidden");
}

function deleteRecord(id) {
  if (!id) return;
  const record = getRecords().find((item) => item.id === id);
  if (!record) return;
  if (!confirm(`Datensatz "${record.name}" wirklich löschen?`)) return;
  saveRecords(getRecords().filter((item) => item.id !== id));
  closeDetail();
  clearRecordForm();
  renderRecords();
}

function setupPriceModule(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  on($(`${prefix}PriceForm`), "submit", (event) => {
    event.preventDefault();
    savePriceItem(type);
  });
  on($(`${prefix}CalculatorItem`), "change", () => updateCalculator(type));
  on($(`${prefix}CalculatorQty`), "input", () => updateCalculator(type));
  on($(`clear${capitalize(prefix)}PricesBtn`), "click", () => {
    if (!confirm("Diese Preisliste wirklich leeren?")) return;
    localStorage.removeItem(type === "sell" ? STORAGE.sellPrices : STORAGE.buyPrices);
    renderPriceModule(type);
  });
}

function savePriceItem(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const name = $(`${prefix}ItemName`).value.trim();
  const price = Number($(`${prefix}ItemPrice`).value || 0);
  const unit = $(`${prefix}ItemUnit`).value.trim();
  const note = $(`${prefix}ItemNote`).value.trim();

  if (!name || price <= 0) {
    alert("Bitte Artikel und Preis eintragen.");
    return;
  }

  const items = getPriceItems(type);
  items.unshift({ id: createId(), name, price, unit, note, createdAt: new Date().toLocaleString("de-DE") });
  savePriceItems(type, items);
  $(`${prefix}PriceForm`).reset();
  renderPriceModule(type);
}

function renderPriceModule(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = getPriceItems(type);
  const list = $(`${prefix}PriceList`);
  const select = $(`${prefix}CalculatorItem`);
  if (!list || !select) return;

  select.innerHTML = items.length
    ? items.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} — ${formatMoney(item.price)}</option>`).join("")
    : `<option value="">Keine Artikel vorhanden</option>`;

  list.innerHTML = items.length
    ? items.map((item) => `
      <div class="price-row">
        <div><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.unit || "Keine Einheit")} ${item.note ? `· ${escapeHtml(item.note)}` : ""}</span></div>
        <div class="price-value">${formatMoney(item.price)}</div>
        <button class="danger-btn mini-btn" type="button" data-delete-price="${escapeHtml(item.id)}">Löschen</button>
      </div>
    `).join("")
    : `<div class="price-row"><div><strong>Noch keine Artikel</strong><span>Lege jetzt die erste Position an.</span></div></div>`;

  list.querySelectorAll("[data-delete-price]").forEach((button) => {
    button.addEventListener("click", () => {
      savePriceItems(type, items.filter((item) => item.id !== button.dataset.deletePrice));
      renderPriceModule(type);
    });
  });
  updateCalculator(type);
}

function updateCalculator(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = getPriceItems(type);
  const selectedId = $(`${prefix}CalculatorItem`)?.value;
  const qty = Number($(`${prefix}CalculatorQty`)?.value || 0);
  const item = items.find((entry) => entry.id === selectedId);
  setText(`${prefix}CalculatorResult`, item ? formatMoney(item.price * qty) : "0 $");
}

function saveInternalNote() {
  const title = $("internalTitle").value.trim();
  const content = $("internalContent").value.trim();
  if (!title && !content) return alert("Bitte Überschrift oder Information eintragen.");
  const notes = readJson(STORAGE.internal, []);
  notes.unshift({ id: createId(), title: title || "Interne Information", content, createdAt: new Date().toLocaleString("de-DE") });
  writeJson(STORAGE.internal, notes);
  $("internalTitle").value = "";
  $("internalContent").value = "";
  renderInternal();
}

function renderInternal() {
  const list = $("internalList");
  if (!list) return;
  const notes = readJson(STORAGE.internal, []);
  list.innerHTML = notes.length
    ? notes.map((note) => `<article class="akten-card static-card"><div class="folder-chip-row"><span class="folder-chip">${escapeHtml(note.createdAt)}</span></div><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.content || "Keine Beschreibung")}</p><div class="card-actions"><button class="danger-btn mini-btn" data-delete-internal="${escapeHtml(note.id)}" type="button">Löschen</button></div></article>`).join("")
    : `<article class="akten-card static-card"><h3>Noch keine internen Informationen</h3><p>Hier kannst du später Regeln, Hinweise oder wichtige Ashborn-Infos sammeln.</p></article>`;
  list.querySelectorAll("[data-delete-internal]").forEach((button) => {
    button.addEventListener("click", () => {
      writeJson(STORAGE.internal, notes.filter((note) => note.id !== button.dataset.deleteInternal));
      renderInternal();
    });
  });
}

function saveCashEntry() {
  const type = $("cashType").value;
  const amount = Number($("cashAmount").value || 0);
  const reason = $("cashReason").value.trim();
  if (amount <= 0) return alert("Bitte einen Betrag größer als 0 eintragen.");
  if (!reason) return alert("Bitte eine Begründung eintragen.");
  const entries = readJson(STORAGE.cash, []);
  entries.unshift({ id: createId(), type, amount, reason, createdAt: new Date().toLocaleString("de-DE") });
  writeJson(STORAGE.cash, entries);
  $("cashAmount").value = "";
  $("cashReason").value = "";
  renderCash();
}

function renderCash() {
  const entries = readJson(STORAGE.cash, []);
  const deposits = entries.filter((e) => e.type === "deposit").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const withdraws = entries.filter((e) => e.type === "withdraw").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  setText("currentBalance", formatMoney(deposits - withdraws));
  setText("depositTotal", formatMoney(deposits));
  setText("withdrawTotal", formatMoney(withdraws));
  const list = $("cashList");
  if (!list) return;
  list.innerHTML = entries.length
    ? entries.map((entry) => `<div class="price-row"><div><strong>${entry.type === "deposit" ? "Einzahlung" : "Auszahlung"} · ${escapeHtml(entry.createdAt)}</strong><span>${escapeHtml(entry.reason)}</span></div><div class="price-value ${entry.type === "withdraw" ? "negative" : "positive"}">${entry.type === "withdraw" ? "-" : "+"}${formatMoney(entry.amount)}</div></div>`).join("")
    : `<div class="price-row"><div><strong>Noch keine Buchungen</strong><span>Einzahlungen und Auszahlungen erscheinen hier.</span></div></div>`;
}

function clearAllData() {
  if (!confirm("Wirklich ALLE lokalen Ashborn-Daten löschen?")) return;
  Object.values(STORAGE).forEach((key) => localStorage.removeItem(key));
  clearRecordForm();
  renderAll();
}

function exportData() {
  const data = {
    records: getRecords(),
    sellPrices: getPriceItems("sell"),
    buyPrices: getPriceItems("buy"),
    internal: readJson(STORAGE.internal, []),
    cash: readJson(STORAGE.cash, []),
    exportedAt: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashborn-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function getRecords() { return readJson(STORAGE.records, []); }
function saveRecords(records) { writeJson(STORAGE.records, records); }
function getPriceItems(type) { return readJson(type === "sell" ? STORAGE.sellPrices : STORAGE.buyPrices, []); }
function savePriceItems(type, items) { writeJson(type === "sell" ? STORAGE.sellPrices : STORAGE.buyPrices, items); }
function readJson(key, fallback) {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return Array.isArray(value) ? value : fallback;
  } catch (_) {
    return fallback;
  }
}
function writeJson(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function setText(id, value) { const el = $(id); if (el) el.textContent = String(value); }
function setRecordMessage(message, type) {
  const el = $("recordSaveInfo");
  if (!el) return;
  el.textContent = message;
  el.style.color = type === "success" ? "#b8ffca" : type === "error" ? "#ff9ca1" : "#f2d796";
}
function createId() { return `ash_${Date.now()}_${Math.random().toString(16).slice(2)}`; }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}
function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("de-DE", { maximumFractionDigits: 2 })} $`;
}
function capitalize(value) { return String(value).charAt(0).toUpperCase() + String(value).slice(1); }
function createStatusClass(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("person")) return "status-geheim";
  if (normalized.includes("route")) return "status-beobachtung";
  if (normalized.includes("ort")) return "status-archiviert";
  return "";
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
