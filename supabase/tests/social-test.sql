\set ON_ERROR_STOP 0
\pset footer off
insert into auth.users (id,email,raw_user_meta_data) values
 ('00000000-0000-0000-0000-00000000000a','a@k','{"username":"Nils"}'),
 ('00000000-0000-0000-0000-00000000000b','b@k','{"username":"ana_22"}'),
 ('00000000-0000-0000-0000-00000000000c','c@k','{"username":"marko"}');
update public.progress set completed_lessons='{a1-1-1,a1-1-test,a1-2-test}', last_study=current_date, streak=4 where user_id='00000000-0000-0000-0000-00000000000b';

\echo '== anon darf nichts =='
set role anon; set request.jwt.claims='{}';
select * from public.search_users('nil');
select * from public.friendships;
select public.send_friend_request('ana_22');
reset role;

\echo '== A: Suche liefert nur Usernames, nicht sich selbst; Wildcards wirkungslos =='
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
select * from public.search_users('an');
select * from public.search_users('ana');
select * from public.search_users('nil');
select * from public.search_users('%%%');
select * from public.search_users('___');
\echo '-- A sendet Anfrage an ana_22 und marko; doppelt; an sich selbst; unbekannt'
select public.send_friend_request('ANA_22'), public.send_friend_request('marko'), public.send_friend_request('ana_22'), public.send_friend_request('nils'), public.send_friend_request('niemand');
\echo '-- A: Überblick (ausgehend, keine Kennzahlen)'
select username, relation, streak, weekly_xp, chapters_done from public.social_overview();
\echo '-- Angriff: A trägt direkt eine akzeptierte Freundschaft ein / nimmt eigene Anfrage an / ändert Status'
insert into public.friendships (requester,addressee,status) values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-00000000000c','accepted');
select public.respond_friend_request((select id from public.friendships where addressee='00000000-0000-0000-0000-00000000000b'), true) as eigene_annehmen;
update public.friendships set status='accepted';
\echo '-- Angriff: fremde Daten lesen'
select count(*) as fremde_progress from public.progress where user_id<>'00000000-0000-0000-0000-00000000000a';
select count(*) as fremde_profile from public.profiles where user_id<>'00000000-0000-0000-0000-00000000000a';
select * from public.league_members; select * from public.leagues;
select * from public.korak_public_stats('00000000-0000-0000-0000-00000000000b');
reset role;

\echo '== B: sieht nur eigene Anfragen, nimmt an =='
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b"}';
select username, relation from public.social_overview();
select count(*) as sichtbare_zeilen from public.friendships;
select public.respond_friend_request((select id from public.friendships where requester='00000000-0000-0000-0000-00000000000a'), true) as angenommen;
reset role;

\echo '== C: sieht die A-B-Freundschaft nicht; lehnt A ab =='
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c"}';
select count(*) as sichtbare_zeilen from public.friendships;
select public.remove_friend(1) as fremde_AB_loeschen, public.respond_friend_request(1, true) as fremde_annehmen;
select public.respond_friend_request((select id from public.friendships where addressee='00000000-0000-0000-0000-00000000000c'), false) as abgelehnt;
reset role;

\echo '== XP sammeln (wie die App: update/upsert der eigenen Zeile) =='
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b"}';
update public.progress set xp = 120 where user_id='00000000-0000-0000-0000-00000000000b';
update public.progress set xp = 5120 where user_id='00000000-0000-0000-0000-00000000000b';  -- Sprung: max. 300
update public.progress set xp = 5000 where user_id='00000000-0000-0000-0000-00000000000b';  -- Rückgang: nichts
insert into public.progress (user_id,xp) values ('00000000-0000-0000-0000-00000000000b',5040) on conflict (user_id) do update set xp=excluded.xp;
select week = public.korak_week() as diese_woche, amount from public.xp_log order by id;
reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.progress set xp = 50 where user_id='00000000-0000-0000-0000-00000000000a';
\echo '-- A: Freund B mit Kennzahlen (Serie 4, Wochen-XP 460, 2 Kapitel)'
select username, relation, streak, weekly_xp, chapters_done from public.social_overview();
\echo '-- A: Rangliste'
select rank, username, weekly_xp, is_me, is_friend, league_size, week_start = public.korak_week() as woche from public.league_standings();
\echo '-- A: fremdes XP-Log nicht lesbar'
select count(*) as fremde_xp from public.xp_log where user_id<>'00000000-0000-0000-0000-00000000000a';
reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000c"}';
\echo '-- C: noch keine XP diese Woche -> keine Liga'
select count(*) as zeilen from public.league_standings();
reset role;

\echo '== Gruppengröße: 60 aktive Nutzer -> 3 Gruppen, max. 25 =='
insert into auth.users (email,raw_user_meta_data) select 'u'||g||'@k', json_build_object('username','user'||g)::jsonb from generate_series(1,57) g;
update public.progress set xp = xp + 10 where user_id in (select id from auth.users where email like 'u%');
select l.id, count(*) from public.league_members m join public.leagues l on l.id=m.league_id group by l.id order by l.id;

\echo '== Speichern darf nie am Liga-Trigger scheitern (Tabelle kaputt simulieren) =='
alter table public.xp_log rename to xp_log_x;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
update public.progress set xp = 80 where user_id='00000000-0000-0000-0000-00000000000a' returning xp;
reset role;
alter table public.xp_log_x rename to xp_log;

\echo '== Freundschaft beenden: B entfernt A =='
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000b"}';
select public.remove_friend((select id from public.friendships limit 1)) as entfernt;
select count(*) from public.social_overview();
\echo '-- gegenseitige Anfrage: B fragt A an, A fragt B an -> angenommen'
select public.send_friend_request('Nils');
reset role;
set role authenticated; set request.jwt.claims='{"sub":"00000000-0000-0000-0000-00000000000a"}';
select public.send_friend_request('ana_22');
select username, relation from public.social_overview();
reset role;
