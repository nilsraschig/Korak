"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { makeRng, norm, missingDiacritics } = require("../engine/core.js");
const tasks = require("../engine/tasks.js");

const { buildTask, canBuild, typingResult, TYPES_WITH_ITEM, LISTEN_TYPES, RECOGNITION } = tasks;

const SEEDS = Array.from({ length: 200 }, (_, i) => i + 1);

const KAVA_FORMS = { nom: "kava", gen: "kave", dat: "kavi", acc: "kavu", ins: "kavom", loc: "kavi", voc: "kavo" };
const SOK_FORMS = { nom: "sok", gen: "soka", dat: "soku", acc: "sok", ins: "sokom", loc: "soku", voc: "soče" };

// Annotierter Fixture-Pool: Getränke und Essen (Substantive), Verben, Adjektive, Phrasen.
const ITEMS = [
  { hr: "kava", de: "Kaffee", pos: "noun", category: "drink", gender: "f", forms: KAVA_FORMS, concepts: ["case-acc", "gender-f"] },
  { hr: "sok", de: "Saft", pos: "noun", category: "drink", gender: "m", forms: SOK_FORMS },
  { hr: "čaj", de: "Tee", pos: "noun", category: "drink", gender: "m" },
  { hr: "pivo", de: "Bier", pos: "noun", category: "drink", gender: "n" },
  { hr: "vino", de: "Wein", pos: "noun", category: "drink", gender: "n" },
  { hr: "voda", de: "Wasser", pos: "noun", category: "drink", gender: "f" },
  { hr: "kruh", de: "Brot", pos: "noun", category: "food", gender: "m" },
  { hr: "sir", de: "Käse", pos: "noun", category: "food", gender: "m" },
  { hr: "riba", de: "Fisch", pos: "noun", category: "food", gender: "f" },
  { hr: "juha", de: "Suppe", pos: "noun", category: "food", gender: "f" },
  { hr: "piti", de: "trinken", pos: "verb", category: "action" },
  { hr: "jesti", de: "essen", pos: "verb", category: "action" },
  { hr: "dobar", de: "gut", pos: "adj", category: "quality" },
  { hr: "velik", de: "groß", pos: "adj", category: "quality" },
  { hr: "Jednu kavu, molim", de: "Einen Kaffee, bitte", pos: "phrase", category: "order" },
  { hr: "Račun, molim", de: "Die Rechnung, bitte", pos: "phrase", category: "order" },
  { hr: "Želim popiti vodu", de: "Ich möchte Wasser trinken", pos: "phrase", category: "order" },
  { hr: "Imate li slobodan stol?", de: "Haben Sie einen freien Tisch?", pos: "phrase", category: "order" },
  { hr: "Dobar dan", de: "Guten Tag", pos: "phrase", category: "greeting" },
  { hr: "Hvala lijepa", de: "Vielen Dank", pos: "phrase", category: "greeting" }
].map((it, i) => Object.assign({ key: "a1-3-1-" + i }, it));

const POOL = ITEMS;
const byHr = hr => ITEMS.find(i => i.hr === hr);

const LESSON = {
  id: "a1-3-3",
  dialogue: [
    ["A", "Dobar dan! Što želite?"],
    ["B", "Jednu kavu, molim."],
    ["A", "S mlijekom?"],
    ["B", "Da, s mlijekom."]
  ]
};
const DIALOGUES = [
  LESSON,
  { id: "a1-1-1", dialogue: [["A", "Dobro jutro!"], ["B", "Dobro jutro! Kako ste?"], ["A", "Dobro sam, hvala."], ["B", "I ja."]] },
  { id: "a1-2-2", dialogue: [["A", "Koliko imaš godina?"], ["B", "Imam dvadeset godina."], ["A", "Odakle si?"], ["B", "Iz Beča."]] }
];

function ctx(seed, extra) {
  return Object.assign({ pool: POOL, lesson: LESSON, dialogues: DIALOGUES, rng: makeRng(seed), hasTTS: true }, extra);
}

const OPTION_TYPES = ["choice-de", "choice-hr", "listen-choice", "cloze", "ending", "dialogue"];

function checkOptions(task, label) {
  assert.ok(Array.isArray(task.options), label + ": options vorhanden");
  assert.ok(task.options.length >= 2 && task.options.length <= 4, label + ": 2 bis 4 Optionen: " + JSON.stringify(task.options));
  assert.ok(task.options.every(o => typeof o === "string" && norm(o) !== ""), label + ": keine leeren Optionen: " + JSON.stringify(task.options));
  assert.equal(new Set(task.options.map(norm)).size, task.options.length, label + ": keine Doppel: " + JSON.stringify(task.options));
  assert.equal(task.options.filter(o => o === task.answer).length, 1, label + ": Antwort genau einmal: " + JSON.stringify(task.options));
}

// ---------------------------------------------------------------- Konstanten

test("Konstanten: TYPES_WITH_ITEM, LISTEN_TYPES, RECOGNITION", () => {
  assert.deepEqual(LISTEN_TYPES, ["listen", "listen-choice"]);
  assert.deepEqual(RECOGNITION, ["choice-de", "listen-choice", "truefalse"]);
  for (const t of ["choice-de", "choice-hr", "listen-choice", "input-hr", "listen", "cloze", "order", "match", "ending", "truefalse"]) {
    assert.ok(TYPES_WITH_ITEM.includes(t), t + " braucht ein Item");
  }
  assert.ok(!TYPES_WITH_ITEM.includes("dialogue"), "Dialog baut aus der Lektion, nicht aus einem Item");
});

// ---------------------------------------------------------------- Optionen-Invarianten

test("Optionen: Antwort genau einmal, nie leer, nie doppelt (alle Typen, alle Items, Seeds 1-200)", () => {
  for (const type of OPTION_TYPES) {
    const items = type === "dialogue" ? [null] : ITEMS;
    let built = 0;
    for (const item of items) {
      for (const seed of SEEDS) {
        const task = buildTask(type, item, ctx(seed));
        if (task === null) continue;
        built++;
        assert.equal(task.type, type);
        checkOptions(task, `${type} ${item && item.hr} Seed ${seed}`);
      }
    }
    assert.ok(built > 0, type + " wurde nie gebaut");
  }
});

