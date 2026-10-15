# Lern-Engine & Inhalte A1/A2 – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Korak bekommt eine testbare Lern-Engine (Session-Generator, neue Aufgabentypen, Distraktoren, Fehler-DNA) und A1/A2 werden auf eine einheitliche Level-Vorlage gebracht (12 Orte, je 5 Lektionen + Test, ≥ 12 annotierte Items).

**Architecture:** Die Logik wandert aus `app.js` in kleine, reine Module unter `engine/`, die im Browser (`window.KorakEngine`) und in Node (`require`) laufen und mit `node --test` getestet werden. `app.js` bleibt für Darstellung und Zustand zuständig und ruft die Engine auf. Kursinhalte bleiben in `course/*.js`, Items bekommen zusätzliche Felder; der Validator prüft die Vorlage.

**Tech Stack:** Vanilla JS (ES2020, kein Build), Node 22 (`node --test`, `node:assert`) für Unit-Tests, Playwright (vorhanden) für Browser-Tests.

**Spec:** Auftrag „Plan 1 – Lern-Engine & Inhalte A1/A2“ (Chat vom 15.10.2026) und `CLAUDE.md` (Projektregeln).

## Global Constraints

- Kein Build-Schritt, keine npm-Abhängigkeiten, kein `package.json`. Unit-Tests: `node --test tests/`.
- Design, Farben, Schriften, Vala und Animationen bleiben; neue Oberflächen nutzen vorhandene Klassen/Tokens aus `styles.css`.
- Kroatisch ijekavisch mit korrekten Diakritika (č, ć, š, ž, đ); Oberfläche Deutsch.
- localStorage-Schlüssel werden nicht umbenannt oder gelöscht. Keine Supabase-Schemaänderung: neue Lerndaten nur in bereits synchronisierten Strukturen (`state.items[key]`).
- Item-Schlüssel sind positionsbasiert (`<lessonId>-<index>`): vorhandene Items werden nie umsortiert, gelöscht oder in `hr`/`de` geändert – nur **angehängt**. Dialogzeilen ebenfalls nur anhängen.
- Lektions-IDs bleiben stabil; einzige Ausnahme ist die Verschiebung in Task 3 (`a2-13…18` → `b1-4…9`), abgefangen durch `engine/migrate.js`.
- Level-Vorlage (A1–B2): 12 Orte, je 5 Lektionen + 1 Kapiteltest; pro Lektion ≥ 12 Items, 1 Dialog (≥ 4 Zeilen), 1 Grammatik-Tipp, 1 „Wusstest du?“.
- Session: 20 Aufgaben, ≥ 10 verschiedene Wörter, kein Wort direkt hintereinander, max. 3× pro Wort, kein Aufgabentyp zweimal hintereinander, Mischung ~60 % neu / 25 % fällig / 15 % Fehler-DNA.
- Distraktoren: gleiche Wortart + Kategorie + ähnliche Länge; bei Endungen andere Fälle desselben Wortes; nie leere oder doppelte Optionen.
- Mobil zuerst (375 px), Tastatur bedienbar, `prefers-reduced-motion`.
- Service Worker: `CACHE` in `service-worker.js` erhöhen, alle neuen Dateien in `FILES`.

## Entscheidungen, die dieser Plan trifft (bitte beim OK bestätigen)

1. **A2 hat heute 18 Orte, die Vorlage verlangt 12.** Die sechs Alltags-Kapitel 13–18 (Hausarzt, Wohnungssuche, Nachbarn, Konoba, Bahnhof, Amt – Orte Bol, Hvar, Vis, Korčula, Orebić, Mljet) werden zu **B1 Kapitel 1–6** (passen inhaltlich zu B1 und geografisch zu „Süddalmatien“). Die bisherigen B1-Kapitel Ston, Trsteno, Dubrovnik werden B1 Kapitel 7–9. Die Reihenfolge der Orte auf der Karte ändert sich dadurch nicht. Die verschobenen Lektionen bekommen **neue, nie benutzte IDs** (`a2-13-k` → `b1-4-k` … `a2-18-k` → `b1-9-k`), bestehende B1-IDs bleiben – die Migration ist dadurch eine reine Umbenennung und beliebig oft wiederholbar. B1 bleibt „Entwurf“ (9 Orte) bis Plan 2.
2. **A1-Orte 7–12** (nach Krk, vor Senj): Baška – Uhrzeit & Kalender; Cres – Natur & Tiere; Lošinj – Meer & Freizeit; Susak – Kleidung & Farben; Crikvenica – Berufe & Schule; Novi Vinodolski – Feste & Glückwünsche.
3. **Souvenir „A1 abgeschlossen“** gilt künftig für die ersten sechs A1-Kapiteltests („Erste A1-Etappe“), damit niemand, der das alte A1 abgeschlossen hat, sein Souvenir verliert.
4. **Fehler-DNA** wird pro Item in `state.items[key].dna` gespeichert (wird schon synchronisiert), nicht in einer neuen Spalte.

**Bewusst nicht enthalten:** B1/B2-Inhalte (Plan 2); Hafen-Wimpel rechnen den Ort aus der Zahl bestandener Kapiteltests und liegen nach dem Wachsen von A1 bei Freunden mit A2-Fortschritt bis zu 6 Orte daneben – Korrektur braucht eine Änderung an `social.sql` (eigener Plan).

## Review Focus

1. **Alter Fortschritt kommt nach der Umstellung noch einmal herein** (Supabase-Zeile, Offline-Cache eines zweiten Geräts, Gast-`korak-v6` mit `a2-13-*`-IDs) → er wird auf jedem Ladeweg migriert und nie doppelt umbenannt. Test in Task 3.
2. **Nutzer, die das alte A1 abgeschlossen haben**, öffnen die App → Souvenir „A1 abgeschlossen“ bleibt, begonnene B1-Kapitel (Ston …) bleiben offen. Test in Task 3.
3. **Lektion mit wenigen passenden Wörtern** (alles Phrasen, gleiche Bedeutung doppelt, leere Strings im Pool) → trotzdem genau 3 eindeutige, nicht leere Distraktoren, keine zweite richtige Antwort. Test in Task 4.
4. **Gerät ohne kroatische Stimme** (`hasTTS: false`) → keine Hör-Aufgaben, alle Session-Regeln trotzdem erfüllt. Test in Task 6.
5. **Falsche Antworten erzeugen Wiederholungen mitten in der Session** → eingefügte Wiederholungen verletzen weder „kein Wort direkt hintereinander“ noch „kein Typ zweimal hintereinander“. Test in Task 6.

