// content.js — vraagt de service worker om de inhoud van deze pagina te
// ontsleutelen. Doet zelf geen crypto; ontgrendelen gebeurt in de service worker.
// Teksten komen uit i18n.js (geladen vóór dit script, zie manifest).

const SELECTOR = "encrypt-tekst-excrypt";
const t = (k) => WM_I18N.t(k);

let toastHost = null;
let toastType = null;          // null | "locked" | "add"
let lockedDismissed = false;   // gebruiker sloot de ontgrendel-melding (per pagina-load)
let addDismissed = false;      // gebruiker sloot de "URL toevoegen"-melding (per pagina-load)

function collectTags() {
  const tags = [...document.querySelectorAll(SELECTOR)];
  for (const el of tags) {
    if (!el.dataset.cipher) el.dataset.cipher = el.textContent.trim();
  }
  return tags.filter((el) => el.dataset.cipher);
}

function showCipher(tags) {
  for (const el of tags) el.textContent = el.dataset.cipher;
}

// Sommige sites slaan de tekst op in de database en geven hem ge-escaped terug,
// zodat "<encrypt-tekst-excrypt>...</...>" als zichtbare TEKST in de pagina staat
// in plaats van als echt element. querySelectorAll vindt dat niet. Hieronder
// zoeken we die letterlijke vorm in tekstknopen en zetten we hem om naar een
// echt <encrypt-tekst-excrypt>-element; daarna pakt de gewone pijplijn het op.
const OPEN_TAG = "<" + SELECTOR + ">";
const TEXT_TAG_RE = new RegExp(OPEN_TAG + "([\\s\\S]*?)</" + SELECTOR + ">", "g");
const SKIP_PARENTS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "NOSCRIPT", "TITLE"]);

