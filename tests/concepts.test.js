"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { CONCEPTS, POS, CATEGORIES, CASES, autoConcepts } = require("../engine/concepts.js");

const EXPECTED_IDS = [
  "gender", "plural", "case-gen", "case-dat", "case-acc", "case-ins", "case-loc", "case-voc",
  "adj-agreement", "possessive", "pronouns", "verb-biti", "verb-present", "verb-past",
  "verb-future", "verb-modal", "reflexive", "aspect", "imperative", "conditional", "negation",
  "questions", "clitic-order", "numbers", "time", "adverbs", "prepositions", "formal-address", "politeness",
  "diacritics-c", "diacritics-sz", "diacritics-dj", "ijekavian"
];

test("CONCEPTS: genau die vorgesehenen IDs", () => {
  assert.deepEqual(Object.keys(CONCEPTS).sort(), [...EXPECTED_IDS].sort());
});

test("CONCEPTS: jedes Konzept hat nicht leeres title und short", () => {
  for (const [id, c] of Object.entries(CONCEPTS)) {
    assert.equal(typeof c.title, "string", id + ".title");
    assert.equal(typeof c.short, "string", id + ".short");
    assert.ok(c.title.trim().length > 0, id + ".title leer");
    assert.ok(c.short.trim().length > 0, id + ".short leer");
  }
});

test("CONCEPTS: Kurzerklärungen sind echte Erklärungen (Länge, kein Platzhalter)", () => {
  for (const [id, c] of Object.entries(CONCEPTS)) {
    assert.ok(c.short.length >= 40, id + " zu kurz");
    assert.ok(c.short.length <= 400, id + " zu lang");
    assert.ok(!/TODO|XXX|\.\.\.$/.test(c.short), id + " Platzhalter");
  }
});

test("CONCEPTS: Beispieltext für Akkusativ", () => {
  assert.equal(CONCEPTS["case-acc"].title, "Akkusativ");
  assert.equal(
    CONCEPTS["case-acc"].short,
    "Das direkte Objekt steht im Akkusativ: Pijem kavu. Feminine Wörter auf -a enden dann auf -u."
  );
});

test("CONCEPTS: Adverbien haben keine Endungen (Ruling 18)", () => {
  assert.equal(CONCEPTS.adverbs.title, "Adverbien");
  assert.ok(CONCEPTS.adverbs.short.includes("lijevo (links)"));
  assert.ok(CONCEPTS.adverbs.short.includes("bleiben immer gleich"));
  const ids = Object.keys(CONCEPTS);
  assert.equal(ids.indexOf("adverbs"), ids.indexOf("time") + 1, "adverbs steht direkt nach time");
});

test("CONCEPTS: Futur-Regel gilt nur für -ti, Verben auf -ći behalten das -i", () => {
  const s = CONCEPTS["verb-future"].short;
  assert.ok(s.includes("Putovat ću"));
  assert.ok(s.includes("-ti"));
  assert.ok(s.includes("Ići ću"));
  assert.ok(!s.includes("ić ću"));
});

test("Listen: POS, CASES und CATEGORIES wie im Brief", () => {
  assert.deepEqual(POS, ["noun", "verb", "adj", "adv", "pron", "num", "prep", "conj", "part", "interj", "phrase"]);
  assert.deepEqual(CASES, ["nom", "gen", "dat", "acc", "ins", "loc", "voc"]);
  assert.deepEqual(CATEGORIES, [
    "greeting", "people", "family", "food", "drink", "shopping", "money", "numbers", "time",
    "calendar", "weather", "nature", "animals", "sea", "leisure", "clothing", "colors", "body",
    "health", "home", "city", "travel", "transport", "work", "school", "office", "feelings",
    "celebration", "communication", "abstract"
  ]);
  assert.equal(new Set(CATEGORIES).size, CATEGORIES.length);
});

test("autoConcepts: č/ć -> diacritics-c", () => {
  assert.ok(autoConcepts("Čaša").includes("diacritics-c"));
  assert.ok(autoConcepts("kuća").includes("diacritics-c"));
  assert.ok(autoConcepts("ĆEVAPI").includes("diacritics-c"));
});

test("autoConcepts: š/ž -> diacritics-sz", () => {
  assert.ok(autoConcepts("žlica").includes("diacritics-sz"));
  assert.ok(autoConcepts("škola").includes("diacritics-sz"));
  assert.ok(autoConcepts("ŠUMA").includes("diacritics-sz"));
});

test("autoConcepts: đ und dž -> diacritics-dj", () => {
  assert.ok(autoConcepts("Đak").includes("diacritics-dj"));
  assert.ok(autoConcepts("džep").includes("diacritics-dj"));
  assert.ok(autoConcepts("Džem").includes("diacritics-dj"));
  assert.ok(autoConcepts("DŽEP").includes("diacritics-dj"));
});

test("autoConcepts: ohne Sonderzeichen leer; nur passende Konzepte", () => {
  assert.deepEqual(autoConcepts("kava"), []);
  assert.deepEqual(autoConcepts(""), []);
  assert.deepEqual(autoConcepts(undefined), []);
  assert.deepEqual(autoConcepts("čaj"), ["diacritics-c"]);
  assert.deepEqual(autoConcepts("Dobro jutro, čašu kave"), ["diacritics-c", "diacritics-sz"]);
  assert.deepEqual(autoConcepts("džemper i šećer, đak"), ["diacritics-c", "diacritics-sz", "diacritics-dj"]);
});

test("autoConcepts: auch mit zerlegten Zeichen (c + Hatschek)", () => {
  assert.ok(autoConcepts("čaša".normalize("NFD")).includes("diacritics-c"));
  assert.ok(autoConcepts("caša".normalize("NFD")).includes("diacritics-sz"));
});

test("autoConcepts: nur bekannte Konzept-IDs", () => {
  for (const id of autoConcepts("čšđ ćž džep")) assert.ok(CONCEPTS[id], id);
});

test("Browser-Modulmuster: window.KorakEngine wird befüllt, ohne module/require", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "engine", "concepts.js"), "utf8");
  const win = {};
  win.self = win;
  vm.runInNewContext(code, win);
  assert.equal(typeof win.KorakEngine, "object");
  assert.equal(typeof win.KorakEngine.autoConcepts, "function");
  assert.ok(win.KorakEngine.CONCEPTS["case-acc"]);
  assert.ok(Array.isArray(win.KorakEngine.POS));
  assert.ok(Array.isArray(win.KorakEngine.CATEGORIES));
  assert.ok(Array.isArray(win.KorakEngine.CASES));
});

test("Browser-Modulmuster: core.js und concepts.js teilen sich window.KorakEngine", () => {
  const dir = path.join(__dirname, "..", "engine");
  const win = {};
  win.self = win;
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(path.join(dir, "core.js"), "utf8"), win);
  vm.runInContext(fs.readFileSync(path.join(dir, "concepts.js"), "utf8"), win);
  assert.equal(typeof win.KorakEngine.plain, "function");
  assert.equal(typeof win.KorakEngine.autoConcepts, "function");
});