test("Optionen: choice-de/choice-hr/listen-choice mit vollem Pool haben genau 4 Optionen", () => {
  for (const type of ["choice-de", "choice-hr", "listen-choice"]) {
    for (const seed of SEEDS) {
      const task = buildTask(type, byHr("kava"), ctx(seed));
      assert.equal(task.options.length, 4, `${type} Seed ${seed}`);
    }
  }
});

test("Optionen: gemischt, die Antwort steht nicht immer an derselben Stelle", () => {
  const positions = new Set();
  for (const seed of SEEDS) positions.add(buildTask("choice-de", byHr("kava"), ctx(seed)).options.indexOf("Kaffee"));
  assert.deepEqual([...positions].sort(), [0, 1, 2, 3]);
});

test("Optionen: Distraktoren stammen aus derselben Kategorie, wenn genug da sind", () => {
  const drinks = new Set(["Tee", "Saft", "Bier", "Wein", "Wasser"]);
  for (const seed of SEEDS) {
    const task = buildTask("choice-de", byHr("kava"), ctx(seed));
    for (const o of task.options) if (o !== "Kaffee") assert.ok(drinks.has(o), "Getränk erwartet: " + o);
    const hr = buildTask("choice-hr", byHr("kava"), ctx(seed));
    for (const o of hr.options) if (o !== "kava") assert.ok(["čaj", "sok", "pivo", "vino", "voda"].includes(o), "Getränk erwartet: " + o);
  }
});

// ---------------------------------------------------------------- Prompt-Texte und Felder (wie ex() in app.js)

test("choice-de / choice-hr / listen-choice / listen / input-hr: Prompts, Antworten, Felder wie heute in app.js", () => {
  const kava = byHr("kava");
  const a = buildTask("choice-de", kava, ctx(1));
  assert.equal(a.prompt, "Was bedeutet „kava“?");
  assert.equal(a.answer, "Kaffee");
  assert.equal(a.spoken, "kava");
  assert.equal(a.key, kava.key);
  assert.deepEqual(a.keys, [kava.key]);
  assert.equal(a.item, kava);
  assert.deepEqual(a.concepts, ["case-acc", "gender-f"]);

  const b = buildTask("choice-hr", kava, ctx(1));
  assert.equal(b.prompt, "Welche kroatische Antwort bedeutet „Kaffee“?");
  assert.equal(b.answer, "kava");

  const c = buildTask("listen-choice", kava, ctx(1));
  assert.equal(c.prompt, "Hör genau hin: Was bedeutet das?");
  assert.equal(c.answer, "Kaffee");
  assert.equal(c.spoken, "kava");

  const d = buildTask("listen", kava, ctx(1));
  assert.equal(d.prompt, "Tippe auf Anhören und schreibe den kroatischen Ausdruck.");
  assert.equal(d.answer, "kava");
  assert.equal(d.spoken, "kava");

  const e = buildTask("input-hr", kava, ctx(1));
  assert.equal(e.prompt, "Übersetze ins Kroatische: Kaffee");
  assert.equal(e.answer, "kava");
});

test("input-hr und listen haben keine options", () => {
  for (const type of ["input-hr", "listen"]) {
    const task = buildTask(type, byHr("kava"), ctx(1));
    assert.equal(task.options, undefined);
  }
});

test("concepts: leere Liste, wenn das Item keine hat; keys/key folgen dem Item", () => {
  const sir = byHr("sir");
  const task = buildTask("choice-de", sir, ctx(1));
  assert.deepEqual(task.concepts, []);
  assert.deepEqual(task.keys, [sir.key]);
  const withConcepts = buildTask("choice-de", byHr("kava"), ctx(1));
  assert.notEqual(withConcepts.concepts, byHr("kava").concepts, "Kopie, nicht dieselbe Liste");
});

test("isReview des Items wird in die Aufgabe übernommen", () => {
  const task = buildTask("choice-de", Object.assign({}, byHr("kava"), { isReview: true }), ctx(1));
  assert.equal(task.isReview, true);
  assert.equal(buildTask("choice-de", byHr("kava"), ctx(1)).isReview, undefined);
});

// ---------------------------------------------------------------- Hören

test("hasTTS:false -> keine Hör-Aufgaben, alles andere bleibt möglich", () => {
  for (const seed of SEEDS) {
    assert.equal(buildTask("listen", byHr("kava"), ctx(seed, { hasTTS: false })), null);
    assert.equal(buildTask("listen-choice", byHr("kava"), ctx(seed, { hasTTS: false })), null);
  }
  assert.equal(canBuild("listen", byHr("kava"), ctx(1, { hasTTS: false })), false);
  assert.equal(canBuild("listen-choice", byHr("kava"), ctx(1, { hasTTS: false })), false);
  assert.ok(buildTask("choice-de", byHr("kava"), ctx(1, { hasTTS: false })));
  assert.ok(buildTask("input-hr", byHr("kava"), ctx(1, { hasTTS: false })));
  assert.ok(buildTask("listen", byHr("kava"), ctx(1, { hasTTS: true })));
  assert.equal(buildTask("listen", byHr("kava"), ctx(1, { hasTTS: undefined })), null, "ohne Angabe gilt: keine Stimme");
});

// ---------------------------------------------------------------- Lücke füllen

test("cloze: Lücke im Satz, Antwort ist ein Wort daraus, Optionen sind Einzelwörter", () => {
  const item = byHr("Želim popiti vodu");
  const answers = new Set();
  for (const seed of SEEDS) {
    const task = buildTask("cloze", item, ctx(seed));
    assert.ok(task, "Seed " + seed);
    assert.ok(task.prompt.includes("_____"), task.prompt);
    assert.equal(task.hint, "„Ich möchte Wasser trinken“");
    assert.ok(item.hr.split(" ").includes(task.answer), "Antwort aus dem Satz: " + task.answer);
    assert.equal(task.prompt.replace("_____", task.answer), item.hr, "Satz mit Lücke ergibt wieder den Satz");
    checkOptions(task, "cloze Seed " + seed);
    for (const o of task.options) assert.ok(!/\s/.test(o), "Einzelwort: " + o);
    answers.add(task.answer);
  }
  assert.deepEqual([...answers].sort(), ["popiti", "vodu"], "nur kleingeschriebene Wörter ab 4 Buchstaben (Želim nicht)");
});

