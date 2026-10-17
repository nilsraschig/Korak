// Korak Lern-Engine – Konzept-Register: Grammatik- und Schreibkonzepte mit Kurzerklärung,
// Wortarten, Kategorien, Fälle und automatische Konzept-Erkennung.
// Läuft im Browser (window.KorakEngine) und in Node (require).
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) {
  "use strict";

  const CONCEPTS = {
    "gender": {
      title: "Genus",
      short: "Kroatische Substantive sind männlich, weiblich oder sächlich. Meist verrät die Endung das Genus: grad (m.), kava (f.), more (n.)."
    },
    "plural": {
      title: "Plural",
      short: "Der Plural entsteht meist durch eine andere Endung: kava – kave, more – mora. Viele einsilbige männliche Wörter bekommen -ov-/-ev-: grad – gradovi."
    },
    "case-gen": {
      title: "Genitiv",
      short: "Der Genitiv antwortet auf „wessen?“ und steht nach Mengenangaben und vielen Präpositionen: čaša vode (ein Glas Wasser), bez šećera (ohne Zucker)."
    },
    "case-dat": {
      title: "Dativ",
      short: "Der Dativ bezeichnet den Empfänger: Dajem poklon majci. Feminine Wörter auf -a enden im Dativ meist auf -i (majka – majci)."
    },
    "case-acc": {
      title: "Akkusativ",
      short: "Das direkte Objekt steht im Akkusativ: Pijem kavu. Feminine Wörter auf -a enden dann auf -u."
    },
    "case-ins": {
      title: "Instrumental",
      short: "Der Instrumental sagt „womit?“ und, nach s/sa, „mit wem?“: Pišem olovkom, idem s prijateljem. Die Endung ist meist -om oder -em."
    },
    "case-loc": {
      title: "Lokativ",
      short: "Der Lokativ steht nur nach Präpositionen wie u, na und o und sagt „wo?“: Živim u Zagrebu, sjedim na plaži. Bei „wohin?“ steht der Akkusativ: Idem u Zagreb."
    },
    "case-voc": {
      title: "Vokativ",
      short: "Der Vokativ ist die direkte Anrede: Hvala, Ivane! Frauennamen auf -a bekommen -o: Ana – Ano!"
    },
    "adj-agreement": {
      title: "Adjektiv-Übereinstimmung",
      short: "Adjektive richten sich nach Genus, Zahl und Fall des Substantivs: lijep grad, lijepa kuća, lijepo more."
    },
    "possessive": {
      title: "Possessivpronomen",
      short: "Mein, dein, sein richten sich nach dem besessenen Wort, nicht nach dem Besitzer: moj brat, moja sestra, moje dijete."
    },
    "pronouns": {
      title: "Personalpronomen",
      short: "Ja, ti, on/ona/ono, mi, vi, oni/one/ona lässt man meist weg, weil die Verbform die Person zeigt: Govorim hrvatski. Zur Betonung steht das Pronomen: Ja govorim hrvatski, a ti?"
    },
    "verb-biti": {
      title: "Biti – sein",
      short: "Im Alltag nutzt man die kurzen Formen sam, si, je, smo, ste, su: Ja sam Marko. Ona je iz Splita."
    },
    "verb-present": {
      title: "Präsens",
      short: "Das Präsens entsteht aus dem Stamm plus Personenendung: govoriti – govorim, govoriš, govori, govorimo, govorite, govore."
    },
    "verb-past": {
      title: "Perfekt",
      short: "Das Perfekt besteht aus dem kurzen „biti“ und dem l-Partizip, das sich nach dem Geschlecht richtet: Jučer sam putovao (m.) / putovala (f.) u Split."
    },
    "verb-future": {
      title: "Futur",
      short: "Das Futur bildet man mit ću, ćeš, će, ćemo, ćete, će und dem Infinitiv: Sutra ću ići na more. Bei Infinitiven auf -ti fällt vor ću das -i weg: Putovat ću. (Verben auf -ći behalten es: Ići ću.)"
    },
    "verb-modal": {
      title: "Modalverben",
      short: "Modalverben wie moći (können), morati (müssen) und željeti (wollen) stehen mit dem Infinitiv: Mogu plivati. Moram ići kući."
    },
    "reflexive": {
      title: "Reflexive Verben",
      short: "Reflexive Verben brauchen das Wörtchen se (sich): Zovem se Ana. Kako se zoveš?"
    },
    "aspect": {
      title: "Verbalaspekt",
      short: "Viele Verben gibt es als Paar aus unvollendet und vollendet: Pišem pismo. (Ich bin beim Schreiben.) Napisat ću pismo. (Ich schreibe es fertig.)"
    },
    "imperative": {
      title: "Imperativ",
      short: "Der Imperativ fordert auf: Dođi! (du), Dođite! (ihr/Sie). Das Verbot bildet man mit nemoj/nemojte und dem Infinitiv: Nemoj ići!"
    },
    "conditional": {
      title: "Konditional",
      short: "Der Konditional steht für Wünsche und höfliche Bitten: bih, bi, bi, bismo, biste, bi plus l-Partizip. Htio bih kavu. (Ich hätte gern einen Kaffee.)"
    },
    "negation": {
      title: "Verneinung",
      short: "Verneint wird mit ne vor dem Verb: Ne govorim njemački. Bei biti, imati und htjeti verschmilzt ne mit dem Verb: nisam, nemam, neću."
    },
    "questions": {
      title: "Fragen",
      short: "Ja/Nein-Fragen bildet man mit li oder je li: Govoriš li hrvatski? Je li ovdje slobodno? Die Fragewörter sind tko, što, gdje, kamo, kada, kako und zašto."
    },
    "clitic-order": {
      title: "Kurze Wörter an zweiter Stelle",
      short: "Kleine unbetonte Wörter (sam, ću, se, mi, ti, ga …) stehen an zweiter Stelle im Satz, das Hilfsverb vor dem Pronomen: Jučer sam ga vidio. Sutra ću ti pomoći."
    },
    "numbers": {
      title: "Zahlen",
      short: "Eins und zwei haben Genusformen: jedan/jedna/jedno, dva/dvije/dva. Nach 2 bis 4 steht der Genitiv Singular, ab 5 der Genitiv Plural: dva psa, pet pasa."
    },
    "time": {
      title: "Uhrzeit",
      short: "Du fragst Koliko je sati? und antwortest mit sati: Sada je osam sati. Halb acht heißt pola osam (7:30)."
    },
    "adverbs": {
      title: "Adverbien",
      short: "Wörter wie lijevo (links), desno (rechts), ovdje (hier), tamo (dort), sutra (morgen) oder ujutro (morgens) sind Adverbien: Sie haben keine Fallendungen und bleiben immer gleich."
    },
    "prepositions": {
      title: "Präpositionen und Fälle",
      short: "Jede Präposition verlangt einen bestimmten Fall; u und na stehen mit Lokativ (wo?) oder Akkusativ (wohin?): Sjedim u kafiću. Idem u kafić."
    },
    "formal-address": {
      title: "Siezen",
      short: "Fremde Personen sprichst du mit Vi an, das Verb steht dann im Plural: Kako ste? Govorite li njemački?"
    },
    "politeness": {
      title: "Höflichkeit",
      short: "Mit molim (bitte) und hvala (danke) kommst du überall weiter: Molim vas, jednu kavu. Hvala lijepa!"
    },
    "diacritics-c": {
      title: "č und ć",
      short: "č klingt wie deutsches „tsch“ (čaša = Glas), ć ist weicher, die Zunge liegt weiter vorn (kuća = Haus). Beim Schreiben sind c, č und ć drei verschiedene Buchstaben."
    },
    "diacritics-sz": {
      title: "š und ž",
      short: "š klingt wie „sch“ (škola = Schule), ž wie das „g“ in „Garage“ (žena = Frau). Ohne Hatschek wären es s und z, also andere Laute."
    },
    "diacritics-dj": {
      title: "đ und dž",
      short: "đ ist ein weiches „dj“ (đak = Schüler), dž klingt wie „dsch“ in „Dschungel“ (džep = Tasche). Ist đ auf der Tastatur nicht zu finden, schreibt man ersatzweise dj."
    },
    "ijekavian": {
      title: "Ijekavisch",
      short: "In Kroatien spricht und schreibt man ijekavisch: mlijeko (Milch), vrijeme (Zeit, Wetter), lijepo (schön) – nicht mleko, vreme oder lepo."
    }
  };

  const POS = ["noun", "verb", "adj", "adv", "pron", "num", "prep", "conj", "part", "interj", "phrase"];

  const CATEGORIES = [
    "greeting", "people", "family", "food", "drink", "shopping", "money", "numbers", "time",
    "calendar", "weather", "nature", "animals", "sea", "leisure", "clothing", "colors", "body",
    "health", "home", "city", "travel", "transport", "work", "school", "office", "feelings",
    "celebration", "communication", "abstract"
  ];

  const CASES = ["nom", "gen", "dat", "acc", "ins", "loc", "voc"];

  // Konzepte, die sich allein aus der Schreibweise ergeben (Groß-/Kleinschreibung egal).
  function autoConcepts(hr) {
    const s = String(hr || "").normalize("NFC").toLocaleLowerCase("hr");
    const out = [];
    if (/[čć]/.test(s)) out.push("diacritics-c");
    if (/[šž]/.test(s)) out.push("diacritics-sz");
    if (/đ|dž|ǆ/.test(s)) out.push("diacritics-dj");
    return out;
  }

  return { CONCEPTS, POS, CATEGORIES, CASES, autoConcepts };
});
