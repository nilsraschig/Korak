"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { makeRng, norm } = require("../engine/core.js");
const { pickDistractors, endingOptions } = require("../engine/distractors.js");

const KAVA = { hr: "kava", de: "Kaffee", pos: "noun", category: "drink" };

// Annotierter Pool: Getränke, anderes Substantiv-Vokabular, Verben, Adjektive.
const POOL = [
  KAVA,
  { hr: "čaj", de: "Tee", pos: "noun", category: "drink" },
  { hr: "sok", de: "Saft", pos: "noun", category: "drink" },
  { hr: "pivo", de: "Bier", pos: "noun", category: "drink" },
  { hr: "vino", de: "Wein", pos: "noun", category: "drink" },
  { hr: "kruh", de: "Brot", pos: "noun", category: "food" },
  { hr: "sir", de: "Käse", pos: "noun", category: "food" },
  { hr: "grad", de: "Stadt", pos: "noun", category: "place" },
  { hr: "piti", de: "trinken", pos: "verb", category: "action" },
  { hr: "jesti", de: "essen", pos: "verb", category: "action" },
  { hr: "dobar", de: "gut", pos: "adj", category: "quality" }
];

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

test("pickDistractors: 3 Distraktoren derselben Kategorie, wenn genug vorhanden", () => {
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, POOL, { field: "hr", rng: makeRng(seed) });
    assert.equal(out.length, 3, "Seed " + seed);
    for (const o of out) {
      const item = POOL.find(p => p.hr === o);
      assert.ok(item, "Option stammt aus dem Pool: " + o);
      assert.equal(item.category, "drink", "Getränk erwartet: " + o);
      assert.notEqual(o, "kava");
    }
  }
});

test("pickDistractors: field de liefert deutsche Optionen derselben Kategorie", () => {
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, POOL, { field: "de", rng: makeRng(seed) });
    assert.equal(out.length, 3);
    for (const o of out) {
      const item = POOL.find(p => p.de === o);
      assert.ok(item, "Option stammt aus dem Pool: " + o);
      assert.equal(item.category, "drink");
    }
  }
});

test("pickDistractors: n steuert die Anzahl (Standard 3)", () => {
  assert.equal(pickDistractors(KAVA, POOL, { field: "hr", rng: makeRng(1) }).length, 3);
  assert.equal(pickDistractors(KAVA, POOL, { field: "hr", n: 2, rng: makeRng(1) }).length, 2);
  assert.equal(pickDistractors(KAVA, POOL, { field: "hr", n: 4, rng: makeRng(1) }).length, 4);
  assert.deepEqual(pickDistractors(KAVA, POOL, { field: "hr", n: 0, rng: makeRng(1) }), []);
});

test("pickDistractors: Pool mit Duplikaten, leeren Werten und zweiter richtiger Antwort", () => {
  const pool = [
    KAVA,
    { hr: "", de: "Leer", pos: "noun", category: "drink" },
    { hr: "   ", de: "Leerraum", pos: "noun", category: "drink" },
    { hr: "zdravo", de: "Hallo", pos: "phrase", category: "greeting" },
    { hr: "bok", de: "Hallo", pos: "phrase", category: "greeting" },
    { hr: "zdravo", de: "Guten Tag", pos: "phrase", category: "greeting" },
    { hr: "Zdravo!", de: "Servus", pos: "phrase", category: "greeting" },
    { hr: "kafa", de: "Kaffee", pos: "noun", category: "drink" },
    { hr: "čaj", de: "", pos: "noun", category: "drink" },
    { hr: "sok", de: "Saft", pos: "noun", category: "drink" },
    { hr: "pivo", de: "Bier", pos: "noun", category: "drink" },
    { hr: "voda", de: "Wasser", pos: "noun", category: "drink" }
  ];
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, pool, { field: "hr", rng: makeRng(seed) });
    assert.equal(out.length, 3, "Seed " + seed);
    assert.ok(out.every(o => norm(o) !== ""), "keine leeren Optionen: " + JSON.stringify(out));
    assert.equal(new Set(out.map(norm)).size, out.length, "keine Doppel: " + JSON.stringify(out));
    assert.ok(!out.includes("kafa"), "Kandidat mit de Kaffee ist eine zweite richtige Antwort");
    assert.ok(!out.includes("kava"));
  }
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, pool, { field: "de", n: 6, rng: makeRng(seed) });
    assert.ok(out.every(o => norm(o) !== ""), "keine leeren Optionen: " + JSON.stringify(out));
    assert.equal(new Set(out.map(norm)).size, out.length, "keine Doppel: " + JSON.stringify(out));
    assert.ok(!out.some(o => norm(o) === "kaffee"));
  }
});