test("cloze: Satzzeichen bleiben außerhalb der Lücke, Distraktoren sind keine Wörter aus dem Satz", () => {
  const item = byHr("Jednu kavu, molim");
  for (const seed of SEEDS) {
    const task = buildTask("cloze", item, ctx(seed));
    assert.ok(["kavu", "molim"].includes(task.answer), task.answer);
    assert.ok(task.prompt === "Jednu _____, molim" || task.prompt === "Jednu kavu, _____", task.prompt);
    for (const o of task.options) if (o !== task.answer) assert.ok(!["jednu", "kavu", "molim"].includes(o.toLowerCase()), "Satzwort als Distraktor: " + o);
  }
});

test("cloze: nicht möglich bei Einzelwort, zwei Wörtern oder nur Großgeschriebenem", () => {
  assert.equal(buildTask("cloze", byHr("kava"), ctx(1)), null);
  assert.equal(buildTask("cloze", byHr("Dobar dan"), ctx(1)), null);
  assert.equal(canBuild("cloze", byHr("kava"), ctx(1)), false);
  const caps = { hr: "Ana Marko Ivan", de: "Namen", key: "x-0" };
  assert.equal(buildTask("cloze", caps, ctx(1)), null);
  assert.equal(canBuild("cloze", byHr("Želim popiti vodu"), ctx(1)), true);
});

test("cloze: Distraktoren bevorzugen ähnliche Länge", () => {
  const pool = ITEMS.concat([{ hr: "razmišljam nepoznatim", de: "x", pos: "phrase", key: "x-1" }]);   // 10 und 10 Zeichen: zu lang
  for (const seed of SEEDS) {
    const task = buildTask("cloze", byHr("Želim popiti vodu"), ctx(seed, { pool }));
    for (const o of task.options) {
      if (o === task.answer) continue;
      assert.ok(Math.abs(o.length - task.answer.length) <= Math.max(3, 0.4 * task.answer.length), `Länge passt: ${o} zu ${task.answer}`);
    }
  }
});

// ---------------------------------------------------------------- Satz bauen

test("order: Wörter sind eine Umstellung der Antwort, nie die richtige Reihenfolge", () => {
  const item = byHr("Želim popiti vodu");
  const seen = new Set();
  for (const seed of SEEDS) {
    const task = buildTask("order", item, ctx(seed));
    assert.equal(task.prompt, "Bilde den Satz: „Ich möchte Wasser trinken“");
    assert.equal(task.answer, "Želim popiti vodu");
    assert.deepEqual([...task.words].sort(), ["Želim", "popiti", "vodu"].sort());
    assert.notEqual(task.words.join(" "), task.answer, "Seed " + seed);
    assert.equal(task.options, undefined);
    seen.add(task.words.join(" "));
  }
  assert.equal(seen.size, 5, "alle 5 anderen Reihenfolgen kommen vor");
});

test("order: Satzzeichen fallen aus Antwort und Wörtern; nur 3 bis 8 Wörter", () => {
  const task = buildTask("order", byHr("Imate li slobodan stol?"), ctx(3));
  assert.equal(task.answer, "Imate li slobodan stol");
  assert.deepEqual([...task.words].sort(), ["Imate", "li", "slobodan", "stol"].sort());
  assert.equal(buildTask("order", byHr("Dobar dan"), ctx(1)), null);
  assert.equal(buildTask("order", byHr("kava"), ctx(1)), null);
  const nine = { hr: "a b c d e f g h i", de: "neun", key: "x-9" };
  const eight = { hr: "a b c d e f g h", de: "acht", key: "x-8" };
  assert.equal(buildTask("order", nine, ctx(1)), null);
  assert.ok(buildTask("order", eight, ctx(1)));
  assert.equal(canBuild("order", nine, ctx(1)), false);
  assert.equal(canBuild("order", eight, ctx(1)), true);
});

test("order: auch bei wiederholten Wörtern und Seeds mit Glück ist die Reihenfolge anders", () => {
  const item = { hr: "ne ne da", de: "nein nein ja", key: "x-3" };
  for (const seed of SEEDS) {
    const task = buildTask("order", item, ctx(seed));
    assert.notEqual(task.words.join(" "), "ne ne da", "Seed " + seed);
  }
  const same = { hr: "ne ne ne", de: "nein nein nein", key: "x-4" };
  assert.deepEqual(buildTask("order", same, ctx(1)).words, ["ne", "ne", "ne"], "nichts zu mischen, aber kein Absturz");
});

// ---------------------------------------------------------------- Paare verbinden

test("match: 4 Items aus dem Pool inklusive Item, eindeutig; keys sind alle 4 Schlüssel", () => {
  const item = byHr("kava");
  for (const seed of SEEDS) {
    const task = buildTask("match", item, ctx(seed));
    assert.equal(task.type, "match");
    assert.equal(task.prompt, "Verbinde jeden kroatischen Ausdruck mit seiner Bedeutung.");
    assert.equal(task.answer, "");
    assert.equal(task.pairs.length, 4);
    assert.ok(task.pairs.some(p => p.key === item.key), "enthält das Item");
    assert.equal(new Set(task.pairs.map(p => norm(p.hr))).size, 4);
    assert.equal(new Set(task.pairs.map(p => norm(p.de))).size, 4);
    assert.deepEqual([...task.keys].sort(), task.pairs.map(p => p.key).sort());
    assert.equal(task.options, undefined);
    for (const p of task.pairs) assert.ok(POOL.includes(p) || p === item, "stammt aus dem Pool");
  }
});

test("match: bevorzugt kurze Ausdrücke (bis 4 Wörter), nimmt das Item aber immer mit", () => {
  for (const seed of SEEDS) {
    const task = buildTask("match", byHr("Imate li slobodan stol?"), ctx(seed));
    assert.ok(task.pairs.some(p => p.hr === "Imate li slobodan stol?"));
    for (const p of task.pairs) assert.ok(p.hr.split(/\s+/).length <= 4 || p.hr === "Imate li slobodan stol?", p.hr);
  }
});

