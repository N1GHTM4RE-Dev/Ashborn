const SUPABASE_URL = "https://rclpgqrwcygjzqgeurie.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_2BWb4LK4GWC8-S4SVPIlvA_iX41QQqg";
const IMAGE_BUCKET = "ashborn-images";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let activeRecordFilter = "Alle";
let currentRecordId = null;
let pendingImages = [];
let recordsCache = [];
let sellPricesCache = [];
let buyPricesCache = [];
let internalCache = [];
let cashCache = [];
let currentUser = null;

const $ = (id) => document.getElementById(id);
const landingPage = $("landingPage");
const logoButton = $("logoButton");
const landingLoginBtn = $("landingLoginBtn");
const loginBox = $("loginBox");
const closeLoginBtn = $("closeLoginBtn");
const emailInput = $("emailInput");
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

window.addEventListener("unhandledrejection", (event) => {
  console.error(event.reason);
  showGlobalError("Es ist ein Datenbankfehler aufgetreten. Bitte Konsole prüfen.");
});

document.addEventListener("DOMContentLoaded", async () => {
  const { data } = await sb.auth.getSession();
  currentUser = data.session?.user || null;

  if (currentUser) {
    landingPage.classList.add("hidden");
    aktenSystem.classList.remove("hidden");
    await loadAllData();
  }

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
on(emailInput, "keydown", (event) => {
  if (event.key === "Enter") login();
  if (event.key === "Escape") hideLogin();
});

on(logoutBtn, "click", async () => {
  await sb.auth.signOut();
  currentUser = null;
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

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  if (!$("detailModal").classList.contains("hidden")) return closeDetail();
  if (loginBox.classList.contains("show")) hideLogin();
});

setupPriceModule("sell");
setupPriceModule("buy");
on($("saveInternalBtn"), "click", saveInternalNote);
on($("clearInternalBtn"), "click", clearInternalNotes);
on($("saveCashBtn"), "click", saveCashEntry);
on($("clearCashBtn"), "click", () => alert("Aus Sicherheitsgründen wird die Buchhaltung nicht geleert. Erstelle stattdessen eine Gegenbuchung."));
on($("clearAllDataBtn"), "click", clearSystemData);
on($("exportDataBtn"), "click", exportData);

function showLogin() {
  loginError.textContent = "";
  landingPage.classList.add("login-open");
  loginBox.classList.add("show");
  loginBox.setAttribute("aria-hidden", "false");
  setTimeout(() => emailInput?.focus(), 120);
}

function hideLogin() {
  landingPage.classList.remove("login-open");
  loginBox.classList.remove("show");
  loginBox.setAttribute("aria-hidden", "true");
  loginError.textContent = "";
  if (passwordInput) passwordInput.value = "";
}

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value.trim();

  if (!email || !password) {
    loginError.textContent = "Bitte E-Mail und Kennwort eintragen.";
    return;
  }

  loginBtn.disabled = true;
  loginError.textContent = "Zugang wird geprüft...";

  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  loginBtn.disabled = false;

  if (error) {
    loginError.textContent = "Login fehlgeschlagen. Prüfe E-Mail und Kennwort.";
    passwordInput.value = "";
    passwordInput.focus();
    loginBox.classList.remove("shake");
    void loginBox.offsetWidth;
    loginBox.classList.add("shake");
    return;
  }

  currentUser = data.user;
  loginError.textContent = "";
  await loadAllData();

  playSmokeTransition(() => {
    landingPage.classList.add("hidden");
    aktenSystem.classList.remove("hidden");
    hideLogin();
    renderAll();
  });
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
  await Promise.all([loadRecords(), loadPrices("sell"), loadPrices("buy"), loadInternal(), loadCash()]);
  renderAll();
}

function renderAll() {
  renderRecords();
  renderPriceModule("sell");
  renderPriceModule("buy");
  renderInternal();
  renderCash();
}

async function loadRecords() {
  const { data, error } = await sb.from("ashborn_entries").select("*").order("created_at", { ascending: false });
  if (error) return showGlobalError(error.message);
  recordsCache = (data || []).map(dbRecordToUi);
}

function dbRecordToUi(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type || "",
    location: row.find_location || "",
    telegram: row.telegram_number || "",
    description: row.description || "",
    images: Array.isArray(row.images) ? row.images : [],
    createdAt: formatDate(row.created_at),
    updatedAt: row.updated_at && row.updated_at !== row.created_at ? formatDate(row.updated_at) : ""
  };
}

