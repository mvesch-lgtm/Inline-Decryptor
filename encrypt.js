// encrypt.js — los venster om tekst te versleutelen of te ontsleutelen.
// Wachtwoordbron: een opgeslagen regel (kluis open) of een handmatig wachtwoord.
// Bij openen wordt de huidige URL gebruikt indien die bij een opgeslagen regel
// hoort; anders start het venster in handmatige modus.

const $ = (id) => document.getElementById(id);
const send = (m) => chrome.runtime.sendMessage(m);
const t = (k) => WM_I18N.t(k);

const TAG = "encrypt-tekst-excrypt";
const href = new URLSearchParams(location.search).get("href") || "";

let mode = "encrypt";   // "encrypt" | "decrypt"
let source = "manual";  // "saved"   | "manual"
let locked = true;
let entries = [];

// ---------- helpers ----------
function setStatus(text, kind) {
  const el = $("status");
  el.textContent = text || "";
  el.className = "status" + (kind ? " " + kind : "");
}
function wrap(cipher) {
  return "<" + TAG + ">" + cipher + "</" + TAG + ">";
}
// Haal de code uit een (eventueel) met tags omwikkelde invoer.
function extractCipher(input) {
  const re = new RegExp("<" + TAG + ">([\\s\\S]*?)</" + TAG + ">", "i");
  const m = input.match(re);
  return (m ? m[1] : input).trim();
}
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    let ok = false;
    try { ok = document.execCommand("copy"); } catch {}
    ta.remove();
    return ok;
  }
}

// ---------- UI-status ----------
function updateModeUI() {
  $("mode-encrypt").classList.toggle("active", mode === "encrypt");
  $("mode-decrypt").classList.toggle("active", mode === "decrypt");
  $("input-label").textContent = t(mode === "encrypt" ? "inputPlainLabel" : "inputCipherLabel");
  $("input").setAttribute(
    "placeholder",
    t(mode === "encrypt" ? "encryptPlaceholder" : "cipherPlaceholder")
  );
  $("run").textContent = t(mode === "encrypt" ? "encryptDoBtn" : "decryptDoBtn");
  $("result-wrap").classList.add("hidden");
  setStatus("");
}

function updateSavedPanel() {
  const sel = $("entry-select");
  const hint = $("saved-hint");
  if (locked) {
    sel.classList.add("hidden");
    hint.textContent = t("savedLockedHint");
    hint.classList.remove("hidden");
  } else if (entries.length === 0) {
    sel.classList.add("hidden");
    hint.textContent = t("noEntriesHint");
    hint.classList.remove("hidden");
  } else {
    sel.classList.remove("hidden");
    hint.classList.add("hidden");
  }
}

function updateSourceUI() {
  $("source-saved").classList.toggle("active", source === "saved");
  $("source-manual").classList.toggle("active", source === "manual");
  $("panel-saved").classList.toggle("hidden", source !== "saved");
  $("panel-manual").classList.toggle("hidden", source !== "manual");
  if (source === "saved") updateSavedPanel();
  $("result-wrap").classList.add("hidden");
  setStatus("");
}

function populateEntries(matchedId) {
  const sel = $("entry-select");
  sel.innerHTML = "";
  for (const e of entries) {
    const opt = document.createElement("option");
    opt.value = e.id;
    const label = e.label ? e.label + " \u2014 " + e.url : e.url;
    opt.textContent = label;
    sel.append(opt);
  }
  if (matchedId) sel.value = matchedId;
}

// ---------- acties ----------
async function run() {
  const raw = $("input").value;
  const hasInput = mode === "encrypt" ? !!raw : !!extractCipher(raw);
  if (!hasInput) return setStatus(t("encryptEmpty"), "error");

  let msg;
  if (source === "manual") {
    const pw = $("manual-pw").value;
    if (!pw) return setStatus(t("needManualPw"), "error");
    msg = mode === "encrypt"
      ? { type: "manualEncrypt", password: pw, plaintext: raw }
      : { type: "manualDecrypt", password: pw, cipher: extractCipher(raw) };
  } else {
    if (locked) return setStatus(t("savedLockedHint"), "error");
    const id = $("entry-select").value;
    if (!id) return setStatus(t("pickEntry"), "error");
    msg = mode === "encrypt"
      ? { type: "encryptForEntry", id, plaintext: raw }
      : { type: "decryptForEntry", id, cipher: extractCipher(raw) };
  }

  let res;
  try {
    res = await send(msg);
  } catch {
    return setStatus(t("noConnection"), "error");
  }

  // Kluis kan ondertussen automatisch vergrendeld zijn.
  if (res && res.locked) {
    locked = true;
    if (source === "saved") updateSavedPanel();
    return setStatus(t("vaultLocked"), "error");
  }
  if (!res || !res.ok) {
    return setStatus(t(mode === "encrypt" ? "encryptFailed" : "decryptFailed"), "error");
  }

  if (mode === "encrypt") {
    const full = wrap(res.cipher);
    $("result-label").textContent = t("encryptResultLabel");
    $("result").value = full;
    $("result-wrap").classList.remove("hidden");
    const copied = await copyText(full);
    setStatus(copied ? t("encryptCopiedFull") : "", copied ? "ok" : "");
  } else {
    $("result-label").textContent = t("decryptResultLabel");
    $("result").value = res.text;
    $("result-wrap").classList.remove("hidden");
    setStatus(t("decryptedOk"), "ok");
  }
}

// ---------- listeners ----------
$("mode-encrypt").addEventListener("click", () => { mode = "encrypt"; updateModeUI(); });
$("mode-decrypt").addEventListener("click", () => { mode = "decrypt"; updateModeUI(); });
$("source-saved").addEventListener("click", () => { source = "saved"; updateSourceUI(); });
$("source-manual").addEventListener("click", () => { source = "manual"; updateSourceUI(); });

$("toggle-pw").addEventListener("click", () => {
  const inp = $("manual-pw");
  const show = inp.type === "password";
  inp.type = show ? "text" : "password";
  $("toggle-pw").textContent = t(show ? "hidePw" : "showPw");
});

$("run").addEventListener("click", run);
$("input").addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") run();
});

$("copy-btn").addEventListener("click", async () => {
  const ok = await copyText($("result").value);
  const btn = $("copy-btn");
  const original = t("copy");
  btn.textContent = ok ? t("copied") : original;
  setTimeout(() => { btn.textContent = original; }, 1200);
});

$("close-btn").addEventListener("click", () => window.close());

// Taalwissel terwijl het venster openstaat.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lang) {
    WM_I18N.lang = changes.lang.newValue === "en" ? "en" : "nl";
    WM_I18N.apply();
    updateModeUI();
    updateSourceUI();
  }
});

// ---------- init ----------
(async () => {
  await WM_I18N.load();
  WM_I18N.apply();

  const status = await send({ type: "getStatus" });
  locked = !status || status.locked || !status.hasVault;

  let matchedId = null;
  if (!locked) {
    const list = await send({ type: "getEntryList", href });
    if (list && !list.locked) {
      entries = list.entries || [];
      matchedId = list.matchedId || null;
    } else {
      locked = true;
    }
  }

  populateEntries(matchedId);

  // Standaardkeuze: huidige URL indien die matcht, anders handmatig.
  source = !locked && matchedId ? "saved" : "manual";
  mode = "encrypt";

  updateModeUI();
  updateSourceUI();
  ($("input")).focus();
})();
