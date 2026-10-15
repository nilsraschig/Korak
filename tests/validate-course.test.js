"use strict";
// Tests für scripts/validate-course.js: Fixtures (course-ok / course-bad), Regeln einzeln über
// veränderte Kopien der Fixtures, Vorlage für „complete“-Level, Querverweise und --compare.
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const courseIo = require("../scripts/course-io.js");
const validator = require("../scripts/validate-course.js");

const ROOT = path.join(__dirname, "..");
const VALIDATOR = path.join(ROOT, "scripts", "validate-course.js");
const FIXTURE = name => path.join(__dirname, "fixtures", name);

function run(args) {
  const r = spawnSync(process.execPath, [VALIDATOR, ...args], { cwd: ROOT, encoding: "utf8" });
  return { code: r.status, out: String(r.stdout) + String(r.stderr) };
}

// Kopie eines Fixtures in einem temporären Ordner (wird nach dem Test gelöscht).
function scratch(t, name = "course-ok") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "korak-validate-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.cpSync(FIXTURE(name), dir, { recursive: true });
  return dir;
}

// Kopie + Änderung an den Level-Daten, geschrieben über course-io (wie es die Inhalts-Tasks tun).
function mutated(t, fn, name = "course-ok") {
  const dir = scratch(t, name);
  const course = courseIo.loadCourse(dir);
  fn(course.parts, dir);
  course.parts.forEach(p => courseIo.writeLevel(p, courseIo.levelFile(p, dir)));
  return dir;
}

const clone = o => JSON.parse(JSON.stringify(o));
const a1 = parts => parts[0];
const a1Lesson = (parts, i = 0) => a1(parts).level.chapters[0].lessons[i];

// ---------- Fixtures ----------

test("course-ok: Exit 0", () => {
  const r = run(["--dir", FIXTURE("course-ok")]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /OK/);
});

test("course-ok mit --strict für das vollständige Kapitel: Exit 0", () => {
  const r = run(["--dir", FIXTURE("course-ok"), "--strict", "a1-obrok"]);
  assert.equal(r.code, 0, r.out);
});

test("relativer --dir-Pfad funktioniert", () => {
  const r = run(["--dir", path.join("tests", "fixtures", "course-ok")]);
  assert.equal(r.code, 0, r.out);
});

test("course-bad: Exit 1, jeder Verstoß wird gemeldet", () => {
  const r = run(["--dir", FIXTURE("course-bad")]);
  assert.equal(r.code, 1, r.out);
  const expected = [
    ["doppelte ID", /Doppelte ID „a1-1-1“/],
    ["Nomen ohne gender", /„stol“\): gender fehlt/],
    ["unbekanntes Konzept", /„tanjur“\): unbekanntes Konzept „dativ-plural“/],
    ["fehlendes diacritics-c bei čaj", /„čaj“\): Konzept „diacritics-c“ fehlt/],
    ["Lektion mit 11 Items", /a1-1-4: 11 Items \(mindestens 12\)/],
    ["Dialog mit 2 Zeilen", /a1-1-5: Dialog hat 2 Zeilen \(mindestens 4\)/],
    ["at-Verweis ins Leere", /exercise-data\.js.*„a1-99“/],
    ["complete-Level mit zu wenig Kapiteln", /A1: Status „complete“ verlangt 12 Kapitel, gefunden 1/]
  ];
  for (const [name, re] of expected) assert.match(r.out, re, `Meldung fehlt: ${name}\n${r.out}`);
  // Entwurfs-Level A2/B1 bleiben fehlerfrei, die Fehler stammen alle aus A1.
  assert.doesNotMatch(r.out, /✘ (A2|B1)\b/);
  assert.doesNotMatch(r.out, /✘ a2-|✘ b1-/);
});

test("Entwurfs-Level: Vorlage nur als Warnung, Exit 0", () => {
  const r = run(["--dir", FIXTURE("course-ok")]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /⚠ A2\/a2-kafic.*Entwurf/);
  assert.match(r.out, /⚠ B1\/b1-restoran.*Entwurf/);
  assert.match(r.out, /A1 \(Entwurf\): 1 Kapitel/);
});

