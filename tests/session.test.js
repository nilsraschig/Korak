"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { makeRng } = require("../engine/core.js");
const { buildTask, RECOGNITION, LISTEN_TYPES } = require("../engine/tasks.js");
const session = require("../engine/session.js");
const F = require("./fixtures/session-items.js");

const { buildSession, checkSession, insertRetry, PRODUCTION } = session;

const SEEDS = Array.from({ length: 300 }, (_, i) => i + 1);
const TTS = [true, false];
const AUTHORED_TYPES = ["roleplay", "scenario", "fix"];

function opts(seed, hasTTS, extra) {
  return Object.assign({
    newItems: F.LESSON_ITEMS,
    dueItems: F.DUE_ITEMS,
    dnaItems: F.DNA_ITEMS,
    pool: F.POOL,
    lesson: F.LESSON,
    dialogues: F.DIALOGUES,
    authored: F.AUTHORED,
    hasTTS,
    rng: makeRng(seed)
  }, extra);
}

const keysOf = t => (Array.isArray(t.keys) ? t.keys : []);

// Sessions je Seed und TTS werden in mehreren Tests gebraucht: einmal bauen, Kopie der Folge ausgeben.
const CACHE = new Map();
function cached(label, seed, hasTTS, extra) {
  const id = `${label}|${seed}|${hasTTS}`;
  if (!CACHE.has(id)) CACHE.set(id, buildSession(opts(seed, hasTTS, extra)));
  return CACHE.get(id).slice();
}
const fullSession = (seed, hasTTS) => cached("full", seed, hasTTS);
const newOnlySession = (seed, hasTTS) => cached("new", seed, hasTTS, { dueItems: undefined, dnaItems: undefined, authored: undefined });

function countSources(tasks) {
  const c = { new: 0, due: 0, dna: 0, authored: 0 };
  for (const t of tasks) c[t.source] = (c[t.source] || 0) + 1;
  return c;
}

function distinctWords(tasks) {
  return new Set(tasks.flatMap(keysOf)).size;
}

// Eigene, von checkSession unabhängige Prüfung: Für jedes neue Wort steht eine Wiedererkennung vor der ersten Produktion.
function recognitionFirst(tasks) {
  const seen = new Set();
  const errors = [];
  tasks.forEach((t, i) => {
    if (t.source === "new" && PRODUCTION.includes(t.type)) {
      for (const k of keysOf(t)) if (!seen.has(k)) errors.push(`${i}: ${t.type} ${k}`);
    }
    if (RECOGNITION.includes(t.type)) keysOf(t).forEach(k => seen.add(k));
  });
  return errors;
}

// Eigene Prüfung der Nachbar- und Häufigkeitsregeln (unabhängig von checkSession).
function adjacencyAndCount(tasks) {
  const errors = [];
  const count = new Map();
  tasks.forEach((t, i) => {
    if (i > 0 && neighbourClash(tasks[i - 1], t)) errors.push(`${i - 1}/${i}: ${tasks[i - 1].type}/${t.type}`);
    keysOf(t).forEach(k => count.set(k, (count.get(k) || 0) + 1));
  });
  for (const [k, c] of count) if (c > 3) errors.push(`${k}: ${c}×`);
  return errors;
}

function neighbourClash(a, b) {
  if (!a || !b) return false;
  return a.type === b.type || keysOf(a).some(k => keysOf(b).includes(k));
}

// ---------------------------------------------------------------- Konstanten

test("PRODUCTION: Produktions-Typen laut Brief", () => {
  assert.deepEqual([...PRODUCTION].sort(), ["choice-hr", "cloze", "ending", "input-hr", "listen", "order"]);
});

// ---------------------------------------------------------------- buildSession: volle Fixture

