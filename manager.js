// manager.js — volledige beheerpagina (eigen tab). Praat met de service worker.

const $ = (id) => document.getElementById(id);
const send = (m) => chrome.runtime.sendMessage(m);
const t = (k) => WM_I18N.t(k);

function show(view) {
  for (const id of ["view-setup", "view-locked", "view-unlocked"]) {
    $(id).classList.toggle("hidden", id !== view);
  }
}
function setStatus(el, text, kind) {
  el.textContent = text;
  el.className = "status" + (kind ? " " + kind : "");
}

let allEntries = [];
let settingsCache = { lockMinutes: 5, idleSeconds: 60 };

async function refresh() {
  const status = await send({ type: "getStatus" });
  if (!status.hasVault) {
    show("view-setup");
  } else if (status.locked) {
    show("view-locked");
    $("unlock-pw").value = "";
    $("unlock-pw").focus();
  } else {
    show("view-unlocked");
    settingsCache = { lockMinutes: status.lockMinutes, idleSeconds: status.idleSeconds };
    await loadEntries();
  }
}

// ---------- setup ----------
$("setup-btn").addEventListener("click", async () => {
  const pw = $("setup-pw").value;
  const pw2 = $("setup-pw2").value;
  if (pw.length < 4) return setStatus($("setup-status"), t("min4"), "error");
  if (pw !== pw2) return setStatus($("setup-status"), t("pwMismatch"), "error");
  await send({
    type: "setup",
    password: pw,
    lockMinutes: Number($("setup-lock").value) || 5,
    idleSeconds: Number($("setup-idle").value) || 60,
  });
  refresh();
});

// ---------- unlock ----------
$("unlock-btn").addEventListener("click", unlock);
$("unlock-pw").addEventListener("keydown", (e) => { if (e.key === "Enter") unlock(); });
async function unlock() {
  const res = await send({ type: "unlock", password: $("unlock-pw").value });
  if (res.ok) refresh();
  else setStatus($("unlock-status"), t("wrongMasterPw"), "error");
}

// ---------- lock ----------
$("lock-btn").addEventListener("click", async () => {
  await send({ type: "lock" });
  refresh();
});

// ---------- entries ----------
async function loadEntries() {
  const res = await send({ type: "getEntries" });
  if (res.locked) return refresh();
  allEntries = res.entries || [];
  renderList();
}

function renderList() {
  const term = $("search").value.trim().toLowerCase();
  const entries = term
    ? allEntries.filter(
        (e) =>
          (e.label || "").toLowerCase().includes(term) ||
          (e.url || "").toLowerCase().includes(term)
      )
    : allEntries;

  $("count").textContent =
    allEntries.length + " " + (allEntries.length === 1 ? t("entryOne") : t("entryMany"));

  const list = $("entry-list");
  list.innerHTML = "";

  if (allEntries.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("noEntries");
    list.append(p);
    return;
  }
  if (entries.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("noResultsPre") + term + t("noResultsPost");
    list.append(p);
    return;
  }

  for (const e of entries) {
    const row = document.createElement("div");
    row.className = "entry";

    const info = document.createElement("div");
    info.className = "info";
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = e.label || t("noName");
    const url = document.createElement("div");
    url.className = "url";
    url.textContent = e.url;
    const pw = document.createElement("div");
    pw.className = "pw";
    const masked = "\u2022".repeat(Math.min(e.password.length, 14));
    pw.textContent = masked;
    info.append(label, url, pw);

    const actions = document.createElement("div");
    actions.className = "actions";

    const showBtn = document.createElement("button");
    showBtn.className = "secondary small";
    showBtn.textContent = t("show");
    let visible = false;
    showBtn.addEventListener("click", () => {
      visible = !visible;
      pw.textContent = visible ? e.password : masked;
      showBtn.textContent = visible ? t("hide") : t("show");
    });

    const copyBtn = document.createElement("button");
    copyBtn.className = "secondary small";
    copyBtn.textContent = t("copy");
    let copyTimer = null;
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(e.password);
      } catch {
        // Fallback voor het geval clipboard-API niet beschikbaar is.
        const ta = document.createElement("textarea");
        ta.value = e.password;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        ta.remove();
      }
      copyBtn.textContent = t("copied");
      clearTimeout(copyTimer);
      copyTimer = setTimeout(() => { copyBtn.textContent = t("copy"); }, 1200);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "secondary small";
    editBtn.textContent = t("edit");
    editBtn.addEventListener("click", () => openModal(e));

    const delBtn = document.createElement("button");
    delBtn.className = "danger small";
    delBtn.textContent = t("delete");
    delBtn.addEventListener("click", () => openConfirmDelete(e));

    actions.append(showBtn, copyBtn, editBtn, delBtn);
    row.append(info, actions);
    list.append(row);
  }
}

