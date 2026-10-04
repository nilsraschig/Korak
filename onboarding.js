/* Korak – Onboarding vor der Registrierung („Vala packt deinen Plan“).
 *
 * Die Schritte stehen als Daten in STEPS – Fragen, Antworten und Valas Texte lassen sich hier direkt ändern.
 * Typen: intro | choice | scene | chart | minutes | building | plan
 *   field: in welches Profilfeld die Antwort geschrieben wird
 *   bag:   welches Souvenir Vala nach der Antwort einpackt (Zeichnungen aus vala.js)
 *
 * Start:  Onboarding.start({ mode: "first" })  – allererster Start (account.js)
 *         Onboarding.start({ mode: "edit" })   – „Plan anpassen“ im Profil / auf der Startseite
 * Ergebnis: Profil in localStorage "korak-profile" (siehe plan.js), Fortschritt bleibt unberührt.
 */
(function () {
  const STEPS = [
    {
      id: "welcome", type: "intro",
      say: "Bok! Ich bin Vala.",
      text: "Ich begleite dich auf einer Reise entlang der kroatischen Küste – von Poreč bis Dubrovnik. Beantworte mir ein paar kurze Fragen, dann packe ich deinen persönlichen Lernplan.",
      cta: "Los geht’s"
    },
    {
      id: "level", type: "choice", field: "level", bag: "olive",
      say: "Wie viel Kroatisch kannst du schon?",
      options: [
        { value: "A0", label: "Bei null", hint: "Ich fange ganz neu an", tag: "A0" },
        { value: "A1", label: "Ein paar Wörter", hint: "Bok, hvala, kava …", tag: "A1" },
        { value: "A2", label: "Einfache Gespräche", hint: "Bestellen, nach dem Weg fragen", tag: "A2" },
        { value: "B1", label: "Alltag gut", hint: "Ich komme im Alltag zurecht", tag: "B1" }
      ]
    },
    {
      id: "goal", type: "choice", field: "goal", bag: "shell",
      say: "Was möchtest du mit Kroatisch erreichen?",
      options: [
        { value: "grundlagen", label: "Grundlagen lernen", hint: "Wörter, Aussprache, erste Sätze" },
        { value: "sprechen", label: "Sprechen verbessern", hint: "Sicherer im Gespräch werden" },
        { value: "fliessend", label: "Fließend werden", hint: "Langfristig richtig gut sprechen" },
        { value: "unsicher", label: "Weiß ich noch nicht", hint: "Erst mal reinschnuppern" }
      ]
    },
    {
      id: "scene", type: "scene",
      say: "Idemo! Unser Boot legt in Poreč ab.",
      text: "Jeder Ort an der Küste ist ein Kapitel. Korak po korak – Schritt für Schritt – segeln wir gemeinsam bis nach Dubrovnik."
    },
    {
      id: "reason", type: "choice", field: "reason", bag: "postcard", compact: true,
      say: "Und warum Kroatisch? Ich bin neugierig!",
      options: [
        { value: "urlaub", label: "Urlaub" },
        { value: "familie", label: "Familie & Partner" },
        { value: "wurzeln", label: "Meine Wurzeln" },
        { value: "job", label: "Job" },
        { value: "leben", label: "Leben in Kroatien" },
        { value: "studium", label: "Studium" },
        { value: "sonstiges", label: "Etwas anderes" }
      ]
    },
    {
      id: "style", type: "choice", field: "style", bag: "cup",
      say: "Wie lernst du am liebsten?",
      text: "Ich mische weiter alle Übungsarten, setze aber Schwerpunkte.",
      options: [
        { value: "sprechen", label: "Sprechen", hint: "Dialoge, Rollenspiele, nachsprechen" },
        { value: "lesen", label: "Lesen & Schreiben", hint: "Sätze bauen, tippen, korrigieren" },
        { value: "hoeren", label: "Zuhören", hint: "Hörübungen und Aussprache" }
      ]
    },
    {
      id: "curve", type: "chart",
      say: "Ein bisschen jeden Tag bringt dich weiter als viel auf einmal.",
      text: "Mit kurzen, regelmäßigen Einheiten und klugen Wiederholungen bleibt Gelerntes hängen."
    },
    {
      id: "time", type: "minutes", field: "minutesPerDay", timeField: "reminderTime", bag: "lavender",
      say: "Wie viel Zeit nimmst du dir am Tag?",
      options: [
        { value: 5, label: "5 Minuten", hint: "Locker" },
        { value: 10, label: "10 Minuten", hint: "Entspannt" },
        { value: 15, label: "15 Minuten", hint: "Ernsthaft" },
        { value: 30, label: "30 Minuten", hint: "Intensiv" }
      ],
      timeLabel: "Wann soll ich dich erinnern?",
      timeNote: "Die Uhrzeit merke ich mir schon – Erinnerungen kommen mit einem späteren Update."
    },
    { id: "building", type: "building", say: "Ich packe deinen Plan …" },
    { id: "plan", type: "plan", say: "Tvoj plan je spreman! Dein Plan ist fertig." }
  ];

  // Ein Satz zum Hauptgrund auf der Plan-Seite
  const REASON_LINE = {
    urlaub: "Damit du im nächsten Urlaub bestellst, fragst und plauderst.",
    familie: "Damit du mit deinen Liebsten auf Kroatisch sprechen kannst.",
    wurzeln: "Damit die Sprache deiner Familie wieder ein Stück deine wird.",
    job: "Damit du im Job sicher auf Kroatisch kommunizierst.",
    leben: "Damit du dich in Kroatien schnell zu Hause fühlst.",
    studium: "Damit du im Studium in Kroatien gut mitkommst.",
    sonstiges: "Ganz egal warum – wir segeln gemeinsam los."
  };

  const $ = s => document.querySelector(s);
  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
  const BAG_STEPS = STEPS.filter(s => s.bag);
  let mode = "first", pos = 0, draft = {}, timers = [];

  function clearTimers() { timers.forEach(clearTimeout); timers = []; }
  const later = (fn, ms) => timers.push(setTimeout(fn, reduced() ? Math.min(ms, 60) : ms));

  // ---------- Start / Ende ----------
  function start(opts = {}) {
    mode = opts.mode === "edit" ? "edit" : "first";
    const prev = window.Plan && Plan.readProfile();
    draft = mode === "edit" && prev ? { ...prev } : { reminderTime: "19:00" };
    if (!draft.reminderTime) draft.reminderTime = "19:00";
    pos = mode === "edit" ? 1 : 0;
    document.body.classList.remove("booting");
    document.body.classList.add("inAuth", "inOnboarding");
    show("onboarding");
    render();
  }

  function leave() {
    clearTimers();
    document.body.classList.remove("inOnboarding", "inAuth");
  }

  function saveProfile() {
    const profile = {
      level: draft.level, goal: draft.goal, reason: draft.reason, style: draft.style,
      minutesPerDay: Number(draft.minutesPerDay) || 10, reminderTime: draft.reminderTime || "19:00",
      onboardedAt: new Date().toISOString()
    };
    Plan.saveProfile(profile);
    return profile;
  }

  // Startlevel des Plans übernehmen, solange noch nichts erledigt ist (bestehender Fortschritt bleibt unangetastet)
  function applyStartLevel() {
    const p = Plan.current();
    if (!p || typeof state === "undefined") return;
    if (!state.completed.length || mode === "edit") { state.selectedLevel = p.startLevel; save(); }
  }

  function finish(action) {
    saveProfile();
    if (action === "signup") {
      leave();
      Account.showAuth("signup");
      return;
    }
    if (action === "guest") {
      leave();
      Account.enterGuest();
      applyStartLevel();
      show("home");
      return;
    }
    // „Plan übernehmen“ im Bearbeiten-Modus
    leave();
    applyStartLevel();
    show("home");
    toast("Dein Plan ist angepasst. Sretan put!");
  }

  function cancel() {
    leave();
    show("profile");
  }

  // ---------- Darstellung ----------
  function render() {
    clearTimers();
    const step = STEPS[pos], root = $("#onboarding");
    const answered = BAG_STEPS.filter(s => draft[s.field] != null && STEPS.indexOf(s) < pos || (s === step && draft[s.field] != null));
    root.innerHTML = `
      <div class="obTop">
        ${pos > (mode === "edit" ? 1 : 0) ? `<button type="button" class="iconBtn obBack" aria-label="Zurück"><svg class="ico"><use href="#i-back"/></svg></button>` : `<span class="obBackSpacer"></span>`}
        <div class="obBag" role="img" aria-label="Valas Tasche: ${answered.length} von ${BAG_STEPS.length} Antworten eingepackt">
          ${BAG_STEPS.map(s => `<span class="obSlot${answered.includes(s) ? " full" : ""}" data-bag="${s.id}">${answered.includes(s) ? Vala.ART[s.bag] : ""}</span>`).join("")}
        </div>
        <span class="obCount">${pos + 1}/${STEPS.length}</span>
        ${mode === "edit" ? `<button type="button" class="iconBtn obClose" aria-label="Plan anpassen abbrechen"><svg class="ico"><use href="#i-close"/></svg></button>` : ""}
      </div>
      <div class="obMeter" aria-hidden="true"><span style="width:${((pos + 1) / STEPS.length * 100).toFixed(1)}%"></span></div>
      <div class="obStage" data-type="${step.type}">
        <div class="obVala">${Vala.svg({ mood: step.type === "plan" ? "cheer" : "idle" })}</div>
        <h1 class="obSays" id="obSays" tabindex="-1">${esc(step.say)}</h1>
        ${step.text ? `<p class="obText">${esc(step.text)}</p>` : ""}
        <div class="obBody"></div>
      </div>
      <div class="obActions"></div>`;
    const body = root.querySelector(".obBody"), actions = root.querySelector(".obActions");
    ({ intro: renderIntro, choice: renderChoice, scene: renderScene, chart: renderChart, minutes: renderMinutes, building: renderBuilding, plan: renderPlan }[step.type])(step, body, actions);
    const back = root.querySelector(".obBack");
    if (back) back.onclick = goBack;
    const close = root.querySelector(".obClose");
    if (close) close.onclick = cancel;
    requestAnimationFrame(() => { const h = $("#obSays"); if (h) h.focus({ preventScroll: true }); });
    scrollTo(0, 0);
  }

  function next() { if (pos < STEPS.length - 1) { pos++; render(); } }
  function goBack() {
    const min = mode === "edit" ? 1 : 0;
    if (pos <= min) return;
    pos--;
    if (STEPS[pos].type === "building") pos--;   // die Ladeanimation beim Zurückgehen überspringen
    render();
  }

  function nextButton(actions, label = "Weiter", enabled = true) {
    actions.innerHTML = `<button type="button" class="btn btnPrimary btnLarge obNext"${enabled ? "" : " disabled"}>${esc(label)}</button>`;
    const b = actions.querySelector(".obNext");
    b.onclick = next;
    return b;
  }

  function renderIntro(step, body, actions) {
    nextButton(actions, step.cta || "Weiter");
    if (mode === "first") {
      body.innerHTML = `<p class="obAccount">Schon dabei? <button type="button" class="linkBtn" data-signin>Ich habe einen Account – anmelden</button></p>`;
      body.querySelector("[data-signin]").onclick = () => { leave(); Account.showAuth("signin"); };
    }
  }

  // Antwortkarten als Radio-Gruppe: Klick wählt und geht weiter, Pfeiltasten wechseln, Enter bestätigt
  function optionsGroup(step, body, onPick) {
    const cur = draft[step.field];
    body.insertAdjacentHTML("beforeend", `<div class="obOptions${step.compact ? " compact" : ""}" role="radiogroup" aria-labelledby="obSays">${step.options.map((o, i) => {
      const on = cur != null && String(cur) === String(o.value);
      return `<button type="button" class="obOption${on ? " selected" : ""}" role="radio" aria-checked="${on}" tabindex="${on || (cur == null && i === 0) ? 0 : -1}" data-value="${esc(o.value)}" style="--k:${i}">
        ${o.tag ? `<span class="obTag">${esc(o.tag)}</span>` : ""}<span class="obLabel"><b>${esc(o.label)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ""}</span>
      </button>`;
    }).join("")}</div>`);
    const group = body.querySelector(".obOptions"), btns = [...group.querySelectorAll(".obOption")];
    const select = (b, advance) => {
      btns.forEach(x => { const on = x === b; x.classList.toggle("selected", on); x.setAttribute("aria-checked", on); x.tabIndex = on ? 0 : -1; });
      const raw = b.dataset.value, opt = step.options.find(o => String(o.value) === raw);
      const fresh = draft[step.field] == null;
      draft[step.field] = opt.value;
      if (fresh && step.bag) packBag(step);
      onPick(advance);
    };
    btns.forEach((b, i) => {
      b.onclick = () => select(b, true);
      b.onkeydown = e => {
        const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); const n = btns[(i + d + btns.length) % btns.length]; n.focus(); select(n, false); }
      };
    });
  }

  function packBag(step) {
    const slot = document.querySelector(`.obSlot[data-bag="${step.id}"]`);
    if (slot) { slot.innerHTML = Vala.ART[step.bag]; slot.classList.add("full", "pop"); }
    const v = document.querySelector(".obVala .vala");
    if (v) Vala.react(v, "jump", 900);
    const bag = document.querySelector(".obBag");
    if (bag) bag.setAttribute("aria-label", `Valas Tasche: ${document.querySelectorAll(".obSlot.full").length} von ${BAG_STEPS.length} Antworten eingepackt`);
  }

  function renderChoice(step, body, actions) {
    const btn = nextButton(actions, "Weiter", draft[step.field] != null);
    optionsGroup(step, body, advance => {
      btn.disabled = false;
      if (advance) later(next, 420);
    });
  }

  function renderScene(step, body, actions) {
    const tower = window.Coast && Coast.MARKS ? Coast.MARKS.tower : "";
    const vala = Vala.svg({ mood: "cheer" }).replace("<svg ", '<svg x="-24" y="-50" width="44" height="33" style="width:44px;height:33px;overflow:visible" ');
    body.innerHTML = `<div class="obScene" aria-hidden="true"><svg viewBox="0 0 360 200" preserveAspectRatio="xMidYMid slice">
      <rect width="360" height="200" fill="#f4e2bb"/>
      <circle cx="292" cy="46" r="22" fill="#e7ae2f" opacity=".9"/>
      <path filter="url(#paint)" fill="#a8b38c" d="M160 118 C200 100 240 98 280 108 C310 100 340 104 360 110 V140 H160Z"/>
      <path filter="url(#paint)" fill="#2f9c98" d="M0 120 C40 112 80 128 120 120 C160 112 200 128 240 120 C280 112 320 128 360 120 V200 H0Z"/>
      <path filter="url(#paint)" fill="#d6ae7c" d="M-10 200 V96 C20 92 50 98 74 108 C90 120 96 150 92 200Z"/>
      <g transform="translate(46 104)" filter="url(#ink)" stroke="#243328" stroke-width="1.4" stroke-linejoin="round">${tower}</g>
      <text x="22" y="132" class="obPlace">Poreč</text>
      <g class="obWaves" fill="none" stroke="#eaf5f0" stroke-width="2" stroke-linecap="round"><path d="M120 150 q8 -5 16 0 t16 0 M220 170 q8 -5 16 0 t16 0 M300 146 q8 -5 16 0 t16 0"/></g>
      <g class="obBoat"><g transform="translate(118 128)">
        <g filter="url(#ink)" stroke="#243328" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
          <path d="M0 -40 V0" fill="none"/><path d="M2 -37 C14 -28 20 -16 22 -4 H2Z" fill="#fbf7ee"/><path d="M-2 -32 C-10 -24 -15 -14 -17 -4 H-2Z" fill="#0f6b73"/>
          <path d="M-26 0 H30 L22 10 H-18Z" fill="#c0643d"/>
        </g>${vala}
      </g></g>
    </svg></div>`;
    nextButton(actions, "Weiter");
  }

  function renderChart(step, body, actions) {
    body.innerHTML = `<figure class="obChart">
      <svg viewBox="0 0 320 210" role="img" aria-labelledby="obChartTitle">
        <title id="obChartTitle">Lernkurve: ohne Korak flacht sie unter dem A1-Niveau ab, mit Korak steigt sie darüber.</title>
        <path class="axis" d="M34 18 V180 H306"/>
        <text class="axisLabel" x="40" y="198">Zeit</text>
        <text class="axisLabel" x="10" y="100" transform="rotate(-90 14 100)">Können</text>
        <path class="levelLine" d="M34 82 H306"/>
        <text class="levelLabel" x="300" y="74" text-anchor="end">A1-Niveau</text>
        <path class="curve without" pathLength="1" d="M36 176 C80 130 120 112 170 106 C220 101 260 100 304 99"/>
        <path class="curve with" pathLength="1" d="M36 176 C90 160 130 128 170 104 C210 80 250 56 304 34"/>
        <text class="curveLabel with" x="300" y="26" text-anchor="end">mit Korak</text>
        <text class="curveLabel without" x="300" y="118" text-anchor="end">ohne Korak</text>
      </svg>
      <figcaption>Beispielhafte Darstellung</figcaption>
    </figure>`;
    nextButton(actions, "Weiter");
  }

  function renderMinutes(step, body, actions) {
    const btn = nextButton(actions, "Weiter", draft[step.field] != null);
    optionsGroup(step, body, () => { btn.disabled = false; });
    body.insertAdjacentHTML("beforeend", `<div class="obTime field"><label for="obTime">${esc(step.timeLabel)}</label><input id="obTime" type="time" value="${esc(draft[step.timeField] || "19:00")}"><small>${esc(step.timeNote)}</small></div>`);
    body.querySelector("#obTime").onchange = e => { draft[step.timeField] = e.target.value || "19:00"; };
  }

  const LABEL = field => {
    const st = STEPS.find(s => s.field === field);
    const o = st && st.options.find(x => String(x.value) === String(draft[field]));
    return o ? o.label : "–";
  };

  function renderBuilding(step, body, actions) {
    const rows = [
      ["Niveau", LABEL("level")], ["Ziel", LABEL("goal")], ["Grund", LABEL("reason")],
      ["Lernstil", LABEL("style")], ["Zeit", `${draft.minutesPerDay || 10} Minuten am Tag`]
    ];
    body.innerHTML = `<div class="mosaicLoader obLoader" aria-hidden="true">${Array.from({ length: 25 }, (_, i) => `<i style="--i:${i}"></i>`).join("")}</div>
      <ul class="obChecks" aria-live="polite">${rows.map(([k, v]) => `<li><span class="goalDot"><svg class="ico"><use href="#i-check"/></svg></span><span><b>${esc(k)}:</b> ${esc(v)}</span></li>`).join("")}</ul>`;
    actions.innerHTML = "";
    const items = [...body.querySelectorAll(".obChecks li")];
    items.forEach((li, i) => later(() => li.classList.add("met"), 450 + i * 420));
    later(next, 450 + items.length * 420 + 650);
  }

  function renderPlan(step, body, actions) {
    const profile = { ...draft, minutesPerDay: Number(draft.minutesPerDay) || 10 };
    const done = typeof state !== "undefined" ? state.completed : [];
    const p = buildPlan(profile, window.KORAK_DATA, done);
    const st = Coast.stationFor(p.startChapterId);
    const lvl = window.KORAK_DATA.levels.find(l => l.id === p.startLevel);
    body.innerHTML = `<div class="obPlan">
      <div class="obPlanStart"><div class="planMark">${st ? markIcon(st.mark) : ""}</div><div><span class="planLabel">Startort</span><b>${esc(st ? st.name : p.startChapterTitle)}</b><small>${esc(lvl ? lvl.id : "")} · Kapitel ${p.startChapterNumber}: ${esc(p.startChapterTitle)}</small></div></div>
      ${p.skippable.length ? `<p class="obNote">Die ${p.skippable.length} Orte davor sind offen – mit dem Kapiteltest kannst du sie überspringen.</p>` : ""}
      <dl class="figures obFigures">
        <div><dt>Tagesziel</dt><dd>${plural(p.units, "Einheit", "Einheiten")} <small>≈ ${p.minutesPerDay} Min. · ${p.dailyExercises} Übungen</small></dd></div>
        <div><dt>Erinnerung</dt><dd>${esc(profile.reminderTime || "19:00")} Uhr</dd></div>
        <div><dt>Prognose</dt><dd>${esc(p.target)} ca. am ${Plan.formatDate(p.forecastDate)}</dd></div>
      </dl>
      ${draft.reason && REASON_LINE[draft.reason] ? `<p class="obReason">${esc(REASON_LINE[draft.reason])}</p>` : ""}
    </div>`;
    if (mode === "edit") {
      actions.innerHTML = `<button type="button" class="btn btnPrimary btnLarge" data-apply>Plan übernehmen</button>${window.Account && !Account.user ? `<button type="button" class="btn btnQuiet" data-signup>Mit Account sichern</button>` : ""}`;
      actions.querySelector("[data-apply]").onclick = () => finish("apply");
      const s = actions.querySelector("[data-signup]");
      if (s) s.onclick = () => finish("signup");
    } else {
      actions.innerHTML = `<button type="button" class="btn btnPrimary btnLarge" data-signup>Plan sichern</button><button type="button" class="btn btnQuiet" data-guest>Ohne Konto weiter</button><small class="obFine">Mit Account bleibt dein Fortschritt auf allen Geräten gespeichert. Kostenlos, ohne Abo.</small>`;
      actions.querySelector("[data-signup]").onclick = () => finish("signup");
      actions.querySelector("[data-guest]").onclick = () => finish("guest");
    }
  }

  // Tastatur: Enter auf „Weiter“-fähigen Schritten
  document.addEventListener("keydown", e => {
    if (!document.body.classList.contains("inOnboarding")) return;
    if (e.key === "Escape" && mode === "edit") { e.preventDefault(); cancel(); }
  });

  const editBtn = document.getElementById("planEdit");
  if (editBtn) editBtn.onclick = () => start({ mode: "edit" });

  window.Onboarding = { STEPS, start, _draft: () => draft };
})();
