// background.js — service worker / het "brein" van de manager
//
// Verantwoordelijkheden:
//  - Hoofdwachtwoord -> PBKDF2-sleutel -> versleutelde kluis (storage.local).
//  - Ontgrendelde sleutel alleen in storage.session (in-geheugen, weg bij afsluiten).
//  - Auto-lock na X minuten (alarm) en bij afwezigheid (chrome.idle).
//  - Decrypt pagina-inhoud namens de content script, zodat het site-wachtwoord
//    nooit in de webpagina belandt.

const PBKDF2_ITERATIONS = 310000;
const enc = new TextEncoder();
const dec = new TextDecoder();

// ---------- base64 helpers ----------
function b64encode(buf) {
  const a = new Uint8Array(buf);
  let s = "";
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s);
}
function b64decode(str) {
  return Uint8Array.from(atob(str), (c) => c.charCodeAt(0));
}

// ---------- crypto: kluis ----------
async function deriveKey(password, saltBytes) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    true, // extractable: nodig om de sleutel in storage.session te bewaren
    ["encrypt", "decrypt"]
  );
}

// Zelfde afleiding, maar met instelbaar aantal iteraties (voor back-ups).
async function deriveKeyIter(password, saltBytes, iterations) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptJSON(key, obj) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(JSON.stringify(obj))
  );
  return { iv: b64encode(iv), ct: b64encode(ct) };
}

async function decryptJSON(key, ivB64, ctB64) {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    key,
    b64decode(ctB64)
  );
  return JSON.parse(dec.decode(pt));
}

// ---------- crypto: pagina-inhoud (zelfde schema als index.php) ----------
async function decryptPageText(encryptedData, sitePassword) {
  const clean = encryptedData.replace(/\s+/g, "");
  const combined = b64decode(clean);
  if (combined.length < 28) throw new Error("te weinig bytes");

  const iv = combined.slice(0, 12);
  const tag = combined.slice(12, 28);
  const data = combined.slice(28);

  const dataWithTag = new Uint8Array(data.length + tag.length);
  dataWithTag.set(data);
  dataWithTag.set(tag, data.length);

  const keyData = await crypto.subtle.digest("SHA-256", enc.encode(sitePassword));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["decrypt"]);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, dataWithTag);
  return dec.decode(pt);
}

// Versleutel tekst in exact hetzelfde schema (iv | tag | ciphertext, base64),
// zodat de uitvoer leesbaar is voor zowel de extensie als de PHP-kant (index.php).
async function encryptPageText(plaintext, sitePassword) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const keyData = await crypto.subtle.digest("SHA-256", enc.encode(sitePassword));
  const key = await crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, ["encrypt"]);
  // WebCrypto plakt de 16-byte GCM-tag achter de ciphertext: out = ciphertext | tag
  const out = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv, tagLength: 128 }, key, enc.encode(plaintext))
  );
  const data = out.slice(0, out.length - 16);
  const tag = out.slice(out.length - 16);
  const combined = new Uint8Array(12 + 16 + data.length);
  combined.set(iv, 0);
  combined.set(tag, 12);
  combined.set(data, 28);
  return b64encode(combined);
}

// ---------- opslag ----------
async function getVaultRecord() {
  const { vault } = await chrome.storage.local.get("vault");
  return vault || null; // { salt, iv, ct }
}
async function setVaultRecord(rec) {
  await chrome.storage.local.set({ vault: rec });
}
async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return settings || { lockMinutes: 5, idleSeconds: 60 };
}
async function setSettings(s) {
  await chrome.storage.local.set({ settings: s });
}

