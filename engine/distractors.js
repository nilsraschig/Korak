// Korak Lern-Engine – Distraktoren: falsche Antwortoptionen nach Wortart, Kategorie und Länge
// sowie Endungs-Optionen (andere Fälle desselben Wortes).
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  const { norm, shuffle } = req("./core.js");

  // „Ähnliche Länge“: |len(a) − len(b)| ≤ max(3, 40 % der Ziellänge), gemessen am Anzeigetext.
  function similarLength(candidate, target) {
    const t = String(target).length;
    return Math.abs(String(candidate).length - t) <= Math.max(3, 0.4 * t);
  }

  // Wählt bis zu `n` falsche Optionen aus `pool` für die Zielvokabel `target`.
  // `field` ("hr" | "de") ist das Feld, das als Option angezeigt wird.
  // Stufen (jede füllt nur auf): 1 Wortart+Kategorie+Länge, 2 Wortart+Länge, 3 Wortart, 4 Länge, 5 Rest.
  // Ausgeschlossen: leere Werte, gleiches norm wie Ziel oder bereits gewählte Option und
  // Kandidaten, deren anderes Feld dem des Ziels entspricht (zweite richtige Antwort).
  // Liefert weniger als `n` Werte, wenn der Pool nicht mehr hergibt – nie Platzhalter.
  // Reihenfolge und Auswahl innerhalb einer Stufe laufen über `rng`.
  function pickDistractors(target, pool, opts) {
    const o = opts || {};
    const field = o.field;
    if (field !== "hr" && field !== "de") throw new TypeError('pickDistractors: opts.field muss "hr" oder "de" sein');
    const other = field === "hr" ? "de" : "hr";
    const n = o.n === undefined ? 3 : o.n;
    const targetText = target[field];
    const targetNorm = norm(targetText);
    const targetOtherNorm = norm(target[other]);

    const candidates = [];
    for (const c of pool || []) {
      if (!c) continue;
      const text = norm(c[field]);
      if (text === "" || text === targetNorm) continue;
      if (targetOtherNorm !== "" && norm(c[other]) === targetOtherNorm) continue;
      candidates.push(c);
    }
    const mixed = shuffle(candidates, o.rng);

    const samePos = c => !!target.pos && c.pos === target.pos;
    const sameCategory = c => !!target.category && c.category === target.category;
    const similar = c => similarLength(c[field], targetText);
    const stages = [
      c => samePos(c) && sameCategory(c) && similar(c),
      c => samePos(c) && similar(c),
      c => samePos(c),
      c => similar(c),
      () => true
    ];

    const chosen = [];
    const seen = new Set([targetNorm]);
    for (const stage of stages) {
      for (const c of mixed) {
        if (chosen.length >= n) break;
        const text = norm(c[field]);
        if (seen.has(text) || !stage(c)) continue;
        seen.add(text);
        chosen.push(c[field]);
      }
      if (chosen.length >= n) break;
    }
    return shuffle(chosen, o.rng);
  }

  // Falsche Endungs-Optionen: die anderen Formen desselben Wortes (`item.forms`) ohne die richtige
  // (`caseKey`), ohne leere Werte und ohne Doppel. Liefert weniger als `n`, wenn das Wort
  // weniger verschiedene Formen hat.
  function endingOptions(item, caseKey, opts) {
    const o = opts || {};
    const n = o.n === undefined ? 3 : o.n;
    const forms = (item && item.forms) || {};
    const seen = new Set([norm(forms[caseKey])]);
    const candidates = [];
    for (const key of Object.keys(forms)) {
      if (key === caseKey) continue;
      const text = norm(forms[key]);
      if (text === "" || seen.has(text)) continue;
      seen.add(text);
      candidates.push(forms[key]);
    }
    return shuffle(candidates, o.rng).slice(0, Math.max(0, n));
  }

  return { pickDistractors, endingOptions };
});