test("buildSession: Seeds 1–300 mit/ohne TTS – Regeln eingehalten, 20 Aufgaben, Quellen 12/5/3", () => {
  for (const hasTTS of TTS) {
    for (const seed of SEEDS) {
      const label = `seed ${seed}, TTS ${hasTTS}`;
      const tasks = fullSession(seed, hasTTS);
      assert.deepEqual(checkSession(tasks, { minWords: 10, hasTTS }), [], label);
      assert.equal(tasks.length, 20, label);
      const c = countSources(tasks);
      assert.equal(c.due, 5, label + ": fällig");
      assert.equal(c.dna, 3, label + ": Fehler-DNA");
      assert.equal(c.new + c.authored, 12, label + ": neu (inkl. Autoren-Blöcke)");
      assert.equal(c.authored, 2, label + ": beide Autoren-Blöcke");
      assert.ok(distinctWords(tasks) >= 10, label + ": ≥ 10 Wörter");
      assert.deepEqual(recognitionFirst(tasks), [], label + ": Wiedererkennung vor Produktion");
      assert.deepEqual(adjacencyAndCount(tasks), [], label + ": Nachbarn und Häufigkeit");
      for (const t of tasks) {
        assert.ok(["new", "due", "dna", "authored"].includes(t.source), label + ": source gesetzt");
        if (!hasTTS) assert.ok(!LISTEN_TYPES.includes(t.type), label + ": keine Hör-Aufgabe ohne TTS");
      }
    }
  }
});

test("buildSession: Quellen gehören zu den richtigen Items", () => {
  const due = new Set(F.DUE_ITEMS.map(i => i.key));
  const dna = new Set(F.DNA_ITEMS.map(i => i.key));
  const lesson = new Set(F.LESSON_ITEMS.map(i => i.key));
  for (const seed of SEEDS.slice(0, 50)) {
    for (const t of fullSession(seed, true)) {
      if (t.source === "due") assert.ok(t.keys.every(k => due.has(k)), t.keys.join());
      if (t.source === "dna") assert.ok(t.keys.every(k => dna.has(k)), t.keys.join());
      if (t.source === "new") assert.ok(t.keys.every(k => lesson.has(k) || k === "dialog-a1-3-1"), t.keys.join());
    }
  }
});

test("buildSession: Autoren-Block ist ein Platz mit Typ des Blocks und den Einzel-Bildschirmen", () => {
  for (const seed of SEEDS.slice(0, 50)) {
    const tasks = fullSession(seed, true);
    const blocks = tasks.filter(t => t.source === "authored");
    assert.equal(blocks.length, 2);
    const rp = blocks.find(t => t.type === "roleplay");
    const fix = blocks.find(t => t.type === "fix");
    assert.ok(rp && fix, "roleplay und fix vorhanden");
    assert.equal(rp.block.length, 3);
    assert.deepEqual(rp.block.map(s => s.turn), [1, 2, 3]);
    assert.equal(rp.block[0], F.AUTHORED[0][0], "Bildschirme unverändert übernommen");
    assert.equal(fix.block.length, 1);
    assert.deepEqual(rp.keys, []);
    assert.deepEqual(fix.keys, []);
    assert.deepEqual(fix.concepts, ["case-acc"]);
    // Bildschirme kommen nicht zusätzlich einzeln vor
    assert.equal(tasks.filter(t => AUTHORED_TYPES.includes(t.type)).length, 2);
  }
});

test("buildSession: ohne dueItems und dnaItems → 20 Aufgaben, alle source „new“", () => {
  for (const hasTTS of TTS) {
    for (const seed of SEEDS) {
      const label = `seed ${seed}, TTS ${hasTTS}`;
      const tasks = newOnlySession(seed, hasTTS);
      assert.equal(tasks.length, 20, label);
      assert.ok(tasks.every(t => t.source === "new"), label);
      assert.deepEqual(checkSession(tasks, { minWords: 10, hasTTS }), [], label);
      assert.deepEqual(adjacencyAndCount(tasks), [], label);
      assert.deepEqual(recognitionFirst(tasks), [], label);
    }
  }
});