$("search").addEventListener("input", renderList);

// ---------- modal: regel toevoegen / bewerken ----------
const modal = $("modal");

function openModal(entry) {
  setStatus($("m-status"), "");
  if (entry) {
    $("modal-title").textContent = t("modalEdit");
    $("m-id").value = entry.id;
    $("m-label").value = entry.label || "";
    $("m-url").value = entry.url || "";
    $("m-pw").value = entry.password || "";
  } else {
    $("modal-title").textContent = t("modalNew");
    $("m-id").value = "";
    $("m-label").value = "";
    $("m-url").value = "";
    $("m-pw").value = "";
  }
  modal.showModal();
}

$("new-btn").addEventListener("click", () => openModal(null));
$("m-cancel").addEventListener("click", () => modal.close());

$("m-save").addEventListener("click", async () => {
  const url = $("m-url").value.trim();
  const pw = $("m-pw").value;
  if (!url) return setStatus($("m-status"), t("enterUrl"), "error");
  if (!pw) return setStatus($("m-status"), t("enterPw"), "error");

  const entry = {
    id: $("m-id").value || undefined,
    label: $("m-label").value.trim(),
    url,
    password: pw,
  };
  const res = await send({ type: "saveEntry", entry });
  if (res.locked) return refresh();
  allEntries = res.entries;
  modal.close();
  renderList();
});

// ---------- modal: instellingen ----------
const settingsModal = $("settings-modal");

$("settings-btn").addEventListener("click", () => {
  $("set-lock").value = settingsCache.lockMinutes;
  $("set-idle").value = settingsCache.idleSeconds;
  setStatus($("settings-status"), "");
  settingsModal.showModal();
});
$("settings-cancel").addEventListener("click", () => settingsModal.close());
$("settings-save").addEventListener("click", async () => {
  const lockMinutes = Number($("set-lock").value) || 5;
  const idleSeconds = Number($("set-idle").value) || 60;
  await send({ type: "setSettings", lockMinutes, idleSeconds });
  settingsCache = { lockMinutes, idleSeconds };
  setStatus($("settings-status"), t("saved"), "ok");
});

// ---------- modal: hoofdwachtwoord wijzigen ----------
const passwordModal = $("password-modal");

$("change-pw-btn").addEventListener("click", () => {
  settingsModal.close();
  $("pw-current").value = "";
  $("pw-new").value = "";
  $("pw-new2").value = "";
  setStatus($("password-status"), "");
  passwordModal.showModal();
});
$("password-cancel").addEventListener("click", () => passwordModal.close());
$("password-save").addEventListener("click", async () => {
  const cur = $("pw-current").value;
  const nw = $("pw-new").value;
  const nw2 = $("pw-new2").value;
  if (nw.length < 4) return setStatus($("password-status"), t("min4"), "error");
  if (nw !== nw2) return setStatus($("password-status"), t("pwMismatch"), "error");

  const res = await send({ type: "changeMasterPassword", currentPassword: cur, newPassword: nw });
  if (!res.ok) {
    const msg =
      res.reason === "bad-current" ? t("wrongCurrentPw")
      : res.reason === "locked" ? t("vaultLocked")
      : res.reason === "weak" ? t("min4")
      : t("changePwFailed");
    return setStatus($("password-status"), msg, "error");
  }
  setStatus($("password-status"), t("pwChanged"), "ok");
  setTimeout(() => passwordModal.close(), 900);
});

// ---------- modal: back-up (export / import) ----------
const backupModal = $("backup-modal");
let backupMode = null; // "export" | "import"
let pendingBackup = null;

function backupStep(step) {
  $("backup-actions").classList.toggle("hidden", step !== "actions");
  $("backup-form").classList.toggle("hidden", step !== "form");
}