// ---------- ontgrendel-status (in storage.session) ----------
async function getUnlock() {
  const { unlock } = await chrome.storage.session.get("unlock");
  if (!unlock) return null;
  if (Date.now() >= unlock.until) {
    await lockVault();
    return null;
  }
  return unlock;
}
async function getActiveKey() {
  const unlock = await getUnlock();
  if (!unlock) return null;
  return crypto.subtle.importKey(
    "raw",
    b64decode(unlock.keyRaw),
    { name: "AES-GCM" },
    true,
    ["encrypt", "decrypt"]
  );
}
async function setUnlocked(key) {
  const raw = await crypto.subtle.exportKey("raw", key);
  const { lockMinutes } = await getSettings();
  await chrome.storage.session.set({
    unlock: { keyRaw: b64encode(raw), until: Date.now() + lockMinutes * 60000 },
  });
}
async function refreshTimer() {
  const { unlock } = await chrome.storage.session.get("unlock");
  if (!unlock) return;
  const { lockMinutes } = await getSettings();
  unlock.until = Date.now() + lockMinutes * 60000;
  await chrome.storage.session.set({ unlock });
}
async function lockVault() {
  await chrome.storage.session.remove("unlock");
}

// ---------- kluis lezen/schrijven ----------
async function readVault() {
  const key = await getActiveKey();
  if (!key) return null;
  const rec = await getVaultRecord();
  return decryptJSON(key, rec.iv, rec.ct);
}
async function writeVault(vaultObj) {
  const key = await getActiveKey();
  if (!key) throw new Error("locked");
  const { iv, ct } = await encryptJSON(key, vaultObj);
  const rec = await getVaultRecord();
  await setVaultRecord({ salt: rec.salt, iv, ct });
}

// ---------- setup & unlock ----------
async function setupVault(password, lockMinutes, idleSeconds) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const rec = await encryptJSON(key, { version: 1, entries: [] });
  await setVaultRecord({ salt: b64encode(salt), iv: rec.iv, ct: rec.ct });
  await setSettings({ lockMinutes, idleSeconds });
  await applyIdleInterval(idleSeconds);
  await setUnlocked(key);
}

async function unlockVault(password) {
  const rec = await getVaultRecord();
  if (!rec) return { ok: false, reason: "no-vault" };
  const key = await deriveKey(password, b64decode(rec.salt));
  try {
    await decryptJSON(key, rec.iv, rec.ct); // GCM-tag verifieert het wachtwoord
  } catch {
    return { ok: false, reason: "bad-password" };
  }
  await setUnlocked(key);
  return { ok: true };
}

// ---------- hoofdwachtwoord wijzigen ----------
async function changeMasterPassword(currentPassword, newPassword) {
  const rec = await getVaultRecord();
  if (!rec) return { ok: false, reason: "no-vault" };

  // Kluis moet ontgrendeld zijn (we hebben de inhoud nodig om opnieuw te versleutelen).
  const activeKey = await getActiveKey();
  if (!activeKey) return { ok: false, reason: "locked" };

  if (!newPassword || newPassword.length < 4) return { ok: false, reason: "weak" };

  // Verifieer het huidige wachtwoord tegen het opgeslagen zout.
  const currentKey = await deriveKey(currentPassword, b64decode(rec.salt));
  try {
    await decryptJSON(currentKey, rec.iv, rec.ct); // GCM-tag controleert het wachtwoord
  } catch {
    return { ok: false, reason: "bad-current" };
  }

  // Lees de huidige inhoud en versleutel die opnieuw met een nieuw zout + sleutel.
  const vaultObj = await readVault();
  const newSalt = crypto.getRandomValues(new Uint8Array(16));
  const newKey = await deriveKey(newPassword, newSalt);
  const { iv, ct } = await encryptJSON(newKey, vaultObj);
  await setVaultRecord({ salt: b64encode(newSalt), iv, ct });

  // Vernieuw de ontgrendel-sessie met de nieuwe sleutel.
  await setUnlocked(newKey);
  return { ok: true };
}