async function saveRecord() {
  const name = recordFields.name.value.trim();
  if (!name) {
    setRecordMessage("Bitte mindestens den Namen eintragen.", "error");
    recordFields.name.focus();
    return;
  }

  const id = recordFields.id.value.trim();
  setRecordMessage("Speichere Daten...", "neutral");

  const uploadedImages = await uploadPendingImages(id || crypto.randomUUID());
  const allImages = pendingImages.filter((img) => img.path).concat(uploadedImages);

  const payload = {
    name,
    type: recordFields.type.value || null,
    find_location: recordFields.location.value.trim() || null,
    telegram_number: recordFields.telegram.value.trim() || null,
    description: recordFields.description.value.trim() || null,
    images: allImages,
    updated_at: new Date().toISOString(),
    created_by: currentUser?.id || null
  };

  const result = id
    ? await sb.from("ashborn_entries").update(payload).eq("id", id)
    : await sb.from("ashborn_entries").insert(payload);

  if (result.error) {
    setRecordMessage(result.error.message, "error");
    return;
  }

  await loadRecords();
  clearRecordForm();
  setRecordMessage(id ? "Datensatz wurde aktualisiert." : "Datensatz wurde gespeichert.", "success");
  renderRecords();
}

async function uploadPendingImages(recordId) {
  const files = pendingImages.filter((img) => img.file instanceof File);
  const uploaded = [];

  for (const image of files) {
    const safeName = image.file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${recordId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
    const { error } = await sb.storage.from(IMAGE_BUCKET).upload(path, image.file, { upsert: false });
    if (error) {
      setRecordMessage(`Bild konnte nicht hochgeladen werden: ${error.message}`, "error");
      continue;
    }
    uploaded.push({ name: image.file.name, path });
  }

  return uploaded;
}

function loadRecordIntoForm(record) {
  recordFields.id.value = record.id || "";
  recordFields.name.value = record.name || "";
  recordFields.type.value = record.type || "";
  recordFields.location.value = record.location || "";
  recordFields.telegram.value = record.telegram || "";
  recordFields.description.value = record.description || "";
  pendingImages = Array.isArray(record.images) ? [...record.images] : [];
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
  const previews = files.map((file) => ({ name: file.name, file, preview: URL.createObjectURL(file) }));
  pendingImages = [...pendingImages, ...previews];
  renderImagePreview();
}

async function getSignedImageUrl(path) {
  if (!path) return "";
  const { data, error } = await sb.storage.from(IMAGE_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) return "";
  return data.signedUrl;
}

function renderImagePreview() {
  const preview = $("imagePreview");
  if (!preview) return;
  if (!pendingImages.length) {
    preview.innerHTML = `<p class="field-hint">Noch keine Bilder ausgewählt.</p>`;
    return;
  }
  preview.innerHTML = pendingImages.map((image, index) => `
    <div class="image-preview-item" data-image-preview-index="${index}">
      <div class="image-loading">Bild wird geladen...</div>
      <button type="button" class="danger-btn mini-btn" data-remove-image="${index}">Entfernen</button>
    </div>
  `).join("");
  preview.querySelectorAll("[data-remove-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const removed = pendingImages.splice(Number(button.dataset.removeImage), 1)[0];
      if (removed?.preview) URL.revokeObjectURL(removed.preview);
      renderImagePreview();
    });
  });
  pendingImages.forEach(async (image, index) => {
    const box = preview.querySelector(`[data-image-preview-index="${index}"]`);
    if (!box) return;
    const src = image.preview || await getSignedImageUrl(image.path);
    box.querySelector(".image-loading").outerHTML = src
      ? `<img src="${src}" alt="${escapeHtml(image.name || "Bild")}" />`
      : `<div class="image-loading">Bild nicht verfügbar</div>`;
  });
}