test("buildSession: ohne fällige/DNA, aber mit Autoren-Blöcken → neue Items füllen auf", () => {
  for (const seed of SEEDS.slice(0, 100)) {
    const tasks = buildSession(opts(seed, seed % 2 === 0, { dueItems: [], dnaItems: [] }));
    assert.equal(tasks.length, 20);
    const c = countSources(tasks);
    assert.equal(c.new, 18);
    assert.equal(c.authored, 2);
    assert.deepEqual(checkSession(tasks, { minWords: 10 }), []);
  }
});

test("buildSession: nur 3 fällige Items → due = 3, new = 14", () => {
  for (const hasTTS of TTS) {
    for (const seed of SEEDS) {
      const label = `seed ${seed}, TTS ${hasTTS}`;
      const tasks = buildSession(opts(seed, hasTTS, { dueItems: F.DUE_ITEMS.slice(0, 3), authored: undefined }));
      const c = countSources(tasks);
      assert.equal(tasks.length, 20, label);
      assert.equal(c.due, 3, label);
      assert.equal(c.new, 14, label);
      assert.equal(c.dna, 3, label);
      assert.deepEqual(checkSession(tasks, { minWords: 10, hasTTS }), [], label);
      assert.deepEqual(adjacencyAndCount(tasks), [], label);
      assert.deepEqual(recognitionFirst(tasks), [], label);
    }
  }
});

test("buildSession: Pool mit nur 4 Wörtern → Regeln eingehalten, höchstens 12 Aufgaben", () => {
  const four = F.LESSON_ITEMS.slice(0, 4);
  for (const hasTTS of TTS) {
    for (const seed of SEEDS) {
      const label = `seed ${seed}, TTS ${hasTTS}`;
      const tasks = buildSession({ newItems: four, pool: four, hasTTS, rng: makeRng(seed) });
      assert.ok(tasks.length <= 12, label + ": " + tasks.length);
      assert.equal(tasks.length, 12, label + ": so lang wie möglich (4 Wörter × 3)");
      assert.deepEqual(checkSession(tasks, { minWords: 4, hasTTS }), [], label);
      assert.deepEqual(adjacencyAndCount(tasks), [], label);
      assert.deepEqual(recognitionFirst(tasks), [], label);
    }
  }
});

test("buildSession: wenige Lektions-Items – fällige und DNA-Items füllen bis 20 auf", () => {
  for (const seed of SEEDS.slice(0, 100)) {
    const tasks = buildSession(opts(seed, true, { newItems: F.LESSON_ITEMS.slice(0, 2), authored: undefined, lesson: undefined }));
    assert.equal(tasks.length, 20);
    assert.deepEqual(checkSession(tasks, { minWords: 10, hasTTS: true }), []);
    assert.deepEqual(recognitionFirst(tasks), []);
  }
});

test("buildSession: Wiederholungs-Session (nur fällige Items, mix due 1) – 20 Aufgaben", () => {
  for (const seed of SEEDS.slice(0, 100)) {
    const tasks = buildSession({ newItems: [], dueItems: F.DUE_ITEMS.concat(F.DNA_ITEMS), pool: F.POOL, mix: { new: 0, due: 1, dna: 0 }, hasTTS: false, rng: makeRng(seed) });
    assert.equal(tasks.length, 20);
    assert.ok(tasks.every(t => t.source === "due"));
    assert.deepEqual(checkSession(tasks, { minWords: 10, hasTTS: false }), []);
  }
});

test("buildSession: Item in mehreren Quellen zählt einmal (neu hat Vorrang)", () => {
  for (const seed of SEEDS.slice(0, 50)) {
    const tasks = buildSession(opts(seed, true, { dueItems: F.LESSON_ITEMS.slice(0, 3).concat(F.DUE_ITEMS) }));
    assert.deepEqual(checkSession(tasks, { minWords: 10 }), []);
    const lessonKeys = new Set(F.LESSON_ITEMS.map(i => i.key));
    assert.ok(tasks.filter(t => t.source === "due").every(t => !t.keys.some(k => lessonKeys.has(k))));
  }
});