test("--strict macht die Vorlage für ein Entwurfs-Kapitel zum Fehler", () => {
  const r = run(["--dir", FIXTURE("course-ok"), "--strict", "a2-kafic"]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /✘ A2\/a2-kafic: Kapitel hat 2 Lektionen statt 5/);
  assert.match(r.out, /✘ A2\/a2-kafic: a2-7-1: 4 Items \(mindestens 12\)/);
  assert.match(r.out, /a2-7-1: 2 Items ohne Annotation/);
  assert.match(r.out, /a2-7-1: Dialog hat 2 Zeilen/);
  assert.match(r.out, /a2-7-2: „Wusstest du\?“/);
});

test("--strict mit mehreren Kapiteln (Komma) und unbekannter Kapitel-ID", () => {
  const unknown = run(["--dir", FIXTURE("course-ok"), "--strict", "a1-obrok,gibt-es-nicht"]);
  assert.equal(unknown.code, 1, unknown.out);
  assert.match(unknown.out, /--strict: Kapitel „gibt-es-nicht“ gibt es nicht/);
  const two = run(["--dir", FIXTURE("course-ok"), "--strict", "a2-kafic,b1-restoran"]);
  assert.equal(two.code, 1, two.out);
  assert.match(two.out, /✘ A2\/a2-kafic/);
  assert.match(two.out, /✘ B1\/b1-restoran/);
});

test("Aufruf ohne Argumente prüft die Projektwurzel", () => {
  const r = run([]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /OK/);
});

test("falsche Aufrufe: unbekannte Option, fehlender Wert, kein Ordner", () => {
  assert.equal(run(["--gibtsnicht"]).code, 2);
  assert.equal(run(["--strict"]).code, 2);
  assert.equal(run(["--dir"]).code, 2);
  assert.equal(run(["--compare"]).code, 2);
  const r = run(["--dir", path.join(os.tmpdir(), "korak-gibt-es-nicht")]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Kursdaten lassen sich nicht laden/);
});

// ---------- Item-Felder (jedes Item mit pos) ----------

const ITEM_CASES = [
  ["pos nicht in POS", it => { it.pos = "nomen"; }, /„kruh“\): pos „nomen“/],
  ["category fehlt", it => { delete it.category; }, /„kruh“\): category fehlt/],
  ["category nicht in CATEGORIES", it => { it.category = "essen"; }, /„kruh“\): category „essen“/],
  ["concepts fehlt", it => { delete it.concepts; }, /„kruh“\): concepts fehlt oder ist leer/],
  ["concepts leer", it => { it.concepts = []; }, /„kruh“\): concepts fehlt oder ist leer/],
  ["concepts keine Liste", it => { it.concepts = "gender"; }, /„kruh“\): concepts fehlt oder ist leer/],
  ["unbekanntes Konzept", it => { it.concepts = ["gender", "xyz"]; }, /„kruh“\): unbekanntes Konzept „xyz“/],
  ["Nomen ohne gender", it => { delete it.gender; }, /„kruh“\): gender fehlt/],
  ["ungültiges gender", it => { it.gender = "x"; }, /„kruh“\): gender „x“ ist ungültig/],
  ["gender bei Nicht-Nomen", it => { it.pos = "verb"; }, /„kruh“\): gender nur bei Nomen erlaubt/],
  ["forms mit unbekanntem Fall", it => { it.forms.abl = "kruhu"; }, /„kruh“\): forms: unbekannter Fall „abl“/],
  ["forms mit leerem Wert", it => { it.forms.gen = " "; }, /„kruh“\): forms\.gen ist leer/],
  ["forms ohne nom", it => { delete it.forms.nom; }, /„kruh“\): forms: nom fehlt/],
  ["forms kein Objekt", it => { it.forms = ["kruh"]; }, /„kruh“\): forms ist kein Objekt/],
  ["Annotation ohne pos", it => { delete it.pos; }, /„kruh“\): Annotation unvollständig: pos fehlt/]
];
for (const [name, change, re] of ITEM_CASES) {
  test(`Item-Regel: ${name}`, t => {
    const dir = mutated(t, parts => change(a1Lesson(parts).items[0]));
    const r = run(["--dir", dir]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, re, r.out);
    assert.match(r.out, /a1-1-1 item 1/);
  });
}