function renderRecords() {
  const list = $("recordList");
  if (!list) return;
  const query = ($("recordSearchInput")?.value || "").trim().toLowerCase();
  const filtered = recordsCache.filter((record) => {
    const matchesType = activeRecordFilter === "Alle" || record.type === activeRecordFilter;
    const haystack = [record.name, record.type, record.location, record.telegram, record.description, record.createdAt, record.updatedAt].join(" ").toLowerCase();
    return matchesType && haystack.includes(query);
  });

  setText("totalRecordsCount", recordsCache.length);
  setText("filteredRecordsCount", filtered.length);
  setText("imageRecordsCount", recordsCache.filter((item) => Array.isArray(item.images) && item.images.length).length);

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

async function openDetail(record) {
  currentRecordId = record.id;
  setText("detailTitle", record.name || "-");
  setText("detailType", record.type || "Nicht festgelegt");
  setText("detailLocation", record.location || "-");
  setText("detailTelegram", record.telegram || "-");
  setText("detailDescription", record.description || "Keine Beschreibung eingetragen.");
  const images = Array.isArray(record.images) ? record.images : [];
  $("detailImages").innerHTML = images.length ? `<p class="system-text">Bilder werden geladen...</p>` : `<p class="system-text">Keine Bilder hinterlegt.</p>`;
  if (images.length) {
    const html = [];
    for (const img of images) {
      const src = await getSignedImageUrl(img.path);
      if (src) html.push(`<a href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="${escapeHtml(img.name || "Bild")}" /></a>`);
    }
    $("detailImages").innerHTML = html.length ? html.join("") : `<p class="system-text">Bilder konnten nicht geladen werden.</p>`;
  }
  $("detailModal").classList.remove("hidden");
}

function closeDetail() {
  currentRecordId = null;
  $("detailModal").classList.add("hidden");
}

async function deleteRecord(id) {
  if (!id) return;
  const record = recordsCache.find((item) => item.id === id);
  if (!record) return;
  if (!confirm(`Datensatz "${record.name}" wirklich löschen?`)) return;
  const { error } = await sb.from("ashborn_entries").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadRecords();
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
  on($(`clear${capitalize(prefix)}PricesBtn`), "click", () => clearPrices(type));
}

async function loadPrices(type) {
  const table = type === "sell" ? "price_sale" : "price_purchase";
  const { data, error } = await sb.from(table).select("*").order("created_at", { ascending: false });
  if (error) return showGlobalError(error.message);
  const mapped = (data || []).map((row) => ({ id: row.id, name: row.item_name, category: row.category || "", price: Number(row.price || 0), unit: row.unit || "", note: row.note || "", createdAt: formatDate(row.created_at) }));
  if (type === "sell") sellPricesCache = mapped;
  else buyPricesCache = mapped;
}

async function savePriceItem(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const table = type === "sell" ? "price_sale" : "price_purchase";
  const name = $(`${prefix}ItemName`).value.trim();
  const price = Number($(`${prefix}ItemPrice`).value || 0);
  const unit = $(`${prefix}ItemUnit`).value.trim();
  const note = $(`${prefix}ItemNote`).value.trim();

  if (!name || price <= 0) return alert("Bitte Artikel und Preis eintragen.");

  const { error } = await sb.from(table).insert({ item_name: name, price, unit: unit || null, note: note || null });
  if (error) return alert(error.message);
  $(`${prefix}PriceForm`).reset();
  await loadPrices(type);
  renderPriceModule(type);
}

function renderPriceModule(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = type === "sell" ? sellPricesCache : buyPricesCache;
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
    button.addEventListener("click", () => deletePrice(type, button.dataset.deletePrice));
  });
  updateCalculator(type);
}

async function deletePrice(type, id) {
  const table = type === "sell" ? "price_sale" : "price_purchase";
  const { error } = await sb.from(table).delete().eq("id", id);
  if (error) return alert(error.message);
  await loadPrices(type);
  renderPriceModule(type);
}

async function clearPrices(type) {
  if (!confirm("Diese Preisliste wirklich leeren?")) return;
  const table = type === "sell" ? "price_sale" : "price_purchase";
  const { error } = await sb.from(table).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return alert(error.message);
  await loadPrices(type);
  renderPriceModule(type);
}

function updateCalculator(type) {
  const prefix = type === "sell" ? "sell" : "buy";
  const items = type === "sell" ? sellPricesCache : buyPricesCache;
  const selectedId = $(`${prefix}CalculatorItem`)?.value;
  const qty = Number($(`${prefix}CalculatorQty`)?.value || 0);
  const item = items.find((entry) => entry.id === selectedId);
  setText(`${prefix}CalculatorResult`, item ? formatMoney(item.price * qty) : "0 $");
}

async function loadInternal() {
  const { data, error } = await sb.from("internal_notes").select("*").order("created_at", { ascending: false });
  if (error) return showGlobalError(error.message);
  internalCache = (data || []).map((row) => ({ id: row.id, title: row.title, content: row.content || "", createdAt: formatDate(row.created_at) }));
}

async function saveInternalNote() {
  const title = $("internalTitle").value.trim();
  const content = $("internalContent").value.trim();
  if (!title && !content) return alert("Bitte Überschrift oder Information eintragen.");
  const { error } = await sb.from("internal_notes").insert({ title: title || "Interne Information", content: content || null, created_by: currentUser?.id || null });
  if (error) return alert(error.message);
  $("internalTitle").value = "";
  $("internalContent").value = "";
  await loadInternal();
  renderInternal();
}