---

## Dateistruktur

| Datei | Verantwortung |
|---|---|
| `engine/core.js` | Namensraum `KorakEngine`, RNG (`makeRng`, `shuffle`, `pick`), Textfunktionen (`norm`, `plain`, `missingDiacritics`) |
| `engine/concepts.js` | Konzept-Register mit Kurzerklärungen, Wortarten, Kategorien, Fälle, `autoConcepts(hr)` |
| `engine/distractors.js` | Distraktoren nach Wortart/Kategorie/Länge; Endungs-Optionen |
| `engine/tasks.js` | Aufgaben-Bausteine je Typ, `typingResult` |
| `engine/session.js` | Session-Generator, Regelprüfung, Wiederholungen einfügen |
| `engine/dna.js` | Fehler-DNA: zählen, aggregieren, schwächste Konzepte |
| `engine/migrate.js` | ID-Umbenennung für verschobene Kapitel, `migrateState` |
| `scripts/course-io.js` | Kursdateien laden und im bestehenden Format (eine Lektion pro Zeile) schreiben |
| `scripts/validate-course.js` | erweitert: Vorlage, Item-Felder, Konzept-Tags, stabile IDs, Querverweise |
| `tests/*.test.js`, `tests/fixtures/` | Unit-Tests (`node --test tests/`) |
| `tests/e2e/*.js` | Browser-Tests (Playwright, lokaler Server auf Port 8123) |
| `course/a1.js`, `course/a2.js`, `course/b1.js` | Inhalte (Items annotiert, neue A1-Orte, A2 auf Vorlage) |
| `app.js`, `account.js`, `cloud.js`, `coast.js`, `index.html`, `styles.css`, `service-worker.js`, `culture-data.js`, `exercise-data.js` | Integration |

Alle `engine/*.js` nutzen dasselbe Muster, damit sie im Browser und in Node laufen:

```js
(function (root, factory) {
  const api = factory(typeof require === "function" ? require : name => root.KorakEngine);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.KorakEngine = Object.assign(root.KorakEngine || {}, api);
})(typeof self !== "undefined" ? self : this, function (req) { /* … */ return { /* exports */ }; });
```

Abhängigkeiten zwischen Modulen: in Node `req("./core.js")`, im Browser liefert `req` den Namensraum (deshalb exportiert jedes Modul flach mit eindeutigen Namen). Ladereihenfolge in `index.html` vor `cloud.js`: `engine/core.js, engine/concepts.js, engine/migrate.js, engine/distractors.js, engine/tasks.js, engine/session.js, engine/dna.js`.

### Gemeinsame Datentypen

```ts
Item = { hr: string, de: string, key: string,            // key = "<lessonId>-<index>" (zur Laufzeit)
         pos?: Pos, category?: Category, gender?: "m"|"f"|"n",
         forms?: Partial<Record<Case, string>>, concepts?: string[] }
Task = { type: TaskType, key?: string, keys: string[],    // keys = alle Wörter der Aufgabe (match: 4)
         item?: Item, prompt: string, answer: string, options?: string[],
         words?: string[], pairs?: Item[], hint?: string, spoken?: string,
         concepts: string[], source: "new"|"due"|"dna"|"authored", block?: Task[] }
TaskType = "choice-de"|"choice-hr"|"listen-choice"|"input-hr"|"listen"|"cloze"|"order"
         |"match"|"ending"|"truefalse"|"dialogue"|"roleplay"|"scenario"|"fix"
```

Die Felder entsprechen den Objekten, die `app.js` heute schon rendert (`renderChoices`, `renderInput`, `renderOrder`, `renderMatch`, `renderFix`, `renderChat`); `keys`, `concepts`, `source`, `block` sind neu.

---

### Task 1: Engine-Grundgerüst, Konzept-Register, Testlauf

**Files:**
- Create: `engine/core.js`, `engine/concepts.js`, `tests/core.test.js`, `tests/concepts.test.js`
- Modify: `CLAUDE.md` (Abschnitt „Lokal testen“: `node --test tests/`)

**Interfaces:**
- Produces (`engine/core.js`): `makeRng(seed: number): () => number` (mulberry32, Werte in [0,1)); `shuffle<T>(arr: T[], rng): T[]` (neue Liste); `pick<T>(arr: T[], rng): T`; `norm(s): string` (identisch zu `norm` in `app.js`); `plain(s): string` (`norm` + Diakritika entfernt: č,ć→c, š→s, ž→z, đ→dj); `missingDiacritics(answer, target): string[]` (Buchstaben aus `target`, die in `answer` ohne Diakritikum stehen, z. B. `["č"]`).
- Produces (`engine/concepts.js`): `CONCEPTS: Record<string, {title: string, short: string}>`; `POS = ["noun","verb","adj","adv","pron","num","prep","conj","part","interj","phrase"]`; `CATEGORIES` (Liste unten); `CASES = ["nom","gen","dat","acc","ins","loc","voc"]`; `autoConcepts(hr: string): string[]`.

Konzept-IDs (Titel und eine Kurzerklärung auf Deutsch, 1–2 Sätze mit kroatischem Beispiel, schreibt der Implementierer): `gender`, `plural`, `case-gen`, `case-dat`, `case-acc`, `case-ins`, `case-loc`, `case-voc`, `adj-agreement`, `possessive`, `pronouns`, `verb-biti`, `verb-present`, `verb-past`, `verb-future`, `verb-modal`, `reflexive`, `aspect`, `imperative`, `conditional`, `negation`, `questions`, `clitic-order`, `numbers`, `time`, `prepositions`, `formal-address`, `politeness`, `diacritics-c` (č/ć), `diacritics-sz` (š/ž), `diacritics-dj` (đ/dž), `ijekavian`.

Kategorien: `greeting, people, family, food, drink, shopping, money, numbers, time, calendar, weather, nature, animals, sea, leisure, clothing, colors, body, health, home, city, travel, transport, work, school, office, feelings, celebration, communication, abstract`.