test("Item-Regel: autoConcepts je Schreibweise (č/ć, š/ž, đ/dž)", t => {
  const cases = [
    ["Račun", "diacritics-c"], ["kuća", "diacritics-c"], ["šunka", "diacritics-sz"], ["žlica", "diacritics-sz"],
    ["đak", "diacritics-dj"], ["džep", "diacritics-dj"]
  ];
  for (const [hr, tag] of cases) {
    const dir = mutated(t, parts => { Object.assign(a1Lesson(parts).items[0], { hr, concepts: ["gender"] }); });
    const r = run(["--dir", dir]);
    assert.equal(r.code, 1, `${hr}: ${r.out}`);
    assert.match(r.out, new RegExp(`Konzept „${tag}“ fehlt`), `${hr}: ${r.out}`);
  }
});

test("Item-Regel: gültige forms mit voc und alle sieben Fälle bestehen", t => {
  const dir = mutated(t, parts => {
    a1Lesson(parts).items[0].forms = { nom: "kruh", gen: "kruha", dat: "kruhu", acc: "kruh", ins: "kruhom", loc: "kruhu", voc: "kruše" };
  });
  const r = run(["--dir", dir]);
  assert.equal(r.code, 0, r.out);
});

// ---------- IDs und Nummerierung ----------

const ID_CASES = [
  ["Lektions-ID passt nicht zum Muster", parts => { a1Lesson(parts, 2).id = "a1-x-3"; }, /ID „a1-x-3“ passt nicht zum Muster/],
  ["Lektions-ID aus anderem Kapitel", parts => { a1Lesson(parts, 2).id = "a1-2-3"; }, /a1-2-3: Präfix „a1-2“ statt „a1-1“/],
  ["Lektions-ID aus anderem Level", parts => { a1Lesson(parts, 2).id = "a2-1-3"; }, /a2-1-3: ID gehört nicht zu Level A1/],
  ["testId passt nicht zum Präfix", parts => {
    a1(parts).level.chapters[0].testId = "a1-2-test"; a1(parts).tests[0].id = "a1-2-test";
  }, /testId „a1-2-test“ statt „a1-1-test“/],
  ["Lektionsnummer mit Lücke", parts => { a1Lesson(parts, 2).number = 9; }, /a1-1-3: number 9 statt 3/],
  ["Kapitelnummer falsch", parts => { a1(parts).level.chapters[0].number = 2; }, /number 2 statt 1/],
  ["Level-Status fehlt", parts => { delete a1(parts).level.status; }, /A1: Feld „status“ fehlt/],
  ["Level-Status ungültig", parts => { a1(parts).level.status = "fertig"; }, /A1: status „fertig“ ist ungültig/],
  ["Test ohne Kapitel", parts => { a1(parts).tests.push(Object.assign(clone(a1(parts).tests[0]), { id: "a1-9-test" })); }, /Test „a1-9-test“ gehört zu keinem Kapitel/]
];
for (const [name, change, re] of ID_CASES) {
  test(`ID-Regel: ${name}`, t => {
    const dir = mutated(t, change);
    const r = run(["--dir", dir]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, re, r.out);
  });
}

test("ID-Regel: Präfix muss nicht der Position entsprechen (verschobene Kapitel)", () => {
  // course-ok: A2-Kapitel mit Präfix a2-7 an Position 1, B1-Kapitel mit Präfix b1-4 an Position 1.
  const data = courseIo.loadCourse(FIXTURE("course-ok")).data;
  assert.equal(data.levels[1].chapters[0].number, 1);
  assert.equal(data.levels[1].chapters[0].lessons[0].id, "a2-7-1");
  assert.equal(data.levels[2].chapters[0].testId, "b1-4-test");
  assert.equal(run(["--dir", FIXTURE("course-ok")]).code, 0);
});

