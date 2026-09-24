# Korak Version 7 – A1, A2 & B1-Einstieg

## Neu in Version 7
- **Mehr Inhalt:** 5 neue A2-Kapitel (Verkehr & Unterwegs, Wohnung & Zuhause, Wetter & Jahreszeiten,
  Einkaufen & Geld, Körper & Wohlbefinden) und ein neues Level **B1** mit 3 Kapiteln
  (Meinungen & Diskussion, Beruf & Karriere, Medien & Gesellschaft).
  Insgesamt 126 Lektionen inklusive 21 Kapiteltests, 840 Vokabeln/Sätze.
- **Neue Übungstypen:** Paare verbinden, Lückentext, Satz bauen, Hörverständnis (Bedeutung wählen)
  und „Was passt nicht?“. Aufgaben werden pro Begriff zufällig aus einem Pool gezogen.
- **Wörterbuch-Widget:** Button „Aa“ unten rechts (in Lektionen oben rechts), sucht offline in
  beide Richtungen durch den gesamten Kurswortschatz – auch mit Tippfehlern und ohne Akzente.
- **Design:** Farb-/Radius-/Schatten-Tokens, Typografie-Skala, Übergänge und Feedback-Animationen,
  Fokus-Modus in Lektionen, Tastatursteuerung (1–5, Enter).

## Kursdaten prüfen
Nach jeder Änderung an `course-data.js`:

```
node tools/validate-course.js
```

Das Skript prüft doppelte IDs, Nummerierung, Test-IDs und die Verknüpfung zwischen
`levels[].chapters[].lessons` und dem flachen `lessons`-Array.

## Frühere Version 5
- Startbildschirm und Design aus Version 4 bleiben erhalten.
- A1 ist jetzt in 6 übersichtliche Kapitel gegliedert.
- A2 wurde mit 7 vollständigen Kapiteln ergänzt.
- Insgesamt 78 Lektionen inklusive 13 Kapiteltests.
- 65 reguläre Lektionen mit jeweils 20+ Aufgaben.
- Kapiteltests mit ungefähr 30 gemischten Aufgaben.
- Kleine Grammatikhinweise statt langer Grammatikseiten.
- Praktische Mini-Dialoge in jeder regulären Lektion.
- Hörübungen, Übersetzungen und Multiple Choice.
- A1 und A2 verwenden exakt dasselbe Kursprinzip.
- Fortschritt, XP, Wiederholungen und häufig falsche Fragen bleiben erhalten.
- Vorhandener Fortschritt aus Version 4 wird soweit möglich automatisch übernommen.

## Veröffentlichung
1. ZIP entpacken.
2. Alle Dateien in die oberste Ebene des GitHub-Repositories hochladen.
3. Vorhandene Dateien ersetzen.
4. Änderungen committen.
5. Netlify veröffentlicht die neue Version automatisch.

Nach dem Deployment bei Bedarf die Website einmal vollständig neu laden, damit der neue Service Worker aktiv wird.
