# Korak Version 11 – „Put uz obalu“

Live: **https://korak-hr.netlify.app**

## Neu in Version 11
- **Design „Put uz obalu“** (siehe `DESIGN.md`): Reise entlang der Küste von Poreč bis Dubrovnik.
  Papier- und Aquarell-Look, Mosaik als wiederkehrendes Element, Schriften Fraunces, Caveat und Geist.
- **Vala**, die Mauereidechse (`vala.js`): begleitet durch die App, hüpft bei richtigen Antworten,
  legt bei falschen den Kopf schief und sammelt **Souvenirs** (ersetzen die Erfolge, gleiche Bedingungen,
  dazu neu „Mosaikstein“ für 10 Lektionen).
- **Küstenkarte** als Lernpfad (`coast.js`): jedes Kapitel ist ein Ort mit Wahrzeichen; nach einem
  bestandenen Kapiteltest reist Vala zur nächsten Station.
- Sanfte Welle statt Konfetti, leichter Parallax auf der Startseite, optionale Klänge (`sound.js`,
  standardmäßig aus, Schalter unter Profil › Klänge).
- **Wörterbuch-Widget** HR ⇄ DE wieder da (`dictionary.js`): schwebender Knopf, Suche in beide Richtungen,
  Aussprache, offline, im Gast- und Konto-Modus.
- **Reihe „Alltag in Kroatien“** (A2, Kapitel 13–18): Arztbesuch, Wohnungssuche, Small Talk mit Nachbarn,
  Restaurant, Bahnhof & ÖPNV, Behördengang – plus **Kultur-Infoboxen** (`culture-data.js`).
- **Neue Übungstypen** (`exercise-data.js`): Mini-Rollenspiel, „Was würdest du sagen?“ (Speisekarte,
  Schild, Fahrplan, Notiz) und Fehler-Korrektur – gemischt in Lektionen, Tests und „Zufällig mischen“.
- Login, Profile, Fortschritt, XP und Serie funktionieren unverändert; es ist keine Datenbank-Änderung nötig.

# Version 10 – A1, A2 & B1-Einstieg

## Neu in Version 10: Konten
- Registrierung und Login mit **Username + Passwort** (intern über Supabase Auth), Sitzung bleibt bis zum Abmelden.
- Fortschritt wird bei jeder Änderung sofort in **Supabase** gespeichert und auf allen Geräten synchronisiert;
  localStorage dient als Offline-Cache. Gleichzeitiges Lernen auf mehreren Geräten wird zusammengeführt.
- Beim ersten Login wird angeboten, vorhandenen Gast-Fortschritt ins Konto zu übernehmen.
- „Ohne Account weitermachen“ (Gastmodus) funktioniert wie bisher rein lokal.
- Einrichtung: siehe [`supabase/README.md`](supabase/README.md); Zugangsdaten in `config.js`.

## Neu in Version 9
- Helles blaues Design „Plavo more“ mit mehr Bewegung: wanderndes Licht, Wellen, Ripple-Effekt,
  Partikel und XP-Anzeige bei richtigen Antworten, Konfetti am Lektionsende.
- Kroatische Aussprache: automatische Wahl der besten kroatischen Stimme (Ausweich auf Bosnisch/Serbisch),
  Langsam-Taste, Stimme und Tempo unter Profil › Aussprache, Installationshilfe bei fehlender Stimme.

## Neu in Version 8
- Komplett neues Design „Stein & Meer“ (siehe `DESIGN.md`): eigene Typografie, SVG-Icons statt Emojis,
  Trittstein-Lernpfad, Treppe als Fortschritt, Dock-Navigation, Feedback-Blatt in Lektionen,
  animierte Übergänge mit Rücksicht auf „Bewegung reduzieren“.

## Neu in Version 7
- **Mehr Inhalt:** 5 neue A2-Kapitel (Verkehr & Unterwegs, Wohnung & Zuhause, Wetter & Jahreszeiten,
  Einkaufen & Geld, Körper & Wohlbefinden) und ein neues Level **B1** mit 3 Kapiteln
  (Meinungen & Diskussion, Beruf & Karriere, Medien & Gesellschaft).
  Insgesamt 126 Lektionen inklusive 21 Kapiteltests, 840 Vokabeln/Sätze.
- **Neue Übungstypen:** Paare verbinden, Lückentext, Satz bauen, Hörverständnis (Bedeutung wählen)
  und „Was passt nicht?“. Aufgaben werden pro Begriff zufällig aus einem Pool gezogen.
- **Design:** Farb-/Radius-/Schatten-Tokens, Typografie-Skala, Übergänge und Feedback-Animationen,
  Fokus-Modus in Lektionen, Tastatursteuerung (1–5, Enter).

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