test("pickDistractors: bei field de fällt ein Kandidat mit gleichem hr wie das Ziel weg", () => {
  const pool = [
    KAVA,
    { hr: "kava", de: "Kaffeegetränk", pos: "noun", category: "drink" },
    { hr: "Kava!", de: "Mokka", pos: "noun", category: "drink" },
    { hr: "čaj", de: "Tee", pos: "noun", category: "drink" },
    { hr: "sok", de: "Saft", pos: "noun", category: "drink" }
  ];
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, pool, { field: "de", rng: makeRng(seed) });
    assert.deepEqual([...out].sort(), ["Saft", "Tee"], "Seed " + seed);
  }
});

test("pickDistractors: Duplikate werden über norm erkannt (Groß-/Kleinschreibung, Satzzeichen)", () => {
  const pool = [
    KAVA,
    { hr: "Hvala!", de: "Danke", pos: "phrase", category: "greeting" },
    { hr: "hvala", de: "Dankeschön", pos: "phrase", category: "greeting" },
    { hr: "HVALA.", de: "Vielen Dank", pos: "phrase", category: "greeting" }
  ];
  const out = pickDistractors(KAVA, pool, { field: "hr", rng: makeRng(3) });
  assert.equal(out.length, 1);
  assert.equal(norm(out[0]), "hvala");
});

test("pickDistractors: nur 2 brauchbare Kandidaten ergeben genau 2 Optionen, nie Platzhalter", () => {
  const pool = [
    KAVA,
    { hr: "kava", de: "Kaffee", pos: "noun", category: "drink" },
    { hr: "čaj", de: "Tee", pos: "noun", category: "drink" },
    { hr: "", de: "Nichts", pos: "noun", category: "drink" },
    { hr: "sok", de: "Saft", pos: "noun", category: "drink" },
    { hr: "sok", de: "Fruchtsaft", pos: "noun", category: "drink" },
    { hr: "kafa", de: "Kaffee", pos: "noun", category: "drink" }
  ];
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, pool, { field: "hr", rng: makeRng(seed) });
    assert.equal(out.length, 2, "Seed " + seed + ": " + JSON.stringify(out));
    assert.deepEqual([...out].sort(), ["sok", "čaj"]);
  }
});

test("pickDistractors: leerer Pool, nur das Ziel, fehlende Felder", () => {
  assert.deepEqual(pickDistractors(KAVA, [], { field: "hr", rng: makeRng(1) }), []);
  assert.deepEqual(pickDistractors(KAVA, [KAVA], { field: "hr", rng: makeRng(1) }), []);
  assert.deepEqual(pickDistractors(KAVA, [{ de: "Tee" }, null, { hr: null, de: "Saft" }], { field: "hr", rng: makeRng(1) }), []);
});

test("pickDistractors: ohne annotiertes Ziel (kein pos/category) funktioniert die Länge als Kriterium", () => {
  const target = { hr: "kava", de: "Kaffee" };
  const pool = [
    target,
    { hr: "čaj", de: "Tee" },
    { hr: "sok", de: "Saft" },
    { hr: "pivo", de: "Bier" },
    { hr: "ja", de: "ich", pos: "pron" },
    { hr: "nikada ne razmišljam o tome", de: "nie", pos: "phrase" }
  ];
  for (const seed of SEEDS) {
    const out = pickDistractors(target, pool, { field: "hr", rng: makeRng(seed) });
    assert.equal(out.length, 3);
    assert.ok(!out.includes("nikada ne razmišljam o tome"), "zu lange Option: " + JSON.stringify(out));
  }
});

test("pickDistractors: Stufe 2 füllt mit gleicher Wortart und ähnlicher Länge, nicht mit zu langer Kategorie-Option", () => {
  const pool = [
    KAVA,
    { hr: "čaj", de: "Tee", pos: "noun", category: "drink" },
    { hr: "sok", de: "Saft", pos: "noun", category: "drink" },
    { hr: "mineralna voda s gazom", de: "Mineralwasser", pos: "noun", category: "drink" },   // 22 Zeichen: zu lang
    { hr: "kruh", de: "Brot", pos: "noun", category: "food" },
    { hr: "piti", de: "trinken", pos: "verb", category: "action" }
  ];
  for (const seed of SEEDS) {
    const out = pickDistractors(KAVA, pool, { field: "hr", rng: makeRng(seed) });
    assert.equal(out.length, 3);
    assert.ok(out.includes("čaj") && out.includes("sok"), "Stufe 1 zuerst: " + JSON.stringify(out));
    assert.ok(out.includes("kruh"), "Stufe 2 vor Stufe 3: " + JSON.stringify(out));
  }
});

