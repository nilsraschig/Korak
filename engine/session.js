// Korak Lern-Engine – Session-Generator: stellt aus neuen, fälligen und Fehler-DNA-Items eine Folge von
// (standardmäßig) 20 Aufgaben zusammen, prüft die Session-Regeln und fügt Wiederholungen nach Fehlern ein.
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  const { shuffle, norm } = req("./core.js");
  const { buildTask, RECOGNITION, LISTEN_TYPES } = req("./tasks.js");

  // Aufgaben, die ein Wort aktiv abfragen. Vor der ersten davon steht bei neuen Wörtern eine Wiedererkennung.
  const PRODUCTION = ["input-hr", "listen", "choice-hr", "cloze", "order", "ending"];
  const ITEM_TYPES = RECOGNITION.concat(PRODUCTION);
  const SOURCES = ["new", "due", "dna", "authored"];

  const SIZE = 20;
  const MIN_WORDS = 10;
  const MAX_PER_WORD = 3;
  const RESTARTS = 50;
  const MAX_AUTHORED = 4;            // höchstens 4 Autoren-Blöcke und höchstens ein Drittel des Anteils „neu“
  const MIX = { new: 0.6, due: 0.25, dna: 0.15 };

  // Standard-Gewichte = heutiges Verhalten von prodType/recogType in app.js (= BASE in plan.js).
  const BASE_PROD = { "input-hr": 2, "choice-hr": 1, listen: 1, order: 2, cloze: 2 };
  const BASE_LISTEN_CHOICE = 0.3;
  // Neue Typen: „Endung wählen“ so oft wie order/cloze (nur Wörter mit `forms`), „Richtig/Falsch“
  // übernimmt 30 % der Wiedererkennungen, die nicht listen-choice sind. Für Fehler-DNA zählt
  // „Endung wählen“ doppelt (Fälle sind die häufigsten Stolpersteine).
  const ENDING_WEIGHT = 2;
  const TRUEFALSE_SHARE = 0.3;
  const DNA_ENDING_FACTOR = 2;

  const isText = s => typeof s === "string" && norm(s) !== "";
  const num = (v, d) => (typeof v === "number" && Number.isFinite(v) ? v : d);

  // Wörter einer Aufgabe (eindeutig). match: 4 Schlüssel, Autoren-Block: keine.
  function keysOf(task) {
    if (!task) return [];
    const keys = Array.isArray(task.keys) ? task.keys : task.key !== undefined ? [task.key] : [];
    return Array.from(new Set(keys.filter(k => k !== undefined && k !== null)));
  }

  // Zufällige Reihenfolge, Elemente mit höherem Gewicht eher vorn (Ziehen ohne Zurücklegen).
  function weightedOrder(list, weightOf, rng) {
    const rest = list.slice();
    const out = [];
    while (rest.length) {
      const ws = rest.map(x => Math.max(0, weightOf(x)));
      const sum = ws.reduce((a, b) => a + b, 0);
      let i = 0;
      if (sum <= 0) {
        i = Math.floor(rng() * rest.length);
      } else {
        let r = rng() * sum;
        i = -1;
        for (let k = 0; k < rest.length; k++) {
          if (ws[k] <= 0) continue;
          i = k;
          r -= ws[k];
          if (r < 0) break;
        }
      }
      out.push(rest.splice(i, 1)[0]);
    }
    return out;
  }

  // ---- Typ-Gewichte je Rolle

  // R: erste Begegnung mit einem neuen Wort (nur Wiedererkennung), P: weitere Aufgaben zu einem neuen Wort,
  // due/dna: schon gelernte Wörter – werden aktiv abgefragt (Produktion).
  function typeWeights(weights, hasTTS) {
    const w = weights && typeof weights === "object" ? weights : null;
    const prodIn = w && w.prod && typeof w.prod === "object" ? w.prod : BASE_PROD;
    const prod = {};
    for (const t of PRODUCTION) {
      const v = t === "ending" ? num(prodIn.ending, ENDING_WEIGHT) : num(prodIn[t], 0);
      if (v > 0 && (hasTTS || !LISTEN_TYPES.includes(t))) prod[t] = v;
    }
    const lc = hasTTS ? Math.min(1, Math.max(0, num(w && w.listenChoice, BASE_LISTEN_CHOICE))) : 0;
    const recog = { "listen-choice": lc, "choice-de": (1 - lc) * (1 - TRUEFALSE_SHARE), truefalse: (1 - lc) * TRUEFALSE_SHARE };
    const dna = Object.assign({}, prod);
    if (dna.ending) dna.ending *= DNA_ENDING_FACTOR;
    return { R: recog, P: prod, due: prod, dna };
  }

  // Ersatz-Typen, wenn kein bevorzugter Typ passt (Nachbar hat denselben Typ oder Aufgabe nicht baubar).
  const FALLBACK = { R: RECOGNITION, P: ITEM_TYPES, due: ITEM_TYPES, dna: ITEM_TYPES };

  // ---- Bausteine

  function authoredTask(block, hasTTS) {
    if (!Array.isArray(block)) return null;
    const screens = block.filter(s => s && typeof s.type === "string");
    if (!screens.length) return null;
    const first = screens[0];
    if (LISTEN_TYPES.includes(first.type) && !hasTTS) return null;
    const concepts = Array.from(new Set(screens.flatMap(s => (Array.isArray(s.concepts) ? s.concepts : []))));
    return {
      type: first.type,
      keys: [],
      prompt: typeof first.prompt === "string" ? first.prompt : "",
      answer: typeof first.answer === "string" ? first.answer : "",
      concepts,
      source: "authored",
      block: screens
    };
  }

  // Verteilt `occ` Vorkommen auf neue Wörter: so viele Wörter, dass jedes eine Wiedererkennung und eine
  // Produktion bekommt (wie pairFor in app.js), mindestens aber `need` Wörter; dann je Wort bis 3×.
  function wordCounts(available, need, occ) {
    const w = Math.min(available, Math.max(need, Math.ceil(occ / 2)), occ);
    const counts = new Array(Math.max(0, w)).fill(1);
    let left = occ - counts.length;
    for (let round = 2; round <= MAX_PER_WORD && left > 0; round++) {
      for (let i = 0; i < counts.length && left > 0; i++) { counts[i]++; left--; }
    }
    return { counts, leftover: left };
  }

  const wordUnit = (item, source, rem) => ({ kind: "word", item, source, keys: [item.key], rem });
  const fixedUnit = task => ({ kind: "fixed", task, keys: keysOf(task), rem: 1 });

  // Legt fest, was in die Session kommt: Einheiten (Wort mit Anzahl Vorkommen oder fertige Aufgabe).
  function allocate(src, cfg, ctx, rng) {
    const { size, mix } = cfg;
    const qDue = Math.min(src.due.length, Math.max(0, Math.round(size * mix.due)), size);
    const qDna = Math.min(src.dna.length, Math.max(0, Math.round(size * mix.dna)), size - qDue);
    const qNew = size - qDue - qDna;
    const W = src.fresh.length;
    const target = Math.min(MIN_WORDS, W + src.due.length + src.dna.length, size);
    const wNeed = Math.min(W, Math.max(0, target - qDue - qDna), qNew);
    let free = qNew - wNeed;
    const units = [];

    // Autoren-Blöcke (je ein Platz), dann ein Dialog aus der Lektion
    const A = Math.min(src.blocks.length, MAX_AUTHORED, Math.floor(qNew / 3), free);
    src.blocks.slice(0, A).forEach(t => units.push(fixedUnit(Object.assign({}, t))));
    free -= A;
    if (free > 0) {
      const d = buildTask("dialogue", null, ctx);
      if (d) { d.source = "new"; units.push(fixedUnit(d)); free--; }
    }

    // Neue Wörter, dazu ein „Verbinden“ aus Lektionswörtern mit freier Kapazität (ungenutzte zuerst)
    const words = shuffle(src.fresh, rng);
    const occ = wNeed + free;
    let plan = null;
    if (W >= 4 && occ - 1 >= Math.max(1, wNeed)) {
      const p = wordCounts(W, wNeed, occ - 1);
      if (p.leftover === 0) {
        const tryMatch = list => {
          if (list.length < 4) return null;
          const anchor = list[Math.floor(rng() * list.length)];
          return buildTask("match", anchor, Object.assign({}, ctx, { pool: list }));
        };
        const m = tryMatch(words.filter((_, i) => !p.counts[i])) ||
                  tryMatch(words.filter((_, i) => (p.counts[i] || 0) < MAX_PER_WORD));
        if (m) {
          m.source = "new";
          units.push(fixedUnit(m));
          plan = p;
        }
      }
    }
    if (!plan) plan = wordCounts(W, wNeed, occ);
    plan.counts.forEach((c, i) => units.push(wordUnit(words[i], "new", c)));

    // Fällige und DNA-Items je einmal; fehlen neue Wörter, füllen weitere fällige/DNA-Items auf,
    // danach zweite und dritte Vorkommen, zuletzt weitere Autoren-Blöcke.
    let deficit = plan.leftover;
    const dueUnits = src.due.slice(0, qDue).map(it => wordUnit(it, "due", 1));
    const dnaUnits = src.dna.slice(0, qDna).map(it => wordUnit(it, "dna", 1));
    for (let i = qDue; i < src.due.length && deficit > 0; i++, deficit--) dueUnits.push(wordUnit(src.due[i], "due", 1));
    for (let i = qDna; i < src.dna.length && deficit > 0; i++, deficit--) dnaUnits.push(wordUnit(src.dna[i], "dna", 1));
    const repeatable = dueUnits.concat(dnaUnits);
    for (let round = 2; round <= MAX_PER_WORD && deficit > 0; round++) {
      for (const u of repeatable) if (deficit > 0 && u.rem < round) { u.rem++; deficit--; }
    }
    for (let i = A; i < src.blocks.length && deficit > 0; i++, deficit--) units.push(fixedUnit(Object.assign({}, src.blocks[i])));
    return units.concat(repeatable);
  }

  // Baut die Folge gierig auf: an jeder Stelle zufällig (Wörter mit mehr offenen Vorkommen eher) unter den
  // Einheiten, die mit der Vorgänger-Aufgabe weder Wort noch Typ teilen und die Restfolge lösbar lassen.
  function arrange(units, ctx, tw, rng) {
    const out = [];
    const recognized = new Set();
    const remByKey = new Map();
    let total = 0;
    for (const u of units) {
      total += u.rem;
      for (const k of u.keys) remByKey.set(k, (remByKey.get(k) || 0) + u.rem);
    }
    let prev = null;

    // Notwendige Bedingung: Restvorkommen jedes Wortes passen ohne Nachbarschaft in die Restlänge.
    function feasible(u) {
      const after = total - 1;
      for (const [k, r] of remByKey) {
        const mine = u.keys.includes(k);
        if ((mine ? r - 1 : r) > (mine ? Math.floor(after / 2) : Math.ceil(after / 2))) return false;
      }
      return true;
    }

    function place(u, preferred) {
      if (u.kind === "fixed") return preferred ? u.task : null;
      const role = u.source === "new" ? (recognized.has(u.item.key) ? "P" : "R") : u.source;
      const weights = tw[role];
      let types;
      if (preferred) {
        types = weightedOrder(Object.keys(weights).filter(t => weights[t] > 0), t => weights[t], rng);
      } else {
        // Ersatz: zuerst Typen, die in einer anderen Rolle gewichtet sind, zuletzt solche mit Gewicht 0
        const other = FALLBACK[role].filter(t => !(weights[t] > 0));
        const liked = other.filter(t => tw.R[t] > 0 || tw.P[t] > 0);
        types = shuffle(liked, rng).concat(shuffle(other.filter(t => !liked.includes(t)), rng));
      }
      for (const type of types) {
        if (prev && prev.type === type) continue;
        const task = buildTask(type, u.item, ctx);
        if (task) { task.source = u.source; return task; }
      }
      return null;
    }

    while (total > 0) {
      const prevKeys = keysOf(prev);
      const open = units.filter(u => u.rem > 0 &&
        !u.keys.some(k => prevKeys.includes(k)) &&
        !(u.kind === "fixed" && prev && u.task.type === prev.type));
      if (!open.length) break;
      const ordered = weightedOrder(open, u => u.rem, rng);
      const good = ordered.filter(feasible);
      const rest = ordered.filter(u => !good.includes(u));
      let task = null;
      let chosen = null;
      search: for (const tier of [good, rest]) {
        for (const preferred of [true, false]) {
          for (const u of tier) {
            task = place(u, preferred);
            if (task) { chosen = u; break search; }
          }
        }
      }
      if (!task) break;
      out.push(task);
      chosen.rem--;
      total--;
      for (const k of chosen.keys) remByKey.set(k, remByKey.get(k) - 1);
      if (RECOGNITION.includes(task.type)) keysOf(task).forEach(k => recognized.add(k));
      prev = task;
    }
    return { tasks: out, complete: total === 0 };
  }

  // opts: { newItems, dueItems?, dnaItems?, pool, lesson?, dialogues?, authored?: Task[][], size = 20,
  //         mix = {new:.6, due:.25, dna:.15}, weights?: Plan.weights() | null, hasTTS, rng }
  function buildSession(opts) {
    const o = opts || {};
    const rng = typeof o.rng === "function" ? o.rng : Math.random;
    const size = Math.max(0, Math.floor(num(o.size, SIZE)));
    const mixIn = o.mix && typeof o.mix === "object" ? o.mix : {};
    const mix = { due: Math.max(0, num(mixIn.due, MIX.due)), dna: Math.max(0, num(mixIn.dna, MIX.dna)) };
    const hasTTS = !!o.hasTTS;

    // Gültige Items mit Schlüssel; ein Wort gehört zu genau einer Quelle (neu vor fällig vor DNA).
    const seen = new Set();
    const clean = list => (Array.isArray(list) ? list : []).filter(it => {
      if (!it || it.key === undefined || it.key === null || !isText(it.hr) || !isText(it.de) || seen.has(it.key)) return false;
      seen.add(it.key);
      return true;
    });
    const src = { fresh: clean(o.newItems), due: clean(o.dueItems), dna: clean(o.dnaItems) };
    src.blocks = (Array.isArray(o.authored) ? o.authored : []).map(b => authoredTask(b, hasTTS)).filter(Boolean);
    const pool = Array.isArray(o.pool) ? o.pool : src.fresh.concat(src.due, src.dna);
    const ctx = { pool, lesson: o.lesson, dialogues: o.dialogues, hasTTS, rng };
    const tw = typeWeights(o.weights, hasTTS);

    // Sackgasse → bis zu 50 Neustarts mit den nächsten Zufallswerten, danach die längste gefundene Folge.
    let best = [];
    for (let attempt = 0; attempt <= RESTARTS; attempt++) {
      const res = arrange(allocate(src, { size, mix }, ctx, rng), ctx, tw, rng);
      if (res.complete) return res.tasks;
      if (res.tasks.length > best.length) best = res.tasks;
    }
    return best;
  }

  // Liste der Regelverstöße (leer = gültig).
  // opts: { minWords = 10, maxPerWord = 3, hasTTS? (false → Hör-Aufgaben verboten), size? (exakte Länge) }
  function checkSession(tasks, opts) {
    const o = opts || {};
    const minWords = num(o.minWords, MIN_WORDS);
    const maxPerWord = num(o.maxPerWord, MAX_PER_WORD);
    const list = Array.isArray(tasks) ? tasks : [];
    const errors = [];
    const counts = new Map();
    const recognized = new Set();
    let prev = null;
    list.forEach((t, i) => {
      const n = i + 1;
      if (!t || typeof t.type !== "string") {
        errors.push(`Aufgabe ${n}: kein Aufgabentyp`);
        prev = null;
        return;
      }
      const keys = keysOf(t);
      if (!SOURCES.includes(t.source)) errors.push(`Aufgabe ${n} (${t.type}): Quelle fehlt oder ist unbekannt`);
      if (prev) {
        if (prev.type === t.type) errors.push(`Aufgabe ${n - 1}–${n}: Typ „${t.type}“ zweimal hintereinander`);
        const prevKeys = keysOf(prev);
        for (const k of keys) if (prevKeys.includes(k)) errors.push(`Aufgabe ${n - 1}–${n}: Wort „${k}“ zweimal hintereinander`);
      }
      if (o.hasTTS === false && LISTEN_TYPES.includes(t.type)) errors.push(`Aufgabe ${n}: Hör-Aufgabe „${t.type}“ ohne TTS`);
      if (t.source === "new" && PRODUCTION.includes(t.type)) {
        for (const k of keys) if (!recognized.has(k)) errors.push(`Aufgabe ${n}: Produktion „${t.type}“ vor Wiedererkennung für „${k}“`);
      }
      if (RECOGNITION.includes(t.type)) keys.forEach(k => recognized.add(k));
      keys.forEach(k => counts.set(k, (counts.get(k) || 0) + 1));
      prev = t;
    });
    for (const [k, c] of counts) if (c > maxPerWord) errors.push(`Wort „${k}“ kommt ${c}× vor (höchstens ${maxPerWord})`);
    if (counts.size < minWords) errors.push(`Nur ${counts.size} verschiedene Wörter (mindestens ${minWords})`);
    if (o.size !== undefined && list.length !== o.size) errors.push(`Länge ${list.length} statt ${o.size}`);
    return errors;
  }

  // Fügt `task` (Wiederholung nach falscher Antwort an `pos`) frühestens bei pos + 2 ein, an der ersten Stelle,
  // an der weder Typ noch ein Wort mit den Nachbarn übereinstimmt; sonst ans Ende. Liefert den Index.
  function insertRetry(queue, pos, task) {
    const keys = keysOf(task);
    const clash = other => !!other && (other.type === task.type || keysOf(other).some(k => keys.includes(k)));
    const start = Math.max(0, (Number.isFinite(pos) ? Math.floor(pos) : -2) + 2);
    for (let i = start; i <= queue.length; i++) {
      if (!clash(queue[i - 1]) && !clash(queue[i])) {
        queue.splice(i, 0, task);
        return i;
      }
    }
    queue.push(task);
    return queue.length - 1;
  }

  return { buildSession, checkSession, insertRetry, PRODUCTION };
});