test("ID-Regel: zwei Kapitel mit demselben Präfix werden gemeldet", t => {
  const dir = mutated(t, parts => {
    const lv = a1(parts).level;
    const second = clone(lv.chapters[0]);
    second.id = "a1-zweites"; second.number = 2;
    second.lessons.forEach((l, i) => { l.chapterId = second.id; l.number = 7 + i; });
    lv.chapters.push(second);
    a1(parts).tests.push(Object.assign(clone(a1(parts).tests[0]), { chapterId: second.id, number: 12 }));
  });
  const r = run(["--dir", dir]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /Präfix „a1-1“ wird schon von Kapitel „a1-obrok“ benutzt/);
});

// ---------- Vorlage für „complete“-Level ----------

// Macht aus dem einen A1-Kapitel des Fixtures n Kapitel (Kapitel 1 behält ID und damit die Querverweise).
function growA1(parts, n) {
  const part = a1(parts);
  const baseChapter = part.level.chapters[0], baseTest = part.tests[0];
  const chapters = [], tests = [];
  let num = 0;
  for (let k = 1; k <= n; k++) {
    const c = clone(baseChapter), tst = clone(baseTest);
    if (k > 1) c.id = `a1-kap${k}`;
    c.number = k; c.testId = `a1-${k}-test`;
    c.lessons.forEach((l, i) => { Object.assign(l, { id: `a1-${k}-${i + 1}`, chapterId: c.id, number: ++num }); });
    Object.assign(tst, { id: c.testId, chapterId: c.id, number: ++num });
    chapters.push(c); tests.push(tst);
  }
  part.level.chapters = chapters; part.tests = tests;
}

test("complete-Level mit 12 vorlagengerechten Kapiteln: Exit 0", t => {
  const dir = mutated(t, parts => { growA1(parts, 12); a1(parts).level.status = "complete"; });
  const r = run(["--dir", dir]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /A1 \(komplett\): 12 Kapitel, 60 Lektionen/);
});

for (const n of [11, 13]) {
  test(`complete-Level mit ${n} Kapiteln: Fehler`, t => {
    const dir = mutated(t, parts => { growA1(parts, n); a1(parts).level.status = "complete"; });
    const r = run(["--dir", dir]);
    assert.equal(r.code, 1, r.out);
    assert.match(r.out, new RegExp(`A1: Status „complete“ verlangt 12 Kapitel, gefunden ${n}`));
  });
}

