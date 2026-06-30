// i18n.js — gedeelde vertalingen (NL/EN) voor popup, manager en content script.
// De gekozen taal staat in chrome.storage.local onder "lang" en geldt overal.

globalThis.WM_MESSAGES = {
  nl: {
    // gedeeld
    appName: "Wachtwoord Manager",
    masterPw: "Hoofdwachtwoord / PIN",
    unlock: "Ontgrendelen",
    lock: "Vergrendelen",
    wrongMasterPw: "Onjuist hoofdwachtwoord.",
    close: "Sluiten",
    repeat: "Herhaal",
    autolockMin: "Auto-lock (minuten)",
    idleSec: "Afwezig na (seconden)",
    min4: "Minimaal 4 tekens.",
    pwMismatch: "Wachtwoorden komen niet overeen.",
    save: "Opslaan",
    cancel: "Annuleren",

    // popup
    noVault: "Nog geen kluis ingesteld.",
    setupVault: "Kluis instellen",
    locked: "Vergrendeld",
    unlocked: "Ontgrendeld",
    openManager: "Beheer openen",
    savedPwOne: "opgeslagen wachtwoord",
    savedPwMany: "opgeslagen wachtwoorden",

    // manager — setup
    setupTitle: "Kluis instellen",
    setupIntro: "Kies een hoofdwachtwoord of PIN. Dit ontgrendelt de kluis en wordt niet bewaard.",
    createVault: "Kluis aanmaken",

    // manager — unlocked
    passwordsTitle: "Wachtwoorden",
    newEntry: "+ Nieuw",
    settings: "Instellingen",
    backup: "Back-up",
    searchPlaceholder: "Zoeken op naam of URL...",
    entryOne: "regel",
    entryMany: "regels",
    show: "Toon",
    hide: "Verberg",
    copy: "Kopieer",
    copied: "Gekopieerd \u2713",
    edit: "Bewerk",
    delete: "Verwijder",
    noName: "(zonder naam)",
    noEntries: "Nog geen regels. Klik op \u201C+ Nieuw\u201D.",
    noResultsPre: "Geen resultaten voor \u201C",
    noResultsPost: "\u201D.",
    confirmDeleteTitle: "Verwijderen?",
    confirmDeleteText: "Weet je zeker dat je deze regel wilt verwijderen? Dit kan niet ongedaan worden gemaakt.",

    // manager — entry-modal
    modalNew: "Nieuwe regel",
    modalEdit: "Regel bewerken",
    nameLabel: "Naam (label)",
    namePlaceholder: "Bijv. Mijn server",
    urlLabel: "URL (host, bijv. example.com of *.example.com)",
    pwForUrlLabel: "Wachtwoord voor deze URL",
    pwForUrlPlaceholder: "site-wachtwoord",
    enterUrl: "Vul een URL/host in.",
    enterPw: "Vul een wachtwoord in.",

    // manager — instellingen
    saved: "Opgeslagen \u2713",
    changePwTitle: "Hoofdwachtwoord wijzigen",
    changePwBtn: "Hoofdwachtwoord wijzigen\u2026",
    currentPw: "Huidig hoofdwachtwoord",
    newPw: "Nieuw hoofdwachtwoord",
    wrongCurrentPw: "Huidig wachtwoord klopt niet.",
    pwChanged: "Hoofdwachtwoord gewijzigd \u2713",
    changePwFailed: "Wijzigen mislukt.",

    // manager — back-up
    backupIntro: "Maak een versleutelde back-up van je kluis, of zet er een terug. De back-up wordt beveiligd met een wachtwoord dat je zelf kiest.",
    exportEllipsis: "Exporteren\u2026",
    importEllipsis: "Importeren\u2026",
    backupPwLabel: "Back-up-wachtwoord",
    continueBtn: "Doorgaan",
    back: "Terug",
    exportDesc: "Kies een wachtwoord om de back-up te versleutelen. Je hebt dit nodig om te importeren.",
    importDesc: "Voer het wachtwoord in waarmee deze back-up is versleuteld. De regels worden samengevoegd met je huidige kluis.",
    exportAction: "Exporteren",
    importAction: "Importeren",
    backupDownloaded: "Back-up gedownload \u2713",
    vaultLocked: "Kluis is vergrendeld.",
    exportFailed: "Export mislukt.",
    importFailed: "Import mislukt.",
    wrongBackupPw: "Onjuist back-up-wachtwoord.",
    invalidBackup: "Ongeldige back-up.",
    importResultPre: "Ge\u00EFmporteerd: ",
    importResultAdded: " toegevoegd, ",
    importResultSkipped: " overgeslagen.",
    fileReadError: "Kon het bestand niet lezen (geen geldige JSON).",
    notValidBackup: "Dit is geen geldige back-up van deze manager.",

    // content script — meldingen
    toastLockedTitle: "Kluis vergrendeld",
    toastLockedSub: "Ontgrendel om de wachtwoorden op deze pagina te tonen.",
    unlockShort: "Ontgrendel",
    wrongPw: "Onjuist wachtwoord.",
    noConnection: "Geen verbinding met de extensie.",
    toastAddTitle: "URL toevoegen",
    toastAddSub1: "Deze pagina staat nog niet in de manager:",
    toastAddSub2: "Voer het wachtwoord voor deze URL in om het op te slaan.",
    toastAddPlaceholder: "Wachtwoord voor deze URL",
    addBtn: "Toevoegen",
    addWrongPw: "Wachtwoord klopt niet voor deze pagina.",
    addFailed: "Toevoegen mislukt.",

    // popup + crypto-venster — versleutelen/ontsleutelen
    cryptoOpen: "Versleutelen / ontsleutelen\u2026",
    cryptoTitle: "Versleutelen / ontsleutelen",
    modeEncrypt: "Versleutelen",
    modeDecrypt: "Ontsleutelen",
    sourceSaved: "Opgeslagen wachtwoord",
    sourceManual: "Handmatig wachtwoord",
    selectEntryLabel: "Kies een opgeslagen URL / wachtwoord",
    manualPwLabel: "Wachtwoord",
    manualPwPlaceholder: "Voer een wachtwoord in\u2026",
    showPw: "Toon",
    hidePw: "Verberg",
    inputPlainLabel: "Tekst",
    inputCipherLabel: "Versleutelde tekst (met of zonder tags)",
    encryptPlaceholder: "Typ of plak hier de geheime tekst\u2026",
    cipherPlaceholder: "Plak hier de <encrypt-tekst-excrypt>\u2026</encrypt-tekst-excrypt> of alleen de code\u2026",
    encryptDoBtn: "Versleutel & kopieer",
    decryptDoBtn: "Ontsleutel",
    encryptResultLabel: "Resultaat:",
    decryptResultLabel: "Ontsleutelde tekst:",
    encryptEmpty: "Voer eerst een tekst in.",
    needManualPw: "Voer een wachtwoord in.",
    pickEntry: "Kies een opgeslagen wachtwoord.",
    savedLockedHint: "Ontgrendel de kluis om opgeslagen wachtwoorden te gebruiken.",
    noEntriesHint: "Geen opgeslagen wachtwoorden.",
    encryptFailed: "Versleutelen mislukt.",
    decryptFailed: "Ontsleutelen mislukt \u2014 controleer wachtwoord en tekst.",
    decryptedOk: "Ontsleuteld \u2713",
    encryptCopiedFull: "Gekopieerd naar klembord \u2713",
  },

  en: {
    // shared
    appName: "Password Manager",
    masterPw: "Master password / PIN",
    unlock: "Unlock",
    lock: "Lock",
    wrongMasterPw: "Incorrect master password.",
    close: "Close",
    repeat: "Repeat",
    autolockMin: "Auto-lock (minutes)",
    idleSec: "Idle after (seconds)",
    min4: "At least 4 characters.",
    pwMismatch: "Passwords do not match.",
    save: "Save",
    cancel: "Cancel",

    // popup
    noVault: "No vault set up yet.",
    setupVault: "Set up vault",
    locked: "Locked",
    unlocked: "Unlocked",
    openManager: "Open manager",
    savedPwOne: "saved password",
    savedPwMany: "saved passwords",

    // manager — setup
    setupTitle: "Set up vault",
    setupIntro: "Choose a master password or PIN. It unlocks the vault and is not stored.",
    createVault: "Create vault",

    // manager — unlocked
    passwordsTitle: "Passwords",
    newEntry: "+ New",
    settings: "Settings",
    backup: "Backup",
    searchPlaceholder: "Search by name or URL...",
    entryOne: "entry",
    entryMany: "entries",
    show: "Show",
    hide: "Hide",
    copy: "Copy",
    copied: "Copied \u2713",
    edit: "Edit",
    delete: "Delete",
    noName: "(no name)",
    noEntries: "No entries yet. Click \u201C+ New\u201D.",
    noResultsPre: "No results for \u201C",
    noResultsPost: "\u201D.",
    confirmDeleteTitle: "Delete?",
    confirmDeleteText: "Are you sure you want to delete this entry? This cannot be undone.",

    // manager — entry modal
    modalNew: "New entry",
    modalEdit: "Edit entry",
    nameLabel: "Name (label)",
    namePlaceholder: "E.g. My server",
    urlLabel: "URL (host, e.g. example.com or *.example.com)",
    pwForUrlLabel: "Password for this URL",
    pwForUrlPlaceholder: "site password",
    enterUrl: "Enter a URL/host.",
    enterPw: "Enter a password.",

    // manager — settings
    saved: "Saved \u2713",
    changePwTitle: "Change master password",
    changePwBtn: "Change master password\u2026",
    currentPw: "Current master password",
    newPw: "New master password",
    wrongCurrentPw: "Current password is incorrect.",
    pwChanged: "Master password changed \u2713",
    changePwFailed: "Could not change the password.",

    // manager — backup
    backupIntro: "Create an encrypted backup of your vault, or restore one. The backup is protected with a password you choose.",
    exportEllipsis: "Export\u2026",
    importEllipsis: "Import\u2026",
    backupPwLabel: "Backup password",
    continueBtn: "Continue",
    back: "Back",
    exportDesc: "Choose a password to encrypt the backup. You'll need it to import.",
    importDesc: "Enter the password this backup was encrypted with. The entries will be merged into your current vault.",
    exportAction: "Export",
    importAction: "Import",
    backupDownloaded: "Backup downloaded \u2713",
    vaultLocked: "Vault is locked.",
    exportFailed: "Export failed.",
    importFailed: "Import failed.",
    wrongBackupPw: "Incorrect backup password.",
    invalidBackup: "Invalid backup.",
    importResultPre: "Imported: ",
    importResultAdded: " added, ",
    importResultSkipped: " skipped.",
    fileReadError: "Could not read the file (invalid JSON).",
    notValidBackup: "This is not a valid backup from this manager.",

    // content script — toasts
    toastLockedTitle: "Vault locked",
    toastLockedSub: "Unlock to show the passwords on this page.",
    unlockShort: "Unlock",
    wrongPw: "Incorrect password.",
    noConnection: "No connection to the extension.",
    toastAddTitle: "Add URL",
    toastAddSub1: "This page is not in the manager yet:",
    toastAddSub2: "Enter the password for this URL to save it.",
    toastAddPlaceholder: "Password for this URL",
    addBtn: "Add",
    addWrongPw: "Password is not correct for this page.",
    addFailed: "Could not add.",

    // popup + crypto window — encrypt/decrypt
    cryptoOpen: "Encrypt / decrypt\u2026",
    cryptoTitle: "Encrypt / decrypt",
    modeEncrypt: "Encrypt",
    modeDecrypt: "Decrypt",
    sourceSaved: "Saved password",
    sourceManual: "Manual password",
    selectEntryLabel: "Choose a saved URL / password",
    manualPwLabel: "Password",
    manualPwPlaceholder: "Enter a password\u2026",
    showPw: "Show",
    hidePw: "Hide",
    inputPlainLabel: "Text",
    inputCipherLabel: "Encrypted text (with or without tags)",
    encryptPlaceholder: "Type or paste the secret text here\u2026",
    cipherPlaceholder: "Paste the <encrypt-tekst-excrypt>\u2026</encrypt-tekst-excrypt> or just the code\u2026",
    encryptDoBtn: "Encrypt & copy",
    decryptDoBtn: "Decrypt",
    encryptResultLabel: "Result:",
    decryptResultLabel: "Decrypted text:",
    encryptEmpty: "Enter some text first.",
    needManualPw: "Enter a password.",
    pickEntry: "Choose a saved password.",
    savedLockedHint: "Unlock the vault to use saved passwords.",
    noEntriesHint: "No saved passwords.",
    encryptFailed: "Encryption failed.",
    decryptFailed: "Decryption failed \u2014 check the password and text.",
    decryptedOk: "Decrypted \u2713",
    encryptCopiedFull: "Copied to clipboard \u2713",
  },
};