test("match: Doppelte hr/de und leere Einträge im Pool werden übersprungen; zu kleiner Pool -> null", () => {
  const messy = [
    byHr("kava"),
    { hr: "kava", de: "Kaffeegetränk", key: "m-1" },
    { hr: "kafa", de: "Kaffee", key: "m-2" },
    { hr: "", de: "Leer", key: "m-3" },
    { hr: "leer", de: "  ", key: "m-4" },
    { hr: "čaj", de: "Tee", key: "m-5" },
    { hr: "Čaj!", de: "Schwarztee", key: "m-6" },
    { hr: "sok", de: "Saft", key: "m-7" },
    { hr: "pivo", de: "Bier", key: "m-8" }
  ];
  for (const seed of SEEDS) {
    const task = buildTask("match", byHr("kava"), ctx(seed, { pool: messy }));
    assert.equal(task.pairs.length, 4);
    assert.equal(new Set(task.pairs.map(p => norm(p.hr))).size, 4);
    assert.equal(new Set(task.pairs.map(p => norm(p.de))).size, 4);
    assert.ok(task.pairs.every(p => norm(p.hr) !== "" && norm(p.de) !== ""));
  }
  assert.equal(buildTask("match", byHr("kava"), ctx(1, { pool: messy.slice(0, 4) })), null);
  assert.equal(buildTask("match", byHr("kava"), ctx(1, { pool: [] })), null);
  assert.equal(canBuild("match", byHr("kava"), ctx(1, { pool: [] })), false);
});

// ---------------------------------------------------------------- Endung wählen

test("ending: kava mit Fall ins -> Prompt „s ___“, Antwort „kavom“", () => {
  let found = 0;
  for (const seed of SEEDS) {
    const task = buildTask("ending", byHr("kava"), ctx(seed));
    if (task.concepts[0] !== "case-ins") continue;
    found++;
    assert.equal(task.prompt, "s ___");
    assert.equal(task.answer, "kavom");
    assert.equal(task.hint, "Welche Form von „kava“ (Kaffee) passt?");
  }
  assert.ok(found > 10, "Fall ins kommt vor: " + found);
});

test("ending: Rahmen und Antwort je Fall (gen, acc, ins, loc), alle vier Fälle kommen vor, nie dat/voc/nom", () => {
  const expected = {
    "case-gen": ["bez ___", "kave"],
    "case-acc": ["Vidim ___.", "kavu"],
    "case-ins": ["s ___", "kavom"],
    "case-loc": ["o ___", "kavi"]
  };
  const seen = new Set();
  for (const seed of SEEDS) {
    const task = buildTask("ending", byHr("kava"), ctx(seed));
    assert.equal(task.type, "ending");
    assert.equal(task.concepts.length, 1);
    const [prompt, answer] = expected[task.concepts[0]];
    assert.equal(task.prompt, prompt);
    assert.equal(task.answer, answer);
    assert.equal(task.key, byHr("kava").key);
    assert.deepEqual(task.keys, [byHr("kava").key]);
    seen.add(task.concepts[0]);
    checkOptions(task, "ending Seed " + seed);
    assert.equal(task.options.length, 4, "kava hat genug verschiedene Formen");
    const allForms = new Set(Object.values(KAVA_FORMS));
    assert.ok(task.options.every(o => allForms.has(o)), "Optionen sind Formen desselben Wortes: " + task.options);
  }
  assert.deepEqual([...seen].sort(), Object.keys(expected).sort());
});

test("ending: „sa ___“ bei sok (Instrumental sokom) und anderen Formen mit s, š, z, ž am Anfang", () => {
  let n = 0;
  for (const seed of SEEDS) {
    const task = buildTask("ending", byHr("sok"), ctx(seed));
    if (task.concepts[0] === "case-ins") {
      n++;
      assert.equal(task.prompt, "sa ___");
      assert.equal(task.answer, "sokom");
    }
  }
  assert.ok(n > 10);
  for (const [hr, ins] of [["šunka", "šunkom"], ["zec", "zecom"], ["žena", "ženom"], ["sir", "sirom"]]) {
    const item = { hr, de: "x", key: "e-1", forms: { nom: hr, gen: hr + "e", acc: hr + "u", ins, loc: hr + "i" } };
    let hit = false;
    for (const seed of SEEDS) {
      const task = buildTask("ending", item, ctx(seed));
      if (task.concepts[0] !== "case-ins") continue;
      hit = true;
      assert.equal(task.prompt, "sa ___", hr);
    }
    assert.ok(hit, hr);
  }
  const kuca = { hr: "kuća", de: "Haus", key: "e-2", forms: { nom: "kuća", gen: "kuće", acc: "kuću", ins: "kućom", loc: "kući" } };
  for (const seed of SEEDS) {
    const task = buildTask("ending", kuca, ctx(seed));
    if (task.concepts[0] === "case-ins") assert.equal(task.prompt, "s ___", "kućom beginnt mit k");
  }
});

test("ending: Fälle, deren Form gleich dem Nominativ ist, werden nicht gefragt (sok: acc = nom)", () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const task = buildTask("ending", byHr("sok"), ctx(seed));
    assert.notEqual(task.answer, "sok");
    seen.add(task.concepts[0]);
    checkOptions(task, "sok Seed " + seed);
  }
  assert.deepEqual([...seen].sort(), ["case-gen", "case-ins", "case-loc"]);
});

test("ending: ohne forms oder mit weniger als 2 eigenen Formen -> null", () => {
  assert.equal(buildTask("ending", byHr("čaj"), ctx(1)), null);
  assert.equal(canBuild("ending", byHr("čaj"), ctx(1)), false);
  const nur1 = { hr: "kava", de: "Kaffee", key: "e-3", forms: { nom: "kava", gen: "kave" } };
  assert.equal(buildTask("ending", nur1, ctx(1)), null);
  const nurDativVokativ = { hr: "kava", de: "Kaffee", key: "e-4", forms: { nom: "kava", dat: "kavi", voc: "kavo" } };
  assert.equal(buildTask("ending", nurDativVokativ, ctx(1)), null, "dat und voc zählen nicht");
  const gleichNom = { hr: "kava", de: "Kaffee", key: "e-5", forms: { nom: "kava", gen: "kava", acc: "kava", ins: "kavom" } };
  assert.equal(buildTask("ending", gleichNom, ctx(1)), null, "gen/acc = nom zählen nicht");
  const leer = { hr: "kava", de: "Kaffee", key: "e-6", forms: { nom: "kava", gen: "", acc: "  ", ins: "kavom" } };
  assert.equal(buildTask("ending", leer, ctx(1)), null);
  const zwei = { hr: "kava", de: "Kaffee", key: "e-7", forms: { nom: "kava", gen: "kave", ins: "kavom" } };
  assert.ok(buildTask("ending", zwei, ctx(1)));
  assert.equal(canBuild("ending", zwei, ctx(1)), true);
});

