"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const migrate = require("../engine/migrate.js");

const { LESSON_MAP, CHAPTER_MAP, mapLessonId, mapItemKey, migrateState } = migrate;

const clone = o => JSON.parse(JSON.stringify(o));

// Zustand aus dem Brief (Task 3, Step 1).
function oldState() {
  return {
    xp: 420,
    streak: 3,
    completed: ["a2-13-1", "a2-13-test", "b1-1-2"],
    testStars: { "a2-18-test": 3 },
    items: { "a2-15-2-4": { seen: 2 }, "dialog-a2-16-3": { seen: 1 } },
    lastLesson: "a2-17-5",
    selectedLevel: "A2"
  };
}

test("LESSON_MAP und CHAPTER_MAP: genau die sechs verschobenen Kapitel", () => {
  assert.deepEqual(LESSON_MAP, { "a2-13": "b1-4", "a2-14": "b1-5", "a2-15": "b1-6", "a2-16": "b1-7", "a2-17": "b1-8", "a2-18": "b1-9" });
  assert.deepEqual(CHAPTER_MAP, {
    "a2-ordinacija": "b1-ordinacija", "a2-stanovanje": "b1-stanovanje", "a2-susjedi": "b1-susjedi",
    "a2-konoba": "b1-konoba", "a2-kolodvor": "b1-kolodvor", "a2-ured": "b1-ured"
  });
});

test("mapLessonId: verschobene Lektionen und Tests bekommen die neue ID", () => {
  assert.equal(mapLessonId("a2-13-1"), "b1-4-1");
  assert.equal(mapLessonId("a2-13-test"), "b1-4-test");
  assert.equal(mapLessonId("a2-18-5"), "b1-9-5");
  assert.equal(mapLessonId("a2-16-test"), "b1-7-test");
});

test("mapLessonId: alle anderen IDs bleiben unverändert", () => {
  for (const id of ["a2-1-1", "a2-12-test", "b1-2-3", "a1-1-1", "a2-3-13", "a2-130-1", "b1-4-1", "b1-9-test", "a2-13", "", "irgendwas"]) {
    assert.equal(mapLessonId(id), id, id);
  }
});

test("mapItemKey: Item-Schlüssel <lessonId>-<index> und dialog-<lessonId>", () => {
  assert.equal(mapItemKey("a2-15-2-4"), "b1-6-2-4");
  assert.equal(mapItemKey("a2-13-1-0"), "b1-4-1-0");
  assert.equal(mapItemKey("dialog-a2-16-3"), "dialog-b1-7-3");
  for (const k of ["a2-1-1-0", "a2-12-5-11", "b1-2-3-4", "dialog-a2-1-1", "dialog-b1-7-3", "b1-6-2-4"]) assert.equal(mapItemKey(k), k, k);
});

test("migrateState: bildet completed, testStars, items und lastLesson ab", () => {
  const out = migrateState(oldState());
  assert.deepEqual(out.completed, ["b1-4-1", "b1-4-test", "b1-1-2"]);
  assert.deepEqual(out.testStars, { "b1-9-test": 3 });
  assert.deepEqual(Object.keys(out.items).sort(), ["b1-6-2-4", "dialog-b1-7-3"]);
  assert.deepEqual(out.items["b1-6-2-4"], { seen: 2 });
  assert.deepEqual(out.items["dialog-b1-7-3"], { seen: 1 });
  assert.equal(out.lastLesson, "b1-8-5");
  // lastLesson ist nach B1 gewandert → das dazu gewählte Level auch („Weiterlernen“ zeigt sonst A2)
  assert.equal(out.selectedLevel, "B1");
  // übrige Felder bleiben
  assert.equal(out.xp, 420);
  assert.equal(out.streak, 3);
});

test("migrateState: selectedLevel folgt nur einer umbenannten lastLesson aus A2", () => {
  // umbenannt + A2 → B1
  assert.equal(migrateState({ lastLesson: "a2-13-1", selectedLevel: "A2" }).selectedLevel, "B1");
  assert.equal(migrateState({ lastLesson: "a2-18-test", selectedLevel: "A2" }).selectedLevel, "B1");
  // lastLesson nicht verschoben → bleibt A2
  assert.equal(migrateState({ lastLesson: "a2-3-1", selectedLevel: "A2" }).selectedLevel, "A2");
  // schon neue ID (zweiter Lauf / spätere Wahl des Nutzers) → bleibt
  assert.equal(migrateState({ lastLesson: "b1-4-2", selectedLevel: "A2" }).selectedLevel, "A2");
  // anderes Level bewusst gewählt → bleibt
  assert.equal(migrateState({ lastLesson: "a2-13-1", selectedLevel: "A1" }).selectedLevel, "A1");
  // ohne selectedLevel kein neues Feld
  assert.equal("selectedLevel" in migrateState({ lastLesson: "a2-13-1" }), false);
  // idempotent
  const once = migrateState({ lastLesson: "a2-15-2", selectedLevel: "A2" });
  assert.deepEqual(once, { lastLesson: "b1-6-2", selectedLevel: "B1" });
  assert.deepEqual(migrateState(once), once);
});

test("migrateState: idempotent", () => {
  const once = migrateState(oldState());
  assert.deepEqual(migrateState(once), once);
  assert.deepEqual(migrateState(migrateState(migrateState(oldState()))), once);
});

