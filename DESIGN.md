# Korak – Designwelt „Plavo more“ (Blaues Meer)

Korak heißt „Schritt“. Die App fühlt sich an wie ein heller Tag an der Adria: klares, helles Blau,
Licht, das über das Wasser wandert, und Trittsteine, über die man Schritt für Schritt vorankommt.

## Farben
| Token | Wert | Rolle |
|---|---|---|
| `--stone` | `#eef5fd` | helles Adria-Blau, Hintergrund |
| `--paper` | `#fbfdff` | erhöhte Flächen (Antworten, Aktionen, Kennzahl) |
| `--ink` | `#0f2540` | Marineblau, Text und Dock |
| `--sea` | `#1f6fca` | **einziger Akzent**: Fortschritt, Primäraktionen, „richtig“ (Weiß darauf 5,0 : 1) |
| `--sea-tint` / `--sea-wash` | `#dcebfb` / `#eaf3fe` | helle Blauflächen |
| `--red` | `#b34a3e` | entsättigtes Šahovnica-Rot, ausschließlich für Fehler |
| `--gold` | `#c3912a` | ausschließlich Sterne und Grammatiktipps |

## Typografie
- **Bricolage Grotesque** (Display): Überschriften, große Zahlen, Levelcodes, Wortmarke „korak“ in Kleinbuchstaben.
- **Geist** (Text/UI): alles andere, Zahlen tabellarisch.
- Skala im Verhältnis 1,25 (`--t-xs` … `--t-4xl`). Keine Versal-Labels, keine Punkt-Trenner in Metazeilen.

## Signatur
- **Treppe** auf der Startseite: Gesamtfortschritt als zehn ansteigende Stufen.
- **Trittstein-Pfad** im Kurs: Lektionen als Steine im Zickzack, verbunden durch eine Linie,
  deren erledigter Teil sich beim Öffnen zeichnet. Kapiteltests sind auf die Spitze gestellte Steine.
- **Stufen-Zeichen** als Logo und als Abschlussanimation.

## Bewegung
- Ein Auftritt pro Ansichtswechsel (gestaffelt, 70 ms Versatz), sonst nur Bewegung als Antwort auf Aktionen:
  Dock-Indikator gleitet, Feedback-Blatt steigt auf, falsche Antworten schütteln, richtige „poppen“.
- Dauerschleifen bewusst leise: wanderndes Licht im Hintergrund, Wellen unter der Treppe, atmender Ring
  um den aktuellen Trittstein, flackernde Serien-Flamme, Schimmer auf dem Lektionsbalken.
- Belohnung: Welle beim Tippen (Ripple), Lichtkante unter dem Cursor, Partikel und „+8 XP“ bei richtigen
  Antworten, Konfetti ab 70 % am Lektionsende.
- Kurven: `--ease` (expo-out) für Wege, `--spring` für Bestätigungen. `prefers-reduced-motion` schaltet alles ab.

## Regeln
- Keine Emojis in der Oberfläche – Icons sind eigene SVG-Symbole im Sprite in `index.html`
  (Kapitel-Icons über `CHAPTER_ICON` in `app.js`, `course-data.js` bleibt unverändert).
- Karten nur, wo Erhöhung etwas bedeutet (Antworten, Aktionen, Kennzahl). Sonst Listen mit Trennlinien.
- Rot und Gold nie dekorativ verwenden.

## Aussprache
Die Sprachausgabe wählt die beste Stimme des Geräts: Kroatisch, sonst Bosnisch/Serbisch (gleiche
Aussprache der lateinischen Schrift), natürliche/neuronale Stimmen bevorzugt. Stimme und Tempo sind
unter Profil › Aussprache einstellbar; fehlt eine kroatische Stimme, erklärt die App, wie man sie installiert.
