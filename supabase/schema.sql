-- =====================================================================
-- Korak – Datenbankschema für Benutzerprofile und Lernfortschritt
-- Einmalig im Supabase SQL-Editor ausführen (Dashboard › SQL Editor › New query).
-- Das Skript ist idempotent: mehrfaches Ausführen schadet nicht.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Tabelle "profiles": ein Profil pro Auth-Nutzer
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  username   text not null
             constraint username_format check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  created_at timestamptz not null default now()
);

-- Username eindeutig, unabhängig von Groß-/Kleinschreibung ("Nils" = "nils")
create unique index if not exists profiles_username_lower_key
  on public.profiles (lower(username));

-- ---------------------------------------------------------------------
-- 2) Tabelle "progress": entspricht dem bisherigen localStorage-Zustand
-- ---------------------------------------------------------------------
create table if not exists public.progress (
  user_id          uuid primary key references auth.users (id) on delete cascade,
  xp               integer not null default 0 check (xp >= 0),
  streak           integer not null default 1 check (streak >= 0),
  best_streak      integer not null default 1 check (best_streak >= 0),
  last_study       date,                                  -- Tag des letzten Lernens (für die Serie)
  completed_lessons text[] not null default '{}',         -- IDs abgeschlossener Lektionen/Tests
  item_stats       jsonb not null default '{}'::jsonb,    -- Wiederholungsplan pro Begriff inkl. Fehlerzähler
                                                          -- ("häufig falsch" = Einträge mit wrong > 0)
  test_stars       jsonb not null default '{}'::jsonb,    -- Sterne pro Kapiteltest
  daily            jsonb not null default '{}'::jsonb,    -- Tagesziel (Datum, Übungen, Wiederholungen, Dialoge)
  total_answers    integer not null default 0 check (total_answers >= 0),
  correct_answers  integer not null default 0 check (correct_answers >= 0),
  study_seconds    integer not null default 0 check (study_seconds >= 0),
  last_lesson      text,
  selected_level   text,
  speech_rate      real,
  last_login       timestamptz,
  updated_at       timestamptz not null default now(),
  -- Schutz gegen Missbrauch als Datenspeicher (der echte Bedarf liegt bei wenigen KB)
  constraint progress_size check (
    pg_column_size(item_stats) < 1000000 and pg_column_size(completed_lessons) < 100000
  )
);

-- updated_at bei jeder Änderung serverseitig setzen
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists progress_touch_updated_at on public.progress;
create trigger progress_touch_updated_at
  before update on public.progress
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3) Row Level Security: jeder Nutzer sieht und ändert NUR seine eigenen Zeilen
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.progress enable row level security;

-- Rechte auf das Nötige begrenzen (Supabase vergibt standardmäßig alle Rechte, inkl. TRUNCATE,
-- das RLS umgehen würde). Nicht angemeldete Besucher ("anon") bekommen gar keinen Tabellenzugriff.
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.progress from anon, authenticated;
grant select on table public.profiles to authenticated;
grant select, insert, update on table public.progress to authenticated;

drop policy if exists "profiles: eigenes Profil lesen" on public.profiles;
create policy "profiles: eigenes Profil lesen"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = user_id);
-- Absichtlich keine insert/update/delete-Policy für profiles:
-- Profile entstehen nur über den Trigger unten, der Username ist danach fest
-- (er ist Teil der internen Login-Adresse).

drop policy if exists "progress: eigenen Fortschritt lesen" on public.progress;
create policy "progress: eigenen Fortschritt lesen"
  on public.progress for select
  to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "progress: eigenen Fortschritt anlegen" on public.progress;
create policy "progress: eigenen Fortschritt anlegen"
  on public.progress for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "progress: eigenen Fortschritt ändern" on public.progress;
create policy "progress: eigenen Fortschritt ändern"
  on public.progress for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
-- Keine delete-Policy: Fortschritt wird nur zusammen mit dem Account gelöscht (on delete cascade).

-- ---------------------------------------------------------------------
-- 4) Bei Registrierung automatisch Profil + leeren Fortschritt anlegen
--    Der Username kommt aus den Metadaten, die die App bei signUp mitsendet.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1))
  );
  insert into public.progress (user_id) values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- 5) Username-Verfügbarkeit prüfen (für die Registrierung, ohne Profile offenzulegen)
--    Gibt nur true/false zurück – keine Profildaten.
-- ---------------------------------------------------------------------
create or replace function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(name)
  );
$$;

revoke all on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 6) Kontrolle: sollte für beide Tabellen "true" zeigen
-- ---------------------------------------------------------------------
select relname as tabelle, relrowsecurity as rls_aktiv
from pg_class
where relnamespace = 'public'::regnamespace and relname in ('profiles', 'progress');
