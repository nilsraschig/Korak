#!/usr/bin/env node
/* Korak – prüft die Kursdaten (course/a1.js, a2.js, b1.js + course-data.js).
 *
 *   node scripts/validate-course.js            Struktur prüfen
 *   node scripts/validate-course.js --compare alt.js
 *                                              zusätzlich mit einem alten window.KORAK_DATA vergleichen
 *
 * Meldet doppelte IDs, fehlende Felder, falsche Nummerierung und kaputte Verknüpfungen.
 * Exit-Code 1 bei Fehlern, Warnungen ändern den Exit-Code nicht.
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const FILES = ["course/a1.js", "course/a2.js", "course/b1.js", "course-data.js"];
const LEVEL_IDS = ["A1", "A2", "B1"];

const errors = [], warnings = [];
const err = m => errors.push(m), warn = m => warnings.push(m);

function load(files) {
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  for (const f of files) {
    const file = path.isAbsolute(f) ? f : path.join(ROOT, f);
    vm.runInContext(fs.readFileSync(file, "utf8"), sandbox, { filename: f });
  }
  return sandbox.window;
}

let win;
try { win = load(FILES); } catch (e) { console.error("✘ Kursdaten lassen sich nicht laden: " + e.message); process.exit(1); }
const D = win.KORAK_DATA;
if (!D || !Array.isArray(D.levels) || !Array.isArray(D.lessons)) { console.error("✘ window.KORAK_DATA hat nicht die Form {levels, lessons}"); process.exit(1); }

// ---------- Bausteine je Level ----------
const parts = win.KORAK_COURSE || [];
if (parts.length !== LEVEL_IDS.length) err(`Erwartet ${LEVEL_IDS.length} Level-Dateien, gefunden ${parts.length}`);
const partIds = parts.map(p => p.level && p.level.id);
LEVEL_IDS.forEach(id => { if (!partIds.includes(id)) err(`Level-Datei für ${id} fehlt`); });
partIds.forEach((id, i) => { if (partIds.indexOf(id) !== i) err(`Level ${id} ist doppelt vorhanden`); });

// ---------- Struktur ----------
const need = (obj, keys, where) => keys.forEach(k => { if (!(k in obj)) err(`${where}: Feld „${k}“ fehlt`); });
const LEVEL_KEYS = ["id", "title", "subtitle", "chapters"];
const CHAPTER_KEYS = ["id", "icon", "title", "description", "lessons", "level", "number", "testId"];
const LESSON_KEYS = ["title", "description", "items", "grammar", "dialogue", "id", "level", "chapterId", "chapterTitle", "icon", "number", "isTest"];
const TEST_KEYS = ["id", "level", "chapterId", "chapterTitle", "icon", "number", "isTest", "title", "description", "grammar", "dialogue", "items"];

const seenIds = new Map();
const unique = (id, what) => {
  if (typeof id !== "string" || !id) return err(`${what} ohne gültige ID`);
  if (seenIds.has(id)) err(`Doppelte ID „${id}“ (${what} und ${seenIds.get(id)})`);
  else seenIds.set(id, what);
};

const expectedFlat = [];
D.levels.forEach((level, li) => {
  need(level, LEVEL_KEYS, `Level ${level.id || li}`);
  if (level.id !== LEVEL_IDS[li]) err(`Level an Position ${li + 1} ist ${level.id}, erwartet ${LEVEL_IDS[li]}`);
  unique(level.id, "Level");
  if (!Array.isArray(level.chapters) || !level.chapters.length) return err(`${level.id}: keine Kapitel`);
  const lv = level.id.toLowerCase();
  let num = 0;
  level.chapters.forEach((c, ci) => {
    const where = `${level.id}/${c.id || "Kapitel " + (ci + 1)}`;
    need(c, CHAPTER_KEYS, where);
    unique(c.id, "Kapitel " + where);
    if (c.level !== level.id) err(`${where}: level ist ${c.level}`);
    if (c.number !== ci + 1) err(`${where}: number ${c.number} statt ${ci + 1}`);
    if (c.testId !== `${lv}-${ci + 1}-test`) err(`${where}: testId ${c.testId} statt ${lv}-${ci + 1}-test`);
    if (!c.title || !c.description) err(`${where}: Titel oder Beschreibung leer`);
    if (!Array.isArray(c.lessons) || !c.lessons.length) return err(`${where}: keine Lektionen`);
    c.lessons.forEach((l, i) => {
      num++;
      const id = `${lv}-${ci + 1}-${i + 1}`;
      const at = l.id || `${where}/#${i + 1}`;
      need(l, LESSON_KEYS, at);
      unique(l.id, "Lektion");
      if (l.id !== id) err(`${at}: ID sollte ${id} sein`);
      if (l.number !== num) err(`${at}: number ${l.number} statt ${num}`);
      if (l.level !== level.id || l.chapterId !== c.id || l.chapterTitle !== c.title || l.icon !== c.icon || l.isTest !== false)
        err(`${at}: Verknüpfung zu Level/Kapitel stimmt nicht`);
      if (!l.title) err(`${at}: Titel leer`);
      if (typeof l.grammar !== "string" || !l.grammar) err(`${at}: grammar fehlt`);
      if (!Array.isArray(l.items) || !l.items.length) err(`${at}: keine Vokabeln/Sätze (items)`);
      else {
        const hr = new Set();
        l.items.forEach((it, k) => {
          if (!it || typeof it.hr !== "string" || typeof it.de !== "string" || !it.hr.trim() || !it.de.trim()) err(`${at} item ${k + 1}: hr/de fehlt`);
          else {
            if (it.hr !== it.hr.trim() || it.de !== it.de.trim()) err(`${at} item ${k + 1}: Leerzeichen am Rand`);
            if (hr.has(it.hr)) err(`${at}: doppeltes item „${it.hr}“`);
            hr.add(it.hr);
          }
        });
      }
      if (!Array.isArray(l.dialogue)) err(`${at}: dialogue ist keine Liste`);
      else if (l.dialogue.length < 2) warn(`${at}: Dialog kürzer als 2 Zeilen`);
      else l.dialogue.forEach((d, k) => { if (!Array.isArray(d) || d.length !== 2 || !d[0] || !d[1]) err(`${at}: Dialogzeile ${k + 1} ungültig`); });
      expectedFlat.push(l.id);
    });
    num++;
    expectedFlat.push(c.testId);
  });
});

// ---------- Flache Liste & Kapiteltests ----------
const flatIds = D.lessons.map(l => l.id);
if (JSON.stringify(flatIds) !== JSON.stringify(expectedFlat)) {
  const missing = expectedFlat.filter(id => !flatIds.includes(id)), extra = flatIds.filter(id => !expectedFlat.includes(id));
  err(`lessons-Liste passt nicht zur Kapitelstruktur${missing.length ? "; fehlt: " + missing.slice(0, 5).join(", ") : ""}${extra.length ? "; zu viel: " + extra.slice(0, 5).join(", ") : ""}`);
}
const byId = {};
D.lessons.forEach(l => { if (byId[l.id]) err(`Doppelte Lektion in der flachen Liste: ${l.id}`); byId[l.id] = l; });
D.levels.forEach(level => level.chapters.forEach(c => {
  (c.lessons || []).forEach(l => { if (byId[l.id] && JSON.stringify(byId[l.id]) !== JSON.stringify(l)) err(`${l.id}: Kapitel- und flache Fassung weichen ab`); });
  const t = byId[c.testId];
  if (!t) return err(`${c.id}: Kapiteltest ${c.testId} fehlt`);
  unique(t.id, "Kapiteltest");
  need(t, TEST_KEYS, t.id);
  const num = (c.lessons || []).length ? c.lessons[c.lessons.length - 1].number + 1 : null;
  if (t.isTest !== true) err(`${t.id}: isTest ist nicht true`);
  if (num !== null && t.number !== num) err(`${t.id}: number ${t.number} statt ${num}`);
  if (t.level !== level.id || t.chapterId !== c.id || t.chapterTitle !== c.title) err(`${t.id}: Verknüpfung zu Level/Kapitel stimmt nicht`);
  if (t.title !== "Kapiteltest: " + c.title) err(`${t.id}: Titel „${t.title}“`);
}));

// ---------- Vergleich mit altem Stand ----------
const ci = process.argv.indexOf("--compare");
if (ci > 0) {
  const oldFile = process.argv[ci + 1];
  try {
    const old = load([path.resolve(oldFile)]).KORAK_DATA;
    if (JSON.stringify(old) === JSON.stringify(D)) console.log(`✔ Inhalt identisch mit ${oldFile}`);
    else err(`Inhalt weicht von ${oldFile} ab`);
  } catch (e) { err(`Vergleichsdatei nicht lesbar: ${e.message}`); }
}

// ---------- Ergebnis ----------
const items = D.lessons.reduce((s, l) => s + l.items.length, 0);
console.log(D.levels.map(l => `${l.id}: ${l.chapters.length} Kapitel, ${l.chapters.reduce((s, c) => s + c.lessons.length, 0)} Lektionen`).join(" · "));
console.log(`Gesamt: ${D.lessons.length} Einträge (inkl. ${D.lessons.filter(l => l.isTest).length} Kapiteltests), ${items} Vokabeln/Sätze`);
warnings.forEach(w => console.log("  ⚠ " + w));
errors.forEach(e => console.log("  ✘ " + e));
if (errors.length) { console.log(`${errors.length} Fehler.`); process.exit(1); }
console.log(`OK – keine Fehler${warnings.length ? `, ${warnings.length} Warnung(en)` : ""}.`);
