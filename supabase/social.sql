-- ============================================================================
-- Korak – Sozial-Funktionen: Freunde, Wochenliga („Regatta“), Vala besucht Freunde
-- Im Supabase-Dashboard unter SQL Editor → New query einfügen und „Run“ drücken.
-- Voraussetzung: schema.sql wurde bereits ausgeführt (profiles, progress).
-- Das Skript ist wiederholbar und ändert KEINE bestehende Tabelle oder Policy.
--
-- Sicherheitsprinzip:
--  * profiles und progress bleiben unverändert: jeder liest nur seine eigene Zeile.
--  * Neue Tabellen haben RLS; direkt lesbar ist nur, was einen selbst betrifft.
--  * Daten ANDERER Nutzer gibt es ausschließlich über die Funktionen unten, und die
--    liefern nur: Username, aktuelle Serie, Wochen-XP, Anzahl bestandener Kapiteltests.
--    Nie: E-Mail/Konto-Daten, Antworten, Fehler, Lernzeit, Genauigkeit, Einstellungen.
-- ============================================================================

-- ---------- Hilfsfunktion: aktuelle Liga-Woche (Montag, deutsche Zeit) ----------
create or replace function public.korak_week()
returns date
language sql
stable
set search_path = ''
as $$
  select (date_trunc('week', now() at time zone 'Europe/Berlin'))::date
$$;

-- ---------- Freundschaften ----------
create table if not exists public.friendships (
  id           bigint generated always as identity primary key,
  requester    uuid not null references auth.users (id) on delete cascade,
  addressee    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at   timestamptz not null default now(),
  responded_at timestamptz,
  constraint friendships_not_self check (requester <> addressee)
);
-- Jedes Paar nur einmal, egal wer angefragt hat
create unique index if not exists friendships_pair_key
  on public.friendships (least(requester, addressee), greatest(requester, addressee));
create index if not exists friendships_addressee_idx on public.friendships (addressee, status);

-- ---------- XP-Protokoll (Grundlage der Wochenliga, kein Reset nötig) ----------
create table if not exists public.xp_log (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  week       date not null,
  amount     integer not null check (amount > 0),
  created_at timestamptz not null default now()
);
create index if not exists xp_log_week_user_idx on public.xp_log (week, user_id);

-- ---------- Ligen: pro Woche kleine Gruppen ----------
create table if not exists public.leagues (
  id         bigint generated always as identity primary key,
  week       date not null,
  created_at timestamptz not null default now()
);
create index if not exists leagues_week_idx on public.leagues (week);

