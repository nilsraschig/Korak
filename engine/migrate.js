// Korak Lern-Engine – Migration gespeicherter Fortschritte nach der Verschiebung von Kapiteln.
// A2-Kapitel 13–18 (Hausarzt … Amt) sind B1-Kapitel 1–6 geworden und haben neue, nie zuvor benutzte
// Lektions-IDs bekommen (a2-13-k → b1-4-k … a2-18-k → b1-9-k). migrateState benennt die IDs in einem
// gespeicherten Zustand um – eine reine Umbenennung, beliebig oft wiederholbar (Ziel-IDs sind nie Quelle).
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  // Lektions-Präfix alt → neu (gilt für Lektionen <präfix>-<nr> und Tests <präfix>-test).
  const LESSON_MAP = { "a2-13": "b1-4", "a2-14": "b1-5", "a2-15": "b1-6", "a2-16": "b1-7", "a2-17": "b1-8", "a2-18": "b1-9" };
  // Kapitel-ID alt → neu.
  const CHAPTER_MAP = {
    "a2-ordinacija": "b1-ordinacija", "a2-stanovanje": "b1-stanovanje", "a2-susjedi": "b1-susjedi",
    "a2-konoba": "b1-konoba", "a2-kolodvor": "b1-kolodvor", "a2-ured": "b1-ured"
  };

  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const isObj = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const PREFIX = /^([a-z]\d-\d+)-(.+)$/;
  const DIALOG = "dialog-";

  // "a2-13-4" → "b1-4-4", "a2-13-test" → "b1-4-test"; alles andere bleibt unverändert.
  function mapLessonId(id) {
    if (typeof id !== "string") return id;
    const m = PREFIX.exec(id);
    return m && has(LESSON_MAP, m[1]) ? `${LESSON_MAP[m[1]]}-${m[2]}` : id;
  }

  // Item-Schlüssel "<lessonId>-<index>" ("a2-15-2-4" → "b1-6-2-4") und Dialog-Schlüssel "dialog-<lessonId>".
  function mapItemKey(key) {
    if (typeof key !== "string") return key;
    if (key.startsWith(DIALOG)) return DIALOG + mapLessonId(key.slice(DIALOG.length));
    return mapLessonId(key);
  }

  // Tiefe Kopie für JSON-artige Daten (so liegen Zustände in localStorage und Supabase).
  function copy(v) {
    if (Array.isArray(v)) return v.map(copy);
    if (isObj(v)) {
      const out = {};
      for (const k of Object.keys(v)) out[k] = copy(v[k]);
      return out;
    }
    return v;
  }

  const num = v => (typeof v === "number" && isFinite(v) ? v : 0);

  // Welcher von zwei Item-Einträgen für denselben (neuen) Schlüssel bleibt: höheres seen, dann späteres due,
  // bei völligem Gleichstand der Eintrag, der schon unter dem neuen Schlüssel stand. So hängt das Ergebnis
  // nicht von der Reihenfolge der Schlüssel ab.
  function better(a, b) {
    const sa = num(a.value && a.value.seen), sb = num(b.value && b.value.seen);
    if (sa !== sb) return sa > sb ? a : b;
    const da = num(a.value && a.value.due), db = num(b.value && b.value.due);
    if (da !== db) return da > db ? a : b;
    if (a.native !== b.native) return a.native ? a : b;
    return a;
  }

  // Neue Kopie des Zustands mit umbenannten IDs in completed, testStars, items und lastLesson.
  // Die Eingabe bleibt unverändert; migrateState(migrateState(s)) ist tief gleich migrateState(s).
  function migrateState(state) {
    if (!isObj(state)) return state;
    const out = copy(state);

    if (Array.isArray(out.completed)) {
      const seen = new Set();
      out.completed = out.completed.map(mapLessonId).filter(id => {
        if (typeof id !== "string") return true;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    }

    if (isObj(out.testStars)) {
      const stars = {};
      for (const [k, v] of Object.entries(out.testStars)) {
        const id = mapLessonId(k);
        stars[id] = has(stars, id) && !(num(v) > num(stars[id])) ? stars[id] : v;
      }
      out.testStars = stars;
    }

    if (isObj(out.items)) {
      const picked = {};
      for (const [k, value] of Object.entries(out.items)) {
        const key = mapItemKey(k);
        const entry = { value, native: key === k };
        picked[key] = has(picked, key) ? better(picked[key], entry) : entry;
      }
      const items = {};
      for (const [k, e] of Object.entries(picked)) items[k] = e.value;
      out.items = items;
    }

    if (typeof out.lastLesson === "string") out.lastLesson = mapLessonId(out.lastLesson);
    return out;
  }

  return { LESSON_MAP, CHAPTER_MAP, mapLessonId, mapItemKey, migrateState };
});