// ---------- URL-matching ----------
function hostOf(u) {
  try {
    return new URL(u.includes("://") ? u : "https://" + u).hostname.toLowerCase();
  } catch {
    return String(u).toLowerCase();
  }
}
function findEntryForUrl(entries, href) {
  const host = hostOf(href);
  let best = null;
  for (const e of entries) {
    let pat = (e.url || "").trim().toLowerCase();
    if (pat.startsWith("*.")) pat = pat.slice(2);
    const eh = hostOf(pat);
    if (!eh) continue;
    // match: exact host, of huidige host is subdomein van de regel
    if (host === eh || host.endsWith("." + eh)) {
      if (!best || eh.length > best._len) best = { entry: e, _len: eh.length };
    }
  }
  return best ? best.entry : null;
}

async function handleDecryptForUrl(href, ciphers) {
  const key = await getActiveKey();
  if (!key) return { locked: true };
  const vault = await readVault();
  const entry = findEntryForUrl(vault.entries, href);
  if (!entry) return { locked: false, matched: false };
  await refreshTimer();
  const results = [];
  for (const c of ciphers) {
    try {
      results.push({ ok: true, text: await decryptPageText(c, entry.password) });
    } catch {
      results.push({ ok: false });
    }
  }
  return { locked: false, matched: true, results };
}

// ---------- versleutelen/ontsleutelen vanuit het popup-hulpmiddel ----------

// Lijst met regels zonder wachtwoorden (voor de keuzelijst in het venster),
// plus welke regel bij de meegegeven URL hoort.
async function handleGetEntryList(href) {
  const v = await readVault();
  if (!v) return { locked: true };
  await refreshTimer();
  const entries = v.entries.map((e) => ({ id: e.id, label: e.label, url: e.url }));
  const matched = href ? findEntryForUrl(v.entries, href) : null;
  return { locked: false, entries, matchedId: matched ? matched.id : null };
}

// Versleutelen met het wachtwoord van een opgeslagen regel (kluis moet open zijn).
async function handleEncryptForEntry(id, plaintext) {
  const v = await readVault();
  if (!v) return { locked: true };
  const entry = v.entries.find((e) => e.id === id);
  if (!entry) return { ok: false, reason: "no-entry" };
  await refreshTimer();
  try {
    return { ok: true, cipher: await encryptPageText(String(plaintext == null ? "" : plaintext), entry.password) };
  } catch (e) {
    return { ok: false, reason: "encrypt-failed" };
  }
}

// Ontsleutelen met het wachtwoord van een opgeslagen regel (kluis moet open zijn).
async function handleDecryptForEntry(id, cipher) {
  const v = await readVault();
  if (!v) return { locked: true };
  const entry = v.entries.find((e) => e.id === id);
  if (!entry) return { ok: false, reason: "no-entry" };
  await refreshTimer();
  try {
    return { ok: true, text: await decryptPageText(String(cipher || ""), entry.password) };
  } catch (e) {
    return { ok: false, reason: "bad-password" };
  }
}

// Versleutelen met een handmatig wachtwoord (geen kluis nodig).
async function handleManualEncrypt(password, plaintext) {
  if (!password) return { ok: false, reason: "empty-pw" };
  try {
    return { ok: true, cipher: await encryptPageText(String(plaintext == null ? "" : plaintext), password) };
  } catch (e) {
    return { ok: false, reason: "encrypt-failed" };
  }
}

// Ontsleutelen met een handmatig wachtwoord (geen kluis nodig).
async function handleManualDecrypt(password, cipher) {
  if (!password) return { ok: false, reason: "empty-pw" };
  try {
    return { ok: true, text: await decryptPageText(String(cipher || ""), password) };
  } catch (e) {
    return { ok: false, reason: "bad-password" };
  }
}

