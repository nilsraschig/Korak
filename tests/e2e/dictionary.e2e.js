const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const be = makeBackend(); const b = await chromium.launch(); const errs = [];
  async function dev() { const ctx = await b.newContext({viewport: {width: 400, height: 860}, serviceWorkers: 'block'}); await be.attach(ctx); const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting')); return p; }
  async function check(p, label) {
    ok(await p.isVisible('.dictFab'), `${label}: Wörterbuch-Button sichtbar`);
    await p.click('.dictFab'); await p.fill('.dict input', 'kolodvr'); await p.waitForTimeout(250);
    const first = await p.$eval('.dictRow b', e => e.textContent).catch(() => '');
    ok(first === 'kolodvor', `${label}: Tippfehler-Suche "kolodvr" → ${first}`);
    await p.fill('.dict input', 'Wohnung'); await p.waitForTimeout(250);
    ok((await p.$$eval('.dictRow', r => r.length)) > 0, `${label}: DE→HR "Wohnung" findet Treffer`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
    ok(await p.evaluate(() => document.querySelector('.dict').hidden), `${label}: Esc schließt`);
    await p.evaluate(() => startLesson('a1-1-1')); await p.waitForTimeout(300);
    ok(!(await p.isVisible('.dictFab')) && await p.isVisible('.lessonDict'), `${label}: in der Lektion Button im Lektionskopf statt schwebend`);
    await p.click('.lessonDict'); await p.fill('.dict input', 'hvala'); await p.keyboard.press('Enter'); await p.waitForTimeout(250);
    ok(await p.evaluate(() => !checked) && !(await p.evaluate(() => document.querySelector('.dict').hidden)), `${label}: Enter im Suchfeld prüft keine Aufgabe`);
    await p.screenshot({path: shot(`dict-lesson-${label}.png`)});
    await p.keyboard.press('Escape'); await p.evaluate(() => show('home'));
  }
  console.log('Anmeldebildschirm'); const A = await dev();
  ok(!(await A.isVisible('.dictFab')), 'Kein Wörterbuch auf dem Anmeldebildschirm');
  await A.keyboard.press('Control+k'); await A.waitForTimeout(200);
  ok(await A.evaluate(() => document.querySelector('.dict').hidden), 'Strg+K öffnet dort nichts');
  console.log('Gastmodus'); await A.click('#guestBtn'); await check(A, 'gast');
  console.log('Eingeloggt'); const B = await dev();
  await B.click('.authTabs [data-tab=signup]'); await B.fill('#authUser', 'Vala'); await B.fill('#authPass', 'geheim123'); await B.fill('#authConfirm', 'geheim123'); await B.click('#authSubmit');
  await B.waitForFunction(() => document.getElementById('home').classList.contains('active'));
  await check(B, 'konto');
  await B.waitForTimeout(800);
  ok(be.db.progress[be.db.users[0].id].xp >= 0 && await B.$eval('#syncDot', d => d.dataset.state) === 'saved', 'Synchronisierung läuft weiter');
  console.log('Fehler:', errs.length ? errs : 'keine'); console.log(fails ? fails + ' FEHLGESCHLAGEN' : 'ALLE TESTS BESTANDEN'); await b.close(); process.exit(fails || errs.length ? 1 : 0);
})();
