"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const core = require("../engine/core.js");

const { makeRng, shuffle, pick, norm, plain, missingDiacritics } = core;

test("makeRng: gleicher Seed liefert dieselbe Folge, Werte in [0,1)", () => {
  const a = makeRng(1), b = makeRng(1);
  const fa = Array.from({ length: 50 }, () => a());
  const fb = Array.from({ length: 50 }, () => b());
  assert.deepEqual(fa, fb);
  for (const v of fa) assert.ok(v >= 0 && v < 1, "Wert im Bereich [0,1): " + v);
});

test("makeRng: verschiedene Seeds liefern verschiedene Folgen", () => {
  const a = makeRng(1), b = makeRng(2);
  assert.notDeepEqual(Array.from({ length: 5 }, () => a()), Array.from({ length: 5 }, () => b()));
});

test("shuffle: gleiche Elemente, Eingabe unverändert, neue Liste", () => {
  const input = [1, 2, 3];
  const out = shuffle(input, makeRng(7));
  assert.notEqual(out, input);
  assert.deepEqual(input, [1, 2, 3]);
  assert.deepEqual([...out].sort(), [1, 2, 3]);
});

test("shuffle: mit festem Seed reproduzierbar und bei längerer Liste wirklich gemischt", () => {
  const list = Array.from({ length: 20 }, (_, i) => i);
  const a = shuffle(list, makeRng(42)), b = shuffle(list, makeRng(42));
  assert.deepEqual(a, b);
  assert.notDeepEqual(a, list);
  assert.deepEqual([...a].sort((x, y) => x - y), list);
});

test("pick: liefert ein Element der Liste, reproduzierbar", () => {
  const list = ["a", "b", "c", "d"];
  const rng = makeRng(3);
  for (let i = 0; i < 30; i++) assert.ok(list.includes(pick(list, rng)));
  assert.equal(pick(list, makeRng(5)), pick(list, makeRng(5)));
});

test("norm: identisch zu app.js (trim, klein, Satzzeichen weg, Leerraum zusammen)", () => {
  assert.equal(norm("  Čašu  kave, molim! "), "čašu kave molim");
  assert.equal(norm("„Dobar dan“…"), "dobar dan");
  assert.equal(norm("Kako si? (neformalno)"), "kako si neformalno");
  assert.equal(norm(null), "");
  assert.equal(norm(undefined), "");
  assert.equal(norm(42), "42");
});

test("norm: Diakritika bleiben erhalten", () => {
  assert.equal(norm("Đurđica"), "đurđica");
  assert.equal(norm("ŽUTO"), "žuto");
});

test("plain: norm plus Diakritika entfernt", () => {
  assert.equal(plain("Čašu kave, molim!"), "casu kave molim");
  assert.equal(plain("Đurđica"), "djurdjica");
  assert.equal(plain("ćevapčići"), "cevapcici");
  assert.equal(plain("šuma, žaba"), "suma zaba");
  assert.equal(plain(null), "");
});

test("missingDiacritics: fehlende Diakritika aus dem Zielwort", () => {
  assert.deepEqual(missingDiacritics("casa", "čaša"), ["č", "š"]);
  assert.deepEqual(missingDiacritics("čaša", "čaša"), []);
  assert.deepEqual(missingDiacritics("časa", "čaša"), ["š"]);
  assert.deepEqual(missingDiacritics("Casa!", "Čaša"), ["č", "š"]);
});

test("missingDiacritics: đ darf als dj getippt werden und zählt als fehlend", () => {
  assert.deepEqual(missingDiacritics("djak", "đak"), ["đ"]);
  assert.deepEqual(missingDiacritics("dak", "đak"), ["đ"]);
  assert.deepEqual(missingDiacritics("kuca", "kuća"), ["ć"]);
});

test("missingDiacritics: anderes Diakritikum auf demselben Grundbuchstaben (ć statt č) zählt als fehlend", () => {
  assert.deepEqual(missingDiacritics("ćaša", "čaša"), ["č"]);
  assert.deepEqual(missingDiacritics("kuča", "kuća"), ["ć"]);
  assert.deepEqual(missingDiacritics("šaša", "čaša"), [], "š ist kein c – kein fehlendes Diakritikum");
});

test("missingDiacritics: ohne Diakritika im Ziel oder bei falscher Antwort leer", () => {
  assert.deepEqual(missingDiacritics("kava", "kava"), []);
  assert.deepEqual(missingDiacritics("", "čaša"), []);
  assert.deepEqual(missingDiacritics("pivo", "čaša"), []);
});

test("Browser-Modulmuster: window.KorakEngine wird befüllt, ohne module/require", () => {
  const code = fs.readFileSync(path.join(__dirname, "..", "engine", "core.js"), "utf8");
  const win = {};
  win.self = win;
  vm.runInNewContext(code, win);
  assert.equal(typeof win.KorakEngine, "object");
  for (const name of ["makeRng", "shuffle", "pick", "norm", "plain", "missingDiacritics"]) {
    assert.equal(typeof win.KorakEngine[name], "function", name);
  }
  assert.equal(win.KorakEngine.plain("Čaša"), "casa");
});
