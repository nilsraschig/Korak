# Korak – Supabase einrichten

Einmalige Einrichtung für Konten und geräteübergreifenden Fortschritt.

## 1. Schema anlegen
Dashboard › **SQL Editor** › *New query* › Inhalt von [`schema.sql`](schema.sql) einfügen › **Run**.
Die letzte Abfrage muss für `profiles` und `progress` jeweils `rls_aktiv = true` zeigen.
Das Skript kann gefahrlos erneut ausgeführt werden.

**Kontrolle:** Danach [`check.sql`](check.sql) im SQL-Editor ausführen (nur lesend). Alle 14 Zeilen müssen in der
Spalte `ok` `true` zeigen – geprüft werden Tabellen, RLS, Policies, Rechte, Trigger und Funktion.

Was es anlegt:

| Objekt | Zweck |
|---|---|
| `profiles` | ein Profil pro Nutzer: `user_id`, `username` (eindeutig, Groß-/Kleinschreibung egal), `created_at` |
| `progress` | der komplette Lernstand (XP, Serie, abgeschlossene Lektionen, Wiederholungsplan inkl. Fehlerzähler, Sterne, Tagesziel, letzter Login …) |
| RLS-Policies | jeder Nutzer darf **nur seine eigenen Zeilen** lesen und schreiben; Besucher ohne Login sehen nichts |
| Trigger `on_auth_user_created` | legt bei der Registrierung automatisch Profil und leeren Fortschritt an |
| Funktion `username_available` | prüft bei der Registrierung, ob ein Name frei ist (liefert nur true/false) |

## 2. Auth-Einstellungen (wichtig)
- **Authentication › Sign In / Providers › Email**
  - *Enable Email provider*: an
  - **Confirm email: AUS** – die App arbeitet mit internen Pseudo-Adressen (`name@korak.internal`), an die keine Bestätigungsmail zugestellt werden kann. Bleibt es an, kann sich niemand anmelden.
  - *Minimum password length*: **8** (wie `minPasswordLength` in `config.js`)
- **Authentication › Rate Limits**: Registrierungen/Anmeldungen pro Stunde prüfen – für einen kleinen Nutzerkreis reichen die Standardwerte.

## 3. Projekt-URL prüfen
In `config.js` steht `https://dlppaluxzixubuclcxnu.supabase.co` (Supabase-Projekte enden auf **.co**).
Vergleichen mit Dashboard › Project Settings › **API** › Project URL.

## Wichtig zu wissen
- **Kein Passwort-Reset per E-Mail.** Ohne echte Adresse kann Supabase keine Reset-Mail senden. Vergisst jemand
  das Passwort: Dashboard › Authentication › Users › Nutzer › *Reset password* bzw. neues Passwort setzen.
- **`emailDomain` in `config.js` nie mehr ändern**, sobald Nutzer existieren – sonst passt die interne Adresse nicht mehr.
- Falls die Registrierung mit „ungültige interne Adresse“ scheitert, lehnt Supabase die Domain `korak.internal` ab:
  dann **vor** den ersten Registrierungen `emailDomain` auf eine eigene Domain setzen (z. B. die Netlify-Domain) –
  es werden trotzdem keine Mails verschickt.
- Der `anon`-Schlüssel darf öffentlich im Code stehen; den `service_role`-Schlüssel niemals.
