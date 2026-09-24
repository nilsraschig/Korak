# Korak – Designwelt „Stein & Meer“

Korak heißt „Schritt“. Die App soll sich anfühlen wie ein Spaziergang über dalmatinische
Trittsteine am Meer: ruhig, hell, präzise – und bei jeder Antwort spürbar lebendig.

## Farben
| Token | Wert | Rolle |
|---|---|---|
| `--stone` | `#f2f3f0` | Kalkstein, Hintergrund (kühl, bewusst kein Creme) |
| `--paper` | `#fbfbf9` | erhöhte Flächen (Antworten, Karten mit Funktion) |
| `--ink` | `#13262b` | Adria-Tinte, Text und Dock |
| `--sea` | `#0e7a68` | **einziger Akzent** (aus dem App-Icon): Fortschritt, Primäraktionen, „richtig“ |
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
- Einzige Dauerschleife: der atmende Ring um den aktuellen Trittstein.
- Kurven: `--ease` (expo-out) für Wege, `--spring` für Bestätigungen. `prefers-reduced-motion` schaltet alles ab.

## Regeln
- Keine Emojis in der Oberfläche – Icons sind eigene SVG-Symbole im Sprite in `index.html`
  (Kapitel-Icons über `CHAPTER_ICON` in `app.js`, `course-data.js` bleibt unverändert).
- Karten nur, wo Erhöhung etwas bedeutet (Antworten, Aktionen, Kennzahl). Sonst Listen mit Trennlinien.
- Rot und Gold nie dekorativ verwenden.