test("pickDistractors: Stufen 3 bis 5 füllen der Reihe nach auf", () => {
  const target = { hr: "kava", de: "Kaffee", pos: "noun", category: "drink" };
  // Stufe 3: gleiche Wortart, aber zu lang.  Stufe 4: andere Wortart, ähnliche Länge.  Stufe 5: Rest.
  const sameNounLong = { hr: "mineralna voda s gazom", de: "Mineralwasser", pos: "noun", category: "food" };
  const otherPosShort = { hr: "piti", de: "trinken", pos: "verb", category: "action" };
  const otherPosLong = { hr: "ne znam što bih rekao", de: "ich weiß nicht", pos: "phrase", category: "talk" };
  for (const seed of SEEDS) {
    const three = pickDistractors(target, [target, otherPosLong, otherPosShort, sameNounLong], { field: "hr", rng: makeRng(seed) });
    assert.equal(three.length, 3);
    const two = pickDistractors(target, [target, otherPosLong, otherPosShort, sameNounLong], { field: "hr", n: 2, rng: makeRng(seed) });
    assert.deepEqual([...two].sort(), ["mineralna voda s gazom", "piti"], "Stufe 3 und 4 vor Stufe 5: " + JSON.stringify(two));
    const one = pickDistractors(target, [target, otherPosLong, otherPosShort, sameNounLong], { field: "hr", n: 1, rng: makeRng(seed) });
    assert.deepEqual(one, ["mineralna voda s gazom"], "Stufe 3 vor Stufe 4");
  }
  // Stufe 4 gegen Stufe 5
  for (const seed of SEEDS) {
    const one = pickDistractors(target, [target, otherPosLong, otherPosShort], { field: "hr", n: 1, rng: makeRng(seed) });
    assert.deepEqual(one, ["piti"]);
  }
});

test("pickDistractors: Längentoleranz ist max(3, 40 % der Ziellänge) am gewählten Feld", () => {
  // Ziel hr "dobar dan" (9 Zeichen): Toleranz max(3, 3,6) = 3,6 -> 6 bis 12 Zeichen erlaubt (|Δ| <= 3,6 heißt 3).
  const target = { hr: "dobar dan", de: "Guten Tag", pos: "phrase", category: "greeting" };
  const within = { hr: "laku noć", de: "Gute Nacht", pos: "phrase", category: "greeting" };           // 8: Δ 1
  const edge = { hr: "dobro jutro!", de: "Guten Morgen", pos: "phrase", category: "greeting" };        // 12: Δ 3
  const outside = { hr: "dobar dan svima vama", de: "Guten Tag euch allen", pos: "phrase", category: "greeting" }; // 20: Δ 11
  for (const seed of SEEDS) {
    const one = pickDistractors(target, [target, outside, within], { field: "hr", n: 1, rng: makeRng(seed) });
    assert.deepEqual(one, ["laku noć"]);
    const two = pickDistractors(target, [target, outside, edge, within], { field: "hr", n: 2, rng: makeRng(seed) });
    assert.deepEqual([...two].sort(), ["dobro jutro!", "laku noć"].sort());
  }
  // Bei langem Ziel zählt 40 %: 30 Zeichen -> Toleranz 12.
  const long = { hr: "a".repeat(30), de: "lang", pos: "phrase", category: "x" };
  const ok = { hr: "b".repeat(42), de: "lang 2", pos: "phrase", category: "x" };    // Δ 12
  const bad = { hr: "c".repeat(43), de: "lang 3", pos: "phrase", category: "x" };   // Δ 13
  const other = { hr: "kuća", de: "Haus", pos: "noun", category: "place" };
  for (const seed of SEEDS) {
    const one = pickDistractors(long, [long, bad, ok], { field: "hr", n: 1, rng: makeRng(seed) });
    assert.deepEqual(one, ["b".repeat(42)]);
    const prefer = pickDistractors(long, [long, other, bad, ok], { field: "hr", n: 2, rng: makeRng(seed) });
    assert.ok(prefer.includes("b".repeat(42)));
  }
});

