// Task 3: Die Alltags-Kapitel (früher A2 13–18) sind B1-Kapitel 1–6 mit neuen Lektions-IDs (a2-13-k → b1-4-k …).
// Alter Fortschritt muss auf jedem Ladeweg ankommen: Gast (korak-v6), Server-Zeile, Offline-Cache (korak-user-<id>).
const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const A1_TESTS = [1, 2, 3, 4, 5, 6].map(n => `a1-${n}-test`);
const today = new Date().toISOString().slice(0, 10);

(async () => {
  const be = makeBackend(), db = be.db;
  const browser = await chromium.launch(); const errs = [];
  async function device(name, opts = {}) {
    const ctx = await browser.newContext({viewport: {width: 375, height: 812}, serviceWorkers: 'block'}); await be.attach(ctx);
    if (opts.init) await ctx.addInitScript(opts.init, opts.arg);
    const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|favicon|ERR_INTERNET_DISCONNECTED|status of 400/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
    await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'), null, {timeout: 15000});
    return {ctx, p};
  }
  const progress = p => p.evaluate(() => JSON.stringify({completed: state.completed, items: state.items, testStars: state.testStars, lastLesson: state.lastLesson}));
  const OLD_ID = /^(dialog-)?a2-1[3-8]-/; // Lektions-, Test-, Item- und Dialog-IDs der verschobenen Kapitel
  const noOld = list => !list.some(id => OLD_ID.test(id));
  const waitFor = async (cond, ms = 10000) => { const t0 = Date.now(); while (!cond() && Date.now() - t0 < ms) await new Promise(r => setTimeout(r, 100)); return cond(); };

  console.log('a) Gast mit altem Fortschritt in korak-v6');
  const OLD = {
    xp: 900, streak: 2, bestStreak: 4, lastStudy: today,
    completed: ['a2-13-1', ...A1_TESTS, 'b1-1-1'],
    items: {'a2-13-1-0': {box: 2, due: Date.now() + 3 * 864e5, seen: 3, correct: 3, wrong: 0}},
    testStars: {'a1-6-test': 2}, lastLesson: 'a2-13-1', selectedLevel: 'A2',
    daily: {date: '', exercises: 0, reviews: 0, dialogues: 0}
  };
  const G = await device('Gast', {arg: OLD, init: old => {
    if (sessionStorage.getItem('seeded')) return;
    sessionStorage.setItem('seeded', '1');
    localStorage.setItem('korak-v6', JSON.stringify(old));
    localStorage.setItem('korak-mode', 'guest');
  }});
  const g = G.p;
  ok(await g.evaluate(() => document.getElementById('home').classList.contains('active') && !Account.user), 'Gastmodus startet auf der Startseite');
  const sa = await g.evaluate(() => ({completed: state.completed, items: Object.keys(state.items), seen: (state.items['b1-4-1-0'] || {}).seen, lastLesson: state.lastLesson}));
  ok(sa.completed.includes('b1-4-1') && noOld(sa.completed), 'state.completed enthält b1-4-1 statt a2-13-1: ' + sa.completed.join(','));
  ok(A1_TESTS.every(id => sa.completed.includes(id)) && sa.completed.includes('b1-1-1'), 'Übrige IDs unverändert (a1-*-test, b1-1-1)');
  ok(sa.seen === 3 && noOld(sa.items), 'Wiederholungsplan umbenannt: b1-4-1-0 (seen 3)');
  ok(sa.lastLesson === 'b1-4-1', 'lastLesson umbenannt: ' + sa.lastLesson);
  ok(/6 von 27 Orten/.test(await g.textContent('#journeyLabel')), 'Startseite: ' + await g.textContent('#journeyLabel'));

  await g.evaluate(() => { show('levels'); openLevel('B1'); }); await g.waitForSelector('#ch-b1-ordinacija');
  ok(/Kapitel 1 in Bol/.test(await g.textContent('#ch-b1-ordinacija .chapterNo')) && await g.textContent('#ch-b1-ordinacija h2') === 'Beim Hausarzt', 'B1 beginnt mit „Beim Hausarzt“ in Bol');
  const stones = await g.$$eval('#ch-b1-ordinacija .stone', s => s.map(x => x.classList.contains('done')));
  ok(await g.textContent('#ch-b1-ordinacija .chapterCount') === '1/6' && stones[0] === true && stones.filter(Boolean).length === 1, 'Kapitel „Beim Hausarzt“: Lektion 1 erledigt (1/6)');
  ok(await g.evaluate(() => !document.getElementById('ch-b1-misljenje').classList.contains('chapterLocked')), 'Begonnenes B1-Kapitel „Meinungen“ (Ston) bleibt offen');
  ok(await g.evaluate(() => !document.querySelector('#coastHost .station[data-chapter=b1-misljenje]').classList.contains('locked')), 'Ston auf der Karte offen');
  ok(await g.evaluate(() => !document.querySelectorAll('#ch-b1-misljenje .stone')[1].disabled), 'Ston: nächste Lektion (b1-1-2) wählbar');
  ok(await g.evaluate(() => document.getElementById('ch-b1-stanovanje').classList.contains('chapterLocked')), 'Nicht begonnenes Kapitel „Wohnungssuche“ bleibt gesperrt');

  const a1 = await g.evaluate(() => ({ok: souvenirs().find(s => s.id === 'a1').ok, text: achievementData().find(a => a.id === 'a1').text, pct: levelProgress('A1').p}));
  ok(a1.ok && a1.pct < 100, `Souvenir „A1 abgeschlossen“ verdient (A1-Kapiteltests 1–6 bestanden, A1 zu ${a1.pct} %)`);
  ok(a1.text === 'Bestehe die ersten sechs A1-Kapiteltests', 'Ziel-Text: ' + a1.text);
  await g.evaluate(() => show('achievements'));
  ok(await g.evaluate(() => [...document.querySelectorAll('.souvenir.earned h3')].some(h => h.textContent === 'Spitze aus Pag')), 'Souvenir-Ansicht: „Spitze aus Pag“ in Valas Tasche');
  await g.screenshot({path: shot('migration-gast-souvenirs.png')});

  const before = await progress(g);
  ok(!(await g.evaluate(() => localStorage.getItem('korak-v6'))).includes('a2-13'), 'Gespeicherter Gast-Stand enthält keine alten IDs mehr');
  await g.reload(); await g.waitForFunction(() => !document.body.classList.contains('booting'));
  ok(await progress(g) === before, 'Nach Neuladen identisch');

  // Ein veralteter Tab schreibt noch einmal alte IDs (teils doppelt zu neuen): nie doppelt, höheres seen gewinnt.
  await g.evaluate(() => { const s = JSON.parse(localStorage.getItem('korak-v6')); s.completed.push('a2-13-1', 'a2-13-2'); s.items['a2-13-1-0'] = {box: 0, due: 0, seen: 1, correct: 0, wrong: 1}; s.items['a2-13-2-5'] = {box: 1, due: 0, seen: 2, correct: 2, wrong: 0}; localStorage.setItem('korak-v6', JSON.stringify(s)); });
  await g.reload(); await g.waitForFunction(() => !document.body.classList.contains('booting'));
  const sr = await g.evaluate(() => ({c: state.completed, items: state.items}));
  ok(sr.c.filter(id => id === 'b1-4-1').length === 1 && sr.c.includes('b1-4-2') && noOld(sr.c), 'Erneut eingespielte alte IDs: b1-4-1 einmal, b1-4-2 neu');
  ok(sr.items['b1-4-1-0'].seen === 3 && sr.items['b1-4-2-5'].seen === 2 && noOld(Object.keys(sr.items)), 'Item-Kollision: höheres seen gewinnt');

  console.log('b) Angemeldet: Server-Zeile mit alten IDs (a2-16-*)');
  const konoba = ['a2-16-1', 'a2-16-2', 'a2-16-3', 'a2-16-4', 'a2-16-5', 'a2-16-test'];
  const ivana = db.addUser('ivana', {
    xp: 640, streak: 3, best_streak: 5, last_study: today, completed_lessons: [...konoba],
    item_stats: {'a2-16-2-0': {box: 3, due: Date.now() + 864e5, seen: 4, correct: 4, wrong: 0}, 'dialog-a2-16-1': {box: 1, due: Date.now(), seen: 1, correct: 1, wrong: 0}},
    test_stars: {'a2-16-test': 3}, last_lesson: 'a2-16-test', selected_level: 'A2'
  });
  const U = await device('Konto'); const u = U.p;
  ok(await u.evaluate(() => document.getElementById('auth').classList.contains('active')), 'Anmeldebildschirm');
  const writes0 = db.writes || 0;
  await u.fill('#authUser', 'ivana'); await u.fill('#authPass', 'geheim123'); await u.click('#authSubmit');
  await u.waitForSelector('#home.active');
  await u.waitForFunction(() => Account.status === 'saved', null, {timeout: 10000}).catch(() => {});
  const su = await u.evaluate(() => ({completed: state.completed, items: Object.keys(state.items), stars: state.testStars, lastLesson: state.lastLesson, xp: state.xp}));
  ok(su.completed.includes('b1-7-test') && konoba.every(id => su.completed.includes(id.replace('a2-16', 'b1-7'))) && noOld(su.completed), 'Zustand nach dem Login: b1-7-1 … b1-7-test');
  ok(su.items.includes('b1-7-2-0') && su.items.includes('dialog-b1-7-1') && noOld(su.items) && su.stars['b1-7-test'] === 3 && su.lastLesson === 'b1-7-test' && su.xp === 640, 'Items, Sterne, letzte Lektion umbenannt, XP gleich');
  ok(/1 von 27 Orten/.test(await u.textContent('#journeyLabel')), 'Startseite zeigt den Fortschritt: ' + await u.textContent('#journeyLabel'));
  ok(await u.evaluate(() => souvenirs().find(s => s.id === 'chapter').ok && souvenirs().find(s => s.id === 'stars3').ok), 'Souvenirs „Kapitel geschafft“ und „Drei Sterne“ verdient');
  await u.screenshot({path: shot('migration-konto-home.png')});
  await u.evaluate(() => { show('levels'); openLevel('B1'); }); await u.waitForSelector('#ch-b1-konoba');
  ok(await u.textContent('#ch-b1-konoba .chapterCount') === '6/6' && await u.getAttribute('#ch-b1-konoba .stone.test .stars', 'aria-label') === '3 von 3 Sternen', 'B1 „In der Konoba“: 6/6, Kapiteltest mit 3 Sternen');
  ok(await u.evaluate(() => document.querySelector('#coastHost .station[data-chapter=b1-konoba]').classList.contains('done')), 'Korčula auf der B1-Karte erledigt');

  ok(await waitFor(() => (db.writes || 0) > writes0), 'Neue Zeile auf dem Server gespeichert');
  let row = db.progress[ivana.id];
  ok(row.completed_lessons.includes('b1-7-test') && noOld(row.completed_lessons), 'Server: completed_lessons mit b1-7-test, ohne a2-16-*: ' + row.completed_lessons.join(','));
  ok(noOld(Object.keys(row.item_stats)) && row.item_stats['b1-7-2-0'].seen === 4 && row.item_stats['dialog-b1-7-1'], 'Server: item_stats umbenannt');
  ok(JSON.stringify(row.test_stars) === '{"b1-7-test":3}' && row.last_lesson === 'b1-7-test' && row.xp === 640, 'Server: test_stars, last_lesson, XP');
  const beforeU = await progress(u);
  await u.reload(); await u.waitForFunction(() => !document.body.classList.contains('booting')); await u.waitForSelector('#home.active');
  await u.waitForFunction(() => Account.status === 'saved', null, {timeout: 10000}).catch(() => {});
  ok(await progress(u) === beforeU, 'Nach Neuladen identisch');

  console.log('c) Offline-Cache korak-user-<id> mit alten IDs (zweites Gerät, Stand vor dem Update)');
  await u.evaluate(uid => {
    const k = 'korak-user-' + uid, c = JSON.parse(localStorage.getItem(k));
    c.state.completed.push('a2-17-1'); c.state.items['a2-17-1-3'] = {box: 1, due: 0, seen: 2, correct: 1, wrong: 1}; c.state.lastLesson = 'a2-17-1'; c.dirty = true;
    localStorage.setItem(k, JSON.stringify(c));
    const t = JSON.parse(localStorage.getItem('korak-auth')); t.expires_at = Math.floor(Date.now() / 1000) - 3600; localStorage.setItem('korak-auth', JSON.stringify(t));
  }, ivana.id);
  db.down = true;
  await u.reload(); await u.waitForFunction(() => !document.body.classList.contains('booting'), null, {timeout: 15000});
  const sc = await u.evaluate(() => ({home: document.getElementById('home').classList.contains('active'), user: !!Account.user, completed: state.completed, items: Object.keys(state.items), lastLesson: state.lastLesson}));
  ok(sc.home && sc.user, 'Offline-Start aus dem Cache (angemeldet, Startseite)');
  ok(sc.completed.includes('b1-8-1') && sc.completed.includes('b1-7-test') && noOld(sc.completed), 'Cache migriert: b1-8-1 statt a2-17-1');
  ok(sc.items.includes('b1-8-1-3') && noOld(sc.items) && sc.lastLesson === 'b1-8-1', 'Cache: Items und lastLesson migriert');
  db.down = false;
  await u.evaluate(() => dispatchEvent(new Event('online')));
  ok(await waitFor(() => db.progress[ivana.id].completed_lessons.includes('b1-8-1'), 20000), 'Nach dem Wiederverbinden auf dem Server');
  row = db.progress[ivana.id];
  ok(noOld(row.completed_lessons) && noOld(Object.keys(row.item_stats)) && row.item_stats['b1-8-1-3'] && row.last_lesson === 'b1-8-1', 'Server-Zeile ohne alte IDs: ' + row.completed_lessons.join(','));

  console.log('Fehler:', errs.length ? errs : 'keine'); if (errs.length) fails++;
  console.log(fails ? `${fails} FEHLGESCHLAGEN` : 'ALLE TESTS BESTANDEN');
  await browser.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