test("buildSession: Items ohne key, hr oder de werden ignoriert; Dubletten im Pool schaden nicht", () => {
  const broken = [{ hr: "", de: "leer", key: "x-1" }, { hr: "kruh", de: "", key: "x-2" }, { hr: "kruh", de: "Brot" }, null];
  const dupes = F.LESSON_ITEMS.map((it, i) => Object.assign({}, it, { key: "dup-" + i, de: i % 2 ? it.de : "Kaffee" }));
  const pool = F.POOL.concat(dupes, broken.filter(Boolean));
  for (const seed of SEEDS.slice(0, 100)) {
    const tasks = buildSession(opts(seed, true, { newItems: F.LESSON_ITEMS.concat(broken), pool }));
    assert.equal(tasks.length, 20);
    assert.deepEqual(checkSession(tasks, { minWords: 10 }), []);
    assert.ok(tasks.every(t => !t.keys.includes("x-1") && !t.keys.includes("x-2")));
  }
});

test("buildSession: gleicher Seed → gleiche Session", () => {
  const sig = tasks => tasks.map(t => `${t.type}:${t.keys.join("+")}:${t.answer}`);
  assert.deepEqual(sig(buildSession(opts(7, true))), sig(buildSession(opts(7, true))));
  assert.notDeepEqual(sig(buildSession(opts(7, true))), sig(buildSession(opts(8, true))));
});

test("buildSession: size bestimmt die Länge", () => {
  for (const seed of SEEDS.slice(0, 30)) {
    const tasks = buildSession(opts(seed, true, { size: 10, authored: undefined }));
    assert.equal(tasks.length, 10);
    assert.deepEqual(checkSession(tasks, { minWords: 8 }), []);
  }
});

test("buildSession: echte Kursdaten (A1/A2) – jede Lektion und jeder Kapiteltest ergibt eine gültige Session", () => {
  const { loadCourse } = require("../scripts/course-io.js");
  const { data } = loadCourse();
  const withKeys = l => l.items.map((it, i) => Object.assign({ key: `${l.id}-${i}` }, it));
  const lessons = data.lessons.filter(l => (l.level === "A1" || l.level === "A2") && !l.isTest);
  const learned = [];
  let n = 0;
  for (const level of data.levels.filter(l => l.id === "A1" || l.id === "A2")) {
    for (const ch of level.chapters) {
      const chapterItems = ch.lessons.flatMap(withKeys);
      const tests = [{ id: ch.id + "-test", newItems: chapterItems }].concat(ch.lessons.map(l => ({ id: l.id, lesson: l, newItems: withKeys(l) })));
      for (const t of tests) {
        n++;
        const hasTTS = n % 2 === 0;
        const rng = makeRng(n);
        const due = learned.slice(-8);
        const dna = learned.slice(0, 3);
        const tasks = buildSession({ newItems: t.newItems, dueItems: t.lesson ? due : [], dnaItems: t.lesson ? dna : [], pool: chapterItems.concat(due, dna),
          lesson: t.lesson, dialogues: lessons, hasTTS, rng });
        const words = new Set(t.newItems.concat(t.lesson ? due.concat(dna) : []).map(i => i.key)).size;
        assert.deepEqual(checkSession(tasks, { minWords: Math.min(10, words), hasTTS }), [], t.id);
        assert.deepEqual(adjacencyAndCount(tasks), [], t.id);
        if (words >= 10) assert.equal(tasks.length, 20, t.id);
      }
      learned.push(...chapterItems);
    }
  }
  assert.ok(n > 100, "Lektionen geprüft: " + n);
});

// ---------------------------------------------------------------- Typwahl