- [ ] **Step 1: Tests schreiben** – `tests/core.test.js`: `makeRng(1)` liefert zweimal hintereinander dieselbe Folge; `shuffle([1,2,3],rng)` enthält dieselben Elemente und verändert die Eingabe nicht; `plain("Čašu kave, molim!") === "casu kave molim"`; `plain("Đurđica") === "djurdjica"`; `missingDiacritics("casa", "čaša")` ergibt `["č","š"]`; `missingDiacritics("čaša","čaša")` ergibt `[]`. `tests/concepts.test.js`: jedes Konzept hat nicht leeres `title` und `short`; `autoConcepts("Čaša")` enthält `diacritics-c`; `autoConcepts("žlica")` enthält `diacritics-sz`; `autoConcepts("Đak")` und `autoConcepts("džep")` enthalten `diacritics-dj`; `autoConcepts("kava")` ist leer.
- [ ] **Step 2: Fehlschlag prüfen** – Run: `node --test tests/` → FAIL (Module fehlen).
- [ ] **Step 3: `engine/core.js` und `engine/concepts.js` im Modulmuster oben implementieren.**
- [ ] **Step 4: Tests grün** – Run: `node --test tests/` → alle PASS.
- [ ] **Step 5: Commit** – `git add engine tests CLAUDE.md && git commit -m "Engine: Grundgerüst, Konzept-Register, Unit-Tests"`

---

### Task 2: Kursschema v2, Kurs-IO und Validator

**Files:**
- Create: `scripts/course-io.js`, `tests/validate-course.test.js`, `tests/fixtures/course-ok/`, `tests/fixtures/course-bad/` (je drei kleine Level-Dateien + `course-data.js`-Kopie)
- Modify: `scripts/validate-course.js`, `course/a1.js`, `course/a2.js`, `course/b1.js` (nur Feld `status` je Level)

**Interfaces:**
- Consumes: `CONCEPTS, POS, CATEGORIES, CASES, autoConcepts` (Task 1).
- Produces (`scripts/course-io.js`): `loadCourse(dir = ROOT): {data, parts}` (lädt `course/*.js` + `course-data.js` in einer VM); `writeLevel(part, file)` – schreibt eine Level-Datei exakt im heutigen Format (Kopfkommentar, eine Lektion pro Zeile, `tests`-Array). Alle Inhalts-Tasks schreiben nur über diese Funktion.
- Produces (Schema): Level-Feld `status: "complete"|"draft"` (A1, A2, B1 zunächst `"draft"`); Lektionsfeld `fact: {title: string, text: string}`; Item-Felder `pos, category, gender, forms, concepts` (siehe Datentypen).
- Produces (CLI): `node scripts/validate-course.js [--compare <alt.js>] [--strict <chapterId,…>] [--dir <ordner>]` – Exit 1 bei Fehlern.

Regeln des Validators (Fehler = Exit 1):
- Für **jedes** Item, das `pos` hat: `pos ∈ POS`, `category ∈ CATEGORIES`, `concepts` nicht leer und ⊂ `CONCEPTS`, `autoConcepts(hr) ⊂ concepts`, `gender ∈ {m,f,n}` genau bei `pos === "noun"`, `forms` (falls vorhanden) hat nur Schlüssel aus `CASES`, nicht leere Werte und `nom`.
- **Vorlage** für Kapitel in Levels mit `status: "complete"` und für alle per `--strict` genannten Kapitel: 5 Lektionen + Test; jede Lektion ≥ 12 Items, alle annotiert; `dialogue` ≥ 4 Zeilen der Form `[Sprecher, kroatischer Satz]`; `grammar` nicht leer; `fact.title` und `fact.text` nicht leer; mindestens 3 Items je Kapitel mit `forms` aus ≥ 4 verschiedenen Formen. Level mit `status: "complete"` haben genau 12 Kapitel.
- **IDs:** Lektions-IDs eindeutig, Muster `^(a1|a2|b1|b2)-\d+-\d+$`; alle Lektionen eines Kapitels teilen das Präfix `<lv>-<k>`, Test = `<präfix>-test`; `number` zählt je Level lückenlos. (Die bisherige Regel „ID = Position“ entfällt, damit verschobene Kapitel stabile IDs behalten.)
- **Querverweise:** jedes `at` in `exercise-data.js` und jeder Schlüssel in `culture-data.js` verweist auf ein vorhandenes Kapitel bzw. eine Lektion.
- **`--compare`:** jede alte Lektions-ID existiert (direkt oder über `LESSON_MAP` aus Task 3, sobald vorhanden); alte Items stehen an gleicher Position mit gleichem `hr`/`de`; alte Dialogzeilen sind unverändert der Anfang des neuen Dialogs.
- Levels mit `status: "draft"`: Vorlage nur als Warnung.

- [ ] **Step 1: Fixtures + Test schreiben** – `tests/validate-course.test.js` startet den Validator per `child_process.spawnSync("node", ["scripts/validate-course.js","--dir",fixture])`: `course-ok` → Exit 0; `course-bad` enthält je einen Verstoß (doppelte ID, Nomen ohne `gender`, unbekanntes Konzept, fehlendes `autoConcepts`-Tag „diacritics-c“ bei „čaj“, Lektion mit 11 Items in einem `complete`-Level, Dialog mit 2 Zeilen, `at`-Verweis ins Leere) → Exit 1 und jede Meldung erscheint in der Ausgabe.
- [ ] **Step 2: Fehlschlag prüfen** – `node --test tests/validate-course.test.js` → FAIL.
- [ ] **Step 3: `scripts/course-io.js` implementieren und `validate-course.js` auf die Regeln oben erweitern.** `writeLevel` muss bei unveränderten Daten eine byte-identische Datei erzeugen.
- [ ] **Step 4: `status: "draft"` in allen drei Level-Dateien per `writeLevel` setzen.**
- [ ] **Step 5: Prüfen** – `node --test tests/` → PASS; `node scripts/validate-course.js` → Exit 0 (nur Warnungen); `node scripts/validate-course.js --compare <Kopie von origin/main>` → Exit 0.
- [ ] **Step 6: Commit** – `git commit -m "Validator: Level-Vorlage, Item-Felder, Konzept-Tags, stabile IDs"`

---

