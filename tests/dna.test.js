"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { makeRng } = require("../engine/core.js");
const { CONCEPTS } = require("../engine/concepts.js");
const { record, aggregate, weakest, itemsForConcepts } = require("../engine/dna.js");

function it(key, concepts) {
  return { hr: "hr-" + key, de: "de-" + key, key, concepts };
}

// Der Fall aus dem Brief: case-acc 3× falsch, case-gen 1× falsch + 5× richtig, gender nur richtig.
function briefItems() {
  const items = { a: { box: 1, seen: 3, correct: 0, wrong: 3 }, b: { box: 2, seen: 6, correct: 5, wrong: 1 }, c: { box: 3, seen: 2, correct: 2, wrong: 0 } };
  for (let i = 0; i < 3; i++) record(items.a, ["case-acc"], false);
  record(items.b, ["case-gen"], false);
  for (let i = 0; i < 5; i++) record(items.b, ["case-gen"], true);
  record(items.c, ["gender"], true);
  record(items.c, ["gender"], true);
  return items;
}

// ---------------------------------------------------------------- record

test("record: legt dna an und zählt [richtig, falsch] je Konzept", () => {
  assert.deepEqual(record({}, ["case-acc"], false), { dna: { "case-acc": [0, 1] } });
  assert.deepEqual(record({}, ["case-acc"], true), { dna: { "case-acc": [1, 0] } });
});

test("record: verändert die übergebene Statistik und gibt dasselbe Objekt zurück", () => {
  const stat = {};
  const out = record(stat, ["gender"], true);
  assert.equal(out, stat);
  assert.deepEqual(stat.dna, { gender: [1, 0] });
});

test("record: zählt bestehende Werte weiter und mehrere Konzepte auf einmal", () => {
  const stat = { dna: { "case-acc": [2, 1] } };
  record(stat, ["case-acc", "gender"], false);
  record(stat, ["case-acc"], true);
  assert.deepEqual(stat.dna, { "case-acc": [3, 2], gender: [0, 1] });
});

test("record: lässt alle anderen Felder der Item-Statistik unverändert", () => {
  const stat = { box: 3, due: 1234567, seen: 7, correct: 5, wrong: 2 };
  record(stat, ["plural"], false);
  assert.deepEqual(stat, { box: 3, due: 1234567, seen: 7, correct: 5, wrong: 2, dna: { plural: [0, 1] } });
});

test("record: undefined/null werden unverändert zurückgegeben, ohne ein Objekt anzulegen", () => {
  assert.equal(record(undefined, ["case-acc"], false), undefined);
  assert.equal(record(null, ["case-acc"], false), null);
});

test("record: leere oder fehlende Konzepte zählen nichts und legen kein dna an", () => {
  for (const concepts of [[], undefined, null]) {
    const stat = { box: 1 };
    assert.equal(record(stat, concepts, false), stat);
    assert.deepEqual(stat, { box: 1 });
  }
});

test("record: ein doppelt genanntes Konzept zählt pro Aufruf nur einmal", () => {
  const stat = record({}, ["case-acc", "case-acc"], false);
  assert.deepEqual(stat.dna, { "case-acc": [0, 1] });
});

test("record: nicht-Text-Einträge in concepts werden übersprungen", () => {
  const stat = record({}, [null, 3, "", {}, "plural"], true);
  assert.deepEqual(stat.dna, { plural: [1, 0] });
});

test("record: repariert kaputte dna-Werte, statt zu werfen", () => {
  for (const bad of ["x", 5, [], ["a", "b"], [1], [1, 2, 3], [-1, 0], null]) {
    const stat = { dna: { "case-acc": bad, gender: [4, 1] } };
    record(stat, ["case-acc"], false);
    assert.deepEqual(stat.dna, { "case-acc": [0, 1], gender: [4, 1] }, JSON.stringify(bad));
  }
  for (const bad of ["x", 5, [1, 2], null]) {
    const stat = { dna: bad };
    record(stat, ["case-acc"], true);
    assert.deepEqual(stat.dna, { "case-acc": [1, 0] }, JSON.stringify(bad));
  }
});

test("record: „__proto__“ als Konzept-ID verändert keine Prototypen", () => {
  const stat = record({}, ["__proto__", "plural"], false);
  assert.equal(Object.getPrototypeOf(stat.dna), Object.prototype);
  assert.equal({}.wrong, undefined);
  assert.deepEqual(stat.dna, { plural: [0, 1] });
});