function replaceEscapedInTextNode(textNode) {
  const text = textNode.nodeValue;
  TEXT_TAG_RE.lastIndex = 0;
  let match;
  let lastIndex = 0;
  let found = false;
  const frag = document.createDocumentFragment();

  while ((match = TEXT_TAG_RE.exec(text)) !== null) {
    found = true;
    if (match.index > lastIndex) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const el = document.createElement(SELECTOR);
    el.textContent = match[1].trim(); // de cipher
    frag.appendChild(el);
    lastIndex = match.index + match[0].length;
  }
  if (!found) return;
  if (lastIndex < text.length) {
    frag.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  textNode.parentNode.replaceChild(frag, textNode);
}

function normalizeEscapedTags() {
  const root = document.body || document.documentElement;
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const p = node.parentNode;
      if (!p) return NodeFilter.FILTER_REJECT;
      if (SKIP_PARENTS.has(p.nodeName)) return NodeFilter.FILTER_REJECT;
      // Niet in (al echte) tags en niet in bewerkbare velden.
      if (p.nodeName === SELECTOR.toUpperCase()) return NodeFilter.FILTER_REJECT;
      if (p.isContentEditable) return NodeFilter.FILTER_REJECT;
      return node.nodeValue.indexOf(OPEN_TAG) === -1
        ? NodeFilter.FILTER_SKIP
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  // Eerst verzamelen, dan pas wijzigen (DOM niet aanpassen tijdens het wandelen).
  const targets = [];
  let n;
  while ((n = walker.nextNode())) targets.push(n);
  for (const node of targets) replaceEscapedInTextNode(node);
}

function hostLabel() {
  try {
    return location.hostname.toLowerCase();
  } catch {
    return location.href;
  }
}

// ---------- gedeelde toast-helpers ----------
function removeToast() {
  if (toastHost) {
    toastHost.remove();
    toastHost = null;
    toastType = null;
  }
}

function makeToastHost() {
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;top:20px;right:20px;z-index:2147483647;";
  // 'closed' shadow DOM: pagina-scripts kunnen niet via host.shadowRoot
  // bij het wachtwoordveld; we houden de referentie alleen hier.
  const shadow = host.attachShadow({ mode: "closed" });
  return { host, shadow };
}

const TOAST_STYLE = `
  .card{font-family:system-ui,sans-serif;background:#fff;color:#222;border:1px solid #e0e0e0;
    border-radius:10px;padding:12px;box-shadow:0 6px 24px rgba(0,0,0,.18);width:280px;
    animation:wm-in .18s ease-out;}
  @keyframes wm-in{from{opacity:0;transform:translateY(-8px);}to{opacity:1;transform:none;}}
  .head{display:flex;align-items:center;gap:8px;margin-bottom:8px;}
  .key{font-size:18px;line-height:1;}
  .title{font-size:13px;font-weight:600;flex:1;}
  .close{border:none;background:transparent;color:#999;font-size:16px;cursor:pointer;line-height:1;padding:0 2px;}
  .close:hover{color:#555;}
  .sub{font-size:12px;color:#777;margin:0 0 8px;}
  .host{font-weight:600;color:#444;word-break:break-all;}
  .field{display:flex;gap:6px;}
  input{flex:1;min-width:0;padding:7px 8px;border:1px solid #d9d9d9;border-radius:6px;font-size:13px;}
  .btn{border:none;border-radius:6px;background:#60a730;color:#fff;font-size:13px;padding:7px 10px;cursor:pointer;white-space:nowrap;}
  .btn:hover{background:#4f8f27;}
  .err{font-size:12px;color:#c0392b;min-height:1em;margin:6px 0 0;}
`;

// Voorkom dat toetsaanslagen naar de pagina lekken.
function shieldInput(input, onEnter) {
  const stop = (e) => e.stopPropagation();
  input.addEventListener("keyup", stop);
  input.addEventListener("keypress", stop);
  input.addEventListener("input", stop);
  input.addEventListener("keydown", (e) => {
    e.stopPropagation();
    if (e.key === "Enter") onEnter();
  });
}

// ---------- melding: kluis vergrendeld ----------
function showLockedToast() {
  removeToast();
  const { host, shadow } = makeToastHost();
  toastHost = host;
  toastType = "locked";

  shadow.innerHTML = `
    <style>${TOAST_STYLE}</style>
    <div class="card">
      <div class="head">
        <span class="key">&#128273;</span>
        <span class="title">${t("toastLockedTitle")}</span>
        <button class="close" id="close" title="${t("close")}">&#10005;</button>
      </div>
      <p class="sub">${t("toastLockedSub")}</p>
      <div class="field">
        <input type="password" id="pw" placeholder="${t("masterPw")}" autocomplete="off" />
        <button class="btn" id="ok">${t("unlockShort")}</button>
      </div>
      <p class="err" id="err"></p>
    </div>`;

  const input = shadow.getElementById("pw");
  const err = shadow.getElementById("err");

  async function tryUnlock() {
    const pw = input.value;
    if (!pw) return;
    let res;
    try {
      res = await chrome.runtime.sendMessage({ type: "unlock", password: pw });
    } catch (_) {
      err.textContent = t("noConnection");
      return;
    }
    input.value = "";
    if (res && res.ok) {
      removeToast();
      sync(); // pagina ontsleutelen; toont evt. meteen de "URL toevoegen"-melding
    } else {
      err.textContent = t("wrongPw");
      input.focus();
    }
  }

  shieldInput(input, tryUnlock);
  shadow.getElementById("ok").addEventListener("click", tryUnlock);
  shadow.getElementById("close").addEventListener("click", () => {
    lockedDismissed = true;
    removeToast();
  });

  document.documentElement.appendChild(host);
  input.focus();
}

// ---------- melding: URL toevoegen aan de manager ----------
function showAddUrlToast() {
  removeToast();
  const { host, shadow } = makeToastHost();
  toastHost = host;
  toastType = "add";

  shadow.innerHTML = `
    <style>${TOAST_STYLE}</style>
    <div class="card">
      <div class="head">
        <span class="key">&#10133;</span>
        <span class="title">${t("toastAddTitle")}</span>
        <button class="close" id="close" title="${t("close")}">&#10005;</button>
      </div>
      <p class="sub">${t("toastAddSub1")}<br><span class="host" id="host"></span></p>
      <p class="sub">${t("toastAddSub2")}</p>
      <div class="field">
        <input type="password" id="pw" placeholder="${t("toastAddPlaceholder")}" autocomplete="off" />
        <button class="btn" id="ok">${t("addBtn")}</button>
      </div>
      <p class="err" id="err"></p>
    </div>`;

  shadow.getElementById("host").textContent = hostLabel();

  const input = shadow.getElementById("pw");
  const err = shadow.getElementById("err");

  async function tryAdd() {
    const pw = input.value;
    if (!pw) return;
    const ciphers = collectTags().map((el) => el.dataset.cipher);
    let res;
    try {
      res = await chrome.runtime.sendMessage({
        type: "addEntryForUrl",
        href: location.href,
        password: pw,
        ciphers,
      });
    } catch (_) {
      err.textContent = t("noConnection");
      return;
    }
    if (res && res.locked) {
      // kluis is ondertussen vergrendeld geraakt
      removeToast();
      sync();
      return;
    }
    if (res && res.ok) {
      input.value = "";
      removeToast();
      sync(); // pagina staat nu in de manager -> meteen ontsleutelen
    } else if (res && res.reason === "bad-password") {
      err.textContent = t("addWrongPw");
      input.focus();
    } else {
      err.textContent = t("addFailed");
      input.focus();
    }
  }

  shieldInput(input, tryAdd);
  shadow.getElementById("ok").addEventListener("click", tryAdd);
  shadow.getElementById("close").addEventListener("click", () => {
    addDismissed = true;
    removeToast();
  });

  document.documentElement.appendChild(host);
  input.focus();
}

// ---------- hoofdroutine ----------
async function sync() {
  normalizeEscapedTags();
  const tags = collectTags();
  if (tags.length === 0) return;

  let resp;
  try {
    resp = await chrome.runtime.sendMessage({
      type: "decryptForUrl",
      href: location.href,
      ciphers: tags.map((el) => el.dataset.cipher),
    });
  } catch (e) {
    return;
  }

  if (!resp) {
    showCipher(tags);
    return;
  }

  // (1) Kluis vergrendeld -> vraag om het hoofdwachtwoord.
  if (resp.locked) {
    showCipher(tags);
    if (toastType === "add") removeToast();
    if (toastType !== "locked" && !lockedDismissed) showLockedToast();
    return;
  }

  // (2) Ontgrendeld, maar deze URL staat nog niet in de manager -> bied aan
  //     om hem toe te voegen.
  if (!resp.matched || !resp.results) {
    showCipher(tags);
    if (toastType === "locked") removeToast();
    if (toastType !== "add" && !addDismissed) showAddUrlToast();
    return;
  }

  // (3) Gevonden + ontsleuteld.
  removeToast();
  resp.results.forEach((r, i) => {
    tags[i].textContent = r.ok ? r.text : tags[i].dataset.cipher;
  });
}

// Reageer op een taalwissel (bijv. via de popup) terwijl deze pagina openstaat:
// een eventuele melding wordt opnieuw in de nieuwe taal opgebouwd.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lang) {
    WM_I18N.lang = changes.lang.newValue === "en" ? "en" : "nl";
    if (toastType) {
      // forceer heropbouw van de huidige melding in de nieuwe taal
      const wasLocked = toastType === "locked";
      lockedDismissed = false;
      addDismissed = false;
      removeToast();
      sync();
      // herstel "niet nogmaals tonen" niet nodig: sync toont alleen indien relevant
      void wasLocked;
    }
  }
});

