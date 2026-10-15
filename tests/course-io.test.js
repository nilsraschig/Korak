"use strict";
// Tests für scripts/course-io.js: Kursdateien laden und im bestehenden Format zurückschreiben.
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const courseIo = require("../scripts/course-io.js");

const ROOT = path.join(__dirname, "..");
const FIXTURE = name => path.join(__dirname, "fixtures", name);
const sha = buf => crypto.createHash("sha256").update(buf).digest("hex");
const clone = o => JSON.parse(JSON.stringify(o));

function tmpDir(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "korak-io-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

// Lädt alle Level-Dateien eines Ordners, schreibt sie unverändert über writeLevel in einen Ordner
// und prüft Prüfsumme und Bytes vorher/nachher.
function assertRoundTrip(t, dir) {
  const out = tmpDir(t);
  const { parts } = courseIo.loadCourse(dir);
  assert.equal(parts.length, courseIo.LEVEL_FILES.length);
  for (const part of parts) {
    const rel = `course/${part.level.id.toLowerCase()}.js`;
    const target = path.join(out, path.basename(rel));
    courseIo.writeLevel(part, target);
    const before = fs.readFileSync(path.join(dir, rel)), after = fs.readFileSync(target);
    assert.equal(sha(after), sha(before), `${rel}: Prüfsumme weicht ab`);
    assert.ok(before.equals(after), `${rel}: Bytes weichen ab`);
  }
}

test("writeLevel erzeugt für unveränderte Kursdaten byte-identische Dateien", t => {
  assertRoundTrip(t, ROOT);
});

test("writeLevel erzeugt für die Fixtures byte-identische Dateien", t => {
  assertRoundTrip(t, FIXTURE("course-ok"));
  assertRoundTrip(t, FIXTURE("course-bad"));
});

test("loadCourse liefert data und parts in Kursreihenfolge", () => {
  const { data, parts } = courseIo.loadCourse(ROOT);
  assert.deepEqual(data.levels.map(l => l.id), ["A1", "A2", "B1"]);
  assert.deepEqual(parts.map(p => p.level.id), ["A1", "A2", "B1"]);
  assert.ok(Array.isArray(data.lessons) && data.lessons.length > 0);
  assert.ok(parts.every(p => Array.isArray(p.tests) && p.level.chapters.length > 0));
  // Normale Objekte (kein VM-Kontext), und data.levels[i] ist dasselbe Objekt wie parts[i].level.
  assert.ok(data.levels instanceof Array && Object.getPrototypeOf(parts[0].level) === Object.prototype);
  assert.deepEqual(parts.map(p => p.level), data.levels);
  data.levels.forEach((level, i) => assert.equal(level, parts[i].level));
  // Die flache Liste enthält je Kapitel die Lektionen und den Kapiteltest.
  const chapters = data.levels.reduce((s, l) => s + l.chapters.length, 0);
  const lessons = data.levels.reduce((s, l) => s + l.chapters.reduce((s2, c) => s2 + c.lessons.length, 0), 0);
  assert.equal(data.lessons.length, lessons + chapters);
});

test("loadCourse akzeptiert einen anderen Ordner und meldet Fehler verständlich", t => {
  const { data } = courseIo.loadCourse(FIXTURE("course-ok"));
  assert.equal(data.levels[0].chapters[0].id, "a1-obrok");
  assert.throws(() => courseIo.loadCourse(path.join(os.tmpdir(), "korak-gibt-es-nicht")), /ENOENT/);
  const dir = tmpDir(t);
  fs.cpSync(FIXTURE("course-ok"), dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "course-data.js"), "window.KORAK_DATA = { levels: [] };\n");
  assert.throws(() => courseIo.loadCourse(dir), /nicht die Form \{levels, lessons\}/);
});

test("levelFile nennt die Datei eines Levels", () => {
  const { parts } = courseIo.loadCourse(ROOT);
  assert.equal(courseIo.levelFile(parts[0]), path.join(ROOT, "course", "a1.js"));
  assert.equal(courseIo.levelFile(parts[2], "/x/y"), path.join("/x/y", "course", "b1.js"));
});