$("backup-btn").addEventListener("click", () => {
  setStatus($("backup-result"), "");
  backupStep("actions");
  backupModal.showModal();
});
$("backup-close").addEventListener("click", () => backupModal.close());
$("backup-back").addEventListener("click", () => backupStep("actions"));

$("export-btn").addEventListener("click", () => {
  backupMode = "export";
  $("backup-desc").textContent = t("exportDesc");
  $("backup-confirm-wrap").classList.remove("hidden");
  $("backup-pw").value = "";
  $("backup-pw2").value = "";
  $("backup-ok").textContent = t("exportAction");
  setStatus($("backup-status"), "");
  backupStep("form");
});

$("import-btn").addEventListener("click", () => $("import-file").click());
$("import-file").addEventListener("change", async (ev) => {
  const file = ev.target.files[0];
  ev.target.value = "";
  if (!file) return;

  let backup;
  try {
    backup = JSON.parse(await file.text());
  } catch {
    return alert(t("fileReadError"));
  }
  if (!backup || backup.format !== "wm-backup") {
    return alert(t("notValidBackup"));
  }

  pendingBackup = backup;
  backupMode = "import";
  $("backup-desc").textContent = t("importDesc");
  $("backup-confirm-wrap").classList.add("hidden");
  $("backup-pw").value = "";
  $("backup-ok").textContent = t("importAction");
  setStatus($("backup-status"), "");
  backupStep("form");
});

$("backup-ok").addEventListener("click", async () => {
  const pw = $("backup-pw").value;
  if (pw.length < 4) return setStatus($("backup-status"), t("min4"), "error");

  if (backupMode === "export") {
    if (pw !== $("backup-pw2").value) {
      return setStatus($("backup-status"), t("pwMismatch"), "error");
    }
    const res = await send({ type: "exportVault", exportPassword: pw });
    if (!res.ok) {
      return setStatus($("backup-status"), res.reason === "locked" ? t("vaultLocked") : t("exportFailed"), "error");
    }
    downloadBackup(res.backup);
    backupStep("actions");
    setStatus($("backup-result"), t("backupDownloaded"), "ok");
  } else {
    const res = await send({ type: "importVault", exportPassword: pw, backup: pendingBackup });
    if (!res.ok) {
      const msg =
        res.reason === "bad-password" ? t("wrongBackupPw")
        : res.reason === "format" ? t("invalidBackup")
        : t("importFailed");
      return setStatus($("backup-status"), msg, "error");
    }
    allEntries = res.entries;
    renderList();
    backupStep("actions");
    setStatus(
      $("backup-result"),
      t("importResultPre") + res.added + t("importResultAdded") + res.skipped + t("importResultSkipped"),
      "ok"
    );
  }
});

function downloadBackup(backup) {
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const d = new Date();
  const stamp =
    d.getFullYear() +
    String(d.getMonth() + 1).padStart(2, "0") +
    String(d.getDate()).padStart(2, "0");
  const a = document.createElement("a");
  a.href = url;
  a.download = `wachtwoord-kluis-backup-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------- modal: verwijderen bevestigen ----------
const confirmModal = $("confirm-modal");
let pendingDelete = null;

function openConfirmDelete(entry) {
  pendingDelete = entry;
  $("confirm-name").textContent = entry.label
    ? entry.label + " \u2014 " + entry.url
    : entry.url;
  confirmModal.showModal();
}

$("confirm-cancel").addEventListener("click", () => confirmModal.close());
confirmModal.addEventListener("close", () => { pendingDelete = null; });

$("confirm-delete").addEventListener("click", async () => {
  if (!pendingDelete) return confirmModal.close();
  const id = pendingDelete.id;
  confirmModal.close(); // wist ook pendingDelete via de close-listener
  const res = await send({ type: "deleteEntry", id });
  if (res.locked) return refresh();
  allEntries = res.entries;
  renderList();
});

// Reageer op een taalwissel (bijv. via de popup) terwijl deze tab openstaat.
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.lang) {
    WM_I18N.lang = changes.lang.newValue === "en" ? "en" : "nl";
    WM_I18N.apply();
    if (!$("view-unlocked").classList.contains("hidden")) renderList();
  }
});

(async () => {
  await WM_I18N.load();
  WM_I18N.apply();
  refresh();
})();