const TEMPLATE_CASES = [
  ["Lektion mit 11 Items", parts => { a1Lesson(parts, 1).items.pop(); }, /a1-1-2: 11 Items \(mindestens 12\)/],
  ["nur 4 Lektionen", parts => { const c = a1(parts).level.chapters[0]; c.lessons.pop(); a1(parts).tests[0].number = 5; }, /Kapitel hat 4 Lektionen statt 5/],
  ["Item ohne Annotation", parts => { const it = a1Lesson(parts, 2).items[3]; a1Lesson(parts, 2).items[3] = { hr: it.hr, de: it.de }; }, /a1-1-3: 1 Items ohne Annotation \(pos fehlt\)/],
  ["Dialog mit 3 Zeilen", parts => { a1Lesson(parts, 3).dialogue.pop(); }, /a1-1-4: Dialog hat 3 Zeilen \(mindestens 4\)/],
  ["Dialogzeile ohne Satz", parts => { a1Lesson(parts, 3).dialogue[2] = ["A", ""]; }, /a1-1-4: Dialogzeile 3 ungültig/],
  ["Dialogzeile mit drei Teilen", parts => { a1Lesson(parts, 3).dialogue[1] = ["A", "Hvala", "x"]; }, /Dialogzeile 2 ungültig/],
  ["grammar leer", parts => { a1Lesson(parts, 4).grammar = ""; }, /a1-1-5: grammar fehlt/],
  ["fact fehlt", parts => { delete a1Lesson(parts, 0).fact; }, /a1-1-1: „Wusstest du\?“ \(fact mit title und text\) fehlt/],
  ["fact.text leer", parts => { a1Lesson(parts, 0).fact.text = " "; }, /a1-1-1: fact\.text ist leer/],
  ["zu wenige Items mit forms", parts => {
    a1Lesson(parts, 0).items.forEach((it, i) => { if (i > 1) delete it.forms; });
    a1Lesson(parts, 1).items.forEach(it => delete it.forms);
    a1Lesson(parts, 2).items.forEach(it => delete it.forms);
    a1Lesson(parts, 3).items.forEach(it => delete it.forms);
    a1Lesson(parts, 4).items.forEach(it => delete it.forms);
  }, /Kapitel: nur 2 Items mit forms aus mindestens 4 Formen \(mindestens 3\)/],
  ["forms mit nur 3 Fällen zählen nicht", parts => {
    a1Lesson(parts, 0).items.forEach((it, i) => { if (i > 1) delete it.forms; else it.forms = { nom: it.hr, gen: it.hr + "a", dat: it.hr + "u" }; });
    for (let l = 1; l < 5; l++) a1Lesson(parts, l).items.forEach(it => delete it.forms);
  }, /Kapitel: nur 0 Items mit forms aus mindestens 4 Formen/]
];
for (const [name, change, re] of TEMPLATE_CASES) {
  test(`Vorlage (complete-Level): ${name}`, t => {
    const dir = mutated(t, parts => { change(parts); });
    const strict = run(["--dir", dir, "--strict", "a1-obrok"]);
    assert.equal(strict.code, 1, strict.out);
    assert.match(strict.out, re, strict.out);
  });
}

test("Vorlage: Entwurfs-Verstoß in A1 ist ohne --strict nur eine Warnung", t => {
  const dir = mutated(t, parts => { a1Lesson(parts, 1).items.pop(); });
  const r = run(["--dir", dir]);
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /⚠ A1\/a1-obrok.*Entwurf.*1× Lektion mit weniger als 12 Items/);
});

test("Vorlage: complete-Level prüft alle Kapitel, auch ohne --strict", t => {
  const dir = mutated(t, parts => {
    growA1(parts, 12);
    a1(parts).level.status = "complete";
    a1(parts).level.chapters[7].lessons[1].items.pop();
  });
  const r = run(["--dir", dir]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /✘ A1\/a1-kap8: a1-8-2: 11 Items \(mindestens 12\)/);
});

test("fact, falls vorhanden, muss auch im Entwurf wohlgeformt sein", t => {
  const dir = mutated(t, parts => { a1Lesson(parts, 0).fact = { title: "Marenda" }; });
  const r = run(["--dir", dir]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /a1-1-1: fact\.text ist leer/);
});

// ---------- Querverweise ----------

test("Querverweis: Kultur-Schlüssel für Kapitel und Lektionen", t => {
  const dir = scratch(t);
  const file = path.join(dir, "culture-data.js");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"a1-obrok"', '"a1-weg"').replace('"a2-7-2"', '"a2-7-9"'));
  const r = run(["--dir", dir]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /culture-data\.js: Kapitel „a1-weg“ gibt es nicht/);
  assert.match(r.out, /culture-data\.js: Lektion „a2-7-9“ gibt es nicht/);
});

test("Querverweis: at in exercise-data.js darf Kapitel, Lektion oder Kapiteltest sein", t => {
  const dir = scratch(t);
  const file = path.join(dir, "exercise-data.js");
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"b1-4-1"', '"b1-4-test"'));
  assert.equal(run(["--dir", dir]).code, 0);
  fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace('"b1-4-test"', '"b1-5-1"'));
  const r = run(["--dir", dir]);
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /exercise-data\.js: Aufgabe „sc-1“ verweist auf „b1-5-1“/);
});