### Task 3: A2 auf 12 Orte, Alltags-Kapitel nach B1, Migration

**Files:**
- Create: `engine/migrate.js`, `tests/migrate.test.js`, `tests/e2e/migration.e2e.js`
- Modify: `course/a2.js`, `course/b1.js` (über `writeLevel`), `exercise-data.js`, `culture-data.js`, `coast.js`, `app.js`, `cloud.js`, `account.js`, `index.html`, `service-worker.js`

**Interfaces:**
- Produces (`engine/migrate.js`): `LESSON_MAP = {"a2-13":"b1-4","a2-14":"b1-5","a2-15":"b1-6","a2-16":"b1-7","a2-17":"b1-8","a2-18":"b1-9"}`; `CHAPTER_MAP = {"a2-ordinacija":"b1-ordinacija","a2-stanovanje":"b1-stanovanje","a2-susjedi":"b1-susjedi","a2-konoba":"b1-konoba","a2-kolodvor":"b1-kolodvor","a2-ured":"b1-ured"}`; `mapLessonId(id: string): string`; `mapItemKey(key: string): string` (`dialog-<id>` eingeschlossen); `migrateState(state): state` – neue Kopie, bildet `completed`, `testStars`-Schlüssel, `items`-Schlüssel und `lastLesson` ab; bei Kollision zweier Item-Einträge gewinnt der mit höherem `seen`; idempotent.
- Consumes: `writeLevel` (Task 2).

- [ ] **Step 1: Unit-Tests schreiben** – `tests/migrate.test.js`: Zustand mit `completed:["a2-13-1","a2-13-test","b1-1-2"]`, `testStars:{"a2-18-test":3}`, `items:{"a2-15-2-4":{seen:2},"dialog-a2-16-3":{seen:1}}`, `lastLesson:"a2-17-5"` → `completed` = `["b1-4-1","b1-4-test","b1-1-2"]`, `testStars` = `{"b1-9-test":3}`, Item-Schlüssel `b1-6-2-4` und `dialog-b1-7-3`, `lastLesson` = `"b1-8-5"`; `migrateState(migrateState(x))` ist tief gleich `migrateState(x)`; Eingabeobjekt bleibt unverändert; `a2-1-1`, `a2-12-test`, `b1-2-3` bleiben unverändert.
- [ ] **Step 2: Fehlschlag prüfen** – `node --test tests/migrate.test.js` → FAIL.
- [ ] **Step 3: `engine/migrate.js` implementieren.**
- [ ] **Step 4: Inhalte verschieben** (Skript im Scratchpad über `loadCourse`/`writeLevel`): A2-Kapitel 13–18 mit neuen Lektions-IDs, `level: "B1"`, neuen Kapitel-IDs aus `CHAPTER_MAP` und neu durchgezählter `number` an den Anfang von B1; B1-Reihenfolge danach: ordinacija, stanovanje, susjedi, konoba, kolodvor, ured, misljenje, karijera, drustvo. Inhalt (Items, Dialoge, Grammatik) unverändert.
- [ ] **Step 5: Verweise anpassen** – `exercise-data.js` (`at`), `culture-data.js` (Schlüssel), `coast.js` (Stations-IDs; `CROP` A2 `[300, 1400]`, B1 `[1250, 2090]`), `app.js` (`CHAPTER_ICON`, `FAMILY`), `plan.js` bleibt unverändert. Danach: `node scripts/validate-course.js --compare <origin/main-Kopie>` → Exit 0 (alte IDs über `LESSON_MAP` gefunden).
- [ ] **Step 6: Migration an allen Ladewegen einhängen** – `app.js` `load()` (Gast), `cloud.js` `fromRow()` (Server), `account.js` beim Lesen von `korak-user-<id>` (Cache): jeweils `KorakEngine.migrateState(...)`.
- [ ] **Step 7: Bestehende Fortschritte schützen** – `app.js` `chapterUnlocked`: zusätzlich `true`, wenn eine Lektion des Kapitels bereits in `state.completed` steht. Souvenir „A1 abgeschlossen“ (`achievementData`, id `a1`): `ok`, wenn die Tests `a1-1-test` … `a1-6-test` bestanden sind; Text „Bestehe die ersten sechs A1-Kapiteltests“.
- [ ] **Step 8a: Bestehende Browser-Suites ins Repo übernehmen** – Login/Konto, Wörterbuch, Übungstypen, Design, Inhalte, Hafen, Onboarding und das Mock-Backend nach `tests/e2e/` (Pfade relativ, Port 8123, Playwright über `require("playwright")` mit Rückfall auf `/opt/node22/lib/node_modules/playwright`); `tests/e2e/run-all.js` startet alle nacheinander und meldet je Suite bestanden/fehlgeschlagen. Run: `node tests/e2e/run-all.js` → alle bestanden.
- [ ] **Step 8: Browser-Test schreiben und ausführen** – `tests/e2e/migration.e2e.js` (Playwright, Muster wie die bisherigen Suites, Mock-Backend `tests/e2e/mockbackend.js`):
  (a) Gast mit `korak-v6` = `{completed:["a2-13-1","a1-1-test",…,"a1-6-test","b1-1-1"], items:{"a2-13-1-0":{seen:3,…}}}` → nach Laden `state.completed` enthält `b1-4-1`, Kapitel „Beim Hausarzt“ in B1 zeigt Lektion 1 erledigt, Souvenir „A1 abgeschlossen“ verdient, B1-Kapitel „Meinungen“ (Ston) ist offen; nach Neuladen identisch.
  (b) Angemeldeter Nutzer, dessen Server-Zeile `completed_lessons` mit `a2-16-test` enthält → Startseite zeigt den Fortschritt, die nächste gespeicherte Zeile auf dem Server enthält `b1-7-test` und kein `a2-16-*` mehr.
  Run: `node tests/e2e/migration.e2e.js` → „ALLE TESTS BESTANDEN“.
- [ ] **Step 9: Service Worker** – `CACHE` erhöhen, `engine/core.js`, `engine/concepts.js`, `engine/migrate.js` in `FILES` und in `index.html` (vor `cloud.js`).
- [ ] **Step 10: Alles prüfen** – `node --test tests/` → PASS; Validator → Exit 0; bestehende Browser-Suites (Login, Inhalte, Hafen, Onboarding) → bestanden.
- [ ] **Step 11: Commit** – `git commit -m "A2 auf 12 Orte: Alltags-Kapitel nach B1, Migration alter Fortschritte"`

