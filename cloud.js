/* Korak – Supabase-Anbindung: Anmeldung per Username und Speichern des Fortschritts.
 * Kennt nur Supabase und das Datenformat, nicht die Oberfläche (die steckt in account.js).
 */
(function () {
  const CFG = window.KORAK_CONFIG || {};
  const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;
  const MIN_PW = CFG.minPasswordLength || 8;

  let client = null;
  try {
    if (window.supabase && CFG.supabaseUrl && CFG.supabaseAnonKey) {
      client = window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseAnonKey, {
        // Sitzung bleibt im Browser gespeichert und wird automatisch erneuert, bis aktiv abgemeldet wird.
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, storageKey: "korak-auth" }
      });
    }
  } catch (e) {
    console.warn("Supabase konnte nicht gestartet werden:", e);
  }

  /** Fehler mit einer Meldung für die Oberfläche und dem betroffenen Formularfeld. */
  class CloudError extends Error {
    constructor(message, field = null, cause = null) {
      super(message);
      this.field = field;
      this.cause = cause;
    }
  }

  const emailFor = username => `${username.trim().toLowerCase()}@${CFG.emailDomain || "korak.internal"}`;

  function validateUsername(name) {
    const n = (name || "").trim();
    if (!n) return "Bitte gib einen Username ein.";
    if (n.length < 3) return "Der Username braucht mindestens 3 Zeichen.";
    if (n.length > 20) return "Der Username darf höchstens 20 Zeichen haben.";
    if (!USERNAME_RE.test(n)) return "Erlaubt sind nur Buchstaben (ohne Umlaute), Ziffern und _.";
    return null;
  }
  function validatePassword(pw) {
    if (!pw) return "Bitte gib ein Passwort ein.";
    if (pw.length < MIN_PW) return `Das Passwort braucht mindestens ${MIN_PW} Zeichen.`;
    return null;
  }

  /** Übersetzt Supabase-/Netzwerkfehler in verständliche Meldungen. */
  function friendly(err, context) {
    const code = err && (err.code || err.error_code) || "";
    const msg = (err && err.message || "").toLowerCase();
    const status = err && err.status;
    if (err && (err.name === "AuthRetryableFetchError" || msg.includes("failed to fetch") || msg.includes("networkerror") || status === 0))
      return new CloudError("Keine Verbindung zum Server. Prüfe deine Internetverbindung und versuche es erneut.", null, err);
    if (code === "user_already_exists" || code === "email_exists" || msg.includes("already registered"))
      return new CloudError("Dieser Username ist schon vergeben.", "username", err);
    if (code === "weak_password" || msg.includes("password should"))
      return new CloudError(`Das Passwort ist zu schwach. Nutze mindestens ${MIN_PW} Zeichen.`, "password", err);
    if (code === "invalid_credentials" || msg.includes("invalid login credentials"))
      return new CloudError("Username oder Passwort ist falsch.", "password", err);
    if (code === "email_not_confirmed")
      return new CloudError("Dieser Account ist noch nicht freigeschaltet. (Einstellung: In Supabase muss „Confirm email“ ausgeschaltet sein.)", null, err);
    if (code === "email_address_invalid" || code === "validation_failed")
      return new CloudError("Registrierung ist gerade falsch eingerichtet (ungültige interne Adresse). Bitte später erneut versuchen.", null, err);
    if (code === "over_request_rate_limit" || code === "over_email_send_rate_limit" || status === 429)
      return new CloudError("Zu viele Versuche in kurzer Zeit. Bitte warte einen Moment.", null, err);
    if (code === "signup_disabled")
      return new CloudError("Neue Registrierungen sind im Moment deaktiviert.", null, err);
    if (context === "signup" && (msg.includes("database error") || status === 500))
      // Tritt auf, wenn der Username-Trigger scheitert, z. B. weil der Name (anders geschrieben) schon existiert
      return new CloudError("Dieser Username ist schon vergeben.", "username", err);
    return new CloudError("Da ist etwas schiefgelaufen. Bitte versuche es erneut.", null, err);
  }

  function need() {
    if (!client) throw new CloudError("Konten sind gerade nicht erreichbar (keine Verbindung zum Server). Du kannst ohne Account weiterlernen.");
  }

  // ---------- Datenformat: App-Zustand <-> Zeile in "progress" ----------
  function toRow(s) {
    return {
      xp: Math.max(0, s.xp | 0),
      streak: Math.max(0, s.streak | 0),
      best_streak: Math.max(0, s.bestStreak | 0),
      last_study: s.lastStudy || null,
      completed_lessons: Array.isArray(s.completed) ? s.completed : [],
      item_stats: s.items || {},
      test_stars: s.testStars || {},
      daily: s.daily || {},
      total_answers: Math.max(0, s.total | 0),
      correct_answers: Math.max(0, s.correct | 0),
      study_seconds: Math.max(0, s.studySeconds | 0),
      last_lesson: s.lastLesson || null,
      selected_level: s.selectedLevel || null,
      speech_rate: typeof s.rate === "number" ? s.rate : null
    };
  }
  function fromRow(r) {
    const s = {
      xp: r.xp || 0,
      streak: r.streak || 1,
      bestStreak: r.best_streak || 1,
      lastStudy: r.last_study || null,
      completed: r.completed_lessons || [],
      items: r.item_stats || {},
      testStars: r.test_stars || {},
      daily: r.daily && r.daily.date ? r.daily : { date: "", exercises: 0, reviews: 0, dialogues: 0 },
      total: r.total_answers || 0,
      correct: r.correct_answers || 0,
      studySeconds: r.study_seconds || 0
    };
    if (r.last_lesson) s.lastLesson = r.last_lesson;
    if (r.selected_level) s.selectedLevel = r.selected_level;
    if (typeof r.speech_rate === "number") s.rate = r.speech_rate;
    return s;
  }

  // ---------- Öffentliche Schnittstelle ----------
  window.Cloud = {
    get available() { return !!client; },
    CloudError,
    validateUsername,
    validatePassword,
    minPasswordLength: MIN_PW,
    toRow,
    fromRow,

    /** Gespeicherte Sitzung (funktioniert auch offline, solange sie im Browser liegt). */
    async currentSession() {
      if (!client) return null;
      try {
        const { data } = await client.auth.getSession();
        return data && data.session || null;
      } catch (e) {
        console.warn("Sitzung nicht lesbar:", e);
        return null;
      }
    },

    /** true/false, oder null wenn unbekannt (offline, Funktion fehlt). */
    async usernameAvailable(name) {
      if (!client || validateUsername(name)) return null;
      try {
        const { data, error } = await client.rpc("username_available", { name: name.trim() });
        return error ? null : !!data;
      } catch (e) { return null; }
    },

    async signUp(username, password) {
      need();
      const name = username.trim();
      const { data, error } = await client.auth.signUp({ email: emailFor(name), password, options: { data: { username: name } } })
        .catch(e => ({ data: null, error: e }));
      if (error) throw friendly(error, "signup");
      if (!data.session) {
        // Nur möglich, wenn in Supabase die E-Mail-Bestätigung aktiv ist – mit Pseudo-Adressen kommt die nie an.
        throw new CloudError("Registrierung fast fertig, aber der Account muss erst freigeschaltet werden. (Einstellung: In Supabase „Confirm email“ ausschalten.)");
      }
      return data.session;
    },

    async signIn(username, password) {
      need();
      const { data, error } = await client.auth.signInWithPassword({ email: emailFor(username), password })
        .catch(e => ({ data: null, error: e }));
      if (error) throw friendly(error, "signin");
      return data.session;
    },

    /** Ruft cb auf, wenn die Sitzung außerhalb dieser Seite endet (anderer Tab, abgelaufen). */
    onSignedOut(cb) {
      if (!client) return;
      client.auth.onAuthStateChange(event => { if (event === "SIGNED_OUT") setTimeout(cb, 0); });
    },

    async signOut() {
      if (!client) return;
      try {
        const { error } = await client.auth.signOut();
        if (error) throw error;
      } catch (e) {
        // Offline: Sitzung wenigstens lokal beenden
        await client.auth.signOut({ scope: "local" }).catch(() => {});
      }
    },

    async fetchUsername(uid) {
      need();
      const { data, error } = await client.from("profiles").select("username").eq("user_id", uid).maybeSingle();
      if (error) throw friendly(error);
      return data && data.username || null;
    },

    /** Liefert {state, updatedAt} oder null, wenn noch keine Zeile existiert. */
    async fetchProgress(uid) {
      need();
      const { data, error } = await client.from("progress").select("*").eq("user_id", uid).maybeSingle();
      if (error) throw friendly(error);
      return data ? { state: fromRow(data), updatedAt: data.updated_at } : null;
    },

    /** Schreibt den kompletten Fortschritt.
     *  Mit knownUpdatedAt wird nur überschrieben, wenn seit dem letzten Abgleich niemand anderes
     *  (z. B. ein zweites Gerät) gespeichert hat – sonst {conflict:true}, und der Aufrufer führt zusammen. */
    async pushProgress(uid, state, extra = {}, knownUpdatedAt = null) {
      need();
      const row = Object.assign(toRow(state), extra);
      if (knownUpdatedAt) {
        const { data, error } = await client.from("progress").update(row)
          .eq("user_id", uid).eq("updated_at", knownUpdatedAt).select("updated_at");
        if (error) throw friendly(error);
        return data && data.length ? { updatedAt: data[0].updated_at } : { conflict: true };
      }
      const { data, error } = await client.from("progress").upsert(Object.assign({ user_id: uid }, row), { onConflict: "user_id" })
        .select("updated_at").single();
      if (error) throw friendly(error);
      return { updatedAt: data && data.updated_at };
    },

    // ---------- Hafen: Freunde & Regatta (supabase/social.sql) ----------
    // Liefern über andere Nutzer nur Username, Serie, Wochen-XP und Kapitelzahl.
    async social(fn, args) {
      need();
      let data = null, error = null;
      try { ({ data, error } = await client.rpc(fn, args || {})); } catch (e) { error = e; }
      if (error) {
        if (error.code === "PGRST202" || error.code === "42883") throw new CloudError("Der Hafen ist noch nicht eingerichtet (supabase/social.sql fehlt).", "setup");
        throw friendly(error);
      }
      return data;
    },
    searchUsers(q) { return this.social("search_users", { q }); },
    sendFriendRequest(username) { return this.social("send_friend_request", { target: username }); },
    respondFriendRequest(id, accept) { return this.social("respond_friend_request", { request_id: id, accept }); },
    removeFriend(id) { return this.social("remove_friend", { friendship_id: id }); },
    socialOverview() { return this.social("social_overview"); },
    leagueStandings() { return this.social("league_standings"); }
  };
})();