test("ending: ohne forms.nom dient item.hr als Nominativ; Optionen ohne Doppel und leere Werte", () => {
  const item = { hr: "kava", de: "Kaffee", key: "e-8", forms: { gen: "kave", acc: "kavu", ins: "kava", dat: "", loc: "kavi" } };
  for (const seed of SEEDS) {
    const task = buildTask("ending", item, ctx(seed));
    assert.ok(task);
    assert.equal(task.hint, "Welche Form von „kava“ (Kaffee) passt?");
    assert.notEqual(task.answer, "kava", "Instrumental „kava“ = Nominativ: nicht fragen");
    checkOptions(task, "Seed " + seed);
  }
});

test("ending: nur 2 Optionen, wenn das Wort kaum verschiedene Formen hat; sonst nie weniger als 2", () => {
  const item = { hr: "x", de: "y", key: "e-9", forms: { nom: "a", gen: "b", acc: "b", ins: "b", loc: "b" } };
  const task = buildTask("ending", item, ctx(1));
  assert.deepEqual([...task.options].sort(), ["a", "b"]);
  const dead = { hr: "a", de: "y", key: "e-10", forms: { gen: "b", acc: "b" } };
  assert.equal(buildTask("ending", dead, ctx(1)), null, "keine falsche Option möglich -> null");
});

test("ending: ctx.focus fragt bevorzugt den Fall des Fokus-Konzepts, sonst wie bisher", () => {
  for (const seed of SEEDS) {
    const task = buildTask("ending", byHr("kava"), ctx(seed, { focus: ["case-acc"] }));
    assert.deepEqual(task.concepts, ["case-acc"], "Seed " + seed);
    assert.equal(task.prompt, "Vidim ___.");
    assert.equal(task.answer, "kavu");
    checkOptions(task, "focus Seed " + seed);
  }
  const two = new Set();
  for (const seed of SEEDS) {
    const task = buildTask("ending", byHr("kava"), ctx(seed, { focus: ["case-loc", "gender", "case-gen"] }));
    assert.ok(["case-loc", "case-gen"].includes(task.concepts[0]), task.concepts[0]);
    two.add(task.concepts[0]);
  }
  assert.equal(two.size, 2, "beide Fokus-Fälle kommen vor");
  // sok: acc = nom wird nie gefragt – Fokus „Akkusativ“ fällt auf die übrigen Fälle zurück
  const rest = new Set();
  for (const seed of SEEDS) rest.add(buildTask("ending", byHr("sok"), ctx(seed, { focus: ["case-acc"] })).concepts[0]);
  assert.deepEqual([...rest].sort(), ["case-gen", "case-ins", "case-loc"]);
  // Fokus ohne Fall-Konzept oder leer: identisch zur Aufgabe ohne Fokus (gleicher Seed)
  for (const seed of SEEDS.slice(0, 50)) {
    const plainTask = buildTask("ending", byHr("kava"), ctx(seed));
    assert.deepEqual(buildTask("ending", byHr("kava"), ctx(seed, { focus: ["diacritics-c"] })), plainTask);
    assert.deepEqual(buildTask("ending", byHr("kava"), ctx(seed, { focus: [] })), plainTask);
  }
});

// ---------------------------------------------------------------- Richtig / Falsch

test("truefalse: über 200 Seeds sowohl Richtig als auch Falsch; bei Falsch ist de' ≠ item.de", () => {
  const counts = { Richtig: 0, Falsch: 0 };
  const item = byHr("kava");
  for (const seed of SEEDS) {
    const task = buildTask("truefalse", item, ctx(seed));
    assert.equal(task.type, "truefalse");
    assert.deepEqual(task.options, ["Richtig", "Falsch"], "feste Reihenfolge");
    assert.ok(task.options.includes(task.answer));
    counts[task.answer]++;
    const m = /^„(.*)“ bedeutet „(.*)“$/.exec(task.prompt);
    assert.ok(m, "Aussageform: " + task.prompt);
    assert.equal(m[1], "kava");
    if (task.answer === "Richtig") assert.equal(m[2], "Kaffee");
    else {
      assert.notEqual(norm(m[2]), norm("Kaffee"));
      assert.ok(ITEMS.some(i => i.de === m[2]), "falsche Bedeutung stammt aus dem Pool: " + m[2]);
    }
    assert.equal(task.spoken, "kava");
    assert.deepEqual(task.keys, [item.key]);
  }
  assert.ok(counts.Richtig > 60 && counts.Falsch > 60, "etwa 50/50: " + JSON.stringify(counts));
});

test("truefalse: Falsch-Aussage ist keine zweite richtige Antwort (gleiche Bedeutung/gleiches Wort im Pool)", () => {
  const pool = [
    byHr("kava"),
    { hr: "kava", de: "Kaffeegetränk", key: "t-1" },
    { hr: "kafa", de: "Kaffee", key: "t-2" },
    { hr: "čaj", de: "Tee", key: "t-3" },
    { hr: "sok", de: "", key: "t-5" }
  ];
  for (const seed of SEEDS) {
    const task = buildTask("truefalse", byHr("kava"), ctx(seed, { pool }));
    const m = /^„(.*)“ bedeutet „(.*)“$/.exec(task.prompt);
    if (task.answer === "Falsch") assert.equal(m[2], "Tee");
  }
});

test("truefalse: ohne Distraktor im Pool bleibt es eine richtige Aussage (kein Absturz, nie null)", () => {
  for (const seed of SEEDS) {
    const task = buildTask("truefalse", byHr("kava"), ctx(seed, { pool: [byHr("kava")] }));
    assert.ok(task);
    assert.equal(task.answer, "Richtig");
    assert.equal(task.prompt, "„kava“ bedeutet „Kaffee“");
  }
  assert.ok(buildTask("truefalse", byHr("kava"), ctx(1, { pool: [] })));
  assert.equal(canBuild("truefalse", byHr("kava"), ctx(1, { pool: [] })), true);
});

// ---------------------------------------------------------------- Dialog ergänzen

test("dialogue: antwortet nie mit Zeile 0, Zeile i >= 1 kommt zufällig vor", () => {
  const seen = new Set();
  for (const seed of SEEDS) {
    const task = buildTask("dialogue", null, ctx(seed));
    assert.equal(task.type, "dialogue");
    assert.notEqual(task.answer, LESSON.dialogue[0][1], "Seed " + seed);
    const i = LESSON.dialogue.findIndex(l => l[1] === task.answer);
    assert.ok(i >= 1, "Antwort ist eine Zeile ab 1");
    seen.add(i);
  }
  assert.deepEqual([...seen].sort(), [1, 2, 3]);
});

