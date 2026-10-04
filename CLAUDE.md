# Korak – Hinweise für die Arbeit am Code

Korak ist eine PWA zum Kroatischlernen für deutschsprachige Lernende.
Vanilla JS, HTML, CSS, Service Worker – **kein Build-Schritt, keine Abhängigkeiten im Browser außer supabase-js (CDN)**.
Hosting auf Netlify (live: https://korak-hr.netlify.app), Deploy automatisch beim Merge nach `main`.
Oberfläche Deutsch, Zielsprache Kroatisch.

## Regeln
- **Design bleibt:** Farben, Schriften (Fraunces, Caveat, Geist), Vala und alle Animationen erhalten.
  Neue Ansichten übernehmen exakt den bestehenden Stil „Put uz obalu“ (siehe `DESIGN.md`).
- **Fortschritt nie verlieren:** localStorage-Schlüssel nicht umbenennen oder löschen; neue Daten unter neuen Schlüsseln.
- **Kein Abo, keine Paywall.**
- **Kroatische Texte:** korrekte Diakritika (č, ć, š, ž, đ), ijekavisch (Standard in Kroatien: *mlijeko, vrijeme, lijepo*).
- **Mobil zuerst** (375 px), Tastatur bedienbar, `prefers-reduced-motion` beachten.
- **Service Worker:** bei jeder Änderung an ausgelieferten Dateien `CACHE` in `service-worker.js` erhöhen,
  neue Dateien in `FILES` aufnehmen.
- Bestehende Funktionen nicht entfernen oder umbauen, außer es ist ausdrücklich gewünscht.
- Arbeit auf eigenem Branch, Merge per Pull Request.

## Konzept
- Maskottchen **Vala**, eine Mauereidechse (SVG in `vala.js`, Posen per CSS-Klasse: idle, jump, tilt, cheer, walk).
- Lernpfad **„Put uz obalu“** als Küstenkarte: A1 Istrien & Kvarner (6 Orte), A2 Dalmatien (18 Orte),
  B1 Süddalmatien (3 Orte). Jedes Kapitel = ein Ort (`Coast.STATIONS` in `coast.js`).
- Erfolge heißen **Souvenirs**; Freunde und Wochenliga heißen **Hafen** (Crew, Regatta).

## Dateien (Ladereihenfolge in `index.html`)
| Datei | Aufgabe |
|---|---|
| `config.js` | Supabase-URL, anon-Key (öffentlich), `emailDomain` |
| supabase-js (CDN, SRI) | Supabase-Client |
| `cloud.js` | `window.Cloud`: Auth (Username → Pseudo-E-Mail), Fortschritt lesen/schreiben, Hafen-RPCs |
| `course/a1.js`, `course/a2.js`, `course/b1.js` | Kursdaten je Level (`window.KORAK_COURSE.push({level, tests})`) |
| `course-data.js` | setzt daraus `window.KORAK_DATA = {levels, lessons}` zusammen |
| `vala.js` | Vala-SVG, Reaktionen, Souvenir-Zeichnungen |
| `coast.js` | Küstenkarte, Stationen, Reise-Animation |
| `sound.js` | optionale Klänge (Web Audio, standardmäßig aus) |
| `culture-data.js` | Kultur-Infoboxen je Kapitel/Lektion |
| `exercise-data.js` | handgeschriebene Aufgaben (Rollenspiel, Szenario, Fehler-Korrektur) |
| `plan.js` | `buildPlan(profile, course)`: Startkapitel, Gewichtung, Tagesziel, Prognose |
| `app.js` | Kern: Zustand, Ansichten, Übungs-Engine, Startseite, Karte, Souvenirs |
| `onboarding.js` | Onboarding-Schritte (Daten-Array `STEPS`) und Ablauf |
| `account.js` | Login/Gast, Synchronisierung, Migration von Gast-Fortschritt |
| `social.js` | Hafen: Crew, Regatta, Wimpel auf der Karte, Hinweise |
| `dictionary.js` | Wörterbuch-Widget HR ⇄ DE |
| `styles.css` | gesamtes Styling |
| `service-worker.js` | Offline-Cache (Supabase-Anfragen werden nie gecacht) |
| `supabase/*.sql` | Schema und Policies – werden manuell im Supabase SQL-Editor ausgeführt |

## Kursdaten
- Struktur: `levels[].chapters[].lessons[]`; Kapiteltests stehen in `tests` der Level-Datei.
  IDs: Lektion `a1-3-2`, Test `a1-3-test`, Kapitel `a1-hrana`. `number` zählt je Level durch.
- **Nach jeder Änderung:** `node scripts/validate-course.js` (Exit-Code 1 bei Fehlern).

## localStorage
| Schlüssel | Inhalt |
|---|---|
| `korak-v6` | Fortschritt im Gastmodus (ältere Stände `korak-v5`, `korak-a1-v3` werden übernommen) |
| `korak-user-<id>` | Offline-Cache je angemeldetem Nutzer |
| `korak-mode` | `"guest"` = bewusst ohne Account |
| `korak-last-user`, `korak-auth` | letzter Nutzer / Sitzung für Offline-Start |
| `korak-guest-migrated` | Gast-Fortschritt wurde ins Konto übernommen |
| `korak-profile` | Onboarding-Profil `{level, goal, reason, style, minutesPerDay, reminderTime, onboardedAt}` |
| `korak-voice`, `korak-sound` | Aussprache- und Klang-Einstellungen |
| `korak-hafen-seen-<id>`, `korak-regatta-<id>` | Hafen-Hinweise (gesehene Anfragen, letzte Platzierung) |
| `korak-travel` (sessionStorage) | ausstehende Reise-Animation auf der Karte |

## Supabase
- Tabellen `profiles`, `progress` (`schema.sql`); Hafen: `friendships`, `xp_log`, `leagues`, `league_members` (`social.sql`).
- RLS ist sicherheitskritisch: jeder liest nur eigene Zeilen; Daten anderer nur über `security definer`-Funktionen.
- Niemals den `service_role`-Schlüssel in den Code.

## Lokal testen
```
npx http-server -p 8123 -c-1 .     # dann http://localhost:8123
node scripts/validate-course.js
```