// ---------------------------------------------------------------- aggregate

test("aggregate: summiert richtig/falsch je Konzept über alle Items", () => {
  const agg = aggregate({
    a: { dna: { "case-acc": [1, 2], gender: [3, 0] } },
    b: { dna: { "case-acc": [0, 1] } },
    c: { box: 2 },
  });
  assert.deepEqual(agg, { "case-acc": { right: 1, wrong: 3 }, gender: { right: 3, wrong: 0 } });
});

test("aggregate: leere, fehlende und alte Daten ergeben {}", () => {
  assert.deepEqual(aggregate({}), {});
  assert.deepEqual(aggregate(undefined), {});
  assert.deepEqual(aggregate(null), {});
  assert.deepEqual(aggregate({ a: { box: 1, seen: 2, correct: 1, wrong: 1 }, b: null, c: undefined, d: 7 }), {});
});

test("aggregate: kaputte dna-Werte werden übersprungen, gültige Nachbarn bleiben", () => {
  const agg = aggregate({
    a: { dna: { "case-acc": "x", gender: [1, 1], plural: [1], "case-gen": ["a", 2], "case-dat": [1, 2, 3] } },
    b: { dna: "kaputt" },
    c: { dna: [[1, 2]] },
    d: { dna: { "case-acc": [0, 2] } },
  });
  assert.deepEqual(agg, { gender: { right: 1, wrong: 1 }, "case-acc": { right: 0, wrong: 2 } });
});

test("aggregate: verändert die Eingabe nicht", () => {
  const items = { a: { dna: { "case-acc": [1, 2] } } };
  const copy = JSON.parse(JSON.stringify(items));
  aggregate(items);
  assert.deepEqual(items, copy);
});

// ---------------------------------------------------------------- weakest

test("weakest: schwächste Konzepte in der Reihenfolge case-acc, case-gen (gender ohne Fehler fehlt)", () => {
  const w = weakest(briefItems(), 3);
  assert.deepEqual(w.map(x => x.id), ["case-acc", "case-gen"]);
});

test("weakest: Einträge tragen title/short aus dem Register und score = wrong / (right + wrong + 2)", () => {
  const [acc, gen] = weakest(briefItems(), 3);
  assert.deepEqual(Object.keys(acc).sort(), ["id", "right", "score", "short", "title", "wrong"]);
  assert.equal(acc.title, CONCEPTS["case-acc"].title);
  assert.equal(acc.short, CONCEPTS["case-acc"].short);
  assert.equal(gen.title, CONCEPTS["case-gen"].title);
  assert.equal(gen.short, CONCEPTS["case-gen"].short);
  assert.equal(acc.right, 0);
  assert.equal(acc.wrong, 3);
  assert.equal(acc.score, 3 / 5);
  assert.equal(gen.right, 5);
  assert.equal(gen.wrong, 1);
  assert.equal(gen.score, 1 / 8);
});

test("weakest: ohne dna (alte Daten) und ohne Daten → []", () => {
  assert.deepEqual(weakest({ a: { box: 1, seen: 3, correct: 1, wrong: 2 }, b: { box: 0 } }), []);
  assert.deepEqual(weakest({}), []);
  assert.deepEqual(weakest(undefined), []);
  assert.deepEqual(weakest(null), []);
});

test("weakest: nur Konzepte mit mindestens einem Fehler", () => {
  assert.deepEqual(weakest({ a: { dna: { gender: [9, 0], plural: [0, 0] } } }), []);
});

test("weakest: unbekannte Konzept-IDs aus alten Daten werden ignoriert", () => {
  // JSON.parse legt „__proto__“ als eigenen Schlüssel an (so kommt es aus localStorage/Supabase).
  const dna = JSON.parse('{"gibt-es-nicht":[0,9],"toString":[0,9],"constructor":[0,9],"__proto__":[0,9],"case-acc":[0,1]}');
  const w = weakest({ a: { dna } });
  assert.deepEqual(w.map(x => x.id), ["case-acc"]);
  assert.equal(Object.getPrototypeOf(aggregate({ a: { dna } })), Object.prototype);
});

test("weakest: kaputte dna-Werte werden übersprungen", () => {
  const w = weakest({
    a: { dna: { "case-acc": "x", "case-gen": [1], plural: ["a", "b"], gender: [0, 2] } },
    b: { dna: 12 },
    c: null,
  });
  assert.deepEqual(w.map(x => x.id), ["gender"]);
});