globalThis.WM_I18N = {
  lang: "nl",

  async load() {
    try {
      const { lang } = await chrome.storage.local.get("lang");
      this.lang = lang === "en" ? "en" : "nl";
    } catch {
      this.lang = "nl";
    }
    return this.lang;
  },

  async set(lang) {
    this.lang = lang === "en" ? "en" : "nl";
    try {
      await chrome.storage.local.set({ lang: this.lang });
    } catch {
      /* opslaan mislukt; taal geldt dan alleen voor deze sessie */
    }
    return this.lang;
  },

  t(key) {
    const dict = WM_MESSAGES[this.lang] || WM_MESSAGES.nl;
    if (key in dict) return dict[key];
    return key in WM_MESSAGES.nl ? WM_MESSAGES.nl[key] : key;
  },

  // Vertaal statische elementen met data-i18n / data-i18n-ph / data-i18n-title.
  apply(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      el.textContent = this.t(el.getAttribute("data-i18n"));
    });
    scope.querySelectorAll("[data-i18n-ph]").forEach((el) => {
      el.setAttribute("placeholder", this.t(el.getAttribute("data-i18n-ph")));
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((el) => {
      el.setAttribute("title", this.t(el.getAttribute("data-i18n-title")));
    });
    try {
      document.documentElement.lang = this.lang;
    } catch {
      /* geen document (zou niet voorkomen) */
    }
  },
};
