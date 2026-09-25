/* Korak – Konfiguration für Konten und Synchronisierung (Supabase).
 *
 * Der "anon public"-Schlüssel ist dafür gedacht, im Browser zu stehen: Er erlaubt nur, was die
 * Row-Level-Security-Regeln in supabase/schema.sql zulassen. Den "service_role"-Schlüssel
 * dagegen NIE hier eintragen – er umgeht alle Regeln.
 */
window.KORAK_CONFIG = {
  supabaseUrl: "https://dlppaluxzixubuclcxnu.supabase.co",
  supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRscHBhbHV4eml4dWJ1Y2xjeG51Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNDM5MTgsImV4cCI6MjEwNTkxOTkxOH0.rULQmo5NzgynsD-znxHQSEGFr2d-AA-rUz12u0bDB6o",

  /* Aus dem Username wird intern eine Login-Adresse gebaut: <username>@<emailDomain>.
   * Nutzer sehen diese Adresse nie. WICHTIG: Nach den ersten Registrierungen nicht mehr ändern,
   * sonst können sich bestehende Nutzer nicht mehr anmelden. */
  emailDomain: "korak.internal",

  /* Mindestlänge fürs Passwort – in Supabase unter Authentication › Providers › Email
   * ("Minimum password length") auf denselben Wert setzen. */
  minPasswordLength: 8
};