function renderInternal() {
  const list = $("internalList");
  if (!list) return;
  list.innerHTML = internalCache.length
    ? internalCache.map((note) => `<article class="akten-card static-card"><div class="folder-chip-row"><span class="folder-chip">${escapeHtml(note.createdAt)}</span></div><h3>${escapeHtml(note.title)}</h3><p>${escapeHtml(note.content || "Keine Beschreibung")}</p><div class="card-actions"><button class="danger-btn mini-btn" data-delete-internal="${escapeHtml(note.id)}" type="button">Löschen</button></div></article>`).join("")
    : `<article class="akten-card static-card"><h3>Noch keine internen Informationen</h3><p>Hier kannst du später Regeln, Hinweise oder wichtige Ashborn-Infos sammeln.</p></article>`;
  list.querySelectorAll("[data-delete-internal]").forEach((button) => {
    button.addEventListener("click", () => deleteInternalNote(button.dataset.deleteInternal));
  });
}

async function deleteInternalNote(id) {
  const { error } = await sb.from("internal_notes").delete().eq("id", id);
  if (error) return alert(error.message);
  await loadInternal();
  renderInternal();
}

async function clearInternalNotes() {
  if (!confirm("Alle internen Informationen löschen?")) return;
  const { error } = await sb.from("internal_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) return alert(error.message);
  await loadInternal();
  renderInternal();
}

async function loadCash() {
  const { data, error } = await sb.from("accounting_transactions").select("*").order("created_at", { ascending: false });
  if (error) return showGlobalError(error.message);
  cashCache = (data || []).map((row) => ({ id: row.id, type: row.transaction_type, amount: Number(row.amount || 0), reason: row.reason || "", createdAt: formatDate(row.created_at) }));
}

async function saveCashEntry() {
  const uiType = $("cashType").value;
  const amount = Number($("cashAmount").value || 0);
  const reason = $("cashReason").value.trim();
  if (amount <= 0) return alert("Bitte einen Betrag größer als 0 eintragen.");
  if (!reason) return alert("Bitte eine Begründung eintragen.");
  const transaction_type = uiType === "deposit" ? "einzahlung" : "auszahlung";
  const { error } = await sb.from("accounting_transactions").insert({ transaction_type, amount, reason: reason || null, created_by: currentUser?.id || null });
  if (error) return alert(error.message);
  $("cashAmount").value = "";
  $("cashReason").value = "";
  await loadCash();
  renderCash();
}

function renderCash() {
  const deposits = cashCache.filter((e) => e.type === "einzahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const withdraws = cashCache.filter((e) => e.type === "auszahlung").reduce((sum, e) => sum + Number(e.amount || 0), 0);
  setText("currentBalance", formatMoney(deposits - withdraws));
  setText("depositTotal", formatMoney(deposits));
  setText("withdrawTotal", formatMoney(withdraws));
  const list = $("cashList");
  if (!list) return;
  list.innerHTML = cashCache.length
    ? cashCache.map((entry) => `<div class="price-row"><div><strong>${entry.type === "einzahlung" ? "Einzahlung" : "Auszahlung"} · ${escapeHtml(entry.createdAt)}</strong><span>${escapeHtml(entry.reason)}</span></div><div class="price-value ${entry.type === "auszahlung" ? "negative" : "positive"}">${entry.type === "auszahlung" ? "-" : "+"}${formatMoney(entry.amount)}</div></div>`).join("")
    : `<div class="price-row"><div><strong>Noch keine Buchungen</strong><span>Einzahlungen und Auszahlungen erscheinen hier.</span></div></div>`;
}

async function clearSystemData() {
  if (!confirm("Wirklich Datensätze, Preislisten und interne Infos löschen? Buchhaltung bleibt erhalten.")) return;
  await Promise.all([
    sb.from("ashborn_entries").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    sb.from("price_sale").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    sb.from("price_purchase").delete().neq("id", "00000000-0000-0000-0000-000000000000"),
    sb.from("internal_notes").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  ]);
  clearRecordForm();
  await loadAllData();
}

function exportData() {
  const data = { records: recordsCache, sellPrices: sellPricesCache, buyPrices: buyPricesCache, internal: internalCache, cash: cashCache, exportedAt: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `ashborn-export-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function setText(id, value) { const el = $(id); if (el) el.textContent = String(value); }
function setRecordMessage(message, type) {
  const el = $("recordSaveInfo");
  if (!el) return;
  el.textContent = message;
  el.style.color = type === "success" ? "#b8ffca" : type === "error" ? "#ff9ca1" : "#f2d796";
}
function showGlobalError(message) { console.error(message); }
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" }[char]));
}
function formatMoney(value) {
  const number = Number(value || 0);
  return `${number.toLocaleString("de-DE", { maximumFractionDigits: 2 })} $`;
}
function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleString("de-DE");
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
