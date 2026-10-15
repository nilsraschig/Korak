// Korak Lern-Engine – Aufgaben-Bausteine: baut aus einem Item (oder einer Lektion) eine Aufgabe je Typ
// und wertet Tipp-Antworten aus. Prompt-Texte und Felder entsprechen ex()/matchEx()/dialogueEx() in app.js.
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  const { makeRng, shuffle, pick, norm, missingDiacritics } = req("./core.js");
  const { pickDistractors, endingOptions } = req("./distractors.js");

  // Typen, die ein Item brauchen. „dialogue“ baut dagegen aus einer Lektion (ctx.lesson).
  const TYPES_WITH_ITEM = ["choice-de", "choice-hr", "listen-choice", "input-hr", "listen", "cloze", "order", "match", "ending", "truefalse"];
  const LISTEN_TYPES = ["listen", "listen-choice"];
  const RECOGNITION = ["choice-de", "listen-choice", "truefalse"];

  const MAX_OPTIONS = 4;

  // ---- Hilfen (aus app.js: strip, tokens, clozeIndexes, canCloze, canOrder, shuffleDifferent)

  const strip = w => w.replace(/[.!?,;:„“"…]/g, "");
  const tokens = s => String(s).split(/\s+/).map(strip).filter(Boolean);
  const isText = s => typeof s === "string" && norm(s) !== "";
  const isLower = w => w === w.toLocaleLowerCase("hr");

  // Positionen der Wörter, die als Lücke taugen: mindestens 4 Zeichen und kleingeschrieben.
  function clozeIndexes(hr) {
    return hr.split(/\s+/).map(strip).map((w, i) => (w.length >= 4 && isLower(w) ? i : -1)).filter(i => i >= 0);
  }

  function canCloze(hr) {
    return tokens(hr).length >= 3 && clozeIndexes(hr).length > 0;
  }

  function canOrder(hr) {
    const n = tokens(hr).length;
    return n >= 3 && n <= 8;
  }

  // Mischt die Wörter so, dass nie die richtige Reihenfolge herauskommt – sofern es überhaupt
  // zwei verschiedene Wörter gibt (bei „ne ne ne“ gibt es nichts zu mischen).
  function shuffleDifferent(words, rng) {
    const target = words.join(" ");
    let s = shuffle(words, rng);
    for (let i = 0; i < 6 && s.join(" ") === target; i++) s = shuffle(words, rng);
    if (s.join(" ") === target) {
      const j = s.findIndex(w => w !== s[0]);
      if (j > 0) [s[0], s[j]] = [s[j], s[0]];
    }
    return s;
  }

  // Antwort + Distraktoren -> gemischte Optionsliste ohne leere und (nach norm) doppelte Werte,
  // die Antwort genau einmal. Weniger als 2 Optionen ergeben null.
  function makeOptions(answer, distractors, rng) {
    if (!isText(answer)) return null;
    const out = [answer];
    const seen = new Set([norm(answer)]);
    for (const d of distractors) {
      if (out.length >= MAX_OPTIONS) break;
      const key = norm(d);
      if (key === "" || seen.has(key)) continue;
      seen.add(key);
      out.push(d);
    }
    return out.length >= 2 ? shuffle(out, rng) : null;
  }

  // Gemeinsame Felder jeder Item-Aufgabe.
  function base(type, item) {
    const task = { type };
    if (item.key !== undefined) task.key = item.key;
    task.keys = item.key !== undefined ? [item.key] : [];
    task.item = item;
    task.spoken = item.hr;
    task.concepts = Array.isArray(item.concepts) ? item.concepts.slice() : [];
    if (item.isReview) task.isReview = true;
    return task;
  }

  const poolOf = ctx => (Array.isArray(ctx.pool) ? ctx.pool : []);

  // ---- Auswahl- und Tipp-Aufgaben

  function choiceTask(type, prompt, answerField, item, ctx, rng) {
    const answer = item[answerField];
    const options = makeOptions(answer, pickDistractors(item, poolOf(ctx), { field: answerField, n: MAX_OPTIONS - 1, rng }), rng);
    if (!options) return null;
    return Object.assign(base(type, item), { prompt, answer, options });
  }

  function inputTask(type, prompt, item) {
    return Object.assign(base(type, item), { prompt, answer: item.hr });
  }

  function clozeTask(item, ctx, rng) {
    if (!canCloze(item.hr)) return null;
    const raw = item.hr.split(/\s+/);
    const i = pick(clozeIndexes(item.hr), rng);
    const word = strip(raw[i]);
    const gap = raw.map((x, k) => (k !== i ? x : x.includes(word) ? x.replace(word, "_____") : "_____")).join(" ");
    // Distraktoren: Einzelwörter (klein, ab 4 Zeichen) aus dem Pool, ohne die Wörter des Satzes selbst.
    const seen = new Set(tokens(item.hr).map(norm));
    const words = [];
    for (const it of poolOf(ctx)) {
      if (!it || !isText(it.hr)) continue;
      for (const w of tokens(it.hr)) {
        const key = norm(w);
        if (w.length < 4 || !isLower(w) || seen.has(key)) continue;
        seen.add(key);
        words.push({ hr: w, de: "" });
      }
    }
    const options = makeOptions(word, pickDistractors({ hr: word, de: "" }, words, { field: "hr", n: MAX_OPTIONS - 1, rng }), rng);
    if (!options) return null;
    return Object.assign(base("cloze", item), { prompt: gap, hint: `„${item.de}“`, answer: word, options });
  }

  function orderTask(item, ctx, rng) {
    if (!canOrder(item.hr)) return null;
    const words = tokens(item.hr);
    return Object.assign(base("order", item), { prompt: `Bilde den Satz: „${item.de}“`, answer: words.join(" "), words: shuffleDifferent(words, rng) });
  }

  // 4 Items aus dem Pool inklusive `item`, mit eindeutigen hr und de. Kurze Ausdrücke (bis 4 Wörter) zuerst.
  function matchTask(item, ctx, rng) {
    const chosen = [item];
    const seenHr = new Set([norm(item.hr)]);
    const seenDe = new Set([norm(item.de)]);
    const candidates = poolOf(ctx).filter(c => c && isText(c.hr) && isText(c.de));
    const short = candidates.filter(c => tokens(c.hr).length <= 4);
    const rest = candidates.filter(c => tokens(c.hr).length > 4);
    for (const c of shuffle(short, rng).concat(shuffle(rest, rng))) {
      if (chosen.length >= 4) break;
      const hr = norm(c.hr), de = norm(c.de);
      if (seenHr.has(hr) || seenDe.has(de)) continue;
      seenHr.add(hr);
      seenDe.add(de);
      chosen.push(c);
    }
    if (chosen.length < 4) return null;
    const pairs = shuffle(chosen, rng);
    return {
      type: "match",
      keys: pairs.map(p => p.key).filter(k => k !== undefined),
      prompt: "Verbinde jeden kroatischen Ausdruck mit seiner Bedeutung.",
      answer: "",
      pairs,
      concepts: Array.isArray(item.concepts) ? item.concepts.slice() : []
    };
  }

  // ---- Endung wählen

  const ENDING_CASES = ["gen", "acc", "ins", "loc"];

  function nominative(item) {
    const forms = item.forms || {};
    return isText(forms.nom) ? forms.nom : item.hr;
  }

  // Fälle, die sich fragen lassen: gen/acc/ins/loc mit eigener, vom Nominativ verschiedener Form.
  // Es braucht mindestens zwei davon und pro Fall mindestens eine falsche Option (Zahl der Optionen hängt nicht vom rng ab).
  function endingCases(item) {
    const forms = item.forms;
    if (!forms || typeof forms !== "object") return [];
    const nom = norm(nominative(item));
    const own = ENDING_CASES.filter(k => isText(forms[k]) && norm(forms[k]) !== nom);
    if (own.length < 2) return [];
    return own.filter(k => endingOptions(item, k, { n: MAX_OPTIONS - 1, rng: makeRng(1) }).length >= 1);
  }

  function endingFrame(caseKey, form) {
    switch (caseKey) {
      case "gen": return "bez ___";
      case "acc": return "Vidim ___.";
      case "ins": return /^[sšzž]/.test(norm(form)) ? "sa ___" : "s ___";
      default: return "o ___";   // loc
    }
  }

  // ctx.focus (Konzept-IDs, z. B. ["case-acc"]): Fälle aus dem Fokus werden bevorzugt gefragt (Fehler-DNA).
  function endingTask(item, ctx, rng) {
    const cases = endingCases(item);
    if (!cases.length) return null;
    const focus = Array.isArray(ctx.focus) ? cases.filter(k => ctx.focus.includes("case-" + k)) : [];
    const caseKey = pick(focus.length ? focus : cases, rng);
    const answer = item.forms[caseKey];
    const options = makeOptions(answer, endingOptions(item, caseKey, { n: MAX_OPTIONS - 1, rng }), rng);
    if (!options) return null;
    return Object.assign(base("ending", item), {
      prompt: endingFrame(caseKey, answer),
      hint: `Welche Form von „${nominative(item)}“ (${item.de}) passt?`,
      answer,
      options,
      concepts: ["case-" + caseKey]
    });
  }

  // ---- Richtig / Falsch

  function truefalseTask(item, ctx, rng) {
    let de = item.de;
    if (rng() >= 0.5) {
      const wrong = pickDistractors(item, poolOf(ctx), { field: "de", n: 1, rng })[0];
      if (wrong !== undefined) de = wrong;
    }
    return Object.assign(base("truefalse", item), {
      prompt: `„${item.hr}“ bedeutet „${de}“`,
      answer: de === item.de ? "Richtig" : "Falsch",
      options: ["Richtig", "Falsch"]
    });
  }

  // ---- Dialog ergänzen

  function dialogueLines(lesson) {
    const lines = lesson && Array.isArray(lesson.dialogue) ? lesson.dialogue : [];
    return lines.filter(l => Array.isArray(l) && typeof l[0] === "string" && isText(l[1]));
  }

  function dialogueTask(lesson, ctx, rng) {
    if (!lesson || lesson.id === undefined) return null;
    const lines = dialogueLines(lesson);
    if (lines.length < 2) return null;
    // Distraktoren: Zeilen anderer Lektionen; Zeilen der eigenen Lektion (sichtbar im Prompt) nie.
    const own = new Set(lines.map(l => norm(l[1])));
    const candidates = [];
    for (const other of Array.isArray(ctx.dialogues) ? ctx.dialogues : []) {
      if (!other || other.id === lesson.id) continue;
      for (const l of dialogueLines(other)) if (!own.has(norm(l[1]))) candidates.push({ hr: l[1], de: "" });
    }
    if (!candidates.length) return null;   // Antwort steht in `own`, jeder Kandidat ist also eine echte Alternative
    const i = 1 + Math.floor(rng() * (lines.length - 1));
    const answer = lines[i][1];
    const options = makeOptions(answer, pickDistractors({ hr: answer, de: "" }, candidates, { field: "hr", n: MAX_OPTIONS - 1, rng }), rng);
    if (!options) return null;
    const before = lines.slice(Math.max(0, i - 2), i).map(l => `${l[0]}: ${l[1]}`);
    return {
      type: "dialogue",
      key: `dialog-${lesson.id}`,
      keys: [`dialog-${lesson.id}`],
      item: { hr: answer, de: "Passende Antwort im Dialog" },
      prompt: ["Dialog ergänzen:"].concat(before, `${lines[i][0]}: …`).join("\n"),
      answer,
      options,
      spoken: lines[i - 1][1],
      concepts: []
    };
  }

  // ---- Einstieg

  const BUILDERS = {
    "choice-de": (item, ctx, rng) => choiceTask("choice-de", `Was bedeutet „${item.hr}“?`, "de", item, ctx, rng),
    "choice-hr": (item, ctx, rng) => choiceTask("choice-hr", `Welche kroatische Antwort bedeutet „${item.de}“?`, "hr", item, ctx, rng),
    "listen-choice": (item, ctx, rng) => choiceTask("listen-choice", "Hör genau hin: Was bedeutet das?", "de", item, ctx, rng),
    "input-hr": item => inputTask("input-hr", `Übersetze ins Kroatische: ${item.de}`, item),
    "listen": item => inputTask("listen", "Tippe auf Anhören und schreibe den kroatischen Ausdruck.", item),
    "cloze": clozeTask,
    "order": orderTask,
    "match": matchTask,
    "ending": endingTask,
    "truefalse": truefalseTask
  };

  // Baut eine Aufgabe oder liefert null, wenn der Typ für dieses Item (bzw. diese Lektion) nicht möglich ist.
  // ctx: { pool: Item[], lesson?, dialogues?, rng?, hasTTS }. „dialogue“ ignoriert `item` und nutzt ctx.lesson.
  function buildTask(type, item, ctx) {
    const c = ctx || {};
    const rng = c.rng || Math.random;
    if (type === "dialogue") return dialogueTask(c.lesson, c, rng);
    if (!Object.prototype.hasOwnProperty.call(BUILDERS, type)) return null;
    if (LISTEN_TYPES.includes(type) && !c.hasTTS) return null;
    if (!item || !isText(item.hr) || !isText(item.de)) return null;
    return BUILDERS[type](item, c, rng);
  }

  // Wie buildTask(...) !== null, aber unabhängig vom rng des Aufrufers (verbraucht keine Zufallszahlen).
  function canBuild(type, item, ctx) {
    return buildTask(type, item, Object.assign({}, ctx, { rng: makeRng(1) })) !== null;
  }

  // ---- Tipp-Auswertung

  const SPECIAL_CLASS = { "č": "[čćc]", "ć": "[ćčc]", "š": "[šs]", "ž": "[žz]", "đ": "(?:đ|dj|d)" };

  // Vergleicht Antwort und Ziel: exakt (nach norm) -> ok; fehlen nur Diakritika oder steht ein falsches
  // auf demselben Grundbuchstaben (ć statt č) -> ok und near (für đ im Ziel sind „đ“, „dj“ und „d“ zulässig);
  // sonst nicht ok. `missing` nennt die betroffenen Buchstaben des Ziels.
  function typingResult(answer, target) {
    const a = norm(answer).normalize("NFC");
    const t = norm(target).normalize("NFC");
    if (a === t) return { ok: true, near: false, missing: [] };
    const pattern = Array.from(t).map(ch => SPECIAL_CLASS[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("");
    if (!new RegExp("^" + pattern + "$").test(a)) return { ok: false, near: false, missing: [] };
    return { ok: true, near: true, missing: missingDiacritics(a, t) };
  }

  return { buildTask, canBuild, typingResult, TYPES_WITH_ITEM, LISTEN_TYPES, RECOGNITION };
});