test("Querverweise: culture-data.js und exercise-data.js sind optional", t => {
  const dir = scratch(t);
  fs.rmSync(path.join(dir, "culture-data.js"));
  fs.rmSync(path.join(dir, "exercise-data.js"));
  assert.equal(run(["--dir", dir]).code, 0);
});

// ---------- --compare ----------

const lessonById = (data, id) => data.lessons.find(l => l.id === id);

test("compareCourse: identischer Stand und reine Ergänzungen sind fehlerfrei", () => {
  const old = courseIo.loadCourse(FIXTURE("course-ok")).data;
  const same = validator.compareCourse(old, clone(old));
  assert.deepEqual(same.errors, []);
  assert.equal(same.stats.lessons, old.lessons.length);
  assert.equal(same.stats.items, old.lessons.reduce((s, l) => s + l.items.length, 0));
  assert.equal(same.stats.dialogueLines, old.lessons.reduce((s, l) => s + l.dialogue.length, 0));
  const next = clone(old);
  const l = lessonById(next, "a1-1-1");
  l.items.push({ hr: "kolač", de: "Kuchen" });
  l.dialogue.push(["A", "Hvala!"]);
  next.lessons.push(clone(lessonById(next, "a1-1-2")));
  const res = validator.compareCourse(old, next);
  assert.deepEqual(res.errors, []);
  assert.equal(res.stats.items, same.stats.items);
});

test("compareCourse: geänderte, entfernte oder umsortierte Items", () => {
  const old = courseIo.loadCourse(FIXTURE("course-ok")).data;
  const mut = fn => { const n = clone(old); fn(n); return validator.compareCourse(old, n).errors; };
  let errors = mut(n => { lessonById(n, "a1-1-1").items[0].hr = "kruha"; });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /a1-1-1: Item 1 geändert: alt „kruh“ \/ „Brot“, neu „kruha“ \/ „Brot“/);
  errors = mut(n => { lessonById(n, "a1-1-1").items[2].de = "Eintopf"; });
  assert.match(errors[0], /a1-1-1: Item 3 geändert/);
  errors = mut(n => { lessonById(n, "a1-1-1").items.splice(0, 1); });
  assert.ok(errors.length >= 1);
  assert.match(errors[0], /a1-1-1: Item 1 geändert/);
  errors = mut(n => { lessonById(n, "a1-1-1").items.pop(); });
  assert.match(errors[0], /a1-1-1: Item 12 fehlt \(alt „[^“]+“\)/);
  errors = mut(n => { const it = lessonById(n, "a1-1-1").items; [it[0], it[1]] = [it[1], it[0]]; });
  assert.equal(errors.length, 2);
});

test("compareCourse: Dialogzeilen müssen der Anfang des neuen Dialogs bleiben", () => {
  const old = courseIo.loadCourse(FIXTURE("course-ok")).data;
  const mut = fn => { const n = clone(old); fn(n); return validator.compareCourse(old, n).errors; };
  let errors = mut(n => { lessonById(n, "a1-1-1").dialogue[1][1] = "Kava, molim."; });
  assert.match(errors[0], /a1-1-1: Dialogzeile 2 geändert/);
  errors = mut(n => { lessonById(n, "a1-1-1").dialogue.pop(); });
  assert.match(errors[0], /a1-1-1: Dialogzeile 4 fehlt/);
  errors = mut(n => { lessonById(n, "a1-1-1").dialogue[0][0] = "X"; });
  assert.match(errors[0], /a1-1-1: Dialogzeile 1 geändert/);
});