test("weakest: Standard ist 3, n begrenzt die Liste", () => {
  const items = { a: { dna: { "case-acc": [0, 5], "case-gen": [0, 4], "case-dat": [0, 3], "case-ins": [0, 2], "case-loc": [0, 1] } } };
  assert.deepEqual(weakest(items).map(x => x.id), ["case-acc", "case-gen", "case-dat"]);
  assert.deepEqual(weakest(items, 1).map(x => x.id), ["case-acc"]);
  assert.equal(weakest(items, 5).length, 5);
  assert.equal(weakest(items, 99).length, 5);
  assert.deepEqual(weakest(items, 0), []);
  assert.deepEqual(weakest(items, -2), []);
});

test("weakest: sortiert nach score absteigend, bei gleichem score nach wrong absteigend", () => {
  const items = {
    a: { dna: {
      "case-gen": [3, 1],     // 1/6
      "case-dat": [1, 1],     // 1/4
      "case-ins": [0, 1],     // 1/3  (gleich viel wie case-loc: wrong 1)
      "case-loc": [2, 2],     // 2/6 = 1/3  (wrong 2 → vor case-ins)
      "case-voc": [0, 0],     // zählt nicht
    } },
  };
  const w = weakest(items, 10);
  assert.deepEqual(w.map(x => x.id), ["case-loc", "case-ins", "case-dat", "case-gen"]);
  for (let i = 1; i < w.length; i++) assert.ok(w[i - 1].score >= w[i].score);
});

test("weakest: Ergebnis hängt nicht von der Reihenfolge der Eingabe ab", () => {
  const dna = { "case-ins": [0, 1], "case-loc": [0, 1], plural: [0, 1] };
  const rev = Object.fromEntries(Object.entries(dna).reverse());
  assert.deepEqual(weakest({ a: { dna } }, 10).map(x => x.id), weakest({ a: { dna: rev } }, 10).map(x => x.id));
});

test("weakest: summiert über mehrere Items", () => {
  const items = { a: { dna: { plural: [0, 1] } }, b: { dna: { plural: [1, 1] } } };
  const [p] = weakest(items);
  assert.equal(p.id, "plural");
  assert.equal(p.right, 1);
  assert.equal(p.wrong, 2);
  assert.equal(p.score, 2 / 5);
});

// ---------------------------------------------------------------- itemsForConcepts

const POOL = [
  it("acc-1", ["case-acc"]), it("acc-2", ["case-acc", "gender"]), it("acc-3", ["case-acc"]), it("acc-4", ["case-acc"]),
  it("gen-1", ["case-gen"]), it("gen-2", ["case-gen", "plural"]),
  it("gender-1", ["gender"]), it("gender-2", ["gender"]),
  it("none-1", []), it("none-2", undefined), { hr: "x", de: "y", key: "none-3", concepts: "case-acc" },
];

test("itemsForConcepts: liefert nur Items mit dem ersten Konzept, solange vorhanden", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const out = itemsForConcepts(["case-acc"], POOL, 3, makeRng(seed));
    assert.equal(out.length, 3);
    for (const x of out) assert.ok(x.concepts.includes("case-acc"), x.key);
  }
  // Auch mit Folgekonzept: erst alle case-acc, dann der Rest.
  const out = itemsForConcepts(["case-acc", "case-gen"], POOL, 4, makeRng(7));
  assert.deepEqual(out.map(x => x.key).sort(), ["acc-1", "acc-2", "acc-3", "acc-4"]);
});

test("itemsForConcepts: füllt mit dem nächsten Konzept auf, wenn das erste nicht reicht", () => {
  const out = itemsForConcepts(["case-gen", "gender"], POOL, 4, makeRng(3));
  assert.equal(out.length, 4);
  assert.deepEqual(out.slice(0, 2).map(x => x.key).sort(), ["gen-1", "gen-2"]);
  for (const x of out.slice(2)) assert.ok(x.concepts.includes("gender"), x.key);
});

test("itemsForConcepts: Reihenfolge der Konzepte bestimmt die Reihenfolge der Treffer", () => {
  const out = itemsForConcepts(["gender", "case-gen", "case-acc"], POOL, 99, makeRng(11));
  const firstGen = out.findIndex(x => x.concepts.includes("case-gen") && !x.concepts.includes("gender"));
  const lastGender = out.map(x => x.concepts.includes("gender")).lastIndexOf(true);
  assert.ok(lastGender < firstGen, "alle gender-Items vor den reinen case-gen-Items");
  assert.deepEqual(out.slice(0, 3).map(x => x.key).sort(), ["acc-2", "gender-1", "gender-2"]);
});