---

### Task 4: Distraktoren

**Files:**
- Create: `engine/distractors.js`, `tests/distractors.test.js`

**Interfaces:**
- Consumes: `norm`, `shuffle` (Task 1).
- Produces: `pickDistractors(target: Item, pool: Item[], opts: {field: "hr"|"de", n?: number = 3, rng}): string[]`; `endingOptions(item: Item, caseKey: Case, opts: {n?: number = 3, rng}): string[]` (nur andere Formen desselben Wortes, ohne die richtige; weniger als `n`, wenn das Wort weniger verschiedene Formen hat).

Auswahl in Stufen, jede Stufe füllt nur auf: (1) gleiche `pos` + gleiche `category` + ähnliche Länge (|Δ Zeichen| ≤ max(3, 40 % der Ziellänge)); (2) gleiche `pos` + ähnliche Länge; (3) gleiche `pos`; (4) ähnliche Länge; (5) Rest. Immer ausgeschlossen: leere Werte, Werte mit gleichem `norm` wie das Ziel oder wie ein bereits gewählter Distraktor, Kandidaten, deren **anderes** Feld gleich dem des Ziels ist (zweite richtige Antwort).

- [ ] **Step 1: Tests schreiben** – Pool aus annotierten Fixture-Items: Ziel `{hr:"kava", de:"Kaffee", pos:"noun", category:"drink"}` → 3 Distraktoren, alle aus `category:"drink"`, wenn ≥ 3 vorhanden; Pool mit Duplikaten (`"Hallo"` zweimal), leeren Strings und einem Item mit `de:"Kaffee"` → keine leeren, keine doppelten Optionen, kein Kandidat mit `de:"Kaffee"` bei `field:"hr"`; Pool aus nur 2 brauchbaren Kandidaten → Ergebnislänge 2 (nie Platzhalter); `endingOptions({forms:{nom:"kava",gen:"kave",dat:"kavi",acc:"kavu",ins:"kavom",loc:"kavi"}}, "acc")` → 3 Werte aus `{kava,kave,kavi,kavom}`, ohne `kavu`, ohne Doppel; `endingOptions` für `{forms:{nom:"sok",gen:"soka",acc:"sok"}}`, `"gen"` → `["sok"]`.
- [ ] **Step 2: Fehlschlag prüfen** – `node --test tests/distractors.test.js` → FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Tests grün** – `node --test tests/` → PASS.
- [ ] **Step 5: Commit** – `git commit -m "Engine: Distraktoren nach Wortart, Kategorie und Länge"`

---

### Task 5: Aufgaben-Bausteine (inkl. Endung wählen, Richtig/Falsch, Dialog ergänzen)

**Files:**
- Create: `engine/tasks.js`, `tests/tasks.test.js`

**Interfaces:**
- Consumes: `pickDistractors`, `endingOptions` (Task 4); `missingDiacritics`, `norm`, `plain`, `shuffle`, `pick` (Task 1).
- Produces: `buildTask(type: TaskType, item: Item|null, ctx: {pool: Item[], lesson?: Lesson, dialogues?: Lesson[], rng, hasTTS: boolean}): Task|null` – `null`, wenn der Typ für dieses Item nicht möglich ist; `canBuild(type, item, ctx): boolean`; `typingResult(answer: string, target: string): {ok: boolean, near: boolean, missing: string[]}` (`near` = nur Diakritika fehlen; zählt als richtig); `TYPES_WITH_ITEM`, `LISTEN_TYPES = ["listen","listen-choice"]`, `RECOGNITION = ["choice-de","listen-choice","truefalse"]`.

Festlegungen je Typ (Prompt-Texte wie heute in `app.js` `ex()`; `options` immer gemischt, Länge 4 außer Richtig/Falsch):
- `choice-de`, `listen-choice`: Antwort `item.de`, Distraktoren `field:"de"`. `choice-hr`: Antwort `item.hr`, `field:"hr"`. Hör-Typen nur bei `hasTTS`.
- `input-hr`, `listen`: ohne `options`; Auswertung über `typingResult`.
- `cloze`, `order`: wie heute (`canCloze`/`canOrder` wandern als `canBuild` nach `engine/tasks.js`); `cloze`-Optionen über `pickDistractors` mit Einzelwörtern ähnlicher Länge.
- `match`: 4 Items aus `ctx.pool` inkl. `item`, eindeutige `hr`/`de`; `keys` = alle 4 Schlüssel.
- `ending` (neu): nur wenn `item.forms` mindestens 2 der Fälle `gen, acc, ins, loc` mit eigener Form hat. Zufälliger Fall, Rahmen: `gen` „bez ___“ (ohne), `acc` „Vidim ___.“ (Ich sehe …), `ins` „s ___“ bzw. „sa ___“ wenn die Form mit s, š, z oder ž beginnt (mit), `loc` „o ___“ (über). `prompt` = Rahmen, `hint` = „Welche Form von „<nom>“ (<de>) passt?“, `answer` = Form, `options` = Antwort + `endingOptions`, `concepts` = `["case-<fall>"]`.
- `truefalse` (neu): Aussage „„<hr>“ bedeutet „<de'>““; mit Wahrscheinlichkeit 0,5 `de' = item.de`, sonst ein Distraktor (`field:"de"`). `options = ["Richtig","Falsch"]` (feste Reihenfolge), `answer` entsprechend.
- `dialogue` (Dialog ergänzen): Lektion mit ≥ 2 Dialogzeilen; Zeile `i ≥ 1` zufällig, `prompt` = bis zu zwei vorherige Zeilen + „…“, `answer` = Zeile `i`, Distraktoren = Zeilen aus `ctx.dialogues` (andere Lektionen) ähnlicher Länge, eindeutig. `key` = `dialog-<lessonId>` (wie heute, bestehende Souvenir-Logik prüft dieses Präfix).
- Jede Aufgabe: `concepts` = `item.concepts` (bei `ending` der Fall), `keys` = `[item.key]`, sofern nicht anders festgelegt.

- [ ] **Step 1: Tests schreiben** – für jeden Typ mit Fixture-Items (Seeds 1–200): `options` (falls vorhanden) enthalten `answer` genau einmal, keine leeren und keine doppelten Werte (nach `norm`); `hasTTS:false` → `buildTask("listen", …) === null`; `ending` für „kava“ mit Fall `ins` → Prompt „s ___“, Antwort „kavom“; für „sok“ (`ins:"sokom"`) Prompt „sa ___“; Item ohne `forms` → `null`; `truefalse` liefert über 200 Seeds sowohl „Richtig“ als auch „Falsch“ als Antwort und bei „Falsch“ ist `de'` ≠ `item.de`; `dialogue` antwortet nie mit Zeile 0; `typingResult("casa","čaša")` → `{ok:true, near:true, missing:["č","š"]}`, `typingResult("kava","čaša")` → `ok:false`.
- [ ] **Step 2: Fehlschlag prüfen** – `node --test tests/tasks.test.js` → FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Tests grün** – `node --test tests/` → PASS.
- [ ] **Step 5: Commit** – `git commit -m "Engine: Aufgabentypen inkl. Endung wählen, Richtig/Falsch, Dialog ergänzen"`

