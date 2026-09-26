-- Korak – Prüfung nach dem Ausführen von social.sql
-- Im SQL Editor ausführen. Jede Zeile muss in der Spalte „ok“ true zeigen.
select 'Tabellen vorhanden' as pruefung,
       count(*) = 4 as ok
  from information_schema.tables
 where table_schema = 'public' and table_name in ('friendships', 'xp_log', 'leagues', 'league_members')
union all
select 'RLS auf allen neuen Tabellen aktiv',
       bool_and(c.relrowsecurity)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
 where n.nspname = 'public' and c.relname in ('friendships', 'xp_log', 'leagues', 'league_members')
union all
select 'XP-Trigger an progress vorhanden',
       exists (select 1 from pg_trigger where tgname = 'progress_log_xp' and not tgisinternal)
union all
select 'Funktionen vorhanden',
       count(*) = 6
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('search_users', 'send_friend_request', 'respond_friend_request', 'remove_friend', 'social_overview', 'league_standings')
union all
select 'Nicht angemeldete (anon) können keine Sozial-Funktion aufrufen',
       not bool_or(has_function_privilege('anon', p.oid, 'execute'))
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('search_users', 'send_friend_request', 'respond_friend_request', 'remove_friend', 'social_overview', 'league_standings', 'korak_public_stats', 'korak_log_xp')
union all
select 'Fremde Kennzahlen nicht direkt abrufbar',
       not has_function_privilege('authenticated', 'public.korak_public_stats(uuid)', 'execute')
union all
select 'Ligen/Mitglieder nicht direkt lesbar',
       not has_table_privilege('authenticated', 'public.league_members', 'select')
       and not has_table_privilege('authenticated', 'public.leagues', 'select')
union all
select 'Freundschaften nicht direkt beschreibbar',
       not has_table_privilege('authenticated', 'public.friendships', 'insert')
       and not has_table_privilege('authenticated', 'public.friendships', 'update')
union all
select 'Bestehende Tabellen weiterhin nur eigene Zeile (Policies unverändert)',
       (select count(*) from pg_policies where schemaname = 'public' and tablename in ('profiles', 'progress')) = 4;
