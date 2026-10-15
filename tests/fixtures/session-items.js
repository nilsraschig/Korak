// Fixture für tests/session.test.js: 12 Lektions-Items, 8 fällige, 6 Fehler-DNA-Items (alle annotiert,
// einige mit `forms`), eine Lektion mit Dialog, weitere Dialoge und 2 Autoren-Blöcke (Task[][]).
"use strict";

const withKeys = (lessonId, items) => items.map((it, i) => Object.assign({ key: `${lessonId}-${i}` }, it));

// Lektion „Im Café“ (neu)
const LESSON_ITEMS = withKeys("a1-3-1", [
  { hr: "kava", de: "Kaffee", pos: "noun", category: "drink", gender: "f",
    forms: { nom: "kava", gen: "kave", dat: "kavi", acc: "kavu", ins: "kavom", loc: "kavi" }, concepts: ["gender", "case-acc"] },
  { hr: "čaj", de: "Tee", pos: "noun", category: "drink", gender: "m", concepts: ["diacritics-c"] },
  { hr: "voda", de: "Wasser", pos: "noun", category: "drink", gender: "f",
    forms: { nom: "voda", gen: "vode", dat: "vodi", acc: "vodu", ins: "vodom", loc: "vodi" }, concepts: ["case-gen"] },
  { hr: "mlijeko", de: "Milch", pos: "noun", category: "drink", gender: "n",
    forms: { nom: "mlijeko", gen: "mlijeka", dat: "mlijeku", acc: "mlijeko", ins: "mlijekom", loc: "mlijeku" }, concepts: ["case-ins"] },
  { hr: "sok", de: "Saft", pos: "noun", category: "drink", gender: "m", concepts: ["gender"] },
  { hr: "šećer", de: "Zucker", pos: "noun", category: "food", gender: "m", concepts: ["diacritics-c", "diacritics-sz"] },
  { hr: "kolač", de: "Kuchen", pos: "noun", category: "food", gender: "m", concepts: ["diacritics-c"] },
  { hr: "čaša", de: "Glas", pos: "noun", category: "home", gender: "f", concepts: ["diacritics-c", "diacritics-sz"] },
  { hr: "Jednu kavu, molim.", de: "Einen Kaffee, bitte.", pos: "phrase", category: "food", concepts: ["case-acc", "numbers"] },
  { hr: "Račun, molim.", de: "Die Rechnung, bitte.", pos: "phrase", category: "money", concepts: ["diacritics-c"] },
  { hr: "Želim čašu vode.", de: "Ich möchte ein Glas Wasser.", pos: "phrase", category: "drink", concepts: ["case-acc", "case-gen", "diacritics-sz"] },
  { hr: "Kava s mlijekom, molim.", de: "Kaffee mit Milch, bitte.", pos: "phrase", category: "drink", concepts: ["case-ins"] }
]);

// Fällige Wiederholungen aus früheren Lektionen
const DUE_ITEMS = withKeys("a1-1-1", [
  { hr: "Dobar dan", de: "Guten Tag", pos: "phrase", category: "greeting", concepts: [] },
  { hr: "hvala", de: "danke", pos: "interj", category: "greeting", concepts: [] },
  { hr: "Doviđenja", de: "Auf Wiedersehen", pos: "interj", category: "greeting", concepts: ["diacritics-dj"] },
  { hr: "Kako si?", de: "Wie geht es dir?", pos: "phrase", category: "greeting", concepts: ["questions"] },
  { hr: "Zovem se Ana.", de: "Ich heiße Ana.", pos: "phrase", category: "people", concepts: ["reflexive"] },
  { hr: "prijatelj", de: "Freund", pos: "noun", category: "people", gender: "m",
    forms: { nom: "prijatelj", gen: "prijatelja", dat: "prijatelju", acc: "prijatelja", ins: "prijateljem", loc: "prijatelju" }, concepts: ["gender"] },
  { hr: "Odakle si?", de: "Woher kommst du?", pos: "phrase", category: "people", concepts: ["questions"] },
  { hr: "Vidimo se sutra!", de: "Bis morgen!", pos: "phrase", category: "greeting", concepts: ["reflexive"] }
]);