---

### Task 6: Session-Generator

**Files:**
- Create: `engine/session.js`, `tests/session.test.js`, `tests/fixtures/session-items.js`

**Interfaces:**
- Consumes: `buildTask`, `canBuild`, `RECOGNITION`, `LISTEN_TYPES` (Task 5); `makeRng`, `shuffle` (Task 1).
- Produces:
  - `buildSession(opts: {newItems: Item[], dueItems?: Item[], dnaItems?: Item[], pool: Item[], lesson?: Lesson, dialogues?: Lesson[], authored?: Task[][], size?: number = 20, mix?: {new: .6, due: .25, dna: .15}, weights?: PlanWeights|null, hasTTS: boolean, rng}): Task[]`
  - `checkSession(tasks: Task[], opts: {minWords: number, maxPerWord: number = 3}): string[]` – Liste der Regelverstöße (leer = gültig).
  - `insertRetry(queue: Task[], pos: number, task: Task): number` – fügt `task` frühestens bei `pos + 2` ein, an der ersten Stelle, an der weder Typ noch ein Wort mit den Nachbarn übereinstimmt (sonst ans Ende); gibt den Index zurück.

Regeln, die `buildSession` garantiert und `checkSession` prüft:
- Länge = `size` (20), sofern der Pool ≥ 10 verschiedene Wörter hat; sonst so lang wie mit den Regeln möglich.
- ≥ `min(10, verfügbare Wörter)` verschiedene Wörter (`keys`); kein Wort in zwei aufeinanderfolgenden Aufgaben; jedes Wort ≤ 3×; kein Typ zweimal hintereinander. Ein Autoren-Block (z. B. dreizügiges Rollenspiel) ist **ein** Platz mit Typ des Blocks; `block` enthält die Einzel-Bildschirme.
- Quellen-Ziel bei `size = 20`: 12 neu / 5 fällig / 3 Fehler-DNA; fehlt eine Quelle, füllen die neuen Items auf. `task.source` ist gesetzt.
- Pro Wort steht eine Wiedererkennungs-Aufgabe (`RECOGNITION`) vor der ersten Produktions-Aufgabe (`input-hr`, `listen`, `choice-hr`, `cloze`, `order`, `ending`).
- `weights` (aus `Plan.weights()`, Form wie in `plan.js`) gewichtet die Typwahl für neue Items; ohne `weights` gleiche Häufigkeiten wie heute in `prodType`/`recogType`.
- Ohne TTS keine `LISTEN_TYPES`.

Vorgehen (Algorithmus nicht durch Signatur bestimmt): Kandidaten-Aufgaben je Quelle erzeugen, dann gierig die Reihenfolge aufbauen – jeweils zufällig unter den Kandidaten wählen, die alle Regeln mit der bisherigen Folge erfüllen; bei Sackgasse bis zu 50 Neustarts mit dem nächsten Zufallswert, danach die beste gefundene Folge.

- [ ] **Step 1: Tests schreiben** – Fixture: 12 Lektions-Items, 8 fällige, 6 DNA-Items (alle annotiert, einige mit `forms`), 2 Autoren-Blöcke. Für Seeds 1–300 mit `hasTTS` true und false: `checkSession(...)` ist leer; Länge 20; Quellen 12/5/3; ohne `dueItems` und `dnaItems` → 20 Aufgaben alle `source:"new"`; nur 3 fällige Items → `due` = 3, `new` = 14; Pool mit nur 4 Wörtern → `checkSession` leer, Länge ≤ 12; Wiedererkennung vor Produktion je Wort; `insertRetry` an 1000 zufälligen Positionen erzeugt nie Verstöße gegen Typ- oder Wort-Nachbarschaft.
- [ ] **Step 2: Fehlschlag prüfen** – `node --test tests/session.test.js` → FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Tests grün** – `node --test tests/` → PASS (Laufzeit < 10 s).
- [ ] **Step 5: Commit** – `git commit -m "Engine: Session-Generator mit Regeln und Mischung neu/fällig/Fehler-DNA"`

---

### Task 7: Fehler-DNA

**Files:**
- Create: `engine/dna.js`, `tests/dna.test.js`

**Interfaces:**
- Consumes: `CONCEPTS` (Task 1).
- Produces: `record(stat: ItemStat, concepts: string[], ok: boolean): ItemStat` – erhöht `stat.dna[c] = [richtig, falsch]` je Konzept (legt `dna` an, verändert und gibt `stat` zurück); `aggregate(items: Record<string, ItemStat>): Record<string, {right: number, wrong: number}>`; `weakest(items, n = 3): {id, title, short, right, wrong, score}[]` – nur Konzepte mit `wrong ≥ 1`, `score = wrong / (right + wrong + 2)`, absteigend nach `score`, dann `wrong`; `itemsForConcepts(conceptIds: string[], candidates: Item[], n: number, rng): Item[]` – Items, die das erste Konzept tragen, aufgefüllt mit dem nächsten.