test("pickDistractors: gleicher Seed liefert dieselbe Reihenfolge, Pool bleibt unverändert", () => {
  const snapshot = JSON.stringify(POOL);
  const a = pickDistractors(KAVA, POOL, { field: "hr", rng: makeRng(11) });
  const b = pickDistractors(KAVA, POOL, { field: "hr", rng: makeRng(11) });
  assert.deepEqual(a, b);
  assert.equal(JSON.stringify(POOL), snapshot);
});

test("pickDistractors: Reihenfolge ist zufällig über rng (verschiedene Seeds ergeben verschiedene Folgen)", () => {
  const seen = new Set();
  for (const seed of SEEDS) seen.add(pickDistractors(KAVA, POOL, { field: "hr", rng: makeRng(seed) }).join("|"));
  assert.ok(seen.size > 3, "Folgen sollten variieren: " + seen.size);
});

test("pickDistractors: ungültiges field wird abgelehnt", () => {
  assert.throws(() => pickDistractors(KAVA, POOL, { rng: makeRng(1) }), /field/);
  assert.throws(() => pickDistractors(KAVA, POOL, { field: "en", rng: makeRng(1) }), /field/);
});

test("endingOptions: andere Formen desselben Wortes, ohne die richtige, ohne Doppel", () => {
  const item = { forms: { nom: "kava", gen: "kave", dat: "kavi", acc: "kavu", ins: "kavom", loc: "kavi" } };
  const allowed = new Set(["kava", "kave", "kavi", "kavom"]);
  for (const seed of SEEDS) {
    const out = endingOptions(item, "acc", { rng: makeRng(seed) });
    assert.equal(out.length, 3, "Seed " + seed);
    assert.ok(out.every(o => allowed.has(o)), JSON.stringify(out));
    assert.ok(!out.includes("kavu"));
    assert.equal(new Set(out).size, out.length);
  }
});

test("endingOptions: weniger Formen als n ergibt weniger Optionen", () => {
  const item = { forms: { nom: "sok", gen: "soka", acc: "sok" } };
  assert.deepEqual(endingOptions(item, "gen", { rng: makeRng(1) }), ["sok"]);
  assert.deepEqual(endingOptions(item, "nom", { rng: makeRng(1) }), ["soka"]);
});

test("endingOptions: n begrenzt die Anzahl, Reihenfolge reproduzierbar", () => {
  const item = { forms: { nom: "kava", gen: "kave", dat: "kavi", acc: "kavu", ins: "kavom", loc: "kavi" } };
  assert.equal(endingOptions(item, "acc", { n: 2, rng: makeRng(5) }).length, 2);
  assert.equal(endingOptions(item, "acc", { n: 10, rng: makeRng(5) }).length, 4);
  assert.deepEqual(endingOptions(item, "acc", { rng: makeRng(9) }), endingOptions(item, "acc", { rng: makeRng(9) }));
  const seen = new Set();
  for (const seed of SEEDS) seen.add(endingOptions(item, "acc", { rng: makeRng(seed) }).join("|"));
  assert.ok(seen.size > 1, "Reihenfolge/Auswahl variiert mit dem Seed");
});

test("endingOptions: leere Formen, Formen mit gleichem norm und fehlendes forms werden abgefangen", () => {
  const item = { forms: { nom: "kava", gen: "", dat: "  ", acc: "kavu", ins: "Kava!", loc: null } };
  assert.deepEqual(endingOptions(item, "acc", { rng: makeRng(1) }), ["kava"]);
  assert.deepEqual(endingOptions({}, "acc", { rng: makeRng(1) }), []);
  assert.deepEqual(endingOptions({ forms: { acc: "kavu" } }, "acc", { rng: makeRng(1) }), []);
});

test("Browser: engine/distractors.js hängt sich nach core.js an window.KorakEngine", () => {
  const win = {};
  win.self = win;
  for (const file of ["core.js", "distractors.js"]) {
    const code = fs.readFileSync(path.join(__dirname, "..", "engine", file), "utf8");
    vm.runInNewContext(code, win);
  }
  assert.equal(typeof win.KorakEngine.pickDistractors, "function");
  assert.equal(typeof win.KorakEngine.endingOptions, "function");
  assert.equal(typeof win.KorakEngine.norm, "function", "core-Exporte bleiben erhalten");
  const out = win.KorakEngine.pickDistractors(KAVA, POOL, { field: "hr", rng: win.KorakEngine.makeRng(3) });
  assert.equal(out.length, 3);
});