// ---------- nieuwe regel toevoegen vanaf de pagina ----------
async function handleAddEntryForUrl(href, password, ciphers) {
  const key = await getActiveKey();
  if (!key) return { locked: true };

  const host = hostOf(href);
  if (!host) return { ok: false, reason: "bad-host" };
  if (!password) return { ok: false, reason: "empty" };

  // Verifieer het wachtwoord: het moet de inhoud van deze pagina kunnen
  // ontsleutelen. Zo slaan we nooit per ongeluk een verkeerd wachtwoord op.
  const list = Array.isArray(ciphers) ? ciphers : [];
  if (list.length) {
    let verified = false;
    for (const c of list) {
      try {
        await decryptPageText(c, password);
        verified = true;
        break;
      } catch {
        /* probeer de volgende cipher */
      }
    }
    if (!verified) return { ok: false, reason: "bad-password" };
  }

  const vault = await readVault();
  const existing = findEntryForUrl(vault.entries, href);
  if (existing) {
    // Bestaat er al een (sub)domein-regel? Werk dan het wachtwoord bij.
    existing.password = password;
  } else {
    vault.entries.push({
      id: crypto.randomUUID(),
      label: host,
      url: host,
      password,
    });
  }
  await writeVault(vault);
  await refreshTimer();

  // Ontsleutel de pagina-inhoud meteen met de zojuist opgeslagen regel.
  const entry = findEntryForUrl(vault.entries, href);
  const results = [];
  for (const c of list) {
    try {
      results.push({ ok: true, text: await decryptPageText(c, entry.password) });
    } catch {
      results.push({ ok: false });
    }
  }
  return { ok: true, matched: true, results, entries: vault.entries };
}

// ---------- back-up: export & import ----------
async function handleExport(exportPassword) {
  const vault = await readVault();
  if (!vault) return { ok: false, reason: "locked" };
  if (!exportPassword || exportPassword.length < 4) return { ok: false, reason: "weak" };

  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyIter(exportPassword, salt, PBKDF2_ITERATIONS);
  const { iv, ct } = await encryptJSON(key, { version: 1, entries: vault.entries });
  await refreshTimer();

  return {
    ok: true,
    backup: {
      format: "wm-backup",
      version: 1,
      kdf: "PBKDF2-SHA256",
      iterations: PBKDF2_ITERATIONS,
      salt: b64encode(salt),
      iv,
      ct,
    },
  };
}

async function handleImport(exportPassword, backup) {
  const vault = await readVault();
  if (!vault) return { ok: false, reason: "locked" };
  if (!backup || backup.format !== "wm-backup") return { ok: false, reason: "format" };

  let payload;
  try {
    const key = await deriveKeyIter(
      exportPassword,
      b64decode(backup.salt),
      backup.iterations || PBKDF2_ITERATIONS
    );
    payload = await decryptJSON(key, backup.iv, backup.ct);
  } catch {
    return { ok: false, reason: "bad-password" };
  }

  const incoming = Array.isArray(payload.entries) ? payload.entries : [];
  let added = 0;
  let skipped = 0;
  for (const e of incoming) {
    if (!e || !e.url || typeof e.password !== "string") {
      skipped++;
      continue;
    }
    const dup = vault.entries.some((x) => x.url === e.url && x.password === e.password);
    if (dup) {
      skipped++;
      continue;
    }
    vault.entries.push({
      id: crypto.randomUUID(),
      label: e.label || "",
      url: e.url,
      password: e.password,
    });
    added++;
  }
  await writeVault(vault);
  await refreshTimer();
  return { ok: true, added, skipped, entries: vault.entries };
}

// ---------- auto-lock: idle + alarm ----------
async function applyIdleInterval(seconds) {
  try {
    chrome.idle.setDetectionInterval(Math.max(15, Number(seconds) || 60));
  } catch (e) {
    /* idle-permissie ontbreekt */
  }
}

chrome.idle.onStateChanged.addListener((state) => {
  if (state === "idle" || state === "locked") lockVault();
});

chrome.alarms.create("autolock-check", { periodInMinutes: 1 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name !== "autolock-check") return;
  const { unlock } = await chrome.storage.session.get("unlock");
  if (unlock && Date.now() >= unlock.until) await lockVault();
});