- [ ] **Step 1: Tests schreiben** – `record({}, ["case-acc"], false)` → `{dna:{"case-acc":[0,1]}}`; dreimal falsch bei `case-acc`, einmal falsch + fünfmal richtig bei `case-gen`, nur richtig bei `gender` → `weakest(...,3)` = `["case-acc","case-gen"]` in dieser Reihenfolge, Einträge haben `title`/`short` aus dem Register; Item-Statistiken ohne `dna` (alte Daten) → `weakest` = `[]`; unbekannte Konzept-IDs in alten Daten werden ignoriert; `itemsForConcepts(["case-acc"], …, 3)` liefert nur Items mit `case-acc`, solange vorhanden.
- [ ] **Step 2: Fehlschlag prüfen** – `node --test tests/dna.test.js` → FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Tests grün** – `node --test tests/` → PASS.
- [ ] **Step 5: Commit** – `git commit -m "Engine: Fehler-DNA pro Konzept"`

---

### Task 8: Integration in die App

**Files:**
- Modify: `app.js`, `index.html`, `styles.css`, `service-worker.js`
- Create: `tests/e2e/engine.e2e.js`

**Interfaces:**
- Consumes: `buildSession`, `insertRetry`, `checkSession` (Task 6); `buildTask`, `typingResult` (Task 5); `record`, `weakest`, `itemsForConcepts` (Task 7); `CONCEPTS` (Task 1).
- Produces (app.js): `sessionFor(kind: "lesson"|"test"|"review"|"wrong"|"random"|"dna", lesson?: Lesson): Task[]` – ersetzt `makeNormal`, `makeTest` und die Zusammenstellung in `startReview`, `startWrongPractice`, `startRandom`.

Quellen je Art (immer 20 Plätze, Regeln aus Task 6):
- `lesson`: neu = Items der Lektion; fällig = `due()`; DNA = `itemsForConcepts(weakest(state.items,3).map(c=>c.id), gelernte Items, 3)`; Autoren-Blöcke wie heute `authoredForLesson`.
- `test`: neu = alle Items des Kapitels, keine fälligen/DNA, Autoren-Blöcke wie heute `authoredForChapter(…, 2)`.
- `review`: fällig zuerst, aufgefüllt mit zuletzt gelernten Items. `wrong`: `wrongItems()`. `random`: freigeschaltete Items. `dna`: Items der drei schwächsten Konzepte, aufgefüllt mit gelernten Items.

- [ ] **Step 1: Browser-Test schreiben** – `tests/e2e/engine.e2e.js`: Lektion `a1-3-1` starten → 20 Aufgaben (`queue.length` vor der ersten Antwort), `checkSession(queue)` leer; eine `ending`-Aufgabe (per Seed erzwungen) zeigt Rahmen und 4 Optionen, richtige Wahl → „Richtig“; `truefalse` zeigt „Richtig“/„Falsch“; „casa“ auf „čaša“ getippt → zählt richtig, Rückmeldung nennt „č, š“, `state.items[key].dna["diacritics-c"][1] === 1`; drei falsche `ending`-Antworten im Akkusativ → Profil zeigt unter „Deine Stolpersteine“ „Akkusativ“ mit Kurzerklärung; Üben › „Schwachstelle üben“ startet eine Session, deren DNA-Aufgaben `case-acc` tragen; Abschlussbildschirm zeigt `fact.title` der Lektion; nach falscher Antwort keine zwei gleichen Typen/Wörter hintereinander bis Sessionende; ohne TTS (Playwright: `speechSynthesis` entfernt) keine Hör-Aufgaben. Breite 375 px: kein Element ragt über den Rand.
- [ ] **Step 2: Fehlschlag prüfen** – `node tests/e2e/engine.e2e.js` → FAIL.
- [ ] **Step 3: `sessionFor` in `app.js` implementieren** und alle Start-Funktionen darauf umstellen; Wiederholungen nach falschen Antworten über `insertRetry`.
- [ ] **Step 4: Darstellung** – `ending` und `truefalse` über das vorhandene `renderChoices`; `KIND`-Texte: `ending` „Endung wählen“, `truefalse` „Richtig oder falsch?“; Tipp-Auswertung über `typingResult` (Rückmeldung „Fast perfekt – achte auf č, š“). `cultureFor(l)` bevorzugt `l.fact`.
- [ ] **Step 5: Fehler-DNA** – in `check()` nach `schedule(...)`: `record(state.items[q.key], q.concepts, ok && !near)`, bei `near` zusätzlich `record(…, ["diacritics-…"], false)` für die fehlenden Buchstaben. Profil: neuer Block „Deine Stolpersteine“ (3 schwächste Konzepte: Titel, Kurzerklärung, „x von y richtig“; leer: „Noch keine Stolpersteine – weiter so!“). Üben: neue Aktion „Schwachstelle üben“ (vorhandene `.action`-Gestaltung) → `sessionFor("dna")`. Bestehende Aktionen bleiben.
- [ ] **Step 6: Service Worker und Skripte** – `CACHE` erhöhen; alle `engine/*.js` in `FILES` und `index.html`.
- [ ] **Step 7: Prüfen** – `node tests/e2e/engine.e2e.js` → bestanden; `node --test tests/` → PASS; alle bestehenden Browser-Suites bestanden.
- [ ] **Step 8: Commit** – `git commit -m "App nutzt Lern-Engine: 20er-Sessions, neue Aufgabentypen, Fehler-DNA im Profil"`

---

### Tasks 9–13: Inhalte (gemeinsame Vorgaben)

Jeder Inhalts-Task arbeitet nur über `loadCourse`/`writeLevel`, hängt Items und Dialogzeilen **an** und ändert keine vorhandenen `hr`/`de`.

- **Item-Annotation:** `pos`, `category`, `concepts` (inkl. `autoConcepts`), `gender` bei Nomen; `forms` (Singular: `nom, gen, dat, acc, ins, loc`, `voc` wo üblich) für mindestens 3 Nomen je Kapitel. Sätze/Wendungen: `pos:"phrase"`, Konzepte nach der Grammatik, die sie zeigen (z. B. `verb-present`, `case-acc`, `formal-address`).
- **Neue Items** im Stil der bestehenden: gemischt Einzelwörter (mit Artikel-freier Grundform) und kurze Alltagssätze, Deutsch natürlich, Kroatisch ijekavisch.
- **Dialog** ≥ 4 Zeilen `["A", …], ["B", …]`; vorhandene Zeilen bleiben vorn.
- **„Wusstest du?“** `fact: {title, text}` – 1–3 Sätze Landeskunde, Bezug zum Ort oder Thema. Vorhandene Lektionstexte aus `culture-data.js` können übernommen werden.
- **Sprachprüfung im Review:** Diakritika, Ijekavisch (*mlijeko, vrijeme, lijepo, dvije*), Fallformen in `forms`, Genus, Höflichkeitsform; der Reviewer liest jede neue Zeile.
- **Prüfung je Task:** `node scripts/validate-course.js --strict <Kapitel-IDs des Tasks>` → Exit 0; `node scripts/validate-course.js --compare <origin/main-Kopie>` → Exit 0; `node --test tests/` → PASS.