function newTypeStats(weights, hasTTS) {
  const stat = { recog: {}, prod: {} };
  for (const seed of SEEDS) {
    const tasks = weights ? buildSession(opts(seed, hasTTS, { weights, dueItems: [], dnaItems: [], authored: undefined })) : newOnlySession(seed, hasTTS);
    const seen = new Set();
    for (const t of tasks) {
      if (t.source !== "new" || !t.item || t.type === "dialogue") continue;
      const group = seen.has(t.key) ? "prod" : "recog";
      stat[group][t.type] = (stat[group][t.type] || 0) + 1;
      seen.add(t.key);
    }
  }
  return stat;
}

const share = (obj, key) => (obj[key] || 0) / Object.values(obj).reduce((a, b) => a + b, 0);

test("Typwahl ohne weights: Wiedererkennung wie recogType (≈ 30 % listen-choice), Produktion wie prodType", () => {
  const s = newTypeStats(null, true);
  const lc = share(s.recog, "listen-choice");
  assert.ok(lc > 0.18 && lc < 0.42, "listen-choice-Anteil " + lc);
  assert.ok(Object.keys(s.recog).every(t => RECOGNITION.includes(t)), JSON.stringify(s.recog));
  for (const t of ["input-hr", "choice-hr", "listen", "order", "cloze", "ending"]) assert.ok(s.prod[t] > 0, t + " kommt vor");
  assert.ok(s.recog.truefalse > 0, "truefalse kommt vor");
  const noTts = newTypeStats(null, false);
  assert.equal(noTts.recog["listen-choice"] || 0, 0);
  assert.equal(noTts.prod.listen || 0, 0);
});

test("Typwahl mit weights: listenChoice und prod steuern die Aufgaben neuer Wörter", () => {
  const listenHeavy = newTypeStats({ prod: { "input-hr": 2, "choice-hr": 1, listen: 4, order: 2, cloze: 2 }, listenChoice: 0.55, roleplayBonus: 0.1 }, true);
  const base = newTypeStats(null, true);
  assert.ok(share(listenHeavy.recog, "listen-choice") > share(base.recog, "listen-choice") + 0.1, "mehr listen-choice");
  assert.ok(share(listenHeavy.prod, "listen") > share(base.prod, "listen") + 0.1, "mehr listen");

  // Nur input-hr gewichtet: zwei input-hr dürfen nicht aufeinander folgen, deshalb weichen einige Aufgaben
  // auf gewichtete Wiedererkennungs-Typen aus – nie auf Typen mit Gewicht 0.
  const onlyInput = newTypeStats({ prod: { "input-hr": 1, "choice-hr": 0, listen: 0, order: 0, cloze: 0, ending: 0 }, listenChoice: 0 }, true);
  assert.equal(onlyInput.recog["listen-choice"] || 0, 0, "listenChoice 0 → keine listen-choice");
  assert.ok(share(onlyInput.prod, "input-hr") > 0.7, "Produktion überwiegend input-hr: " + JSON.stringify(onlyInput.prod));
  for (const t of ["choice-hr", "listen", "order", "cloze", "ending", "listen-choice"]) {
    assert.equal(onlyInput.prod[t] || 0, 0, t + " hat Gewicht 0: " + JSON.stringify(onlyInput.prod));
  }
});

test("Typwahl mit Standard-weights aus plan.js: keine Ersatz-Typen nötig", () => {
  const BASE = { prod: { "input-hr": 2, "choice-hr": 1, listen: 1, order: 2, cloze: 2 }, listenChoice: 0.3, roleplayBonus: 0 };
  for (const hasTTS of TTS) {
    for (const seed of SEEDS.slice(0, 100)) {
      const seen = new Set();
      for (const t of buildSession(opts(seed, hasTTS, { weights: BASE }))) {
        if (!t.item || t.type === "dialogue") continue;
        if (t.source === "new" && !seen.has(t.key)) { seen.add(t.key); assert.ok(RECOGNITION.includes(t.type)); continue; }
        assert.ok(PRODUCTION.includes(t.type), `seed ${seed}: ${t.source} ${t.type}`);
      }
    }
  }
});

