// Korak Lern-Engine – Fehler-DNA: pro Konzept-Tag zählen, wie oft ein Wort richtig/falsch war,
// über alle Items aggregieren, die schwächsten Konzepte ermitteln und passende Items auswählen.
// Gespeichert wird pro Item in `state.items[key].dna = { <konzeptId>: [richtig, falsch] }`.
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  const { shuffle } = req("./core.js");
  const { CONCEPTS } = req("./concepts.js");

  const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  const isObject = v => v !== null && typeof v === "object" && !Array.isArray(v);
  const isCount = v => typeof v === "number" && Number.isFinite(v) && v >= 0;
  // Gültiger Zähler: Array aus genau zwei Zahlen ≥ 0 – alles andere ist ein kaputter Wert aus alten Daten.
  const isPair = v => Array.isArray(v) && v.length === 2 && isCount(v[0]) && isCount(v[1]);
  // „__proto__“ würde beim Zuweisen den Prototyp statt eines Eintrags setzen.
  const isConceptId = id => typeof id === "string" && id !== "" && id !== "__proto__";

  // Zählt für jedes Konzept in `concepts` ein Ergebnis in `stat.dna`.
  // Verändert `stat` an Ort und Stelle und gibt es zurück; alle anderen Felder bleiben unberührt.
  // Ohne Statistik (undefined/null) wird nichts angelegt, ohne Konzepte nichts gezählt.
  function record(stat, concepts, ok) {
    if (!isObject(stat)) return stat;
    const ids = Array.isArray(concepts) ? [...new Set(concepts.filter(isConceptId))] : [];
    if (!ids.length) return stat;
    if (!isObject(stat.dna)) stat.dna = {};
    const slot = ok ? 0 : 1;
    for (const id of ids) {
      const pair = has(stat.dna, id) && isPair(stat.dna[id]) ? stat.dna[id] : [0, 0];
      const next = pair.slice();
      next[slot] += 1;
      stat.dna[id] = next;
    }
    return stat;
  }

  // Summe über alle Items: { <konzeptId>: { right, wrong } }. Items ohne dna und kaputte Werte zählen nicht.
  function aggregate(items) {
    const out = {};
    if (!isObject(items)) return out;
    for (const key of Object.keys(items)) {
      const dna = isObject(items[key]) ? items[key].dna : null;
      if (!isObject(dna)) continue;
      for (const id of Object.keys(dna)) {
        if (!isConceptId(id) || !isPair(dna[id])) continue;
        const sum = has(out, id) ? out[id] : (out[id] = { right: 0, wrong: 0 });
        sum.right += dna[id][0];
        sum.wrong += dna[id][1];
      }
    }
    return out;
  }

  // Die n schwächsten Konzepte (nur mit mindestens einem Fehler und aus dem Register):
  // score = wrong / (right + wrong + 2), absteigend; bei gleichem score mehr Fehler zuerst.
  function weakest(items, n = 3) {
    const limit = typeof n === "number" && !Number.isNaN(n) ? Math.max(0, Math.floor(n)) : 3;
    const agg = aggregate(items);
    return Object.keys(agg)
      .filter(id => has(CONCEPTS, id) && agg[id].wrong >= 1)
      .map(id => {
        const { right, wrong } = agg[id];
        return { id, title: CONCEPTS[id].title, short: CONCEPTS[id].short, right, wrong, score: wrong / (right + wrong + 2) };
      })
      .sort((a, b) => b.score - a.score || b.wrong - a.wrong || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
      .slice(0, limit);
  }

  // Bis zu n Items aus `candidates`, die eines der Konzepte tragen: zuerst die mit dem ersten Konzept
  // (zufällig gemischt über rng), dann die mit dem zweiten usw. Kein Item doppelt (gleiches Objekt oder gleicher key).
  function itemsForConcepts(conceptIds, candidates, n, rng) {
    if (typeof n !== "number" || !(n >= 1) || !Array.isArray(conceptIds) || !Array.isArray(candidates)) return [];
    const limit = Math.floor(n);
    const identity = it => (typeof it.key === "string" && it.key !== "" ? "key:" + it.key : it);
    const seen = new Set();
    const unique = [];
    for (const it of candidates) {
      if (!isObject(it) || !Array.isArray(it.concepts)) continue;
      const id = identity(it);
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(it);
    }
    const out = [];
    const taken = new Set();
    for (const conceptId of conceptIds) {
      if (out.length >= limit) break;
      const hits = unique.filter(it => !taken.has(it) && it.concepts.includes(conceptId));
      for (const it of shuffle(hits, rng)) {
        if (out.length >= limit) break;
        taken.add(it);
        out.push(it);
      }
    }
    return out;
  }

  return { record, aggregate, weakest, itemsForConcepts };
});