chrome.runtime.onStartup.addListener(() => lockVault());
chrome.runtime.onInstalled.addListener(async () => {
  const s = await getSettings();
  await applyIdleInterval(s.idleSeconds);
});

// ---------- berichten-router ----------
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    try {
      switch (msg.type) {
        case "getStatus": {
          const rec = await getVaultRecord();
          const unlock = await getUnlock();
          const settings = await getSettings();
          sendResponse({ hasVault: !!rec, locked: !unlock, ...settings });
          break;
        }
        case "setup":
          await setupVault(msg.password, msg.lockMinutes, msg.idleSeconds);
          sendResponse({ ok: true });
          break;
        case "unlock":
          sendResponse(await unlockVault(msg.password));
          break;
        case "changeMasterPassword":
          sendResponse(await changeMasterPassword(msg.currentPassword, msg.newPassword));
          break;
        case "lock":
          await lockVault();
          sendResponse({ ok: true });
          break;
        case "getEntries": {
          const v = await readVault();
          if (!v) { sendResponse({ locked: true }); break; }
          await refreshTimer();
          sendResponse({ locked: false, entries: v.entries });
          break;
        }
        case "saveEntry": {
          const v = await readVault();
          if (!v) { sendResponse({ locked: true }); break; }
          const e = msg.entry;
          if (e.id) {
            const i = v.entries.findIndex((x) => x.id === e.id);
            if (i >= 0) v.entries[i] = e;
            else v.entries.push(e);
          } else {
            e.id = crypto.randomUUID();
            v.entries.push(e);
          }
          await writeVault(v);
          await refreshTimer();
          sendResponse({ ok: true, entries: v.entries });
          break;
        }
        case "deleteEntry": {
          const v = await readVault();
          if (!v) { sendResponse({ locked: true }); break; }
          v.entries = v.entries.filter((x) => x.id !== msg.id);
          await writeVault(v);
          await refreshTimer();
          sendResponse({ ok: true, entries: v.entries });
          break;
        }
        case "setSettings": {
          await setSettings({ lockMinutes: msg.lockMinutes, idleSeconds: msg.idleSeconds });
          await applyIdleInterval(msg.idleSeconds);
          await refreshTimer();
          sendResponse({ ok: true });
          break;
        }
        case "decryptForUrl":
          sendResponse(await handleDecryptForUrl(msg.href, msg.ciphers));
          break;
        case "getEntryList":
          sendResponse(await handleGetEntryList(msg.href));
          break;
        case "encryptForEntry":
          sendResponse(await handleEncryptForEntry(msg.id, msg.plaintext));
          break;
        case "decryptForEntry":
          sendResponse(await handleDecryptForEntry(msg.id, msg.cipher));
          break;
        case "manualEncrypt":
          sendResponse(await handleManualEncrypt(msg.password, msg.plaintext));
          break;
        case "manualDecrypt":
          sendResponse(await handleManualDecrypt(msg.password, msg.cipher));
          break;
        case "addEntryForUrl":
          sendResponse(await handleAddEntryForUrl(msg.href, msg.password, msg.ciphers));
          break;
        case "exportVault":
          sendResponse(await handleExport(msg.exportPassword));
          break;
        case "importVault":
          sendResponse(await handleImport(msg.exportPassword, msg.backup));
          break;
        case "openUnlock":
          try {
            await chrome.action.openPopup();
          } catch (e) {
            await chrome.tabs.create({ url: chrome.runtime.getURL("manager.html") });
          }
          sendResponse({ ok: true });
          break;
        default:
          sendResponse({ error: "onbekend berichttype" });
      }
    } catch (err) {
      console.error("[Manager bg]", err);
      sendResponse({ error: String(err && err.message ? err.message : err) });
    }
  })();
  return true; // async sendResponse
});
