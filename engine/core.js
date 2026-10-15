// Korak Lern-Engine – Grundgerüst: Zufall und Textfunktionen.
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  // mulberry32: kleiner, schneller Zufallsgenerator mit festem Seed (Werte in [0,1)).
  function makeRng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // Fisher-Yates auf einer Kopie; die Eingabe bleibt unverändert.
  function shuffle(arr, rng) {
    const next = rng || Math.random;
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      const t = out[i];
      out[i] = out[j];
      out[j] = t;
    }
    return out;
  }

  function pick(arr, rng) {
    const next = rng || Math.random;
    return arr[Math.floor(next() * arr.length)];
  }

  // Identisch zu norm() in app.js: trimmen, klein (hr), Satzzeichen weg, Leerraum zusammenfassen.
  function norm(s) {
    return String(s || "").trim().toLocaleLowerCase("hr").replace(/[.!?,;:„“"'…–—()]/g, "").replace(/\s+/g, " ");
  }

  const PLAIN_MAP = { "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "dj" };

  // norm + Diakritika ersetzt (č,ć→c, š→s, ž→z, đ→dj).
  function plain(s) {
    return norm(s).normalize("NFC").replace(/[čćšžđ]/g, ch => PLAIN_MAP[ch]);
  }

  // Basisbuchstabe eines kroatischen Sonderbuchstabens (đ → d), sonst der Buchstabe selbst.
  const BASE_LETTER = { "č": "c", "ć": "c", "š": "s", "ž": "z", "đ": "d" };

  // Buchstaben aus `target`, die in `answer` ohne (oder mit falschem) Diakritikum stehen, z. B. ["č", "š"].
  // Falsch heißt: anderes Diakritikum auf demselben Grundbuchstaben (ć statt č).
  // Jeder Buchstabe erscheint einmal (in der Reihenfolge seines ersten Auftretens).
  // Für đ gilt auch die Ersatzschreibung „dj“ als fehlend.
  function missingDiacritics(answer, target) {
    const a = norm(answer).normalize("NFC");
    const t = norm(target).normalize("NFC");
    const missing = [];
    let j = 0;
    for (let i = 0; i < t.length && j < a.length; i++) {
      const ch = t[i];
      const base = BASE_LETTER[ch];
      if (base === undefined || a[j] === ch) {
        j++;
      } else if (ch === "đ" && a.slice(j, j + 2) === "dj") {
        if (!missing.includes(ch)) missing.push(ch);
        j += 2;
      } else if (a[j] === base || BASE_LETTER[a[j]] === base) {
        if (!missing.includes(ch)) missing.push(ch);
        j++;
      } else {
        j++;
      }
    }
    return missing;
  }

  return { makeRng, shuffle, pick, norm, plain, missingDiacritics };
});