test("Abwechslung: ending, truefalse, dialogue und match kommen vor", () => {
  const types = new Set();
  for (const seed of SEEDS.slice(0, 50)) fullSession(seed, true).forEach(t => types.add(t.type));
  for (const t of ["ending", "truefalse", "dialogue", "match", "choice-de", "input-hr", "roleplay", "fix"]) assert.ok(types.has(t), t);
});

test("Fällige und DNA-Items werden aktiv abgefragt (Produktion bevorzugt)", () => {
  let prod = 0, all = 0;
  for (const seed of SEEDS.slice(0, 100)) {
    for (const t of fullSession(seed, true)) {
      if (t.source !== "due" && t.source !== "dna") continue;
      all++;
      if (PRODUCTION.includes(t.type)) prod++;
    }
  }
  assert.ok(prod / all > 0.9, `${prod}/${all}`);
});

// ---------------------------------------------------------------- checkSession

const T = (type, keys, source = "new") => ({ type, keys, key: keys[0], source, prompt: "", answer: "", concepts: [] });

test("checkSession: findet jeden Regelverstoß", () => {
  const ok = [T("choice-de", ["a"]), T("truefalse", ["b"]), T("input-hr", ["a"]), T("choice-de", ["c"]), T("choice-hr", ["b"])];
  assert.deepEqual(checkSession(ok, { minWords: 3 }), []);

  const has = (tasks, o, re) => assert.ok(checkSession(tasks, o).some(e => re.test(e)), JSON.stringify(checkSession(tasks, o)));
  has([T("choice-de", ["a"]), T("choice-de", ["b"])], { minWords: 1 }, /Typ/);
  has([T("choice-de", ["a"]), T("truefalse", ["a"])], { minWords: 1 }, /Wort/);
  has([T("choice-de", ["a"]), T("match", ["b", "c", "a", "d"])], { minWords: 1 }, /Wort/);
  const four = [T("choice-de", ["a"]), T("input-hr", ["b"], "due"), T("truefalse", ["a"]), T("choice-hr", ["b"], "due"), T("input-hr", ["a"]), T("cloze", ["b"], "due"), T("choice-hr", ["a"])];
  has(four, { minWords: 1 }, /a.*4/);
  assert.deepEqual(checkSession(four.slice(0, 6), { minWords: 2 }), [], "3× ist erlaubt");
  has(four, { minWords: 1, maxPerWord: 2 }, /„b“/);
  has([T("input-hr", ["a"]), T("choice-de", ["b"])], { minWords: 1 }, /Wiedererkennung/);
  has(ok, { minWords: 4 }, /Wörter/);
  has([T("listen", ["a"], "due")], { minWords: 1, hasTTS: false }, /TTS|Hör/);
  has([Object.assign(T("choice-de", ["a"]), { source: undefined })], { minWords: 1 }, /Quelle/);
  has(ok, { minWords: 1, size: 20 }, /Länge/);
});

test("checkSession: Produktion vor Wiedererkennung ist nur für neue Wörter ein Verstoß", () => {
  assert.deepEqual(checkSession([T("input-hr", ["a"], "due"), T("ending", ["b"], "dna")], { minWords: 2 }), []);
  assert.equal(checkSession([T("input-hr", ["a"], "new"), T("ending", ["b"], "dna")], { minWords: 2 }).length, 1);
  // match zählt nicht als Wiedererkennung, truefalse schon
  assert.equal(checkSession([T("match", ["a", "b", "c", "d"]), T("cloze", ["e"]), T("order", ["a"])], { minWords: 1 }).length, 2);
  assert.deepEqual(checkSession([T("truefalse", ["a"]), T("cloze", ["e"], "due"), T("order", ["a"])], { minWords: 1 }), []);
});

