/* Korak – Konten, Synchronisierung und Anmeldebildschirm.
 *
 * Prinzip: Supabase ist die Wahrheit. localStorage dient pro Nutzer als Offline-Cache
 * ("korak-user-<id>"). Jede Änderung wird sofort hochgeladen; klappt das nicht (offline),
 * bleibt der Cache als "dirty" markiert und wird beim nächsten Kontakt mit dem Server
 * zusammengeführt. Gäste speichern wie bisher nur lokal unter "korak-v6".
 */
(function () {
  const MODE_KEY = "korak-mode";              // "guest" = bewusst ohne Account
  const LAST_USER_KEY = "korak-last-user";    // {id, username} für den Offline-Start
  const MIGRATED_KEY = "korak-guest-migrated"; // Stand des Gast-Fortschritts bei der letzten Rückfrage
  const VOICE_KEY = "korak-voice";            // Stimme ist gerätespezifisch und wird nicht synchronisiert
  const cacheKey = uid => `korak-user-${uid}`;
  const RETRY = [3000, 10000, 30000, 60000];

  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.warn("Lokaler Speicher voll oder gesperrt", e); } };
  const isNetwork = e => /Verbindung|fetch|network/i.test((e && (e.message || String(e))) || "") || navigator.onLine === false;

  const Account = {
    user: null,          // {id} des angemeldeten Nutzers, sonst null (Gast)
    username: null,
    status: "idle",      // idle | saving | saved | offline | error
    version: 0,          // zählt lokale Änderungen, um überholte Uploads zu erkennen
    updatedAt: null,
    pushing: false,
    retry: 0,
    timer: null,
    signingOut: false
  };
  window.Account = Account;

  // ---------- Zustand ----------
  const withDefaults = s => Object.assign(defaults(), s || {});
  const hasProgress = s => !!s && ((s.completed || []).length > 0 || (s.xp || 0) > 0);

  function adopt(next) {
    state = withDefaults(next);
    state.voice = localStorage.getItem(VOICE_KEY) || state.voice || "";
    resetDaily();
    if (typeof pickVoice === "function" && HAS_TTS) pickVoice();
  }

  /** Führt zwei Stände zusammen, ohne Lernfortschritt zu verlieren.
   *  additive=true: Gast-Fortschritt wird zu einem Konto hinzugefügt (XP etc. addieren).
   *  additive=false: zwei Versionen desselben Kontos (Maximum statt Summe). */
  function mergeStates(a, b, additive = false) {
    a = withDefaults(a); b = withDefaults(b);
    const out = withDefaults(b);
    const add = (x, y) => additive ? (x || 0) + (y || 0) : Math.max(x || 0, y || 0);
    out.xp = add(a.xp, b.xp);
    out.studySeconds = add(a.studySeconds, b.studySeconds);
    if (additive) { out.total = a.total + b.total; out.correct = a.correct + b.correct; }
    else if (a.total > b.total) { out.total = a.total; out.correct = a.correct; }
    const newer = (a.lastStudy || "") > (b.lastStudy || "") ? a : b;
    out.lastStudy = newer.lastStudy;
    out.streak = newer.streak;
    out.bestStreak = Math.max(a.bestStreak || 1, b.bestStreak || 1, out.streak || 1);
    out.completed = [...new Set([...(a.completed || []), ...(b.completed || [])])];
    out.items = Object.assign({}, a.items);
    for (const [k, v] of Object.entries(b.items || {})) {
      const o = out.items[k];
      if (!o || (v.seen || 0) > (o.seen || 0) || ((v.seen || 0) === (o.seen || 0) && (v.due || 0) > (o.due || 0))) out.items[k] = v;
    }
    out.testStars = Object.assign({}, a.testStars);
    for (const [k, v] of Object.entries(b.testStars || {})) out.testStars[k] = Math.max(out.testStars[k] || 0, v || 0);
    const da = a.daily || {}, db = b.daily || {};
    out.daily = da.date === db.date
      ? { date: da.date, exercises: add(da.exercises, db.exercises), reviews: add(da.reviews, db.reviews), dialogues: add(da.dialogues, db.dialogues) }
      : ((da.date || "") > (db.date || "") ? da : db);
    if (b.rate == null && a.rate != null) out.rate = a.rate;
    return out;
  }
  Account.mergeStates = mergeStates;

  // Zähler, die auf mehreren Geräten parallel wachsen können: jedes Gerät trägt nur seinen Zuwachs
  // seit dem letzten Abgleich ("base") bei – so gehen bei gleichzeitigem Lernen keine XP verloren.
  const COUNTERS = ["xp", "total", "correct", "studySeconds"];
  const snapshot = s => Object.fromEntries(COUNTERS.map(k => [k, (s && s[k]) || 0]));
  function mergeWithBase(remote, local, base) {
    const out = mergeStates(remote, local, false);
    if (base) for (const k of COUNTERS) out[k] = (remote[k] || 0) + Math.max(0, (local[k] || 0) - (base[k] || 0));
    return out;
  }
  Account.mergeWithBase = mergeWithBase;

  // ---------- Speichern & Synchronisieren ----------
  function writeCache(dirty) {
    if (!Account.user) return;
    const s = Object.assign({}, state); delete s.voice;
    writeJSON(cacheKey(Account.user.id), { state: s, dirty, updatedAt: Account.updatedAt, base: Account.base, username: Account.username });
  }

  /** Wird von save() in app.js aufgerufen, sobald jemand angemeldet ist. */
  Account.persist = function () {
    Account.version++;
    writeCache(true);
    schedulePush(150);
  };

  function schedulePush(ms) {
    clearTimeout(Account.timer);
    Account.timer = setTimeout(push, ms);
  }

  async function push(extra) {
    if (!Account.user) return;
    if (Account.pushing) { Account.again = true; return; }
    if (!Cloud.available) { setStatus("offline"); return; }
    Account.pushing = true;
    const uid = Account.user.id;
    setStatus("saving");
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const v = Account.version, sent = snapshot(state);
        const res = await Cloud.pushProgress(uid, state, extra, Account.updatedAt);
        if (!Account.user || Account.user.id !== uid) return; // inzwischen abgemeldet
        if (res.conflict) {
          // Ein anderes Gerät hat inzwischen gespeichert: Serverstand holen, zusammenführen, erneut senden
          const remote = await Cloud.fetchProgress(uid);
          if (!Account.user || Account.user.id !== uid) return;
          if (remote) adopt(mergeWithBase(remote.state, state, Account.base));
          Account.updatedAt = remote && remote.updatedAt;
          Account.base = remote ? snapshot(remote.state) : Account.base;
          Account.version++;
          writeCache(true);
          refreshView();
          continue;
        }
        Account.updatedAt = res.updatedAt || Account.updatedAt;
        Account.base = sent;
        Account.retry = 0;
        if (Account.version === v) { writeCache(false); setStatus("saved"); }
        else { writeCache(true); Account.again = true; }
        return;
      }
      Account.again = true; // sehr unwahrscheinlich: wiederholte Konflikte – später erneut
    } catch (e) {
      console.warn("Speichern in Supabase fehlgeschlagen:", e.cause || e);
      setStatus(isNetwork(e) ? "offline" : "error");
      schedulePush(RETRY[Math.min(Account.retry++, RETRY.length - 1)]);
    } finally {
      Account.pushing = false;
      if (Account.again) { Account.again = false; schedulePush(0); }
    }
  }
  Account.flush = async function () {
    clearTimeout(Account.timer);
    if (Account.pushing) await new Promise(r => { const t = setInterval(() => { if (!Account.pushing) { clearInterval(t); r(); } }, 50); });
    const cache = Account.user && readJSON(cacheKey(Account.user.id));
    if (cache && cache.dirty) await push();
    const after = Account.user && readJSON(cacheKey(Account.user.id));
    return !(after && after.dirty);
  };

  /** Holt Änderungen anderer Geräte, z. B. wenn die App wieder in den Vordergrund kommt. */
  async function pull() {
    if (!Account.user || !Cloud.available || Account.pushing) return;
    const uid = Account.user.id;
    try {
      const remote = await Cloud.fetchProgress(uid);
      if (!remote || !Account.user || Account.user.id !== uid || Account.pushing || remote.updatedAt === Account.updatedAt) return;
      const cache = readJSON(cacheKey(uid));
      const dirty = !!(cache && cache.dirty);
      adopt(dirty ? mergeWithBase(remote.state, state, Account.base) : remote.state);
      Account.updatedAt = remote.updatedAt;
      Account.base = snapshot(remote.state);
      writeCache(dirty);
      if (dirty) schedulePush(0); else setStatus("saved");
      refreshView();
    } catch (e) { /* offline – später erneut */ }
  }
  Account.pull = pull;
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") pull(); });
  addEventListener("focus", () => pull());

  addEventListener("online", () => { if (Account.user) { Account.retry = 0; pull().then(() => schedulePush(0)); } });
  addEventListener("offline", () => { if (Account.user) setStatus("offline"); });

  const STATUS_TEXT = {
    idle: "Synchronisierung bereit",
    saving: "Wird gespeichert …",
    saved: "In deinem Konto gespeichert",
    offline: "Offline – wird synchronisiert, sobald du wieder online bist",
    error: "Speichern gerade nicht möglich – neuer Versuch folgt"
  };
  function setStatus(s) {
    Account.status = s;
    const dot = $("#syncDot");
    if (dot) { dot.dataset.state = s; dot.title = STATUS_TEXT[s]; }
    const txt = $("#accountSync");
    if (txt) txt.textContent = Account.user ? STATUS_TEXT[s] : "Nur auf diesem Gerät gespeichert";
  }

  // ---------- Sitzungen ----------
  function currentView() {
    return VIEWS.find(v => $("#" + v).classList.contains("active"));
  }
  function refreshView() {
    const v = currentView();
    renderCommon();
    if (v === "home") renderHome();
    else if (v === "levels") { if ($("#levels").classList.contains("detailOpen")) renderCourse(); else renderLevels(); }
    else if (v === "practice") renderPractice();
    else if (v === "profile") renderProfile();
    else if (v === "achievements") renderAchievements();
    else if (v === "hafen" && window.Social) Social.render();
  }
  function enterApp() {
    document.body.classList.remove("inAuth", "booting");
    updateAccountUI();
    show("home");
  }

  async function enterUser(user, opts = {}) {
    Account.user = { id: user.id };
    const last = readJSON(LAST_USER_KEY);
    Account.username = (user.user_metadata && user.user_metadata.username) || (last && last.id === user.id && last.username) || "…";
    writeJSON(LAST_USER_KEY, { id: user.id, username: Account.username });
    localStorage.removeItem(MODE_KEY);

    const cache = readJSON(cacheKey(user.id));
    adopt(cache ? cache.state : defaults());
    Account.updatedAt = cache && cache.updatedAt;
    Account.base = cache && cache.base;
    Account.version = 0;
    const localDirty = !!(cache && cache.dirty);
    enterApp();
    setStatus(opts.offlineOnly ? "offline" : "saving");
    if (opts.offlineOnly) return;

    try {
      const [remote, uname] = await Promise.all([
        Cloud.fetchProgress(user.id),
        Cloud.fetchUsername(user.id).catch(() => null)
      ]);
      if (!Account.user || Account.user.id !== user.id) return;
      if (uname) { Account.username = uname; writeJSON(LAST_USER_KEY, { id: user.id, username: uname }); updateAccountUI(); }
      // Lokale Änderungen (offline gemacht oder seit dem Start) gehen nie verloren – sonst gilt der Server.
      if (remote) adopt(localDirty || Account.version > 0 ? mergeWithBase(remote.state, state, Account.base) : remote.state);
      Account.updatedAt = remote && remote.updatedAt;
      Account.base = remote ? snapshot(remote.state) : null;
      Account.version++;
      writeCache(true);
      await push({ last_login: new Date().toISOString() });
      refreshView();
      await offerMigration();
      if (window.Social) Social.check();
    } catch (e) {
      console.warn("Fortschritt konnte nicht geladen werden:", e.cause || e);
      setStatus(isNetwork(e) ? "offline" : "error");
      if (!isNetwork(e)) toast(e.message || "Fortschritt konnte nicht geladen werden.");
    }
  }

  function enterGuest() {
    Account.user = null;
    Account.username = null;
    localStorage.setItem(MODE_KEY, "guest");
    adopt(load());
    setStatus("idle");
    enterApp();
  }

  async function offerMigration() {
    const guest = load();
    if (!hasProgress(guest) || !Account.user) return;
    const mark = readJSON(MIGRATED_KEY);
    if (mark && mark.xp >= (guest.xp || 0) && mark.completed >= guest.completed.length) return;
    const n = guest.completed.filter(lessonById).length;
    const yes = await ask({
      title: "Fortschritt übernehmen?",
      text: `Auf diesem Gerät gibt es Fortschritt ohne Account: ${guest.xp} XP und ${n} abgeschlossene ${n === 1 ? "Lektion" : "Lektionen"}. Soll er in dein Profil „${Account.username}“ übernommen werden?`,
      yes: "Übernehmen",
      no: "Nicht übernehmen"
    });
    writeJSON(MIGRATED_KEY, { xp: guest.xp || 0, completed: guest.completed.length, uid: Account.user && Account.user.id, merged: yes });
    if (!yes || !Account.user) return;
    adopt(mergeStates(state, guest, true));
    Account.persist();
    refreshView();
    toast("Fortschritt übernommen und gespeichert.");
  }

  async function logout() {
    closeMenu();
    if (!Account.user) return;
    const synced = await Account.flush().catch(() => false);
    if (!synced) {
      const go = await ask({
        title: "Trotzdem abmelden?",
        text: "Einige Fortschritte konnten noch nicht gespeichert werden, weil keine Verbindung besteht. Wenn du dich jetzt abmeldest, gehen sie verloren.",
        yes: "Trotzdem abmelden",
        no: "Abbrechen",
        danger: true
      });
      if (!go) return;
    }
    Account.signingOut = true;
    const uid = Account.user.id;
    clearTimeout(Account.timer);
    Account.user = null;
    Account.username = null;
    await Cloud.signOut();
    localStorage.removeItem(cacheKey(uid));   // Daten eines Kontos nicht auf geteilten Geräten liegen lassen
    localStorage.removeItem(LAST_USER_KEY);
    Account.signingOut = false;
    adopt(load());
    showAuth("signin");
    toast("Du bist abgemeldet.");
  }

  // ---------- Dialog ----------
  function ask({ title, text, yes, no, danger }) {
    const d = $("#dialog");
    $("#dialogTitle").textContent = title;
    $("#dialogText").textContent = text;
    $("#dialogYes").textContent = yes;
    $("#dialogNo").textContent = no;
    $("#dialogYes").classList.toggle("btnDanger", !!danger);
    return new Promise(resolve => {
      const done = v => { d.close(); resolve(v); };
      $("#dialogYes").onclick = () => done(true);
      $("#dialogNo").onclick = () => done(false);
      d.oncancel = e => { e.preventDefault(); done(false); };
      d.showModal();
    });
  }
  Account.ask = ask;

  // ---------- Kontoanzeige & Menü ----------
  function updateAccountUI() {
    const name = Account.user ? Account.username : "Gast";
    $("#accountName").textContent = name;
    $("#accountAvatar").textContent = Account.user ? (name[0] || "?").toUpperCase() : "?";
    $("#accountBtn").classList.toggle("guest", !Account.user);
    $("#menuName").textContent = Account.user ? name : "Ohne Account";
    $("#menuLogout").classList.toggle("hidden", !Account.user);
    $("#menuLogin").classList.toggle("hidden", !!Account.user);
    setStatus(Account.status);
    if (window.Social) Social.updateBadge();
  }
  Account.updateUI = updateAccountUI;

  function openMenu() {
    const m = $("#accountMenu");
    m.hidden = false;
    requestAnimationFrame(() => m.classList.add("open"));
    $("#accountBtn").setAttribute("aria-expanded", "true");
  }
  function closeMenu() {
    const m = $("#accountMenu");
    m.classList.remove("open");
    $("#accountBtn").setAttribute("aria-expanded", "false");
    setTimeout(() => { if (!m.classList.contains("open")) m.hidden = true; }, 200);
  }
  $("#accountBtn").onclick = e => { e.stopPropagation(); $("#accountMenu").hidden ? openMenu() : closeMenu(); };
  document.addEventListener("click", e => { if (!$("#accountMenu").hidden && !e.target.closest("#accountMenu")) closeMenu(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#accountMenu").hidden) { closeMenu(); $("#accountBtn").focus(); } });
  $("#menuLogout").onclick = logout;
  $("#menuLogin").onclick = () => { closeMenu(); showAuth("signup"); };
  Account.logout = logout;
  Account.showAuth = tab => showAuth(tab);

  /** Profilkopf: Name und Aktionen passend zu Gast/Konto. */
  Account.renderProfileHead = function () {
    const signed = !!Account.user;
    $("#profileMonogram").textContent = signed ? (Account.username[0] || "K").toUpperCase() : "K";
    $("#profileTitle").textContent = signed ? Account.username : "Gast";
    $("#profileSub").textContent = signed
      ? "Dein Fortschritt wird in deinem Konto gespeichert und auf allen Geräten synchronisiert."
      : "Dein Fortschritt liegt nur auf diesem Gerät. Mit einem Account ist er sicher und überall verfügbar.";
    $("#profileLogout").classList.toggle("hidden", !signed);
    $("#profileSignup").classList.toggle("hidden", signed);
  };
  $("#profileLogout").onclick = logout;
  $("#profileSignup").onclick = () => showAuth("signup");

  // ---------- Anmeldebildschirm ----------
  let tab = "signin";
  function showAuth(which) {
    document.body.classList.remove("booting");
    document.body.classList.add("inAuth");
    setTab(which || "signin");
    $("#authOffline").classList.toggle("hidden", Cloud.available);
    show("auth");
    setTimeout(() => $("#authUser").focus(), 350);
  }
  function setTab(which) {
    tab = which;
    const signup = which === "signup";
    document.querySelectorAll(".authTabs button").forEach(b => {
      const on = b.dataset.tab === which;
      b.classList.toggle("active", on);
      b.setAttribute("aria-selected", on);
    });
    $("#authForm").dataset.mode = which;
    $("#confirmField").classList.toggle("hidden", !signup);
    $("#authPass").autocomplete = signup ? "new-password" : "current-password";
    $("#authPassHint").textContent = signup ? `Mindestens ${Cloud.minPasswordLength} Zeichen. Ohne E-Mail gibt es kein Zurücksetzen – merk es dir gut.` : "";
    $("#authUserHint").textContent = signup ? "3–20 Zeichen: Buchstaben, Ziffern und _. Wird in der App angezeigt." : "";
    $("#authSubmit span").textContent = signup ? "Account erstellen" : "Anmelden";
    $("#authTitle").textContent = signup ? "Account erstellen" : "Willkommen zurück";
    clearErrors();
  }
  function clearErrors() {
    document.querySelectorAll("#authForm .fieldError").forEach(e => { e.textContent = ""; });
    document.querySelectorAll("#authForm .field").forEach(f => f.classList.remove("invalid"));
    $("#authError").classList.add("hidden");
    $("#authUserOk").textContent = "";
  }
  function fieldError(field, msg) {
    const map = { username: "authUser", password: "authPass", confirm: "authConfirm" };
    const input = $("#" + (map[field] || "authUser"));
    const f = input.closest(".field");
    f.classList.add("invalid");
    f.querySelector(".fieldError").textContent = msg;
    input.setAttribute("aria-invalid", "true");
  }
  function formError(msg) {
    const box = $("#authError");
    box.textContent = msg;
    box.classList.remove("hidden");
    box.classList.remove("shake"); void box.offsetWidth; box.classList.add("shake");
  }
  function busy(on) {
    const b = $("#authSubmit");
    b.disabled = on;
    b.classList.toggle("loading", on);
    $("#authSubmit span").textContent = on ? (tab === "signup" ? "Account wird erstellt …" : "Anmelden …") : (tab === "signup" ? "Account erstellen" : "Anmelden");
  }

  document.querySelectorAll(".authTabs button").forEach(b => b.onclick = () => { setTab(b.dataset.tab); $("#authUser").focus(); });
  ["authUser", "authPass", "authConfirm"].forEach(id => $("#" + id).addEventListener("input", e => {
    const f = e.target.closest(".field");
    f.classList.remove("invalid");
    f.querySelector(".fieldError").textContent = "";
    e.target.removeAttribute("aria-invalid");
    if (id === "authUser") $("#authUserOk").textContent = "";
  }));
  $("#authUser").addEventListener("blur", async () => {
    if (tab !== "signup") return;
    const name = $("#authUser").value.trim();
    if (!name) return;
    const problem = Cloud.validateUsername(name);
    if (problem) return fieldError("username", problem);
    const free = await Cloud.usernameAvailable(name);
    if (free === false) fieldError("username", "Dieser Username ist schon vergeben.");
    else if (free === true && $("#authUser").value.trim() === name) $("#authUserOk").textContent = "Verfügbar";
  });
  $("#togglePass").onclick = () => {
    const show = $("#authPass").type === "password";
    ["authPass", "authConfirm"].forEach(id => { $("#" + id).type = show ? "text" : "password"; });
    $("#togglePass").textContent = show ? "Verbergen" : "Anzeigen";
    $("#togglePass").setAttribute("aria-pressed", show);
  };

  $("#authForm").onsubmit = async e => {
    e.preventDefault();
    clearErrors();
    const name = $("#authUser").value.trim(), pw = $("#authPass").value, pw2 = $("#authConfirm").value;
    let bad = false;
    if (tab === "signup") {
      const u = Cloud.validateUsername(name); if (u) { fieldError("username", u); bad = true; }
      const p = Cloud.validatePassword(pw); if (p) { fieldError("password", p); bad = true; }
      if (!p && pw !== pw2) { fieldError("confirm", "Die Passwörter stimmen nicht überein."); bad = true; }
    } else {
      if (!name) { fieldError("username", "Bitte gib deinen Username ein."); bad = true; }
      if (!pw) { fieldError("password", "Bitte gib dein Passwort ein."); bad = true; }
    }
    if (bad) { const first = $("#authForm [aria-invalid=true]"); if (first) first.focus(); return; }
    busy(true);
    try {
      if (tab === "signup" && (await Cloud.usernameAvailable(name)) === false) throw new Cloud.CloudError("Dieser Username ist schon vergeben.", "username");
      const session = tab === "signup" ? await Cloud.signUp(name, pw) : await Cloud.signIn(name, pw);
      $("#authPass").value = ""; $("#authConfirm").value = "";
      await enterUser(session.user);
      toast(tab === "signup" ? `Willkommen, ${Account.username}!` : `Dobro došli, ${Account.username}!`);
    } catch (err) {
      console.warn("Anmeldung fehlgeschlagen:", err.cause || err);
      if (err.field) fieldError(err.field, err.message); else formError(err.message || "Da ist etwas schiefgelaufen.");
    } finally {
      busy(false);
    }
  };
  $("#guestBtn").onclick = enterGuest;

  // Abmeldung in einem anderen Tab oder abgelaufene Sitzung
  Cloud.onSignedOut(function () {
    if (!Account.user || Account.signingOut) return;
    const uid = Account.user.id;
    Account.user = null;
    localStorage.removeItem(cacheKey(uid));
    localStorage.removeItem(LAST_USER_KEY);
    adopt(load());
    showAuth("signin");
    toast("Deine Sitzung ist abgelaufen. Bitte melde dich erneut an.");
  });

  // ---------- Start ----------
  async function boot() {
    // Nicht ewig auf die Sitzung warten: Offline mit abgelaufenem Token versucht Supabase bis zu 30 s lang zu erneuern.
    const res = await Promise.race([Cloud.currentSession(), new Promise(r => setTimeout(() => r("timeout"), 3000))]);
    if (res && res !== "timeout" && res.user) return enterUser(res.user);
    const last = readJSON(LAST_USER_KEY);
    const hasCache = !!(last && readJSON(cacheKey(last.id)));
    // Angemeldet, aber gerade kein Server (offline, Token nicht erneuerbar, Skript nicht geladen):
    // mit dem lokalen Cache weiterlernen; synchronisiert wird, sobald wieder Verbindung besteht.
    if (hasCache && (localStorage.getItem("korak-auth") || !Cloud.available)) {
      enterUser({ id: last.id, user_metadata: { username: last.username } }, { offlineOnly: true });
      setTimeout(pull, 2500);
      return;
    }
    if (localStorage.getItem(MODE_KEY) === "guest") return enterGuest();
    showAuth("signin");
  }
  boot();
})();