test("renderLevel: Kopfkommentar zählt die Kapitel neu", () => {
  const { parts } = courseIo.loadCourse(FIXTURE("course-ok"));
  const part = clone(parts[0]);
  assert.match(courseIo.renderLevel(part), /^\/\* Korak – Kursdaten A1: Kroatisch A1 \(1 Kapitel\)\.\n \* Wird von course-data\.js zu window\.KORAK_DATA zusammengesetzt\. Prüfen: node scripts\/validate-course\.js \*\/\n/);
  const second = clone(part.level.chapters[0]);
  second.id = "a1-zweites";
  part.level.chapters.push(second);
  assert.match(courseIo.renderLevel(part), /\(2 Kapitel\)\./);
  part.level.chapters.length = 0;
  assert.match(courseIo.renderLevel(part), /\(0 Kapitel\)\./);
});

test("renderLevel: eine Lektion pro Zeile mit zwei Leerzeichen Einzug", () => {
  const { parts } = courseIo.loadCourse(FIXTURE("course-ok"));
  const lines = courseIo.renderLevel(parts[0]).split("\n");
  const lessonLines = lines.filter(l => l.startsWith("  {"));
  // 5 Lektionen + 1 Kapiteltest
  assert.equal(lessonLines.length, 6);
  assert.ok(lessonLines.slice(0, 4).every(l => l.endsWith("},")));
  assert.ok(lessonLines[4].endsWith("}"), "letzte Lektion ohne Komma");
  assert.ok(lessonLines[5].endsWith("}"), "letzter Test ohne Komma");
  assert.equal(lines[lines.length - 1], "", "Datei endet mit Zeilenumbruch");
  assert.equal(lines[lines.length - 2], "});");
});

test("renderLevel: Änderungen verändern nur die betroffene Zeile; Ergebnis lässt sich neu laden", t => {
  const dir = tmpDir(t);
  fs.cpSync(FIXTURE("course-ok"), dir, { recursive: true });
  const before = fs.readFileSync(path.join(dir, "course", "a1.js"), "utf8").split("\n");
  const course = courseIo.loadCourse(dir);
  course.parts[0].level.chapters[0].lessons[1].items.push({ hr: "kolač", de: "Kuchen" });
  courseIo.writeLevel(course.parts[0], courseIo.levelFile(course.parts[0], dir));
  const after = fs.readFileSync(path.join(dir, "course", "a1.js"), "utf8").split("\n");
  assert.equal(after.length, before.length);
  const differing = after.map((l, i) => (l === before[i] ? -1 : i)).filter(i => i >= 0);
  assert.equal(differing.length, 1);
  assert.ok(after[differing[0]].includes('{"hr":"kolač","de":"Kuchen"}'));
  const again = courseIo.loadCourse(dir);
  assert.equal(again.data.levels[0].chapters[0].lessons[1].items.at(-1).hr, "kolač");
});

test("Level-Feld status steht nach subtitle und bleibt beim Zurückschreiben erhalten", t => {
  const dir = tmpDir(t);
  fs.cpSync(FIXTURE("course-ok"), dir, { recursive: true });
  const { parts } = courseIo.loadCourse(dir);
  assert.deepEqual(Object.keys(parts[0].level), ["id", "title", "subtitle", "status", "chapters"]);
  assert.match(courseIo.renderLevel(parts[0]), /Object\.assign\(\{"id":"A1","title":"Kroatisch A1","subtitle":"Grundlegende Alltagssituationen","status":"draft"\}, \{"chapters": \[/);
  parts[0].level.status = "complete";
  courseIo.writeLevel(parts[0], courseIo.levelFile(parts[0], dir));
  assert.equal(courseIo.loadCourse(dir).data.levels[0].status, "complete");
});

test("writeLevel verändert die übergebenen Daten nicht und gibt den Text zurück", t => {
  const dir = tmpDir(t);
  const { parts } = courseIo.loadCourse(FIXTURE("course-ok"));
  const snapshot = JSON.stringify(parts[1]);
  const file = path.join(dir, "a2.js");
  const text = courseIo.writeLevel(parts[1], file);
  assert.equal(JSON.stringify(parts[1]), snapshot);
  assert.equal(fs.readFileSync(file, "utf8"), text);
});

test("renderLevel: Kapitelfelder nach lessons bleiben hinter der Lektionsliste", () => {
  const { parts } = courseIo.loadCourse(FIXTURE("course-ok"));
  const text = courseIo.renderLevel(parts[0]);
  assert.match(text, /\n\], "level": "A1", "number": 1, "testId": "a1-1-test"\}\n\]\}\),\n"tests": \[\n/);
});