test("dialogue: Schlüssel dialog-<lessonId>, Prompt mit bis zu zwei vorherigen Zeilen und „…“, spoken = vorherige Zeile", () => {
  const prompts = {};
  for (const seed of SEEDS) {
    const task = buildTask("dialogue", null, ctx(seed));
    assert.equal(task.key, "dialog-a1-3-3");
    assert.deepEqual(task.keys, ["dialog-a1-3-3"]);
    assert.deepEqual(task.concepts, []);
    assert.deepEqual(task.item, { hr: task.answer, de: "Passende Antwort im Dialog" });
    const i = LESSON.dialogue.findIndex(l => l[1] === task.answer);
    prompts[i] = task.prompt;
    assert.equal(task.spoken, LESSON.dialogue[i - 1][1]);
  }
  assert.equal(prompts[1], "Dialog ergänzen:\nA: Dobar dan! Što želite?\nB: …");
  assert.equal(prompts[2], "Dialog ergänzen:\nA: Dobar dan! Što želite?\nB: Jednu kavu, molim.\nA: …");
  assert.equal(prompts[3], "Dialog ergänzen:\nB: Jednu kavu, molim.\nA: S mlijekom?\nB: …", "Zeile 0 fällt weg: nur zwei Zeilen davor");
});

test("dialogue: Distraktoren sind Zeilen anderer Lektionen, nie aus der eigenen Lektion", () => {
  const own = new Set(LESSON.dialogue.map(l => norm(l[1])));
  const others = new Set(DIALOGUES.slice(1).flatMap(d => d.dialogue.map(l => l[1])));
  for (const seed of SEEDS) {
    const task = buildTask("dialogue", null, ctx(seed));
    assert.equal(task.options.length, 4);
    for (const o of task.options) {
      if (o === task.answer) continue;
      assert.ok(others.has(o), "aus anderer Lektion: " + o);
      assert.ok(!own.has(norm(o)), "nicht aus der eigenen Lektion: " + o);
    }
  }
});

test("dialogue: ähnliche Länge wird bevorzugt", () => {
  const dialogues = [
    { id: "d-0", dialogue: [["A", "Hallo!"], ["B", "Hallo, wie geht es dir heute so?"]] },
    { id: "d-1", dialogue: [["A", "Bok!"], ["B", "Ja sam dobro, a ti kako si danas?"], ["A", "Isto tako, hvala na pitanju!"], ["B", "Ne znam što bih ti rekao sada, doista."], ["A", "Dobro."], ["B", "Hm."]] }
  ];
  for (const seed of SEEDS) {
    const task = buildTask("dialogue", null, ctx(seed, { lesson: dialogues[0], dialogues }));
    assert.equal(task.answer, "Hallo, wie geht es dir heute so?");
    assert.equal(task.options.length, 4);
    assert.deepEqual([...task.options].sort(), [
      "Hallo, wie geht es dir heute so?", "Isto tako, hvala na pitanju!", "Ja sam dobro, a ti kako si danas?", "Ne znam što bih ti rekao sada, doista."
    ].sort(), "ähnlich lange Zeilen zuerst: " + JSON.stringify(task.options));
  }
});

test("dialogue: zu wenige Zeilen, keine Distraktorzeilen oder keine Lektions-ID -> null", () => {
  assert.equal(buildTask("dialogue", null, ctx(1, { lesson: { id: "x", dialogue: [["A", "Bok!"]] } })), null);
  assert.equal(buildTask("dialogue", null, ctx(1, { lesson: { id: "x" } })), null);
  assert.equal(buildTask("dialogue", null, ctx(1, { lesson: undefined })), null);
  assert.equal(buildTask("dialogue", null, ctx(1, { dialogues: [LESSON] })), null, "nur die eigene Lektion");
  assert.equal(buildTask("dialogue", null, ctx(1, { dialogues: [] })), null);
  assert.equal(buildTask("dialogue", null, ctx(1, { dialogues: undefined })), null);
  assert.equal(buildTask("dialogue", null, ctx(1, { lesson: { dialogue: LESSON.dialogue } })), null);
  assert.equal(canBuild("dialogue", null, ctx(1, { dialogues: [] })), false);
  assert.equal(canBuild("dialogue", null, ctx(1)), true);
});

test("dialogue: ungültige oder leere Zeilen und Doppel werden übergangen", () => {
  const lesson = { id: "q-1", dialogue: [["A", "Bok!"], ["B", ""], null, ["B", "Bok! Kako si?"], ["A", 7], ["A", "Dobro."]] };
  const dialogues = [
    lesson,
    { id: "q-2", dialogue: [["A", "Hvala."], ["B", "Hvala!"], ["A", ""], ["B", "Molim."], ["A", "Bok!"], ["B", "Bok! Kako si?"], ["A", "Nema na čemu."]] }
  ];
  for (const seed of SEEDS) {
    const task = buildTask("dialogue", null, ctx(seed, { lesson, dialogues }));
    assert.ok(["Bok! Kako si?", "Dobro."].includes(task.answer));
    checkOptions(task, "Seed " + seed);
    assert.ok(!task.options.includes("Bok!") || task.answer === "Bok!", "Zeile 0 der eigenen Lektion ist kein Distraktor");
  }
});

// ---------------------------------------------------------------- typingResult

test("typingResult: exakt, Groß-/Kleinschreibung und Satzzeichen zählen als richtig, nicht als near", () => {
  assert.deepEqual(typingResult("kava", "kava"), { ok: true, near: false, missing: [] });
  assert.deepEqual(typingResult("  Kava! ", "kava"), { ok: true, near: false, missing: [] });
  assert.deepEqual(typingResult("Dobar  dan.", "Dobar dan"), { ok: true, near: false, missing: [] });
  assert.deepEqual(typingResult("čaša", "čaša"), { ok: true, near: false, missing: [] });
});

test("typingResult: nur fehlende Diakritika -> ok und near, missing nennt die Buchstaben", () => {
  assert.deepEqual(typingResult("casa", "čaša"), { ok: true, near: true, missing: ["č", "š"] });
  assert.deepEqual(typingResult("Casa", "čaša"), { ok: true, near: true, missing: ["č", "š"] });
  assert.deepEqual(typingResult("zena", "žena"), { ok: true, near: true, missing: ["ž"] });
  assert.deepEqual(typingResult("cas", "čaš"), { ok: true, near: true, missing: ["č", "š"] });
  assert.deepEqual(typingResult("cacak", "čačak"), { ok: true, near: true, missing: ["č"] });
  assert.deepEqual(typingResult("Dobro vece", "Dobro veče"), { ok: true, near: true, missing: ["č"] });
  assert.deepEqual(typingResult("časa", "čaša"), { ok: true, near: true, missing: ["š"] }, "ein Buchstabe richtig, einer fehlt");
});

