-- Korak – Einrichtung prüfen (nur lesend, ändert nichts).
-- Im Supabase SQL-Editor ausführen: Jede Zeile sollte in der Spalte "ok" true zeigen.
select * from (values
  ('Tabelle profiles existiert',         to_regclass('public.profiles') is not null, ''),
  ('Tabelle progress existiert',         to_regclass('public.progress') is not null, ''),
  ('RLS aktiv auf profiles',             coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.profiles')), false), ''),
  ('RLS aktiv auf progress',             coalesce((select relrowsecurity from pg_class where oid = to_regclass('public.progress')), false), ''),
  ('Policies auf profiles (erwartet 1)', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'profiles') = 1,
                                         (select string_agg(policyname || ' [' || cmd || ']', ', ') from pg_policies where schemaname = 'public' and tablename = 'profiles')),
  ('Policies auf progress (erwartet 3)', (select count(*) from pg_policies where schemaname = 'public' and tablename = 'progress') = 3,
                                         (select string_agg(policyname || ' [' || cmd || ']', ', ') from pg_policies where schemaname = 'public' and tablename = 'progress')),
  ('anon: kein Zugriff auf profiles',    not (has_table_privilege('anon', 'public.profiles', 'select') or has_table_privilege('anon', 'public.profiles', 'insert') or has_table_privilege('anon', 'public.profiles', 'update') or has_table_privilege('anon', 'public.profiles', 'delete')), ''),
  ('anon: kein Zugriff auf progress',    not (has_table_privilege('anon', 'public.progress', 'select') or has_table_privilege('anon', 'public.progress', 'insert') or has_table_privilege('anon', 'public.progress', 'update') or has_table_privilege('anon', 'public.progress', 'delete')), ''),
  ('Nutzer: profiles nur lesen',         has_table_privilege('authenticated', 'public.profiles', 'select') and not (has_table_privilege('authenticated', 'public.profiles', 'insert') or has_table_privilege('authenticated', 'public.profiles', 'update') or has_table_privilege('authenticated', 'public.profiles', 'delete') or has_table_privilege('authenticated', 'public.profiles', 'truncate')), ''),
  ('Nutzer: progress lesen/anlegen/ändern, nicht löschen',
                                         has_table_privilege('authenticated', 'public.progress', 'select') and has_table_privilege('authenticated', 'public.progress', 'insert') and has_table_privilege('authenticated', 'public.progress', 'update') and not (has_table_privilege('authenticated', 'public.progress', 'delete') or has_table_privilege('authenticated', 'public.progress', 'truncate')), ''),
  ('Trigger bei Registrierung aktiv',    exists (select 1 from pg_trigger where tgname = 'on_auth_user_created' and tgrelid = 'auth.users'::regclass and tgenabled <> 'D'), ''),
  ('Funktion username_available für Besucher aufrufbar',
                                         to_regprocedure('public.username_available(text)') is not null and has_function_privilege('anon', 'public.username_available(text)', 'execute'), ''),
  ('Alle Nutzer haben ein Profil',       not exists (select 1 from auth.users u left join public.profiles p on p.user_id = u.id where p.user_id is null),
                                         (select count(*)::text || ' Nutzer ohne Profil' from auth.users u left join public.profiles p on p.user_id = u.id where p.user_id is null)),
  ('Alle Nutzer haben einen Fortschritt', not exists (select 1 from auth.users u left join public.progress g on g.user_id = u.id where g.user_id is null),
                                         (select count(*)::text || ' Nutzer insgesamt' from auth.users))
) as t(pruefung, ok, details);
