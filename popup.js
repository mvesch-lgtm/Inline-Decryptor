// popup.js — lichte launcher. Volledige beheer gebeurt in manager.html (eigen tab).

const $ = (id) => document.getElementById(id);
const send = (m) => chrome.runtime.sendMessage(m);

function show(view) {
  for (const id of ["p-setup", "p-locked", "p-unlocked"]) {
    $(id).classList.toggle("hidden", id !== view);
  }
}
function openManager() {
  chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") });
  window.close();
}

// Onthoud de URL van het actieve tabblad (alleen geldig zolang de popup open is,
// dankzij de activeTab-permissie).
let activeHref = null;

async function getActiveHref() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab && /^https?:/i.test(tab.url || "") ? tab.url : null;
  } catch {
    return null;
  }
}

// Open het ruime versleutel/ontsleutel-venster (los popup-venster).
function openCryptoWindow() {
  const base = chrome.runtime.getURL("encrypt.html");
  const url = activeHref ? base + "?href=" + encodeURIComponent(activeHref) : base;
  chrome.windows.create({ url, type: "popup", width: 480, height: 700 });
  window.close();
}

function updateLangButtons() {
  $("lang-nl").classList.toggle("active", WM_I18N.lang === "nl");
  $("lang-en").classList.toggle("active", WM_I18N.lang === "en");
}

async function refresh() {
  $("p-crypto").classList.add("hidden");
  const s = await send({ type: "getStatus" });
  if (!s.hasVault) {
    show("p-setup");
  } else if (s.locked) {
    show("p-locked");
    $("p-pw").value = "";
    $("p-pw").focus();
    // Handmatige modus werkt ook vergrendeld -> knop tonen.
    activeHref = await getActiveHref();
    $("p-crypto").classList.remove("hidden");
  } else {
    show("p-unlocked");
    const r = await send({ type: "getEntries" });
    if (!r.locked) {
      const n = (r.entries || []).length;
      const word = n === 1 ? WM_I18N.t("savedPwOne") : WM_I18N.t("savedPwMany");
      $("p-count").textContent = n + " " + word;
    }
    activeHref = await getActiveHref();
    $("p-crypto").classList.remove("hidden");
  }
}

async function setLang(lang) {
  await WM_I18N.set(lang);
  WM_I18N.apply();
  updateLangButtons();
  refresh(); // dynamische teksten (telling) opnieuw opbouwen
}

$("lang-nl").addEventListener("click", () => setLang("nl"));
$("lang-en").addEventListener("click", () => setLang("en"));

$("open-setup").addEventListener("click", openManager);
$("open-manager").addEventListener("click", openManager);
$("p-crypto").addEventListener("click", openCryptoWindow);
$("p-lock").addEventListener("click", async () => { await send({ type: "lock" }); refresh(); });
$("p-unlock").addEventListener("click", unlock);
$("p-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") unlock(); });

async function unlock() {
  const res = await send({ type: "unlock", password: $("p-pw").value });
  if (res.ok) refresh();
  else $("p-status").textContent = WM_I18N.t("wrongMasterPw");
}

(async () => {
  await WM_I18N.load();
  WM_I18N.apply();
  updateLangButtons();
  refresh();
})();
