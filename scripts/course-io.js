/* Korak – Kursdateien laden und schreiben.
 *
 *   const { loadCourse, writeLevel, levelFile } = require("./scripts/course-io.js");
 *   const { data, parts } = loadCourse();            // Projektwurzel, oder loadCourse("/pfad/zum/ordner")
 *   parts[0].level.chapters[0].lessons[0].items.push({ hr: "…", de: "…" });
 *   writeLevel(parts[0], levelFile(parts[0]));       // course/a1.js im bestehenden Format
 *
 * Alle Inhalts-Änderungen laufen über writeLevel: Das Format der Level-Dateien (Kopfkommentar,
 * eine Lektion pro Zeile) bleibt so erhalten, und bei unveränderten Daten entsteht eine
 * byte-identische Datei. Die Dateien werden in einer VM geladen (wie im Browser mit window).
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const LEVEL_FILES = ["course/a1.js", "course/a2.js", "course/b1.js"];
const COURSE_DATA_FILE = "course-data.js";

// Kopiert Daten aus der VM in den Hauptkontext (Arrays und Objekte), damit sie sich mit
// assert.deepStrictEqual, instanceof Array usw. normal verhalten. Gemeinsame Verweise bleiben
// gemeinsam (data.levels[i] ist weiterhin dasselbe Objekt wie parts[i].level).
function toHostRealm(value, seen = new Map()) {
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return seen.get(value);
  const out = Array.isArray(value) ? [] : {};
  seen.set(value, out);
  for (const k of Object.keys(value)) out[k] = toHostRealm(value[k], seen);
  return out;
}

// Führt Skriptdateien nacheinander in einer VM mit leerem `window` aus und gibt dieses window zurück
// (als normale Objekte). Relative Pfade gelten ab `dir`.
function runScripts(files, dir = ROOT) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) {
    const file = path.isAbsolute(f) ? f : path.join(dir, f);
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: f });
  }
  return toHostRealm(sandbox.window);
}

// Lädt course/a1.js, a2.js, b1.js und course-data.js. Gibt zurück:
//   data  = window.KORAK_DATA ({levels, lessons}) – so wie die App es sieht
//   parts = window.KORAK_COURSE ([{level, tests}] je Level-Datei) – das ist es, was writeLevel schreibt
// data.levels[i] und parts[i].level sind dasselbe Objekt; data.lessons sind (wie in der App) Kopien.
function loadCourse(dir = ROOT) {
  const win = runScripts([...LEVEL_FILES, COURSE_DATA_FILE], dir);
  const data = win.KORAK_DATA;
  if (!data || !Array.isArray(data.levels) || !Array.isArray(data.lessons)) {
    throw new Error("window.KORAK_DATA hat nicht die Form {levels, lessons}");
  }
  return { data, parts: win.KORAK_COURSE || [] };
}

// Pfad der Level-Datei zu einem part, z. B. <dir>/course/a1.js.
function levelFile(part, dir = ROOT) {
  return path.join(dir, "course", part.level.id.toLowerCase() + ".js");
}

const J = JSON.stringify;

// Der Text einer Level-Datei im bestehenden Format.
function renderLevel(part) {
  const level = part.level;
  const chapters = level.chapters || [];
  // Kopfobjekt = alle Level-Felder außer chapters, in Objektreihenfolge (id, title, subtitle, status, …).
  const head = {};
  Object.keys(level).forEach(k => { if (k !== "chapters") head[k] = level[k]; });

  const chapterTexts = chapters.map(c => {
    const keys = Object.keys(c);
    const at = keys.indexOf("lessons");
    if (at < 0) throw new Error(`Kapitel ${c.id}: Feld „lessons“ fehlt`);
    const field = k => `${J(k)}: ${J(c[k])}`;
    const before = keys.slice(0, at).map(field).join(", ");
    const after = keys.slice(at + 1).map(field).join(", ");
    const lessons = c.lessons.map(l => "  " + J(l)).join(",\n");
    return `{${before ? before + ", " : ""}"lessons": [\n${lessons ? lessons + "\n" : ""}]${after ? ", " + after : ""}}`;
  });
  const tests = (part.tests || []).map(t => "  " + J(t)).join(",\n");

  return [
    `/* Korak – Kursdaten ${level.id}: ${level.title} (${chapters.length} Kapitel).`,
    ` * Wird von course-data.js zu window.KORAK_DATA zusammengesetzt. Prüfen: node scripts/validate-course.js */`,
    `(window.KORAK_COURSE = window.KORAK_COURSE || []).push({`,
    `"level": Object.assign(${J(head)}, {"chapters": [`,
    ...(chapterTexts.length ? [chapterTexts.join(",\n")] : []),
    `]}),`,
    `"tests": [`,
    ...(tests ? [tests] : []),
    `]`,
    `});`,
    ``
  ].join("\n");
}

// Schreibt die Level-Datei eines parts nach `file` und gibt den geschriebenen Text zurück.
function writeLevel(part, file) {
  const text = renderLevel(part);
  fs.writeFileSync(file, text, "utf8");
  return text;
}

module.exports = { ROOT, LEVEL_FILES, COURSE_DATA_FILE, runScripts, loadCourse, levelFile, renderLevel, writeLevel };