test("typingResult: anderes Wort -> nicht ok", () => {
  assert.deepEqual(typingResult("kava", "čaša"), { ok: false, near: false, missing: [] });
  assert.deepEqual(typingResult("", "čaša"), { ok: false, near: false, missing: [] });
  assert.equal(typingResult("casas", "čaša").ok, false);
  assert.equal(typingResult("ca", "čaša").ok, false);
});

test("typingResult: falsches Diakritikum auf demselben Grundbuchstaben (ć statt č) ist „near“, missing nennt die Buchstaben des Ziels", () => {
  assert.deepEqual(typingResult("ćaša", "čaša"), { ok: true, near: true, missing: ["č"] });
  assert.deepEqual(typingResult("ćasa", "čaša"), { ok: true, near: true, missing: ["č", "š"] });
  assert.deepEqual(typingResult("kuča", "kuća"), { ok: true, near: true, missing: ["ć"] });
  assert.deepEqual(typingResult("Laku noč", "Laku noć"), { ok: true, near: true, missing: ["ć"] });
  assert.deepEqual(typingResult("cevapćići", "ćevapčići"), { ok: true, near: true, missing: ["ć", "č"] });
});

test("typingResult: kein „near“ bei anderem Grundbuchstaben oder Zusatz-Diakritikum", () => {
  assert.equal(typingResult("čaša", "casa").ok, false, "Zusatz-Diakritikum");
  assert.equal(typingResult("šaša", "čaša").ok, false, "š statt č: anderer Grundbuchstabe");
  assert.equal(typingResult("sasa", "čaša").ok, false);
  assert.equal(typingResult("šena", "žena").ok, false, "š statt ž: anderer Grundbuchstabe");
});

test("typingResult: für đ im Ziel sind „đ“, „dj“ und „d“ zulässig, missing nennt „đ“", () => {
  assert.deepEqual(typingResult("Đurđica", "Đurđica"), { ok: true, near: false, missing: [] });
  assert.deepEqual(typingResult("Durdica", "Đurđica"), { ok: true, near: true, missing: ["đ"] });
  assert.deepEqual(typingResult("Djurdjica", "Đurđica"), { ok: true, near: true, missing: ["đ"] });
  assert.deepEqual(typingResult("Djurdica", "Đurđica"), { ok: true, near: true, missing: ["đ"] }, "gemischt");
  assert.deepEqual(typingResult("Đurdica", "Đurđica"), { ok: true, near: true, missing: ["đ"] });
  assert.equal(typingResult("Durica", "Đurđica").ok, false);
  assert.equal(typingResult("Durdca", "Đurđica").ok, false);
  assert.deepEqual(typingResult("djevojka", "đevojka"), { ok: true, near: true, missing: ["đ"] });
  assert.deepEqual(typingResult("dakovo", "Đakovo"), { ok: true, near: true, missing: ["đ"] });
});

test("typingResult: Ziel mit „dj“ bleibt strikt (djed), „đed“ ist nicht near", () => {
  assert.deepEqual(typingResult("djed", "djed"), { ok: true, near: false, missing: [] });
  assert.equal(typingResult("ded", "djed").ok, false);
  assert.equal(typingResult("đed", "djed").ok, false);
});

test("typingResult: missing stimmt mit missingDiacritics aus core überein", () => {
  for (const [answer, target] of [["casa", "čaša"], ["Durdica", "Đurđica"], ["Djurdjica", "Đurđica"], ["zena", "žena"], ["cacak", "čačak"], ["ćaša", "čaša"], ["kuča", "kuća"]]) {
    assert.deepEqual(typingResult(answer, target).missing, missingDiacritics(answer, target), answer);
  }
});

test("typingResult: zerlegte Unicode-Eingabe (c + Hacek) zählt wie das fertige Zeichen", () => {
  assert.deepEqual(typingResult("čaša", "čaša"), { ok: true, near: false, missing: [] });
  assert.deepEqual(typingResult("casa", "čaša"), { ok: true, near: true, missing: ["č", "š"] });
});

test("typingResult: Sonderzeichen im Ziel (Bindestrich, Klammern, Plus) brechen nichts", () => {
  assert.deepEqual(typingResult("klima-uredaj", "klima-uređaj"), { ok: true, near: true, missing: ["đ"] });
  assert.equal(typingResult("klima uredaj", "klima-uređaj").ok, false);
  assert.equal(typingResult("a+b", "a+b").ok, true);
  assert.equal(typingResult("aab", "a+b").ok, false);
  assert.equal(typingResult("a.b", "a[b").ok, false);
});

// ---------------------------------------------------------------- Zusammenspiel

test("canBuild stimmt mit buildTask überein (alle Typen, alle Items)", () => {
  const all = TYPES_WITH_ITEM.concat(["dialogue"]);
  for (const type of all) {
    for (const item of type === "dialogue" ? [null] : ITEMS) {
      for (const hasTTS of [true, false]) {
        const c = ctx(5, { hasTTS });
        const can = canBuild(type, item, c);
        let sometimes = false;
        for (const seed of [1, 2, 3, 4, 5]) if (buildTask(type, item, ctx(seed, { hasTTS })) !== null) sometimes = true;
        assert.equal(can, sometimes, `${type} ${item && item.hr} hasTTS ${hasTTS}`);
      }
    }
  }
});

test("canBuild verbraucht den rng des Aufrufers nicht", () => {
  const rng = makeRng(9);
  const before = makeRng(9)();
  for (const type of TYPES_WITH_ITEM) canBuild(type, byHr("kava"), { pool: POOL, rng, hasTTS: true });
  assert.equal(rng(), before);
});

test("gleicher Seed liefert dieselbe Aufgabe; Item, Pool und Kontext bleiben unverändert", () => {
  const snapshot = JSON.stringify([ITEMS, DIALOGUES]);
  for (const type of TYPES_WITH_ITEM.concat(["dialogue"])) {
    const item = type === "dialogue" ? null : byHr("kava");
    const a = buildTask(type, item, ctx(17));
    const b = buildTask(type, item, ctx(17));
    assert.deepEqual(a, b, type);
  }
  assert.equal(JSON.stringify([ITEMS, DIALOGUES]), snapshot);
});