create table if not exists public.league_members (
  week      date not null,
  user_id   uuid not null references auth.users (id) on delete cascade,
  league_id bigint not null references public.leagues (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (week, user_id)
);
create index if not exists league_members_league_idx on public.league_members (league_id);

-- ---------- RLS: nichts direkt für Fremde lesbar ----------
alter table public.friendships    enable row level security;
alter table public.xp_log         enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;

revoke all on table public.friendships, public.xp_log, public.leagues, public.league_members from anon, authenticated;
-- Eigene Freundschaften/Anfragen lesen ist erlaubt; anlegen, annehmen, löschen nur über Funktionen
grant select on table public.friendships to authenticated;
grant select on table public.xp_log to authenticated;

drop policy if exists "friendships: nur eigene sehen" on public.friendships;
create policy "friendships: nur eigene sehen"
  on public.friendships for select
  to authenticated
  using ((select auth.uid()) in (requester, addressee));

drop policy if exists "xp_log: nur eigenes sehen" on public.xp_log;
create policy "xp_log: nur eigenes sehen"
  on public.xp_log for select
  to authenticated
  using ((select auth.uid()) = user_id);
-- leagues / league_members: keine Policy und keine Rechte → nur über Funktionen

-- ---------- XP-Zuwachs automatisch protokollieren + Liga-Gruppe zuteilen ----------
-- Läuft bei jedem Speichern des Fortschritts. Die App muss dafür nichts Neues tun.
-- Ein Speichervorgang zählt höchstens 300 XP (schützt vor Sprüngen durch Geräte-
-- Zusammenführung oder übernommenen Gast-Fortschritt). Fehler hier dürfen das
-- Speichern NIE verhindern – daher der Exception-Block.
create or replace function public.korak_log_xp()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  delta integer := new.xp - coalesce(old.xp, 0);
  wk date := public.korak_week();
  lid bigint;
begin
  if delta <= 0 then
    return null;
  end if;
  begin
    insert into public.xp_log (user_id, week, amount) values (new.user_id, wk, least(delta, 300));
    if not exists (select 1 from public.league_members m where m.week = wk and m.user_id = new.user_id) then
      -- Zuteilung serialisieren, damit Gruppen nicht über 25 wachsen
      perform pg_advisory_xact_lock(hashtext('korak-league-' || wk::text));
      select l.id into lid
        from public.leagues l
       where l.week = wk
         and (select count(*) from public.league_members m where m.league_id = l.id) < 25
       order by l.id
       limit 1;
      if lid is null then
        insert into public.leagues (week) values (wk) returning id into lid;
      end if;
      insert into public.league_members (week, user_id, league_id) values (wk, new.user_id, lid)
        on conflict do nothing;
    end if;
  exception when others then
    raise warning 'korak_log_xp: %', sqlerrm;
  end;
  return null;
end;
$$;

drop trigger if exists progress_log_xp on public.progress;
create trigger progress_log_xp
  after update of xp on public.progress
  for each row execute function public.korak_log_xp();

-- ---------- Öffentliche Kennzahlen eines Nutzers (nur intern verwendet) ----------
create or replace function public.korak_public_stats(uid uuid)
returns table (streak integer, weekly_xp integer, chapters_done integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case when p.last_study >= (now() at time zone 'Europe/Berlin')::date - 1 then p.streak else 0 end,
    coalesce((select sum(x.amount)::integer from public.xp_log x where x.user_id = uid and x.week = public.korak_week()), 0),
    coalesce((select count(*)::integer from unnest(p.completed_lessons) c where c like '%-test'), 0)
  from public.progress p
  where p.user_id = uid
$$;

-- ---------- Nutzersuche: nur Usernames ----------
create or replace function public.search_users(q text)
returns table (username text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or length(trim(coalesce(q, ''))) < 3 then
    return;
  end if;
  return query
    select p.username
      from public.profiles p
     where lower(p.username) like replace(replace(replace(lower(trim(q)), '\', '\\'), '%', '\%'), '_', '\_') || '%'
       and p.user_id <> (select auth.uid())
     order by length(p.username), lower(p.username)
     limit 10;
end;
$$;

-- ---------- Freundschaftsanfrage senden ----------
-- Ergebnis: 'sent' | 'accepted' (die andere Person hatte schon angefragt) | 'exists' | 'not_found' | 'self' | 'limit'
create or replace function public.send_friend_request(target text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  other uuid;
  f public.friendships;
begin
  if me is null then raise exception 'not_authenticated'; end if;
  select p.user_id into other from public.profiles p where lower(p.username) = lower(trim(target));
  if other is null then return 'not_found'; end if;
  if other = me then return 'self'; end if;
  select * into f from public.friendships
   where least(requester, addressee) = least(me, other) and greatest(requester, addressee) = greatest(me, other);
  if found then
    if f.status = 'pending' and f.addressee = me then
      update public.friendships set status = 'accepted', responded_at = now() where id = f.id;
      return 'accepted';
    end if;
    return 'exists';
  end if;
  if (select count(*) from public.friendships where requester = me and status = 'pending') >= 50 then
    return 'limit';
  end if;
  insert into public.friendships (requester, addressee) values (me, other);
  return 'sent';
end;
$$;

-- ---------- Anfrage annehmen oder ablehnen (nur die angefragte Person) ----------
create or replace function public.respond_friend_request(request_id bigint, accept boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not_authenticated'; end if;
  if accept then
    update public.friendships set status = 'accepted', responded_at = now()
     where id = request_id and addressee = me and status = 'pending';
  else
    delete from public.friendships where id = request_id and addressee = me and status = 'pending';
  end if;
  return found;
end;
$$;

-- ---------- Anfrage zurückziehen oder Freundschaft beenden (beide Seiten) ----------
create or replace function public.remove_friend(friendship_id bigint)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then raise exception 'not_authenticated'; end if;
  delete from public.friendships where id = friendship_id and me in (requester, addressee);
  return found;
end;
$$;

-- ---------- Freunde & Anfragen im Überblick ----------
-- relation: 'friend' | 'incoming' | 'outgoing'. Kennzahlen nur für bestätigte Freunde.
create or replace function public.social_overview()
returns table (friendship_id bigint, username text, relation text, since timestamptz,
               streak integer, weekly_xp integer, chapters_done integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
begin
  if me is null then return; end if;
  return query
    select f.id,
           p.username,
           case when f.status = 'accepted' then 'friend'
                when f.addressee = me then 'incoming'
                else 'outgoing' end,
           coalesce(f.responded_at, f.created_at),
           s.streak, s.weekly_xp, s.chapters_done
      from public.friendships f
      join public.profiles p
        on p.user_id = case when f.requester = me then f.addressee else f.requester end
      left join lateral (
        select * from public.korak_public_stats(p.user_id)
      ) s on f.status = 'accepted'
     where me in (f.requester, f.addressee)
     order by f.status, lower(p.username);
end;
$$;

-- ---------- Rangliste der eigenen Wochen-Gruppe ----------
-- Leer, solange man in dieser Woche noch keine XP gesammelt hat.
create or replace function public.league_standings()
returns table (rank integer, username text, weekly_xp integer, is_me boolean,
               is_friend boolean, week_start date, league_size integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  me uuid := (select auth.uid());
  wk date := public.korak_week();
  lid bigint;
begin
  if me is null then return; end if;
  select m.league_id into lid from public.league_members m where m.week = wk and m.user_id = me;
  if lid is null then return; end if;
  return query
    with t as (
      select m.user_id,
             coalesce((select sum(x.amount) from public.xp_log x where x.user_id = m.user_id and x.week = wk), 0)::integer as xp
        from public.league_members m
       where m.league_id = lid
    )
    select (row_number() over (order by t.xp desc, lower(p.username)))::integer,
           p.username,
           t.xp,
           t.user_id = me,
           exists (select 1 from public.friendships f
                    where f.status = 'accepted'
                      and least(f.requester, f.addressee) = least(me, t.user_id)
                      and greatest(f.requester, f.addressee) = greatest(me, t.user_id)),
           wk,
           (count(*) over ())::integer
      from t
      join public.profiles p on p.user_id = t.user_id
     order by 1;
end;
$$;

-- ---------- Ausführungsrechte: nur angemeldete Nutzer, nur die öffentlichen Funktionen ----------
revoke all on function public.korak_week() from public, anon;
revoke all on function public.korak_log_xp() from public, anon, authenticated;
revoke all on function public.korak_public_stats(uuid) from public, anon, authenticated;
revoke all on function public.search_users(text) from public, anon;
revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(bigint, boolean) from public, anon;
revoke all on function public.remove_friend(bigint) from public, anon;
revoke all on function public.social_overview() from public, anon;
revoke all on function public.league_standings() from public, anon;
grant execute on function public.korak_week() to authenticated;
grant execute on function public.search_users(text) to authenticated;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(bigint, boolean) to authenticated;
grant execute on function public.remove_friend(bigint) to authenticated;
grant execute on function public.social_overview() to authenticated;
grant execute on function public.league_standings() to authenticated;

-- API sofort über die neuen Funktionen informieren (sonst kann es kurz dauern)
notify pgrst, 'reload schema';