// Ontdubbelde sync: meerdere triggers vlak na elkaar leiden tot één scan.
let syncScheduled = false;
let syncing = false;
function scheduleSync() {
  if (syncScheduled) return;
  syncScheduled = true;
  setTimeout(async () => {
    syncScheduled = false;
    if (syncing) { scheduleSync(); return; } // nog bezig -> straks opnieuw
    syncing = true;
    try {
      await sync();
    } finally {
      syncing = false;
    }
  }, 120);
}

// Houd de pagina in de gaten: forums laden posts/citaten vaak ná het eerste
// laadmoment (AJAX, "meer laden", SPA-navigatie, live preview). Zodra er ergens
// een <encrypt-tekst-excrypt> bijkomt of de pagina hertekent, scannen we opnieuw.
function startObserver() {
  const root = document.documentElement || document.body;
  if (!root) return;
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        // Alleen elementen (geen tekstknopen) bekijken; onze eigen ontsleutelde
        // tekst voegt tekstknopen toe en mag de observer dus niet triggeren.
        if (node.nodeType !== 1) continue;
        if (
          (node.matches && node.matches(SELECTOR)) ||
          (node.querySelector && node.querySelector(SELECTOR)) ||
          // ook de ge-escapete tekstvorm (uit een database) opmerken
          (node.textContent && node.textContent.indexOf(OPEN_TAG) !== -1)
        ) {
          scheduleSync();
          return;
        }
      }
    }
  });
  observer.observe(root, { childList: true, subtree: true });
}

(async () => {
  await WM_I18N.load();
  sync();
  startObserver();
})();

document.addEventListener("visibilitychange", () => {
  if (!document.hidden) scheduleSync();
});
window.addEventListener("focus", scheduleSync);