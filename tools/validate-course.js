#!/usr/bin/env node
// Prüft course-data.js auf Schema-Konsistenz: eindeutige IDs, lückenlose Nummerierung,
// Verknüpfungen zwischen levels[].chapters[].lessons und dem flachen lessons-Array.
// Aufruf: node tools/validate-course.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "..", "course-data.js");
const src = fs.readFileSync(file, "utf8");
const sandbox = { window: {} };
vm.runInNewContext(src, sandbox, { filename: "course-data.js" });
const D = sandbox.window.KORAK_DATA;

const errors = [];
const warn = [];
const err = m => errors.push(m);

// Muss reines JSON sein (kein JS-Ausdruck), damit der Roundtrip exakt bleibt.
const m = src.match(/^window\.KORAK_DATA=([\s\S]*);\s*$/);
if (!m) err("Datei hat nicht die Form window.KORAK_DATA={...};");
else { try { JSON.parse(m[1]); } catch (e) { err("Kein valides JSON: " + e.message); } }

const LESSON_KEYS = "title,description,items,grammar,dialogue,id,level,chapterId,chapterTitle,icon,number,isTest";
const TEST_KEYS = "id,level,chapterId,chapterTitle,icon,number,isTest,title,description,grammar,dialogue,items";
const CHAPTER_KEYS = "id,icon,title,description,lessons,level,number,testId";

const lessonIds = new Set();
D.lessons.forEach(l => { if (lessonIds.has(l.id)) err("Doppelte Lektions-ID: " + l.id); lessonIds.add(l.id); });
const chapterIds = new Set();
const byId = Object.fromEntries(D.lessons.map(l => [l.id, l]));

let expectedFlat = [];
D.levels.forEach(level => {
  if (!/^[A-C][12]$/.test(level.id)) err("Unerwartete Level-ID " + level.id);
  let num = 0;
  level.chapters.forEach((c, ci) => {
    const pre = `${level.id}/${c.id}`;
    if (Object.keys(c).join(",") !== CHAPTER_KEYS) err(`${pre}: Kapitel-Schlüssel ${Object.keys(c)}`);
    if (chapterIds.has(c.id)) err("Doppelte Kapitel-ID: " + c.id);
    chapterIds.add(c.id);
    if (c.level !== level.id) err(`${pre}: level ${c.level}`);
    if (c.number !== ci + 1) err(`${pre}: number ${c.number} statt ${ci + 1}`);
    const lv = level.id.toLowerCase();
    if (c.testId !== `${lv}-${ci + 1}-test`) err(`${pre}: testId ${c.testId}`);
    c.lessons.forEach((l, li) => {
      num++;
      const id = `${lv}-${ci + 1}-${li + 1}`;
      const flat = byId[l.id];
      if (l.id !== id) err(`${pre}: Lektions-ID ${l.id} statt ${id}`);
      if (!flat) { err(`${pre}: ${l.id} fehlt im lessons-Array`); return; }
      if (JSON.stringify(flat) !== JSON.stringify(l)) err(`${l.id}: Kapitel- und Flach-Kopie weichen ab`);
      if (Object.keys(l).join(",") !== LESSON_KEYS) err(`${l.id}: Schlüssel ${Object.keys(l)}`);
      if (l.number !== num) err(`${l.id}: number ${l.number} statt ${num}`);
      if (l.level !== level.id || l.chapterId !== c.id || l.chapterTitle !== c.title || l.icon !== c.icon || l.isTest !== false) err(`${l.id}: Verknüpfungsfelder falsch`);
      if (!l.items.length) err(`${l.id}: keine items`);
      const seen = new Set();
      l.items.forEach((it, i) => {
        if (Object.keys(it).join(",") !== "hr,de") err(`${l.id}[${i}]: item-Schlüssel ${Object.keys(it)}`);
        if (!it.hr || !it.de || it.hr !== it.hr.trim() || it.de !== it.de.trim()) err(`${l.id}[${i}]: leerer/ungetrimmter Eintrag`);
        if (seen.has(it.hr)) err(`${l.id}: doppeltes item ${it.hr}`);
        seen.add(it.hr);
      });
      if (!Array.isArray(l.dialogue) || l.dialogue.length < 2) warn.push(`${l.id}: Dialog kürzer als 2 Zeilen`);
      else l.dialogue.forEach(d => { if (!Array.isArray(d) || d.length !== 2) err(`${l.id}: Dialogzeile ungültig`); });
      if (typeof l.grammar !== "string" || !l.grammar) err(`${l.id}: grammar fehlt`);
      expectedFlat.push(l.id);
    });
    num++;
    const t = byId[c.testId];
    if (!t) err(`${pre}: Test ${c.testId} fehlt`);
    else {
      if (Object.keys(t).join(",") !== TEST_KEYS) err(`${t.id}: Test-Schlüssel ${Object.keys(t)}`);
      if (t.number !== num) err(`${t.id}: number ${t.number} statt ${num}`);
      if (!t.isTest || t.level !== level.id || t.chapterId !== c.id || t.chapterTitle !== c.title) err(`${t.id}: Verknüpfungsfelder falsch`);
      if (t.title !== "Kapiteltest: " + c.title) err(`${t.id}: Titel ${t.title}`);
    }
    expectedFlat.push(c.testId);
  });
});
if (expectedFlat.join() !== D.lessons.map(l => l.id).join()) err("Reihenfolge des lessons-Arrays passt nicht zu levels/chapters");

// Gleiche kroatische Einträge mit unterschiedlicher Übersetzung sind erlaubt, aber sichtbar machen.
const hrMap = {};
D.lessons.forEach(l => l.items.forEach(it => { (hrMap[it.hr] = hrMap[it.hr] || new Set()).add(it.de); }));
Object.entries(hrMap).filter(([, s]) => s.size > 1).forEach(([hr, s]) => warn.push(`„${hr}“ hat mehrere Übersetzungen: ${[...s].join(" | ")}`));

const count = D.levels.map(l => `${l.id}: ${l.chapters.length} Kapitel, ${D.lessons.filter(x => x.level === l.id).length} Lektionen`).join("; ");
console.log(count);
console.log("Gesamt:", D.lessons.length, "Lektionen,", D.lessons.reduce((n, l) => n + l.items.length, 0), "Vokabeln/Sätze");
warn.forEach(w => console.log("Hinweis:", w));
if (errors.length) { errors.forEach(e => console.error("FEHLER:", e)); process.exit(1); }
console.log("OK – course-data.js ist konsistent.");