test("checkSession: Autoren-Blöcke ohne Wörter; minWords standardmäßig 10", () => {
  const block = { type: "roleplay", keys: [], source: "authored", block: [{}, {}], prompt: "", answer: "", concepts: [] };
  assert.deepEqual(checkSession([T("choice-de", ["a"]), block, T("truefalse", ["a"])], { minWords: 1 }), [], "Block trennt Wörter");
  assert.equal(checkSession([block, Object.assign({}, block)], { minWords: 0 }).length, 1, "gleicher Blocktyp hintereinander");
  assert.ok(checkSession([T("choice-de", ["a"])]).some(e => /Wörter/.test(e)), "ohne opts gilt minWords 10");
  assert.deepEqual(checkSession(fullSession(3, true)), []);
});

// ---------------------------------------------------------------- insertRetry

test("insertRetry: frühestens pos + 2, erste Stelle ohne gleichen Typ/gleiches Wort, sonst ans Ende", () => {
  const q = () => [T("choice-de", ["a"]), T("truefalse", ["b"]), T("input-hr", ["c"]), T("choice-de", ["d"]), T("cloze", ["e"]), T("order", ["f"])];
  let queue = q();
  const r1 = T("choice-hr", ["a"]);
  assert.equal(insertRetry(queue, 0, r1), 2);
  assert.equal(queue[2], r1);
  assert.equal(queue.length, 7);

  queue = q();
  // pos + 2 = 2 grenzt an „b“ (Index 1), 3 an input-hr (Index 2) → 4 (zwischen input-hr c und choice-de d)
  assert.equal(insertRetry(queue, 0, T("input-hr", ["b"])), 4);

  // kein Platz ohne Konflikt hinter pos + 2 → ans Ende
  const last = [T("choice-de", ["a"]), T("input-hr", ["x"]), T("cloze", ["y"]), T("input-hr", ["z"])];
  assert.equal(insertRetry(last, 0, T("input-hr", ["a"])), 4);
  assert.equal(last.length, 5);

  // auch ein Task ohne Bezug zu queue[pos] kommt nie direkt hinter pos
  queue = q();
  assert.equal(insertRetry(queue, 0, T("ending", ["z"])), 2);
  queue = q();
  assert.equal(insertRetry(queue, 3, T("ending", ["z"])), 5);
  queue = q();
  assert.equal(insertRetry(queue, -5, T("ending", ["z"])), 0, "negative Position: ab Anfang");

  // pos ist die letzte Aufgabe → ans Ende
  queue = q();
  assert.equal(insertRetry(queue, 5, T("input-hr", ["f"])), 6);
});

function retryFor(q, ctx) {
  // wie retryFor in app.js: Wort-Aufgabe → andere Aufgabe zum selben Item, sonst Kopie
  if (!q.item || q.type === "dialogue") return Object.assign({}, q);
  const t = buildTask(RECOGNITION.includes(q.type) ? "input-hr" : "choice-hr", q.item, ctx) || buildTask("input-hr", q.item, ctx);
  return Object.assign(t, { source: q.source });
}

function referenceIndex(queue, pos, task) {
  for (let i = Math.max(0, pos + 2); i <= queue.length; i++) {
    if (!neighbourClash(queue[i - 1], task) && !neighbourClash(task, queue[i])) return i;
  }
  return queue.length;
}