test("itemsForConcepts: kein Item doppelt, auch wenn es mehrere gesuchte Konzepte trägt", () => {
  const out = itemsForConcepts(["case-acc", "gender", "case-gen", "plural"], POOL, 99, makeRng(5));
  const keys = out.map(x => x.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.equal(keys.length, 8);
});

test("itemsForConcepts: doppelte Kandidaten (gleiches Objekt oder gleicher key) und doppelte Konzepte zählen einmal", () => {
  const a = it("k-1", ["plural"]);
  const out = itemsForConcepts(["plural", "plural"], [a, a, { ...a }, it("k-2", ["plural"])], 99, makeRng(1));
  assert.deepEqual(out.map(x => x.key).sort(), ["k-1", "k-2"]);
});

test("itemsForConcepts: höchstens n Items; n ≤ 0 oder ungültig → []", () => {
  assert.equal(itemsForConcepts(["case-acc"], POOL, 2, makeRng(1)).length, 2);
  assert.equal(itemsForConcepts(["case-acc"], POOL, 99, makeRng(1)).length, 4);
  for (const n of [0, -1, NaN, undefined, null, "3"]) assert.deepEqual(itemsForConcepts(["case-acc"], POOL, n, makeRng(1)), [], String(n));
});

test("itemsForConcepts: ohne Treffer, ohne Konzepte oder ohne Kandidaten → []", () => {
  assert.deepEqual(itemsForConcepts(["case-voc"], POOL, 3, makeRng(1)), []);
  assert.deepEqual(itemsForConcepts([], POOL, 3, makeRng(1)), []);
  assert.deepEqual(itemsForConcepts(undefined, POOL, 3, makeRng(1)), []);
  assert.deepEqual(itemsForConcepts(["case-acc"], [], 3, makeRng(1)), []);
  assert.deepEqual(itemsForConcepts(["case-acc"], undefined, 3, makeRng(1)), []);
});

test("itemsForConcepts: Items ohne gültiges concepts-Feld werden übersprungen", () => {
  const out = itemsForConcepts(["case-acc"], [null, undefined, 5, { key: "x" }, { key: "y", concepts: "case-acc" }, it("z", ["case-acc"])], 5, makeRng(1));
  assert.deepEqual(out.map(x => x.key), ["z"]);
});

test("itemsForConcepts: gleicher Seed → gleiche Auswahl, der rng mischt tatsächlich", () => {
  const big = Array.from({ length: 30 }, (_, i) => it("w-" + i, ["verb-present"]));
  const keys = seed => itemsForConcepts(["verb-present"], big, 5, makeRng(seed)).map(x => x.key).join();
  assert.equal(keys(42), keys(42));
  const variants = new Set([1, 2, 3, 4, 5, 6, 7, 8].map(keys));
  assert.ok(variants.size > 1, "verschiedene Seeds liefern verschiedene Auswahlen");
});

test("itemsForConcepts: ohne rng funktioniert es (Math.random), gibt Original-Objekte zurück und verändert die Eingabe nicht", () => {
  const cand = POOL.slice();
  const out = itemsForConcepts(["case-acc"], cand, 3);
  assert.equal(out.length, 3);
  for (const x of out) assert.ok(POOL.includes(x));
  assert.deepEqual(cand, POOL);
});

// ---------------------------------------------------------------- Browser

test("Browser: engine/dna.js hängt sich nach core und concepts an window.KorakEngine", () => {
  const win = {};
  win.self = win;
  for (const file of ["core.js", "concepts.js", "dna.js"]) {
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, "..", "engine", file), "utf8"), win);
  }
  const E = win.KorakEngine;
  for (const name of ["record", "aggregate", "weakest", "itemsForConcepts"]) assert.equal(typeof E[name], "function", name);
  const stat = E.record({}, ["case-acc"], false);
  const w = E.weakest({ a: stat });
  assert.equal(w.length, 1);
  assert.equal(w[0].id, "case-acc");
  assert.equal(w[0].title, "Akkusativ");
  assert.equal(E.itemsForConcepts(["case-acc"], [it("a", ["case-acc"])], 3, E.makeRng(1)).length, 1);
});
