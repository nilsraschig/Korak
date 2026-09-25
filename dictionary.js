/* Korak – Offline-Wörterbuch Kroatisch ⇄ Deutsch
 * Datenbasis: alle Vokabelpaare aus course-data.js (dedupliziert). Läuft komplett offline.
 * Suche: Normalisierung (Groß/klein, Akzente č→c, đ→d, ß→ss) + Präfix-/Teilstring-Treffer
 * + Tippfehler-Toleranz über Damerau-Levenshtein-Distanz auf Wortebene.
 */
(function () {
  const DATA = window.KORAK_DATA;
  if (!DATA) return;

  const fold = s => String(s || "").toLocaleLowerCase("de").replace(/ß/g, "ss").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
  const clean = s => fold(s).replace(/[.!?,;:„“"'…–—()]/g, " ").replace(/\s+/g, " ").trim();
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  // ---------- Index aufbauen ----------
  const byHr = new Map();
  DATA.lessons.filter(l => !l.isTest).forEach(l => l.items.forEach(it => {
    const k = clean(it.hr);
    let e = byHr.get(k);
    if (!e) byHr.set(k, e = { hr: it.hr, de: [], sources: [] });
    if (!e.de.some(d => clean(d) === clean(it.de))) e.de.push(it.de);
    if (e.sources.length < 3) e.sources.push({ level: l.level, title: l.title });
  }));
  const ENTRIES = [...byHr.values()].map(e => ({
    ...e,
    fHr: clean(e.hr),
    fDe: e.de.map(clean),
    wHr: clean(e.hr).split(" "),
    wDe: e.de.flatMap(d => clean(d).split(" "))
  }));

  // ---------- Fuzzy-Matching ----------
  function distance(a, b, max) {
    // Damerau-Levenshtein (optimal string alignment) mit frühem Abbruch
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev2 = null, prev = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i];
      let rowMin = i;
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
        if (prev2 && i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, prev2[j - 2] + 1);
        cur[j] = v;
        rowMin = Math.min(rowMin, v);
      }
      if (rowMin > max) return max + 1;
      prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }
  const tolerance = n => (n <= 3 ? 0 : n <= 5 ? 1 : 2);

  // Bewertet, wie gut ein einzelnes Suchwort zu einem Wort im Eintrag passt (0 = gar nicht).
  function wordScore(q, w) {
    if (w === q) return 1;
    if (w.startsWith(q)) return 0.9;
    if (q.length >= 3 && w.includes(q)) return 0.7;
    const tol = tolerance(q.length);
    if (!tol) return 0;
    const d = Math.min(distance(q, w, tol), w.length > q.length ? distance(q, w.slice(0, q.length), tol) : tol + 1);
    return d <= tol ? 0.6 - d * 0.12 : 0;
  }

  function scoreField(q, qWords, full, words) {
    if (full === q) return 100;
    if (full.startsWith(q)) return 92 - Math.min(10, (full.length - q.length) / 4);
    if (q.length >= 2 && full.includes(q)) return 78 - Math.min(10, full.length / 10);
    let sum = 0;
    for (const qw of qWords) {
      let best = 0;
      for (const w of words) best = Math.max(best, wordScore(qw, w));
      if (!best) return 0; // jedes Suchwort muss irgendwo passen
      sum += best;
    }
    return 70 * (sum / qWords.length) - Math.min(8, words.length / 2);
  }

  function search(raw, mode) {
    const q = clean(raw);
    if (!q) return [];
    const qWords = q.split(" ");
    const out = [];
    for (const e of ENTRIES) {
      const sHr = mode === "de" ? 0 : scoreField(q, qWords, e.fHr, e.wHr);
      const sDe = mode === "hr" ? 0 : Math.max(0, ...e.fDe.map((f, i) => scoreField(q, qWords, f, f.split(" "))));
      const s = Math.max(sHr, sDe);
      if (s > 0) out.push({ e, s, dir: sHr >= sDe ? "hr" : "de" });
    }
    return out.sort((a, b) => b.s - a.s || a.e.hr.length - b.e.hr.length).slice(0, 30);
  }

  // Markiert den Suchbegriff im Text, sofern sich die Positionen 1:1 abbilden lassen.
  function mark(text, raw) {
    const q = clean(raw), f = fold(text);
    const i = q ? f.indexOf(q) : -1;
    if (i < 0 || f.length !== text.length) return esc(text);
    return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
  }

  // ---------- UI ----------
  const fab = document.createElement("button");
  fab.className = "dictFab";
  fab.type = "button";
  fab.setAttribute("aria-label", "Wörterbuch öffnen");
  fab.setAttribute("aria-expanded", "false");
  fab.innerHTML = '<span aria-hidden="true">Aa</span><small>HR⇄DE</small>';

  const panel = document.createElement("section");
  panel.className = "dict";
  panel.hidden = true;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Wörterbuch Kroatisch–Deutsch");
  panel.innerHTML = `
    <div class="dictHead">
      <div><b>Wörterbuch</b><small>Kroatisch ⇄ Deutsch · ${ENTRIES.length} Einträge aus dem Kurs</small></div>
      <button type="button" class="dictClose" aria-label="Wörterbuch schließen"><svg class="ico" aria-hidden="true"><use href="#i-close"/></svg></button>
    </div>
    <label class="dictSearch"><svg class="ico" aria-hidden="true"><use href="#i-search"/></svg><input type="search" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="z. B. kava, Bahnhof, hvala …"></label>
    <div class="dictModes" role="radiogroup" aria-label="Suchrichtung">
      <button type="button" data-mode="auto" class="active">Beide</button>
      <button type="button" data-mode="hr">HR → DE</button>
      <button type="button" data-mode="de">DE → HR</button>
    </div>
    <div class="dictResults" aria-live="polite"></div>`;

  document.body.append(fab, panel);
  const input = panel.querySelector("input");
  const results = panel.querySelector(".dictResults");
  let mode = "auto", timer = null;

  function speak(t) {
    if (!("speechSynthesis" in window)) return;
    const u = new SpeechSynthesisUtterance(t);
    u.lang = "hr-HR"; u.rate = 0.8;
    const v = speechSynthesis.getVoices().find(x => x.lang.toLowerCase().startsWith("hr"));
    if (v) u.voice = v;
    speechSynthesis.cancel(); speechSynthesis.speak(u);
  }

  function renderEmpty() {
    results.innerHTML = `<div class="dictHint"><p>Tippe ein kroatisches oder deutsches Wort. Tippfehler und fehlende Akzente (c statt č) sind kein Problem.</p><div class="dictExamples">${["kava", "Bahnhof", "hvala", "Wohnung", "sutra", "Wetter"].map(w => `<button type="button">${w}</button>`).join("")}</div></div>`;
    results.querySelectorAll(".dictExamples button").forEach(b => b.onclick = () => { input.value = b.textContent; run(); input.focus(); });
  }

  function run() {
    const raw = input.value;
    if (!clean(raw)) return renderEmpty();
    const hits = search(raw, mode);
    if (!hits.length) {
      // TODO(Übersetzungs-API): Für Wörter außerhalb des Kursvokabulars könnte hier später eine
      // Netlify Function (z. B. /.netlify/functions/translate) mit einer echten Übersetzungs-API
      // abgefragt werden. Bewusst nicht Teil dieser Version – das Widget bleibt offline & kostenlos.
      results.innerHTML = `<div class="dictHint"><p><b>Nicht im Kursvokabular.</b><br>„${esc(raw)}“ kommt in den Lektionen noch nicht vor. Versuche eine andere Schreibweise oder ein einfacheres Wort.</p></div>`;
      return;
    }
    results.innerHTML = "";
    hits.forEach(({ e, dir }) => {
      const row = document.createElement("article");
      row.className = "dictRow";
      const src = e.sources[0];
      row.innerHTML = `
        <div class="dictMain">
          <span class="dictDir">${dir === "hr" ? "HR → DE" : "DE → HR"}</span>
          <b lang="hr">${dir === "hr" ? mark(e.hr, raw) : esc(e.hr)}</b>
          <span class="dictDe" lang="de">${e.de.map(d => (dir === "de" ? mark(d, raw) : esc(d))).join(" · ")}</span>
          <small>${esc(src.level)} · ${esc(src.title)}</small>
        </div>
        <button type="button" class="dictSpeak" aria-label="${esc(e.hr)} anhören"><svg class="ico" aria-hidden="true"><use href="#i-sound"/></svg></button>`;
      row.querySelector(".dictSpeak").onclick = () => speak(e.hr);
      results.appendChild(row);
    });
  }

  function open() {
    // Auf dem Anmeldebildschirm und beim Start nicht öffnen – dort gibt es noch keinen Lernkontext
    if (document.body.classList.contains("inAuth") || document.body.classList.contains("booting")) return;
    panel.hidden = false;
    fab.setAttribute("aria-expanded", "true");
    document.body.classList.add("dictOpen");
    requestAnimationFrame(() => panel.classList.add("show"));
    if (!input.value) renderEmpty();
    setTimeout(() => input.focus(), 60);
  }
  function close() {
    panel.classList.remove("show");
    fab.setAttribute("aria-expanded", "false");
    document.body.classList.remove("dictOpen");
    setTimeout(() => { if (!panel.classList.contains("show")) panel.hidden = true; }, 200);
  }
  const isOpen = () => !panel.hidden && panel.classList.contains("show");

  fab.onclick = () => (isOpen() ? close() : open());
  // Weitere Auslöser, z. B. der „Aa“-Button im Kopf einer Lektion
  document.addEventListener("click", e => { if (e.target.closest("[data-dict-open]")) isOpen() ? close() : open(); });
  panel.querySelector(".dictClose").onclick = close;
  input.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(run, 90); });
  panel.querySelectorAll(".dictModes button").forEach(b => b.onclick = () => {
    mode = b.dataset.mode;
    panel.querySelectorAll(".dictModes button").forEach(x => x.classList.toggle("active", x === b));
    run(); input.focus();
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && isOpen()) { e.preventDefault(); close(); fab.focus(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); isOpen() ? close() : open(); }
  });
  document.addEventListener("pointerdown", e => {
    if (isOpen() && !panel.contains(e.target) && !fab.contains(e.target) && !e.target.closest("[data-dict-open]")) close();
  });

  // Für Tests/Debugging erreichbar
  window.KorakDictionary = { search, entries: ENTRIES, open, close };
})();