test("insertRetry: 1000 zufällige Positionen – Stelle genau nach Regel, ohne Typ-/Wort-Nachbarn, wo eine solche Stelle existiert", () => {
  const pick = makeRng(4242);
  let fallback = 0;
  for (let n = 0; n < 1000; n++) {
    const seed = 1 + (n % 300);
    const hasTTS = n % 2 === 0;
    const queue = fullSession(seed, hasTTS);
    const ctx = { pool: F.POOL, hasTTS, rng: makeRng(n + 7) };
    const pos = Math.floor(pick() * queue.length);
    const retry = retryFor(queue[pos], ctx);
    const before = queue.slice();
    const expected = referenceIndex(before, pos, retry);
    const i = insertRetry(queue, pos, retry);
    assert.equal(i, expected, `seed ${seed}, pos ${pos}`);
    assert.equal(queue[i], retry);
    assert.equal(queue.length, before.length + 1);
    assert.deepEqual(queue.filter(t => t !== retry), before, "übrige Reihenfolge unverändert");
    assert.ok(i >= Math.min(pos + 2, before.length), "frühestens pos + 2");
    const clean = !neighbourClash(queue[i - 1], retry) && !neighbourClash(retry, queue[i + 1]);
    if (!clean) {
      // nur, wenn hinter pos + 1 keine passende Stelle existiert – dann laut Regel ans Ende
      fallback++;
      assert.equal(i, before.length, `seed ${seed}, pos ${pos}: Ersatz ist das Ende`);
      for (let j = Math.max(0, pos + 2); j <= before.length; j++) {
        assert.ok(neighbourClash(before[j - 1], retry) || neighbourClash(retry, before[j]), `seed ${seed}, pos ${pos}: Stelle ${j} wäre frei gewesen`);
      }
    }
  }
  assert.ok(fallback < 150, "Ersatz „ans Ende“ ist die Ausnahme: " + fallback);
});

test("insertRetry: Fehler in den ersten 8 Aufgaben → nie Typ- oder Wort-Nachbarn (Seeds 1–300, mit/ohne TTS)", () => {
  for (const hasTTS of TTS) {
    for (const seed of SEEDS) {
      const base = fullSession(seed, hasTTS);
      const ctx = { pool: F.POOL, hasTTS, rng: makeRng(seed + 500) };
      for (let pos = 0; pos < 8; pos++) {
        const queue = base.slice();
        const retry = retryFor(queue[pos], ctx);
        const i = insertRetry(queue, pos, retry);
        assert.ok(!neighbourClash(queue[i - 1], retry) && !neighbourClash(retry, queue[i + 1]), `seed ${seed}, pos ${pos}, i ${i}`);
      }
    }
  }
});

test("insertRetry: viele falsche Antworten in der ersten Session-Hälfte – ganze Folge ohne Typ- und Wort-Nachbarn", () => {
  const wrong = makeRng(99);
  for (const hasTTS of TTS) {
    for (const seed of SEEDS) {
      const queue = fullSession(seed, hasTTS);
      const ctx = { pool: F.POOL, hasTTS, rng: makeRng(seed + 1000) };
      // Lernende/r beantwortet die ersten 8 Aufgaben, im Schnitt jede dritte falsch (Wiederholungen zählen mit)
      for (let pos = 0; pos < 8; pos++) {
        if (wrong() < 0.33) insertRetry(queue, pos, retryFor(queue[pos], ctx));
      }
      for (let i = 1; i < queue.length; i++) {
        assert.ok(!neighbourClash(queue[i - 1], queue[i]), `seed ${seed}: ${i - 1}/${i} ${queue[i - 1].type}/${queue[i].type} ${queue[i - 1].keys}/${queue[i].keys}`);
      }
    }
  }
});

// ---------------------------------------------------------------- Browser

test("Browser: engine/session.js hängt sich nach core, distractors und tasks an window.KorakEngine", () => {
  const win = {};
  win.self = win;
  for (const file of ["core.js", "distractors.js", "tasks.js", "session.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "engine", file), "utf8"), win);
  }
  const E = win.KorakEngine;
  for (const name of ["buildSession", "checkSession", "insertRetry", "buildTask", "makeRng"]) assert.equal(typeof E[name], "function", name);
  const tasks = E.buildSession(opts(5, true, { rng: E.makeRng(5) }));
  assert.equal(tasks.length, 20);
  assert.equal(E.checkSession(tasks, { minWords: 10 }).length, 0);
});