// Items zu schwachen Konzepten (Fehler-DNA)
const DNA_ITEMS = withKeys("a1-2-2", [
  { hr: "kuća", de: "Haus", pos: "noun", category: "home", gender: "f",
    forms: { nom: "kuća", gen: "kuće", dat: "kući", acc: "kuću", ins: "kućom", loc: "kući" }, concepts: ["case-acc", "diacritics-c"] },
  { hr: "grad", de: "Stadt", pos: "noun", category: "city", gender: "m",
    forms: { nom: "grad", gen: "grada", dat: "gradu", acc: "grad", ins: "gradom", loc: "gradu" }, concepts: ["case-loc"] },
  { hr: "more", de: "Meer", pos: "noun", category: "sea", gender: "n",
    forms: { nom: "more", gen: "mora", dat: "moru", acc: "more", ins: "morem", loc: "moru" }, concepts: ["case-loc"] },
  { hr: "Vidim more.", de: "Ich sehe das Meer.", pos: "phrase", category: "sea", concepts: ["case-acc"] },
  { hr: "Živim u Zagrebu.", de: "Ich wohne in Zagreb.", pos: "phrase", category: "city", concepts: ["case-loc", "diacritics-sz"] },
  { hr: "Idem u grad.", de: "Ich gehe in die Stadt.", pos: "phrase", category: "city", concepts: ["case-acc", "prepositions"] }
]);

const POOL = LESSON_ITEMS.concat(DUE_ITEMS, DNA_ITEMS);

const LESSON = {
  id: "a1-3-1",
  chapterId: "a1-hrana",
  dialogue: [
    ["Konobar", "Dobar dan! Izvolite?"],
    ["Gost", "Jednu kavu s mlijekom, molim."],
    ["Konobar", "Želite li i kolač?"],
    ["Gost", "Ne, hvala. Samo kavu."]
  ]
};

const DIALOGUES = [
  LESSON,
  { id: "a1-1-1", dialogue: [["Ana", "Bok! Kako si?"], ["Marko", "Dobro sam, hvala. A ti?"], ["Ana", "I ja sam dobro."], ["Marko", "Vidimo se sutra!"]] },
  { id: "a1-2-1", dialogue: [["Petra", "Odakle si?"], ["Tom", "Ja sam iz Beča."], ["Petra", "Govoriš li hrvatski?"], ["Tom", "Malo govorim."]] }
];

// Autoren-Blöcke wie authoredItems() in app.js sie liefert: dreizügiges Rollenspiel und eine Fehler-Korrektur.
const RP_SCENE = "Du bestellst in einem Café in Rovinj.";
const AUTHORED = [
  [
    { type: "roleplay", authored: "rp-test-1", prompt: RP_SCENE, npc: "Dobar dan! Što želite?", history: [],
      answer: "Jednu kavu, molim.", options: ["Jednu kavu, molim.", "Laku noć!", "Zovem se Ana."],
      explain: { "Jednu kavu, molim.": "Du bestellst höflich.", "Laku noć!": "So verabschiedet man sich am Abend.", "Zovem se Ana.": "Danach hat niemand gefragt." },
      spoken: "Dobar dan! Što želite?", turn: 1, turns: 3 },
    { type: "roleplay", authored: "rp-test-1", prompt: RP_SCENE, npc: "S mlijekom ili bez?", history: [["Dobar dan! Što želite?", "Jednu kavu, molim."]],
      answer: "S mlijekom, molim.", options: ["S mlijekom, molim.", "Idem u grad.", "Kako si?"],
      explain: { "S mlijekom, molim.": "Passt genau zur Frage.", "Idem u grad.": "Passt nicht zur Frage.", "Kako si?": "Zu vertraulich und keine Antwort." },
      spoken: "S mlijekom ili bez?", turn: 2, turns: 3 },
    { type: "roleplay", authored: "rp-test-1", prompt: RP_SCENE, npc: "Izvolite, to su dva eura.",
      history: [["Dobar dan! Što želite?", "Jednu kavu, molim."], ["S mlijekom ili bez?", "S mlijekom, molim."]],
      answer: "Hvala, izvolite.", options: ["Hvala, izvolite.", "Dobro jutro!", "Vidim more."],
      explain: { "Hvala, izvolite.": "Du bedankst dich und reichst das Geld.", "Dobro jutro!": "Die Begrüßung ist schon vorbei.", "Vidim more.": "Passt nicht zur Situation." },
      spoken: "Izvolite, to su dva eura.", turn: 3, turns: 3 }
  ],
  [
    { type: "fix", authored: "fix-test-1", prompt: "Finde den Fehler und korrigiere ihn.", hint: "„Ich trinke Kaffee.“",
      words: ["Pijem", "kava."], wrongIndex: 1, right: "kavu", fixOptions: ["kavu", "kavi", "kavom"], answer: "1|kavu",
      rightSentence: "Pijem kavu.", why: "Nach „piti“ steht der Akkusativ: kava → kavu.", concepts: ["case-acc"] }
  ]
];

module.exports = { LESSON_ITEMS, DUE_ITEMS, DNA_ITEMS, POOL, LESSON, DIALOGUES, AUTHORED };