### Task 9: A1 Kapitel 1–6 auf die Vorlage
- Modify: `course/a1.js`, `culture-data.js` (nur falls Lektionstexte in `fact` übernommen werden)
- [ ] **Step 1:** Alle 240 vorhandenen Items annotieren.
- [ ] **Step 2:** Je Lektion ≥ 4 Items anhängen (→ ≥ 12), Dialoge auf ≥ 4 Zeilen, `fact` ergänzen.
- [ ] **Step 3:** Prüfung (gemeinsame Vorgaben) mit `--strict a1-begruessung,a1-obitelj,a1-hrana,a1-kupovina,a1-putovanje,a1-svakodnevica`.
- [ ] **Step 4:** Commit `"A1 Kapitel 1–6: Items annotiert und auf Vorlage gebracht"`

### Task 10: A1 neue Orte 7–9 (Baška, Cres, Lošinj)
- Modify: `course/a1.js`, `coast.js`, `culture-data.js`, `app.js` (`CHAPTER_ICON`)
- [ ] **Step 1:** Kapitel `a1-kalendar` (Baška, „Uhrzeit & Kalender“), `a1-priroda` (Cres, „Natur & Tiere“), `a1-more` (Lošinj, „Meer & Freizeit“) als A1-Kapitel 7–9 mit Lektions-IDs `a1-7-*` … `a1-9-*`, je 5 Lektionen + Test, volle Vorlage.
- [ ] **Step 2:** Stationen in `coast.js` nach Krk einfügen (Wahrzeichen: `beach` für Baška, neu `bird` – Gänsegeier – für Cres, neu `dolphin` für Lošinj); `CROP.A1` so erweitern, dass alle A1-Orte sichtbar sind; Kapitel-Infobox in `culture-data.js`.
- [ ] **Step 3:** Prüfung mit `--strict a1-kalendar,a1-priroda,a1-more`; Screenshot der A1-Karte bei 375 px ansehen: Orte, Namen und Route überlappen nicht.
- [ ] **Step 4:** Commit `"A1: neue Orte Baška, Cres, Lošinj"`

### Task 11: A1 neue Orte 10–12 (Susak, Crikvenica, Novi Vinodolski)
- Modify: wie Task 10
- [ ] **Step 1:** Kapitel `a1-odjeca` (Susak, „Kleidung & Farben“), `a1-zanimanja` (Crikvenica, „Berufe & Schule“), `a1-blagdani` (Novi Vinodolski, „Feste & Glückwünsche“) als A1-Kapitel 10–12 (`a1-10-*` … `a1-12-*`), volle Vorlage.
- [ ] **Step 2:** Stationen (Susak als kleine Insel neu in `ISLANDS`, Wahrzeichen neu `costume`; Crikvenica `palm`; Novi Vinodolski `fort`), Kapitel-Infoboxen.
- [ ] **Step 3:** A1-Level auf `status: "complete"` setzen. Prüfung: `node scripts/validate-course.js` (ohne `--strict`) → Exit 0 mit A1 = 12 Kapitel; Karten-Screenshot wie in Task 10.
- [ ] **Step 4:** Commit `"A1: neue Orte Susak, Crikvenica, Novi Vinodolski – A1 komplett nach Vorlage"`

### Task 12: A2 Kapitel 1–6 auf die Vorlage
- Modify: `course/a2.js`
- [ ] **Step 1:** Items annotieren, je Lektion auf ≥ 12 Items, Dialoge ≥ 4 Zeilen, `fact`.
- [ ] **Step 2:** Prüfung mit `--strict a2-proslost,a2-buducnost,a2-smjestaj,a2-restoran,a2-svakodnevica,a2-posao`.
- [ ] **Step 3:** Commit `"A2 Kapitel 1–6 auf Vorlage"`

### Task 13: A2 Kapitel 7–12 auf die Vorlage
- Modify: `course/a2.js`
- [ ] **Step 1:** wie Task 12 für `a2-hitno, a2-promet, a2-dom, a2-vrijeme, a2-novac, a2-tijelo`.
- [ ] **Step 2:** A2 auf `status: "complete"`; `node scripts/validate-course.js` → Exit 0 mit A2 = 12 Kapitel.
- [ ] **Step 3:** Commit `"A2 komplett nach Vorlage"`

---

### Task 14: Abschluss und Verifikation

**Files:**
- Modify: `CLAUDE.md` (Engine-Module, Testbefehle, Item-Felder, Migration), `README.md` (Abschnitt „Neu“), `service-worker.js` (letzte `CACHE`-Erhöhung)

- [ ] **Step 1:** `node scripts/validate-course.js` → Exit 0, Ausgabe zeigt A1: 12, A2: 12, B1: 9 (Entwurf).
- [ ] **Step 2:** `node scripts/validate-course.js --compare <origin/main-Kopie>` → Exit 0.
- [ ] **Step 3:** `node --test tests/` → alle PASS.
- [ ] **Step 4:** `node tests/e2e/run-all.js` → alle Suites (Login/Konto, Wörterbuch, Übungstypen, Design, Inhalte, Hafen, Onboarding, Migration, Engine) bestanden.
- [ ] **Step 5:** Screenshots 375 px: Startseite, A1-Karte, A2-Karte, B1-Karte, je eine Aufgabe „Endung wählen“ und „Richtig/Falsch“, Profil mit Stolpersteinen – ansehen und Auffälligkeiten beheben.
- [ ] **Step 6:** Dokumentation aktualisieren, Commit, Push auf `feature/lern-engine`, Pull Request mit Änderungsliste und Handy-Testliste.
