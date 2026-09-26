# Korak – Designwelt „Put uz obalu“ (Weg entlang der Küste)

Korak heißt „Schritt“. Die App ist eine Reise entlang der kroatischen Küste, von Poreč in Istrien bis
Dubrovnik. Sie soll sich anfühlen wie ein handgezeichnetes Reisetagebuch: Papier, Aquarell, Tinte,
Mosaiksteine – nicht wie eine generische App mit Verläufen, Glas und glatten 3D-Icons.

## Farben
| Token | Wert | Rolle |
|---|---|---|
| `--stone` | `#f3ede1` | Papiergrund (mit Körnung über `.paperGrain`) |
| `--paper` | `#fbf7ee` | Karten, erhöhte Flächen |
| `--ink` / `--deep` | `#14324a` | tiefes Meerblau: Text, Tintenränder, Dock |
| `--sea` | `#0f6b73` | Türkis, tief: Primäraktionen, Fortschritt, „richtig“ (Weiß darauf 6,2 : 1) |
| `--turq` | `#2f9c98` | Türkis, hell: Wasser, Balken, Details |
| `--terra` / `--terra-ink` | `#c0643d` / `#9a4526` | Terrakotta: Kapiteltests, Handschrift-Beschriftungen (dunkle Variante für kleine Schrift) |
| `--sand` | `#e6d3ae` | Sand: versetzte „Druck“-Schatten unter Karten, Land auf der Karte |
| `--olive` | `#6f7a3b` | Olivgrün: erfüllte Tagesziele, B1 |
| `--sun` | `#e7ae2f` | Sonnengelb: **nur Akzent** (aktueller Ort, Wörterbuch-Knopf, Sterne) |
| `--red` | `#a63a2a` | Ziegelrot: ausschließlich Fehler |

Keine dekorativen Farbverläufe. Flächen sind flach und bekommen ihre Lebendigkeit über Papierkörnung,
den Aquarellfilter und Tintenränder.

## Typografie
- **Fraunces** (Display, weiche Variante `SOFT 100`, `WONK 1`): Überschriften, große Zahlen, Levelcodes,
  Wortmarke „korak“. Seitentitel kursiv – warm und redaktionell.
- **Caveat** (Handschrift): alles, was „jemand ins Reisetagebuch geschrieben“ hat – Grüße, Valas Sprechblase,
  Ortsnamen auf der Karte, Regionsnamen, „Nächster Halt“, kroatische Souvenir-Namen.
- **Geist** (Text/UI): alles andere, Zahlen tabellarisch.
- Alle drei Schriften enthalten č ć đ š ž.

## Formen
- Organische Rundungen: Radien nie ganz gleichmäßig (`--r-s`, `--r-m`, `--r-l`, `--r-btn`).
- Karten mit Bedeutung haben einen Tintenrand (`1.8px var(--ink)`) und einen versetzten Sand-Schatten
  statt weicher Unschärfe – wie ein aufgeklebtes Stück Papier.
- Buttons haben eine „gedrückte“ Unterkante (`box-shadow: 0 3px 0`) und sinken beim Tippen ein.

## Signatur
- **Vala** (`vala.js`): eine freche Mauereidechse im Kinderbuch-Stil, als SVG aus Einzelteilen
  (Schwanz, Körper, Beine, Kopf, Tasche) mit Aquarell- (`#paint`) und Tintenfilter (`#ink`).
  Posen per CSS-Klasse: `idle` (atmet, blinzelt), `jump` (richtige Antwort), `tilt` (legt den Kopf schief,
  Fragezeichen – falsche Antwort), `cheer` (Abschluss, Ankunft), `walk` (Reise auf der Karte).
  Die Zeichnung kann später 1:1 durch eine beauftragte Illustration ersetzt werden (gleiche Klassen).