test("ohne rng im Kontext (Math.random) funktioniert alles", () => {
  for (const type of TYPES_WITH_ITEM) {
    const item = ["match", "cloze", "order"].includes(type) ? byHr("Želim popiti vodu") : byHr("kava");
    const task = buildTask(type, item, { pool: POOL, hasTTS: true });
    assert.ok(task, type);
  }
  assert.ok(buildTask("dialogue", null, { lesson: LESSON, dialogues: DIALOGUES }));
});

test("unbekannter Typ, fehlendes Item oder leere Felder -> null", () => {
  assert.equal(buildTask("roleplay", byHr("kava"), ctx(1)), null);
  assert.equal(buildTask("odd", byHr("kava"), ctx(1)), null);
  assert.equal(buildTask("nonsense", byHr("kava"), ctx(1)), null);
  for (const type of TYPES_WITH_ITEM) {
    assert.equal(buildTask(type, null, ctx(1)), null, type + " ohne Item");
    assert.equal(buildTask(type, undefined, ctx(1)), null);
    assert.equal(buildTask(type, { hr: "", de: "Kaffee", key: "z-1" }, ctx(1)), null, type + " mit leerem hr");
    assert.equal(buildTask(type, { hr: "kava", de: "  ", key: "z-2" }, ctx(1)), null, type + " mit leerem de");
    assert.equal(canBuild(type, null, ctx(1)), false);
  }
  assert.equal(buildTask("choice-de", byHr("kava")), null, "ohne Kontext gibt es keinen Pool");
});

// ---------------------------------------------------------------- Review-Fokus: wenige oder schlechte Distraktoren

test("Pool mit Phrasen, doppelten Bedeutungen und leeren Strings -> trotzdem 3 eindeutige, nicht leere Distraktoren", () => {
  const pool = [
    byHr("kava"),
    { hr: "zdravo", de: "Hallo", pos: "phrase", category: "greeting", key: "p-1" },
    { hr: "bok", de: "Hallo", pos: "phrase", category: "greeting", key: "p-2" },
    { hr: "Zdravo!", de: "Servus", pos: "phrase", category: "greeting", key: "p-3" },
    { hr: "", de: "Leer", pos: "noun", key: "p-4" },
    { hr: "tihi", de: "", pos: "adj", key: "p-5" },
    { hr: "kafa", de: "Kaffee", pos: "noun", key: "p-6" },
    { hr: "voda", de: "Wasser", pos: "noun", key: "p-7" },
    { hr: "pivo", de: "Bier", pos: "noun", key: "p-8" },
    { hr: "pivo", de: "Bier", pos: "noun", key: "p-9" },
    { hr: "Laku noć", de: "Gute Nacht", pos: "phrase", key: "p-10" }
  ];
  for (const type of ["choice-de", "choice-hr", "listen-choice"]) {
    for (const seed of SEEDS) {
      const task = buildTask(type, byHr("kava"), ctx(seed, { pool }));
      assert.ok(task, `${type} Seed ${seed}`);
      assert.equal(task.options.length, 4, JSON.stringify(task.options));
      checkOptions(task, `${type} Seed ${seed}`);
      if (type === "choice-hr") assert.ok(!task.options.includes("kafa"), "kafa heißt auch Kaffee: zweite richtige Antwort");
      else assert.equal(task.options.filter(o => norm(o) === "kaffee").length, 1, "keine zweite richtige Antwort");
    }
  }
});

test("zu wenige Distraktoren: weniger Optionen, aber mindestens 2, sonst null", () => {
  const pool3 = [byHr("kava"), byHr("čaj"), byHr("sok")];
  for (const seed of SEEDS) {
    const task = buildTask("choice-de", byHr("kava"), ctx(seed, { pool: pool3 }));
    assert.equal(task.options.length, 3);
    checkOptions(task, "Seed " + seed);
  }
  const pool2 = [byHr("kava"), byHr("čaj")];
  assert.equal(buildTask("choice-de", byHr("kava"), ctx(1, { pool: pool2 })).options.length, 2);
  for (const type of ["choice-de", "choice-hr", "listen-choice", "cloze"]) {
    const item = type === "cloze" ? byHr("Želim popiti vodu") : byHr("kava");
    assert.equal(buildTask(type, item, ctx(1, { pool: [item] })), null, type);
  }
  assert.equal(buildTask("choice-de", byHr("kava"), ctx(1, { pool: [byHr("kava")] })), null);
  assert.equal(buildTask("choice-hr", byHr("kava"), ctx(1, { pool: [] })), null);
  assert.equal(buildTask("listen-choice", byHr("kava"), ctx(1, { pool: [{ hr: "kafa", de: "Kaffee", key: "k-1" }] })), null, "einzige Alternative hat dieselbe Bedeutung");
  assert.equal(canBuild("choice-de", byHr("kava"), ctx(1, { pool: [byHr("kava")] })), false);
  assert.equal(buildTask("cloze", byHr("Želim popiti vodu"), ctx(1, { pool: [byHr("Želim popiti vodu")] })), null, "keine Wörter für Distraktoren");
});

// ---------------------------------------------------------------- Browser

test("Browser: engine/tasks.js hängt sich nach core.js und distractors.js an window.KorakEngine", () => {
  const win = {};
  win.self = win;
  for (const file of ["core.js", "distractors.js", "tasks.js"]) {
    const code = fs.readFileSync(path.join(__dirname, "..", "engine", file), "utf8");
    vm.runInNewContext(code, win);
  }
  const E = win.KorakEngine;
  for (const name of ["buildTask", "canBuild", "typingResult"]) assert.equal(typeof E[name], "function", name);
  assert.deepEqual(Array.from(E.LISTEN_TYPES), ["listen", "listen-choice"]);
  assert.equal(typeof E.norm, "function", "core-Exporte bleiben erhalten");
  assert.equal(typeof E.pickDistractors, "function");
  const task = E.buildTask("choice-de", byHr("kava"), { pool: POOL, rng: E.makeRng(3), hasTTS: true });
  assert.equal(task.options.length, 4);
  assert.equal(task.answer, "Kaffee");
  assert.equal(E.typingResult("casa", "čaša").near, true);
});