test("migrateState: Eingabe bleibt unverändert, Ergebnis ist eine eigene Kopie", () => {
  const input = oldState();
  const before = clone(input);
  const out = migrateState(input);
  assert.deepEqual(input, before);
  assert.notEqual(out, input);
  assert.notEqual(out.completed, input.completed);
  assert.notEqual(out.items, input.items);
  out.items["b1-6-2-4"].seen = 99;
  out.completed.push("x");
  assert.deepEqual(input, before);

  // auch ohne zu migrierende IDs eine Kopie
  const plain = { completed: ["a1-1-1"], items: { "a1-1-1-0": { seen: 1 } }, testStars: {}, lastLesson: "a1-1-2" };
  const copy = migrateState(plain);
  assert.deepEqual(copy, plain);
  assert.notEqual(copy, plain);
  assert.notEqual(copy.items["a1-1-1-0"], plain.items["a1-1-1-0"]);
});

test("migrateState: unveränderte IDs bleiben (a2-1-1, a2-12-test, b1-2-3)", () => {
  const s = {
    completed: ["a2-1-1", "a2-12-test", "b1-2-3"],
    testStars: { "a2-12-test": 2 },
    items: { "a2-1-1-0": { seen: 1 }, "b1-2-3-4": { seen: 2 }, "dialog-a2-12-1": { seen: 1 } },
    lastLesson: "a2-1-1"
  };
  assert.deepEqual(migrateState(s), s);
});

test("migrateState: Kollisionen – doppelte Lektionen einmal, Item mit höherem seen gewinnt, Sterne als Maximum", () => {
  const s = {
    completed: ["a2-13-1", "b1-4-1", "b1-4-2", "a2-13-2", "a1-1-1"],
    testStars: { "a2-13-test": 3, "b1-4-test": 1, "a2-14-test": 1, "b1-5-test": 2 },
    items: {
      "a2-13-1-0": { seen: 5, correct: 4 }, "b1-4-1-0": { seen: 2, correct: 1 },   // alt gewinnt
      "b1-4-1-1": { seen: 7, correct: 7 }, "a2-13-1-1": { seen: 3, correct: 1 },   // neu gewinnt (Reihenfolge egal)
      "dialog-a2-13-1": { seen: 1 }, "dialog-b1-4-1": { seen: 4 }
    },
    lastLesson: "b1-4-2"
  };
  const out = migrateState(s);
  assert.deepEqual(out.completed, ["b1-4-1", "b1-4-2", "a1-1-1"]);
  assert.deepEqual(out.testStars, { "b1-4-test": 3, "b1-5-test": 2 });
  assert.deepEqual(out.items, {
    "b1-4-1-0": { seen: 5, correct: 4 },
    "b1-4-1-1": { seen: 7, correct: 7 },
    "dialog-b1-4-1": { seen: 4 }
  });
  assert.equal(out.lastLesson, "b1-4-2");
  assert.deepEqual(migrateState(out), out);
});

test("migrateState: Kollision bei gleichem seen – Ergebnis hängt nicht von der Schlüsselreihenfolge ab", () => {
  const a = { items: { "a2-15-1-0": { seen: 2, due: 100 }, "b1-6-1-0": { seen: 2, due: 200 } } };
  const b = { items: { "b1-6-1-0": { seen: 2, due: 200 }, "a2-15-1-0": { seen: 2, due: 100 } } };
  assert.deepEqual(migrateState(a).items, { "b1-6-1-0": { seen: 2, due: 200 } });
  assert.deepEqual(migrateState(b).items, migrateState(a).items);
  const c = { items: { "a2-15-1-0": { seen: 2, due: 5, box: 1 }, "b1-6-1-0": { seen: 2, due: 5, box: 3 } } };
  const d = { items: { "b1-6-1-0": { seen: 2, due: 5, box: 3 }, "a2-15-1-0": { seen: 2, due: 5, box: 1 } } };
  assert.deepEqual(migrateState(c).items, { "b1-6-1-0": { seen: 2, due: 5, box: 3 } });
  assert.deepEqual(migrateState(d).items, migrateState(c).items);
});

test("migrateState: robust bei fehlenden oder kaputten Feldern", () => {
  assert.deepEqual(migrateState({ xp: 5 }), { xp: 5 });
  assert.deepEqual(migrateState({ completed: null, items: null, testStars: null, lastLesson: null }), { completed: null, items: null, testStars: null, lastLesson: null });
  assert.deepEqual(migrateState({ completed: ["a2-14-1", 7, null] }).completed, ["b1-5-1", 7, null]);
  assert.equal(migrateState(null), null);
  assert.equal(migrateState(undefined), undefined);
});

test("Browser: migrate.js erweitert window.KorakEngine (flache Exporte)", () => {
  const sandbox = { self: {}, KorakEngine: undefined };
  sandbox.self = sandbox;
  vm.createContext(sandbox);
  for (const f of ["core.js", "concepts.js", "migrate.js"]) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, "..", "engine", f), "utf8"), sandbox, { filename: f });
  }
  const E = sandbox.KorakEngine;
  assert.equal(typeof E.migrateState, "function");
  assert.equal(typeof E.mapLessonId, "function");
  assert.equal(typeof E.mapItemKey, "function");
  assert.equal(typeof E.norm, "function", "Exporte von core.js bleiben erhalten");
  assert.equal(E.LESSON_MAP["a2-13"], "b1-4");
  assert.equal(E.mapLessonId("a2-16-test"), "b1-7-test");
});