- **Küstenkarte** (`coast.js`): eine handgezeichnete Karte von Istrien bis Dubrovnik. Jedes Kapitel ist ein
  echter Ort mit Wahrzeichen-Silhouette (Glockenturm in Rovinj, Arena in Pula, „Gruß an die Sonne“ in Zadar,
  Krka-Wasserfälle, Diokletianpalast in Split, Lavendel auf Hvar, Stadtmauern von Dubrovnik …). Die erledigte Route ist in Türkis nachgezogen; nach jedem bestandenen
  Kapiteltest läuft Vala beim nächsten Öffnen der Karte zur nächsten Station.
- **Mosaik** als wiederkehrendes Element: Trenner auf der Startseite (`.mosaicRule`), Rahmen um verdiente
  Souvenirs, Kante der Anmeldekarte und der Übungskachel, Ladebildschirm (`.mosaicLoader`), Logo
  (drei Steinchen), Reiseleiste (jeder Ort ein Steinchen).
- **Souvenirs** statt Erfolgen: Vala sammelt Andenken (Olivenzweig, Mosaikstein, Muschel, Ansichtskarte,
  Lavendel aus Hvar, Šibenik-Knopf, Spitze aus Pag, Kaffeetasse, Leuchtturm, Krawatte) – jedes mit
  kroatischem Namen. Die Freischaltbedingungen der bisherigen Erfolge bleiben unverändert.

## Hafen (Freunde & Liga)
- **Hafen** statt „Social“: eigener Dock-Punkt mit Anker. Freunde sind die **Crew**, Anfragen kommen als
  **Flaschenpost**, die Wochenliga ist eine **Regatta** – handgezeichnete Segelboote auf einem Stück Meer,
  Abstand zum Führenden nach Wochen-XP, darunter die Rangliste auf Papier (Plätze 1–3 als Sonne, Sand, Terrakotta).
- Auf der Küstenkarte zeigen kleine **Wimpel** mit Initial, wo die Crew gerade ist; Vala segelt auf Tipp hin,
  grüßt in Handschrift und kehrt zurück.
- Hinweise beim nächsten Besuch als Papier-Karte mit Vala („Nachricht aus dem Hafen“), nie als System-Push.

## Bewegung
- Richtige Antwort: das Feedback-Blatt steigt als **sanfte Welle** auf, Vala hüpft. Kein Konfetti, keine Partikel.
- Falsche Antwort: Vala legt neugierig den Kopf schief; die Antwort schüttelt kurz.
- Startseite: leichter **Parallax-Effekt** der Küstenszene (Scrollen und Mauszeiger), Meer wiegt sich langsam.
- Karte: Vala läuft entlang der Route (ca. 2,6 s), danach jubelt sie.
- Alles Dauerhafte ist leise (atmen, blinzeln, atmender Ring um den aktuellen Ort) und läuft über
  `transform`/`translate`, damit es auf dem Handy flüssig bleibt. `prefers-reduced-motion` schaltet alles ab;
  die Reise springt dann direkt zum Ziel.

## Klänge (`sound.js`)
Dezente, per Web Audio erzeugte Klänge (keine Audiodateien): Welle + zwei Töne bei „richtig“, tiefer Ton bei
„falsch“, Möwe und Welle beim Öffnen der Karte und bei Valas Reise, kleine Melodie am Lektionsende.
**Standardmäßig aus**, Schalter unter Profil › Klänge (nur auf diesem Gerät gespeichert).

## Regeln
- Keine Emojis in der Oberfläche – Icons sind eigene SVG-Symbole im Sprite in `index.html`.
- Sonnengelb und Ziegelrot nie flächig-dekorativ verwenden.
- Neue Orte: Station in `Coast.STATIONS` (Kapitel-ID, Name, Koordinaten, Wahrzeichen) ergänzen.

## Aussprache
Die Sprachausgabe wählt die beste Stimme des Geräts: Kroatisch, sonst Bosnisch/Serbisch (gleiche
Aussprache der lateinischen Schrift), natürliche/neuronale Stimmen bevorzugt. Stimme und Tempo sind
unter Profil › Aussprache einstellbar; fehlt eine kroatische Stimme, erklärt die App, wie man sie installiert.
