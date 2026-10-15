#!/usr/bin/env node
/* Korak – prüft die Kursdaten (course/a1.js, a2.js, b1.js + course-data.js).
 *
 *   node scripts/validate-course.js                       Struktur, Item-Felder, IDs, Querverweise prüfen
 *   node scripts/validate-course.js --strict a1-hrana,a1-kupovina
 *                                                         diese Kapitel zusätzlich streng nach Level-Vorlage prüfen
 *   node scripts/validate-course.js --compare alt.js      mit einem alten window.KORAK_DATA vergleichen
 *   node scripts/validate-course.js --dir tests/fixtures/course-ok
 *                                                         einen anderen Ordner prüfen (gleiche Struktur wie die
 *                                                         Projektwurzel; culture-data.js und exercise-data.js optional)
 *
 * Regeln (Fehler = Exit-Code 1, Warnungen ändern ihn nicht; falsche Aufrufe = Exit-Code 2):
 *  - Struktur: Pflichtfelder, Verknüpfungen Level/Kapitel/Lektion/Test, flache Lektionsliste, doppelte Items.
 *  - IDs: Lektionen ^(a1|a2|b1|b2)-\d+-\d+$, alle Lektionen eines Kapitels teilen das Präfix <level>-<k>,
 *    Test = <präfix>-test; `number` zählt je Level lückenlos. (ID = Position gilt nicht mehr, damit verschobene
 *    Kapitel ihre IDs behalten.)
 *  - Items mit `pos`: pos, category, concepts, gender (nur Nomen), forms – siehe checkAnnotation().
 *  - Vorlage (5 Lektionen + Test, ≥ 12 annotierte Items, Dialog ≥ 4 Zeilen, grammar, fact, Formen) gilt für Kapitel
 *    in Levels mit status "complete" (genau 12 Kapitel) und für alle Kapitel aus --strict. In Levels mit status
 *    "draft" ist die Vorlage nur eine Warnung.
 *  - Querverweise: `at` in exercise-data.js und Schlüssel in culture-data.js müssen existieren.
 *  - --compare: jede alte Lektion existiert (direkt oder über LESSON_MAP aus engine/migrate.js), alte Items stehen
 *    an gleicher Position mit gleichem hr/de, alte Dialogzeilen bleiben der Anfang des neuen Dialogs.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const { CONCEPTS, POS, CATEGORIES, CASES, autoConcepts } = require("../engine/concepts.js");
const courseIo = require("./course-io.js");

const LEVEL_IDS = ["A1", "A2", "B1"];
const STATUSES = ["complete", "draft"];
const STATUS_LABEL = { complete: "komplett", draft: "Entwurf" };
const GENDERS = ["m", "f", "n"];
const LESSON_ID = /^(a1|a2|b1|b2)-(\d+)-(\d+)$/;
const TEST_ID = /^(a1|a2|b1|b2)-(\d+)-test$/;
const TEMPLATE = { chapters: 12, lessons: 5, items: 12, dialogue: 4, formsItems: 3, forms: 4 };
const MIGRATE_FILE = path.join(__dirname, "..", "engine", "migrate.js");

const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const isStr = v => typeof v === "string" && v.trim() !== "";
const isDialogueLine = d => Array.isArray(d) && d.length === 2 && isStr(d[0]) && isStr(d[1]);

// ---------- Item-Annotation ----------

// Prüft die Annotationsfelder eines Items. Gilt für jedes Item mit `pos`; Felder ohne `pos` sind ein Fehler.
function checkAnnotation(it, where, err) {
  if (it.pos === undefined) {
    if (["category", "gender", "forms", "concepts"].some(k => it[k] !== undefined)) err(`${where}: Annotation unvollständig: pos fehlt`);
    return;
  }
  if (!POS.includes(it.pos)) err(`${where}: pos „${it.pos}“ ist keine gültige Wortart`);

  if (it.category === undefined) err(`${where}: category fehlt`);
  else if (!CATEGORIES.includes(it.category)) err(`${where}: category „${it.category}“ ist keine gültige Kategorie`);

  if (!Array.isArray(it.concepts) || !it.concepts.length) err(`${where}: concepts fehlt oder ist leer`);
  else {
    it.concepts.forEach(c => { if (typeof c !== "string" || !has(CONCEPTS, c)) err(`${where}: unbekanntes Konzept „${c}“`); });
    autoConcepts(it.hr).forEach(c => { if (!it.concepts.includes(c)) err(`${where}: Konzept „${c}“ fehlt (ergibt sich aus der Schreibweise)`); });
  }

  if (it.pos === "noun") {
    if (it.gender === undefined) err(`${where}: gender fehlt (Nomen brauchen m, f oder n)`);
    else if (!GENDERS.includes(it.gender)) err(`${where}: gender „${it.gender}“ ist ungültig (m, f oder n)`);
  } else if (it.gender !== undefined) err(`${where}: gender nur bei Nomen erlaubt`);

  if (it.forms !== undefined) {
    const f = it.forms;
    if (f === null || typeof f !== "object" || Array.isArray(f)) err(`${where}: forms ist kein Objekt`);
    else {
      Object.keys(f).forEach(k => {
        if (!CASES.includes(k)) err(`${where}: forms: unbekannter Fall „${k}“`);
        else if (!isStr(f[k])) err(`${where}: forms.${k} ist leer`);
      });
      if (!has(f, "nom")) err(`${where}: forms: nom fehlt`);
    }
  }
}

// Ein Item zählt für die Vorlage, wenn forms mindestens 4 Fälle mit nicht leerem Wert enthält.
function hasRichForms(it) {
  if (!it || !it.forms || typeof it.forms !== "object" || Array.isArray(it.forms)) return false;
  return CASES.filter(k => isStr(it.forms[k])).length >= TEMPLATE.forms;
}

// ---------- Level-Vorlage ----------

// Verstöße eines Kapitels gegen die Level-Vorlage: [{kind, text, n}] (n = Zahl der betroffenen Dinge).
// Was schon als Strukturfehler gemeldet wird (grammar, ungültige Dialogzeilen, kaputtes fact), steht hier nicht doppelt.
function templateIssues(chapter) {
  const issues = [];
  const add = (kind, text, n = 1) => issues.push({ kind, text, n });
  const lessons = Array.isArray(chapter.lessons) ? chapter.lessons : [];
  if (lessons.length !== TEMPLATE.lessons) add("lessons", `Kapitel hat ${lessons.length} Lektionen statt ${TEMPLATE.lessons}`);
  lessons.forEach(l => {
    const items = Array.isArray(l.items) ? l.items : [];
    if (items.length < TEMPLATE.items) add("items", `${l.id}: ${items.length} Items (mindestens ${TEMPLATE.items})`);
    const unannotated = items.filter(it => !it || it.pos === undefined).length;
    if (unannotated) add("annotation", `${l.id}: ${unannotated} Items ohne Annotation (pos fehlt)`, unannotated);
    const lines = (Array.isArray(l.dialogue) ? l.dialogue : []).filter(isDialogueLine).length;
    if (lines < TEMPLATE.dialogue) add("dialogue", `${l.id}: Dialog hat ${lines} Zeilen (mindestens ${TEMPLATE.dialogue})`);
    if (l.fact === undefined) add("fact", `${l.id}: „Wusstest du?“ (fact mit title und text) fehlt`);
  });
  const rich = lessons.reduce((s, l) => s + (Array.isArray(l.items) ? l.items.filter(hasRichForms).length : 0), 0);
  if (rich < TEMPLATE.formsItems) add("forms", `Kapitel: nur ${rich} Items mit forms aus mindestens ${TEMPLATE.forms} Formen (mindestens ${TEMPLATE.formsItems})`);
  return issues;
}

const WARNING_LABEL = {
  lessons: () => `Lektionszahl ≠ ${TEMPLATE.lessons}`,
  items: n => `${n}× Lektion mit weniger als ${TEMPLATE.items} Items`,
  annotation: n => `${n}× Item ohne Annotation`,
  dialogue: n => `${n}× Lektion mit Dialog unter ${TEMPLATE.dialogue} Zeilen`,
  fact: n => `${n}× Lektion ohne „Wusstest du?“`,
  forms: () => `zu wenige Items mit forms`
};

function summarize(issues) {
  const sums = new Map();
  issues.forEach(i => sums.set(i.kind, (sums.get(i.kind) || 0) + i.n));
  return [...sums].map(([kind, n]) => WARNING_LABEL[kind](n)).join(", ");
}

// ---------- Vergleich mit altem Stand ----------

// "a2-13-4" → "b1-4-4" bei lessonMap {"a2-13": "b1-4"}; ohne passendes Präfix bleibt die ID.
function mapLessonId(id, lessonMap) {
  const m = /^([^-]+-\d+)-(.+)$/.exec(String(id));
  return m && has(lessonMap, m[1]) ? `${lessonMap[m[1]]}-${m[2]}` : String(id);
}

// Vergleicht den alten Stand ({levels, lessons}) mit dem neuen. Gibt {errors, stats} zurück.
function compareCourse(oldData, newData, opts = {}) {
  const lessonMap = opts.lessonMap || {};
  const errors = [], stats = { lessons: 0, items: 0, dialogueLines: 0 };
  if (!oldData || !Array.isArray(oldData.lessons)) {
    errors.push("Der Vergleichsstand enthält keine gültigen Kursdaten (erwartet window.KORAK_DATA = {levels, lessons})");
    return { errors, stats };
  }
  const byId = new Map(newData.lessons.map(l => [l.id, l]));
  oldData.lessons.forEach(old => {
    const id = mapLessonId(old.id, lessonMap);
    const label = id === old.id ? old.id : `${old.id} → ${id}`;
    const now = byId.get(id);
    if (!now) return errors.push(`Alte Lektion „${old.id}“ fehlt${id === old.id ? "" : ` (erwartet als „${id}“)`}`);
    stats.lessons++;
    const newItems = now.items || [];
    (old.items || []).forEach((it, k) => {
      const cur = newItems[k];
      if (!cur) errors.push(`${label}: Item ${k + 1} fehlt (alt „${it.hr}“)`);
      else if (cur.hr !== it.hr || cur.de !== it.de) errors.push(`${label}: Item ${k + 1} geändert: alt „${it.hr}“ / „${it.de}“, neu „${cur.hr}“ / „${cur.de}“`);
      else stats.items++;
    });
    const newLines = now.dialogue || [];
    (old.dialogue || []).forEach((line, k) => {
      const cur = newLines[k];
      if (!cur) errors.push(`${label}: Dialogzeile ${k + 1} fehlt`);
      else if (cur[0] !== line[0] || cur[1] !== line[1]) errors.push(`${label}: Dialogzeile ${k + 1} geändert`);
      else stats.dialogueLines++;
    });
  });
  return { errors, stats };
}

// LESSON_MAP aus engine/migrate.js (kommt mit Task 3); ohne die Datei keine Abbildung.
function loadLessonMap(file = MIGRATE_FILE) {
  if (!fs.existsSync(file)) return {};
  delete require.cache[require.resolve(file)];
  const mod = require(file);
  return mod && mod.LESSON_MAP && typeof mod.LESSON_MAP === "object" ? mod.LESSON_MAP : {};
}

// ---------- Prüfung ----------

// opts: { dir, strict: [Kapitel-IDs], compare: Datei, lessonMap }. Gibt {errors, warnings, lines} zurück.
function validate(opts = {}) {
  const dir = opts.dir ? path.resolve(opts.dir) : courseIo.ROOT;
  const strictIds = new Set(opts.strict || []);
  const errors = [], warnings = [], lines = [];
  const err = m => errors.push(m);
  // Vorlagen-Warnungen: Kapitel mit gleichem Befund eines Levels stehen in einer Zeile.
  const templateWarnings = new Map();

  let course;
  try { course = courseIo.loadCourse(dir); } catch (e) {
    return { errors: ["Kursdaten lassen sich nicht laden: " + e.message], warnings, lines };
  }
  const D = course.data, parts = course.parts;

  // ---------- Bausteine je Level ----------
  if (parts.length !== LEVEL_IDS.length) err(`Erwartet ${LEVEL_IDS.length} Level-Dateien, gefunden ${parts.length}`);
  const partIds = parts.map(p => p.level && p.level.id);
  LEVEL_IDS.forEach(id => { if (!partIds.includes(id)) err(`Level-Datei für ${id} fehlt`); });
  partIds.forEach((id, i) => { if (partIds.indexOf(id) !== i) err(`Level ${id} ist doppelt vorhanden`); });

  // ---------- Struktur ----------
  const need = (obj, keys, where) => keys.forEach(k => { if (!(k in obj)) err(`${where}: Feld „${k}“ fehlt`); });
  const LEVEL_KEYS = ["id", "title", "subtitle", "status", "chapters"];
  const CHAPTER_KEYS = ["id", "icon", "title", "description", "lessons", "level", "number", "testId"];
  const LESSON_KEYS = ["title", "description", "items", "grammar", "dialogue", "id", "level", "chapterId", "chapterTitle", "icon", "number", "isTest"];
  const TEST_KEYS = ["id", "level", "chapterId", "chapterTitle", "icon", "number", "isTest", "title", "description", "grammar", "dialogue", "items"];

  const seenIds = new Map(), dupIds = new Set();
  const unique = (id, what) => {
    if (typeof id !== "string" || !id) return err(`${what} ohne gültige ID`);
    if (seenIds.has(id)) { dupIds.add(id); err(`Doppelte ID „${id}“ (${what} und ${seenIds.get(id)})`); }
    else seenIds.set(id, what);
  };

  const expectedFlat = [], chapterIds = new Set();
  let annotated = 0;
  D.levels.forEach((level, li) => {
    need(level, LEVEL_KEYS, `Level ${level.id || li}`);
    if (level.id !== LEVEL_IDS[li]) err(`Level an Position ${li + 1} ist ${level.id}, erwartet ${LEVEL_IDS[li]}`);
    unique(level.id, "Level");
    if ("status" in level && !STATUSES.includes(level.status)) err(`${level.id}: status „${level.status}“ ist ungültig (complete oder draft)`);
    if (!Array.isArray(level.chapters) || !level.chapters.length) return err(`${level.id}: keine Kapitel`);
    const complete = level.status === "complete";
    if (complete && level.chapters.length !== TEMPLATE.chapters)
      err(`${level.id}: Status „complete“ verlangt ${TEMPLATE.chapters} Kapitel, gefunden ${level.chapters.length}`);
    const lv = String(level.id).toLowerCase();
    const prefixOwner = new Map();
    let num = 0;
    level.chapters.forEach((c, ci) => {
      const where = `${level.id}/${c.id || "Kapitel " + (ci + 1)}`;
      need(c, CHAPTER_KEYS, where);
      unique(c.id, "Kapitel " + where);
      chapterIds.add(c.id);
      if (c.level !== level.id) err(`${where}: level ist ${c.level}`);
      if (c.number !== ci + 1) err(`${where}: number ${c.number} statt ${ci + 1}`);
      if (!c.title || !c.description) err(`${where}: Titel oder Beschreibung leer`);
      if (!Array.isArray(c.lessons) || !c.lessons.length) { err(`${where}: keine Lektionen`); num++; expectedFlat.push(c.testId); return; }

      // Präfix <level>-<k> des Kapitels: aus der ersten passenden Lektions-ID, nicht aus der Position.
      let prefix = null;
      for (const l of c.lessons) {
        const m = LESSON_ID.exec(l && l.id);
        if (m && m[1] === lv) { prefix = `${m[1]}-${m[2]}`; break; }
      }
      if (prefix) {
        if (prefixOwner.has(prefix)) err(`${where}: Präfix „${prefix}“ wird schon von Kapitel „${prefixOwner.get(prefix)}“ benutzt`);
        else prefixOwner.set(prefix, c.id);
        if (c.testId !== `${prefix}-test`) err(`${where}: testId „${c.testId}“ statt „${prefix}-test“`);
      } else if (typeof c.testId !== "string" || !TEST_ID.test(c.testId)) err(`${where}: testId „${c.testId}“ passt nicht zum Muster`);

      c.lessons.forEach((l, i) => {
        num++;
        const at = l.id || `${where}/#${i + 1}`;
        need(l, LESSON_KEYS, at);
        unique(l.id, "Lektion " + where);
        const m = LESSON_ID.exec(l.id);
        if (typeof l.id === "string" && l.id) {
          if (!m) err(`${at}: ID „${l.id}“ passt nicht zum Muster <level>-<kapitel>-<nr>`);
          else if (m[1] !== lv) err(`${at}: ID gehört nicht zu Level ${level.id}`);
          else if (prefix && `${m[1]}-${m[2]}` !== prefix) err(`${at}: Präfix „${m[1]}-${m[2]}“ statt „${prefix}“`);
        }
        if (l.number !== num) err(`${at}: number ${l.number} statt ${num}`);
        if (l.level !== level.id || l.chapterId !== c.id || l.chapterTitle !== c.title || l.icon !== c.icon || l.isTest !== false)
          err(`${at}: Verknüpfung zu Level/Kapitel stimmt nicht`);
        if (!l.title) err(`${at}: Titel leer`);
        if (!isStr(l.grammar)) err(`${at}: grammar fehlt`);
        if (!Array.isArray(l.items) || !l.items.length) err(`${at}: keine Vokabeln/Sätze (items)`);
        else {
          const hr = new Set();
          l.items.forEach((it, k) => {
            if (!it || typeof it.hr !== "string" || typeof it.de !== "string" || !it.hr.trim() || !it.de.trim()) return err(`${at} item ${k + 1}: hr/de fehlt`);
            if (it.hr !== it.hr.trim() || it.de !== it.de.trim()) err(`${at} item ${k + 1}: Leerzeichen am Rand`);
            if (hr.has(it.hr)) err(`${at}: doppeltes item „${it.hr}“`);
            hr.add(it.hr);
            if (it.pos !== undefined) annotated++;
            checkAnnotation(it, `${at} item ${k + 1} („${it.hr}“)`, err);
          });
        }
        if (!Array.isArray(l.dialogue)) err(`${at}: dialogue ist keine Liste`);
        else l.dialogue.forEach((d, k) => { if (!isDialogueLine(d)) err(`${at}: Dialogzeile ${k + 1} ungültig (erwartet [Sprecher, Satz])`); });
        if (l.fact !== undefined) {
          if (l.fact === null || typeof l.fact !== "object" || Array.isArray(l.fact)) err(`${at}: fact ist kein Objekt {title, text}`);
          else ["title", "text"].forEach(k => { if (!isStr(l.fact[k])) err(`${at}: fact.${k} ist leer`); });
        }
        expectedFlat.push(l.id);
      });
      num++;
      expectedFlat.push(c.testId);

      // Level-Vorlage: Fehler in complete-Levels und bei --strict, sonst Warnung.
      const issues = templateIssues(c);
      if (complete || strictIds.has(c.id)) issues.forEach(i => err(`${where}: ${i.text}`));
      else if (issues.length) {
        const label = `Vorlage (${STATUS_LABEL[level.status] || "ohne Status"}): ${summarize(issues)}`, key = `${level.id}|${label}`;
        if (!templateWarnings.has(key)) templateWarnings.set(key, { level: level.id, label, ids: [] });
        templateWarnings.get(key).ids.push(c.id);
      }
    });
  });
  strictIds.forEach(id => { if (!chapterIds.has(id)) err(`--strict: Kapitel „${id}“ gibt es nicht`); });
  templateWarnings.forEach(w => {
    const shown = w.ids.slice(0, 3).join(", ") + (w.ids.length > 3 ? ` … (${w.ids.length} Kapitel)` : "");
    warnings.push(`${w.level}/${shown}: ${w.label}`);
  });

  // ---------- Flache Liste & Kapiteltests ----------
  const flatIds = D.lessons.map(l => l.id);
  if (JSON.stringify(flatIds) !== JSON.stringify(expectedFlat)) {
    const missing = expectedFlat.filter(id => !flatIds.includes(id)), extra = flatIds.filter(id => !expectedFlat.includes(id));
    err(`lessons-Liste passt nicht zur Kapitelstruktur${missing.length ? "; fehlt: " + missing.slice(0, 5).join(", ") : ""}${extra.length ? "; zu viel: " + extra.slice(0, 5).join(", ") : ""}`);
  }
  const byId = {};
  D.lessons.forEach(l => { if (byId[l.id]) err(`Doppelte Lektion in der flachen Liste: ${l.id}`); byId[l.id] = l; });
  D.levels.forEach(level => (level.chapters || []).forEach(c => {
    (c.lessons || []).forEach(l => {
      if (!dupIds.has(l.id) && byId[l.id] && JSON.stringify(byId[l.id]) !== JSON.stringify(l)) err(`${l.id}: Kapitel- und flache Fassung weichen ab`);
    });
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
  // Tests in einer Level-Datei, die zu keinem Kapitel gehören, würde course-data.js stillschweigend weglassen.
  parts.forEach(p => {
    const known = new Set(((p.level && p.level.chapters) || []).map(c => c.testId));
    (p.tests || []).forEach(t => { if (!known.has(t.id)) err(`${p.level.id}: Test „${t.id}“ gehört zu keinem Kapitel`); });
  });

  // ---------- Querverweise ----------
  const lessonIds = new Set(flatIds);
  const optional = file => {
    if (!fs.existsSync(path.join(dir, file))) return null;
    try { return courseIo.runScripts([file], dir); } catch (e) { err(`${file} lässt sich nicht laden: ${e.message}`); return null; }
  };
  const exercises = optional("exercise-data.js");
  if (exercises) {
    if (!Array.isArray(exercises.KORAK_EXERCISES)) err("exercise-data.js: window.KORAK_EXERCISES ist keine Liste");
    else exercises.KORAK_EXERCISES.forEach((ex, k) => {
      const name = ex && ex.id ? ex.id : `#${k + 1}`;
      if (!ex || typeof ex.at !== "string" || !ex.at) err(`exercise-data.js: Aufgabe „${name}“ hat kein at`);
      else if (!chapterIds.has(ex.at) && !lessonIds.has(ex.at)) err(`exercise-data.js: Aufgabe „${name}“ verweist auf „${ex.at}“, das es nicht gibt (weder Kapitel noch Lektion)`);
    });
  }
  const culture = optional("culture-data.js");
  if (culture) {
    const c = culture.KORAK_CULTURE;
    if (!c || typeof c !== "object") err("culture-data.js: window.KORAK_CULTURE fehlt");
    else {
      Object.keys(c.chapters || {}).forEach(id => { if (!chapterIds.has(id)) err(`culture-data.js: Kapitel „${id}“ gibt es nicht`); });
      Object.keys(c.lessons || {}).forEach(id => { if (!lessonIds.has(id)) err(`culture-data.js: Lektion „${id}“ gibt es nicht`); });
    }
  }

  // ---------- Vergleich mit altem Stand ----------
  if (opts.compare) {
    let old, loaded = true;
    try { old = courseIo.runScripts([path.resolve(opts.compare)], dir).KORAK_DATA; } catch (e) { loaded = false; err(`Vergleichsdatei nicht lesbar: ${e.message}`); }
    if (loaded) {
      const res = compareCourse(old, D, { lessonMap: opts.lessonMap || loadLessonMap() });
      res.errors.forEach(err);
      if (!res.errors.length)
        lines.push(`✔ Vergleich mit ${opts.compare}: ${res.stats.lessons} alte Lektionen, ${res.stats.items} Items und ${res.stats.dialogueLines} Dialogzeilen unverändert`);
    }
  }

  // ---------- Zusammenfassung ----------
  const items = D.lessons.reduce((s, l) => s + (l.items || []).length, 0);
  lines.unshift(
    D.levels.map(l => {
      const chapters = l.chapters || [];
      const label = STATUS_LABEL[l.status];
      return `${l.id}${label ? ` (${label})` : ""}: ${chapters.length} Kapitel, ${plural(chapters.reduce((s, c) => s + (c.lessons || []).length, 0), "Lektion", "Lektionen")}`;
    }).join(" · "),
    `Gesamt: ${D.lessons.length} Einträge (inkl. ${D.lessons.filter(l => l.isTest).length} Kapiteltests), ${items} Vokabeln/Sätze, davon ${annotated} annotiert`
  );
  return { errors, warnings, lines };
}

// ---------- Kommandozeile ----------

const USAGE = "Aufruf: node scripts/validate-course.js [--strict <kapitel-id,…>] [--compare <alt.js>] [--dir <ordner>]";

function parseArgs(argv) {
  const opts = { strict: [], dir: null, compare: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const value = () => {
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) throw new Error(`${a} braucht einen Wert`);
      return argv[++i];
    };
    if (a === "--compare") opts.compare = value();
    else if (a === "--dir") opts.dir = value();
    else if (a === "--strict") {
      const ids = value().split(",").map(s => s.trim()).filter(Boolean);
      if (!ids.length) throw new Error("--strict braucht mindestens eine Kapitel-ID");
      opts.strict.push(...ids);
    } else throw new Error(`Unbekannte Option: ${a}`);
  }
  return opts;
}

function main(argv) {
  let opts;
  try { opts = parseArgs(argv); } catch (e) {
    console.error("✘ " + e.message + "\n" + USAGE);
    return 2;
  }
  const res = validate(opts);
  res.lines.forEach(l => console.log(l));
  res.warnings.forEach(w => console.log("  ⚠ " + w));
  res.errors.forEach(e => console.log("  ✘ " + e));
  if (res.errors.length) { console.log(`${res.errors.length} Fehler.`); return 1; }
  console.log(`OK – keine Fehler${res.warnings.length ? `, ${res.warnings.length} Warnung(en)` : ""}.`);
  return 0;
}

if (require.main === module) process.exitCode = main(process.argv.slice(2));

module.exports = { validate, compareCourse, mapLessonId, loadLessonMap, checkAnnotation, templateIssues, TEMPLATE };