test("compareCourse: fehlende alte Lektion; LESSON_MAP findet verschobene Lektionen", () => {
  const old = courseIo.loadCourse(FIXTURE("course-ok")).data;
  const moved = clone(old);
  moved.lessons.forEach(l => { if (l.id.startsWith("a2-7-")) l.id = l.id.replace("a2-7-", "a2-9-"); });
  const without = validator.compareCourse(old, moved).errors;
  assert.ok(without.some(e => /Alte Lektion „a2-7-1“ fehlt/.test(e)), without.join("\n"));
  assert.ok(without.some(e => /Alte Lektion „a2-7-test“ fehlt/.test(e)), without.join("\n"));
  const withMap = validator.compareCourse(old, moved, { lessonMap: { "a2-7": "a2-9" } });
  assert.deepEqual(withMap.errors, []);
  // Eine Abbildung für ein anderes Präfix ändert nichts.
  assert.ok(validator.compareCourse(old, moved, { lessonMap: { "a2-8": "a2-9" } }).errors.length > 0);
  // Inhalte werden auch über die Abbildung verglichen.
  lessonById(moved, "a2-9-1").items[0].hr = "kruha";
  assert.match(validator.compareCourse(old, moved, { lessonMap: { "a2-7": "a2-9" } }).errors[0], /a2-7-1 → a2-9-1: Item 1 geändert/);
});

test("compareCourse: alter Stand ohne levels/lessons", () => {
  const new_ = courseIo.loadCourse(FIXTURE("course-ok")).data;
  assert.match(validator.compareCourse({}, new_).errors[0], /keine gültigen Kursdaten/);
});

test("loadLessonMap: ohne engine/migrate.js leer, sonst LESSON_MAP", t => {
  assert.deepEqual(validator.loadLessonMap(path.join(os.tmpdir(), "korak-gibt-es-nicht.js")), {});
  const dir = scratch(t);
  const file = path.join(dir, "migrate.js");
  fs.writeFileSync(file, 'module.exports = { LESSON_MAP: { "a2-13": "b1-4" } };');
  assert.deepEqual(validator.loadLessonMap(file), { "a2-13": "b1-4" });
  fs.writeFileSync(file, "module.exports = { andere: 1 };");
  assert.deepEqual(validator.loadLessonMap(file), {});
});

function writeOld(dir, data) {
  const file = path.join(dir, "alt.js");
  fs.writeFileSync(file, "window.KORAK_DATA = " + JSON.stringify(data) + ";\n");
  return file;
}

test("--compare per CLI: identisch → Exit 0, Änderung → Exit 1, fehlende Datei → Exit 1", t => {
  const dir = scratch(t);
  const old = courseIo.loadCourse(dir).data;
  const same = run(["--dir", dir, "--compare", writeOld(dir, old)]);
  assert.equal(same.code, 0, same.out);
  assert.match(same.out, /✔ Vergleich mit .*alt\.js/);

  const changed = clone(old);
  lessonById(changed, "a1-1-2").items[1].hr = "anderes Wort";
  const bad = run(["--dir", dir, "--compare", writeOld(dir, changed)]);
  assert.equal(bad.code, 1, bad.out);
  assert.match(bad.out, /a1-1-2: Item 2 geändert/);

  const missing = run(["--dir", dir, "--compare", path.join(dir, "gibt-es-nicht.js")]);
  assert.equal(missing.code, 1, missing.out);
  assert.match(missing.out, /Vergleichsdatei nicht lesbar/);
});

test("--compare per CLI: neuer Kurs mit angehängten Items und Dialogzeilen besteht", t => {
  const dir = scratch(t);
  const old = courseIo.loadCourse(dir).data;
  const oldFile = writeOld(dir, old);
  const course = courseIo.loadCourse(dir);
  const l = a1Lesson(course.parts);
  l.items.push({ hr: "kolač", de: "Kuchen" });
  l.dialogue.push(["B", "Hvala!"]);
  course.parts.forEach(p => courseIo.writeLevel(p, courseIo.levelFile(p, dir)));
  const r = run(["--dir", dir, "--compare", oldFile]);
  assert.equal(r.code, 0, r.out);
});

test("--compare gegen den Stand von origin/main (falls als Kopie vorhanden)", { skip: !fs.existsSync(path.join(ROOT, ".superpowers/sdd/lern-engine/baseline-course.js")) }, () => {
  const r = run(["--compare", path.join(ROOT, ".superpowers/sdd/lern-engine/baseline-course.js")]);
  assert.equal(r.code, 0, r.out);
});
