const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
const SHOTS = shot('auth');
let failures = 0;
const ok = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✘ ') + msg); if (!cond) failures++; };

async function answerOne(p, wrong = false) {
  const q = await p.evaluate(() => { const q = queue[pos]; return {type: q.type, answer: q.answer, pairs: q.pairs, words: q.words}; });
  if (q.type === 'match') {
    for (const pr of q.pairs) { await p.click(`.matchCol:nth-child(1) .matchItem:not(.matched) >> text="${pr.hr}"`); await p.click(`.matchCol:nth-child(2) .matchItem:not(.matched) >> text="${pr.de}"`); }
    await p.waitForSelector('#next:not(.hidden)');
  } else {
    if (q.type === 'order') { for (const w of q.answer.split(' ')) await p.click(`.wordBank .chip >> text="${w}"`); }
    else if (q.type === 'fix') await p.evaluate(() => { const q = queue[pos]; document.querySelectorAll('#answerArea .fixWord')[q.wrongIndex].click(); [...document.querySelectorAll('#answerArea .fixOptions .chip')].find(c => c.textContent === q.right).click(); });
    else if (['input-hr', 'listen'].includes(q.type)) await p.fill('.textInput', wrong ? 'xyz' : q.answer);
    else await p.evaluate(([a, w]) => { const bs = [...document.querySelectorAll('#answerArea .choice')]; (w ? bs.find(b => b.dataset.value !== a) : bs.find(b => b.dataset.value === a)).click(); }, [q.answer, wrong]);
    await p.click('#check');
  }
  await p.click('#next');
}
async function finishLesson(p) { while (await p.evaluate(() => document.querySelector('#lesson').classList.contains('active'))) await answerOne(p); }
const view = p => p.evaluate(() => VIEWS.find(v => document.getElementById(v).classList.contains('active')));
const fieldErrors = p => p.$$eval('#authForm .fieldError', els => els.map(e => e.textContent).filter(Boolean));

(async () => {
  const be = makeBackend();
  const browser = await chromium.launch();
  const errs = [];
  async function device(name, vp = {width: 400, height: 860}) {
    const ctx = await browser.newContext({viewport: vp, serviceWorkers: 'block'});
    await be.attach(ctx);
    const p = await ctx.newPage();
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|favicon|ERR_INTERNET_DISCONNECTED|status of 400/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
    await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
    return {ctx, p};
  }

  console.log('1) Neues Gerät: Anmeldebildschirm zuerst');
  const A = await device('A');
  ok(await view(A.p) === 'auth', 'Auth-Screen wird zuerst gezeigt');
  ok(await A.p.isHidden('.dock'), 'Navigation im Auth-Screen ausgeblendet');
  await A.p.waitForTimeout(700); await A.p.screenshot({path: SHOTS + '-signin-m.png'});

  console.log('2) Registrierung: Validierung');
  await A.p.click('.authTabs [data-tab=signup]');
  ok(await A.p.isVisible('#confirmField'), 'Feld "Passwort bestätigen" sichtbar');
  await A.p.fill('#authUser', 'ab'); await A.p.fill('#authPass', 'kurz'); await A.p.fill('#authConfirm', 'kurz');
  await A.p.click('#authSubmit');
  let fe = await fieldErrors(A.p);
  ok(fe.some(t => t.includes('mindestens 3')), 'Username zu kurz: ' + fe[0]);
  ok(fe.some(t => t.includes('mindestens 8')), 'Passwort zu kurz: ' + fe[1]);
  await A.p.fill('#authUser', 'Nils'); await A.p.fill('#authPass', 'geheim123'); await A.p.fill('#authConfirm', 'geheim124');
  await A.p.click('#authSubmit');
  fe = await fieldErrors(A.p);
  ok(fe.some(t => t.includes('stimmen nicht')), 'Passwörter ungleich: ' + fe.join(' | '));
  await A.p.fill('#authUser', 'Nils ö'); await A.p.click('#authSubmit');
  ok((await fieldErrors(A.p)).some(t => t.includes('Erlaubt sind')), 'Ungültige Zeichen im Username');
  await A.p.screenshot({path: SHOTS + '-signup-errors-m.png'});

  console.log('3) Registrierung erfolgreich');
  await A.p.fill('#authUser', 'Nils'); await A.p.fill('#authPass', 'geheim123'); await A.p.fill('#authConfirm', 'geheim123');
  await A.p.click('#authSubmit');
  await A.p.waitForFunction(() => document.getElementById('home').classList.contains('active'));
  ok(await A.p.textContent('#accountName') === 'Nils', 'Username in der Kopfzeile: ' + await A.p.textContent('#accountName'));
  ok(be.db.users[0] && be.db.users[0].email === 'nils@korak.internal', 'Interne Pseudo-Adresse: ' + (be.db.users[0] || {}).email);
  ok(!(await A.p.$eval('#dialog', d => d.open)), 'Kein Übernahme-Dialog ohne Gast-Fortschritt');
  await A.p.waitForTimeout(800);
  ok(be.db.progress[be.db.users[0].id].last_login, 'last_login gesetzt');

  console.log('4) Lernen → sofort in Supabase');
  await A.p.evaluate(() => startLesson('a1-1-1'));
  const w0 = be.db.writes || 0;
  await answerOne(A.p); await answerOne(A.p); await answerOne(A.p);
  await A.p.waitForTimeout(700);
  const uid = be.db.users[0].id;
  ok((be.db.writes || 0) > w0, `Uploads während der Lektion: ${(be.db.writes || 0) - w0}`);
  ok(be.db.progress[uid].xp === 24, 'XP nach 3 richtigen Antworten in Supabase: ' + be.db.progress[uid].xp);
  await finishLesson(A.p);
  await A.p.waitForTimeout(800);
  let xpA = await A.p.evaluate(() => state.xp);
  ok(be.db.progress[uid].completed_lessons.includes('a1-1-1'), 'Abgeschlossene Lektion in Supabase');
  ok(be.db.progress[uid].xp === xpA, `XP Server=${be.db.progress[uid].xp} Gerät=${xpA}`);
  ok(Object.keys(be.db.progress[uid].item_stats).length >= 8, 'Wiederholungsplan (item_stats) gespeichert');
  ok(await A.p.$eval('#syncDot', d => d.dataset.state) === 'saved', 'Sync-Status "gespeichert"');

  console.log('5) Reload: Sitzung bleibt, Daten vom Server');
  await A.p.reload(); await A.p.waitForFunction(() => !document.body.classList.contains('booting'));
  await A.p.waitForTimeout(600);
  ok(await view(A.p) === 'home', 'Nach Reload direkt eingeloggt (kein Login-Screen)');
  ok(await A.p.evaluate(() => state.xp) === xpA, 'XP nach Reload: ' + await A.p.evaluate(() => state.xp));

  console.log('5b) Neustart offline mit abgelaufenem Token');
  await A.p.evaluate(() => { const k = 'korak-auth', t = JSON.parse(localStorage.getItem(k)); t.expires_at = Math.floor(Date.now() / 1000) - 3600; localStorage.setItem(k, JSON.stringify(t)); });
  be.db.down = true;
  const t0 = Date.now();
  await A.p.reload(); await A.p.waitForFunction(() => !document.body.classList.contains('booting'), null, {timeout: 15000});
  ok(Date.now() - t0 < 7000, `Start dauert nicht ewig: ${Date.now() - t0} ms`);
  ok(await view(A.p) === 'home' && await A.p.textContent('#accountName') === 'Nils', 'Weiter angemeldet (Offline-Cache), kein Login-Screen');
  ok(await A.p.evaluate(() => state.xp) === xpA, 'Fortschritt aus dem Offline-Cache: ' + await A.p.evaluate(() => state.xp));
  await A.p.evaluate(() => { state.xp += 5; save(); });
  await A.p.waitForTimeout(400);
  ok(await A.p.$eval('#syncDot', d => d.dataset.state) !== 'saved', 'Status zeigt: nicht gespeichert (' + await A.p.$eval('#syncDot', d => d.dataset.state) + ')');
  be.db.down = false;
  await A.p.evaluate(() => dispatchEvent(new Event('online')));
  await A.p.waitForFunction(() => document.getElementById('syncDot').dataset.state === 'saved', null, {timeout: 20000}).catch(() => {});
  ok(be.db.progress[uid].xp === xpA + 5, 'Nach dem Wiederverbinden gespeichert (Token erneuert): ' + be.db.progress[uid].xp);
  xpA += 5;

  console.log('6) Gerätewechsel: Login auf Gerät B');
  const B = await device('B', {width: 1280, height: 860});
  await B.p.fill('#authUser', 'nils'); await B.p.fill('#authPass', 'falsch123'); await B.p.click('#authSubmit');
  await B.p.waitForTimeout(400);
  fe = await fieldErrors(B.p);
  ok(fe.some(t => t.includes('falsch')), 'Falsches Passwort: ' + fe.join(' | '));
  await B.p.fill('#authPass', 'geheim123'); await B.p.click('#authSubmit');
  await B.p.waitForFunction(() => document.getElementById('home').classList.contains('active'));
  await B.p.waitForTimeout(800);
  ok(await B.p.evaluate(() => state.xp) === xpA, 'Gerät B sieht den Fortschritt von A: ' + await B.p.evaluate(() => state.xp));
  ok(await B.p.evaluate(() => state.completed.includes('a1-1-1')), 'Gerät B kennt abgeschlossene Lektion');
  ok(await B.p.textContent('#accountName') === 'Nils', 'Anzeigename aus dem Profil (Groß-/Kleinschreibung): ' + await B.p.textContent('#accountName'));
  await B.p.screenshot({path: SHOTS + '-home-d.png'});

  console.log('7) Username schon vergeben (anders geschrieben)');
  const C = await device('C');
  await C.p.click('.authTabs [data-tab=signup]');
  await C.p.fill('#authUser', 'NILS'); await C.p.fill('#authPass', 'anderes123'); await C.p.fill('#authConfirm', 'anderes123');
  await C.p.click('#authSubmit'); await C.p.waitForTimeout(400);
  ok((await fieldErrors(C.p)).some(t => t.includes('schon vergeben')), 'Vergebener Username: ' + (await fieldErrors(C.p)).join(' | '));
  await C.p.fill('#authUser', 'ana_22'); await C.p.locator('#authUser').blur(); await C.p.waitForTimeout(300);
  ok((await C.p.textContent('#authUserOk')) === 'Verfügbar', 'Freier Username wird als verfügbar markiert');

  console.log('8) Offline lernen, danach synchronisieren (Gerät B)');
  const xpBefore = be.db.progress[uid].xp;
  be.db.down = true; await B.ctx.setOffline(true);
  await B.p.evaluate(() => startLesson('a1-1-2')); await finishLesson(B.p);
  const offlineGain = (await B.p.evaluate(() => state.xp)) - xpBefore;
  await B.p.waitForTimeout(600);
  ok(await B.p.$eval('#syncDot', d => d.dataset.state) === 'offline', 'Status offline');
  ok(!be.db.progress[uid].completed_lessons.includes('a1-1-2'), 'Server noch ohne Offline-Lektion');
  const cacheDirty = await B.p.evaluate(u => JSON.parse(localStorage.getItem('korak-user-' + u)).dirty, uid);
  ok(cacheDirty === true, 'Lokaler Cache als ungespeichert markiert');
  // Gleichzeitig lernt Gerät A online weiter (Konflikt)
  be.db.down = false;
  await A.p.evaluate(() => startLesson('a1-2-1'));
  await A.p.evaluate(() => { state.completed.push('a1-2-1'); state.xp += 50; save(); show('home'); });
  await A.p.waitForTimeout(600);
  await B.ctx.setOffline(false); await B.p.evaluate(() => dispatchEvent(new Event('online')));
  await B.p.waitForTimeout(1200);
  const srv = be.db.progress[uid];
  ok(srv.xp === await B.p.evaluate(() => state.xp), 'Server und Gerät B einig: ' + srv.xp);
  ok(srv.completed_lessons.includes('a1-1-2') && srv.completed_lessons.includes('a1-2-1'), 'Nach dem Wiederverbinden: beide Geräte-Stände zusammengeführt? ' + srv.completed_lessons.join(','));

  ok(srv.xp === xpBefore + 50 + offlineGain, `Keine XP verloren: ${xpBefore} + 50 (A) + ${offlineGain} (B offline) = ${xpBefore + 50 + offlineGain}, Server: ${srv.xp}`);
  await A.p.waitForTimeout(300);
  console.log('9) Reload auf B nach Offline-Phase (Merge beim Start)');
  await B.p.reload(); await B.p.waitForFunction(() => !document.body.classList.contains('booting')); await B.p.waitForTimeout(800);
  const cb = await B.p.evaluate(() => state.completed);
  ok(cb.includes('a1-1-2') && cb.includes('a1-2-1'), 'Gerät B hat nach Reload beide Lektionen: ' + cb.join(','));

  console.log('9b) Zwei Geräte gleichzeitig online');
  await A.p.waitForTimeout(500);
  const base = be.db.progress[uid].xp;
  await A.p.evaluate(() => Account.pull()); await A.p.waitForTimeout(500);
  ok(await A.p.evaluate(() => state.completed.includes('a1-1-2')), 'Gerät A holt Fortschritt von B beim Zurückkehren in die App');
  await A.p.evaluate(() => startLesson('a1-1-3')); await B.p.evaluate(() => startLesson('a1-1-3'));
  await answerOne(A.p); await answerOne(B.p); await answerOne(A.p); await answerOne(B.p);
  await A.p.waitForTimeout(1500); await B.p.waitForTimeout(1500);
  const gained = await A.p.evaluate(() => session.correct) + await B.p.evaluate(() => session.correct);
  ok(be.db.progress[uid].xp === base + gained * 8, `Parallel gelernt: ${base} + ${gained}×8 = ${base + gained * 8}, Server: ${be.db.progress[uid].xp}`);
  await A.p.evaluate(() => show('home')); await B.p.evaluate(() => show('home'));
  await A.p.waitForTimeout(600);

  console.log('10) Logout');
  await B.p.click('#accountBtn'); await B.p.waitForTimeout(250); await B.p.screenshot({path: SHOTS + '-menu-d.png'});
  await B.p.click('#menuLogout'); await B.p.waitForTimeout(600);
  ok(await view(B.p) === 'auth', 'Nach Logout: Auth-Screen');
  ok(await B.p.evaluate(u => localStorage.getItem('korak-user-' + u) === null && localStorage.getItem('korak-auth') === null, uid), 'Lokaler Konto-Cache und Sitzung gelöscht');
  await B.p.reload(); await B.p.waitForFunction(() => !document.body.classList.contains('booting'));
  ok(await view(B.p) === 'auth', 'Nach Reload weiterhin abgemeldet');

  console.log('11) Gastmodus + Migration');
  const D = await device('D');
  await D.p.click('#guestBtn');
  ok(await view(D.p) === 'home' && await D.p.textContent('#accountName') === 'Gast', 'Gastmodus startet, Kopfzeile zeigt "Gast"');
  const writesBeforeGuest = be.db.writes || 0, reqBeforeGuest = be.db.log.length;
  await D.p.evaluate(() => startLesson('a1-1-1')); await finishLesson(D.p);
  await D.p.waitForTimeout(500);
  const guestReqs = be.db.log.slice(reqBeforeGuest).filter(l => l.includes('/rest/v1/progress'));
  const guestXp = await D.p.evaluate(() => state.xp);
  await D.p.reload(); await D.p.waitForFunction(() => !document.body.classList.contains('booting'));
  ok(await view(D.p) === 'home' && await D.p.evaluate(() => state.xp) === guestXp, 'Gast bleibt nach Reload Gast, Fortschritt lokal erhalten');
  ok((be.db.writes || 0) === writesBeforeGuest && guestReqs.length === 0, `Gast schreibt nichts in Supabase (Anfragen: ${guestReqs.length})`);
  const serverXpBefore = be.db.progress[uid].xp;
  await D.p.click('#accountBtn'); await D.p.click('#menuLogin');
  ok(await view(D.p) === 'auth' && await D.p.isVisible('#confirmField'), 'Aus dem Gastmodus zur Registrierung');
  await D.p.click('.authTabs [data-tab=signin]');
  await D.p.fill('#authUser', 'Nils'); await D.p.fill('#authPass', 'geheim123'); await D.p.click('#authSubmit');
  await D.p.waitForFunction(() => document.getElementById('dialog').open, null, {timeout: 5000}).catch(() => {});
  ok(await D.p.$eval('#dialog', d => d.open), 'Übernahme-Dialog erscheint');
  ok((await D.p.textContent('#dialogText')).includes(`${guestXp} XP`), 'Dialog nennt Gast-XP: ' + await D.p.textContent('#dialogText'));
  await D.p.screenshot({path: SHOTS + '-migrate-m.png'});
  await D.p.click('#dialogYes'); await D.p.waitForTimeout(900);
  ok(be.db.progress[uid].xp === serverXpBefore + guestXp, `XP addiert: ${serverXpBefore} + ${guestXp} = ${be.db.progress[uid].xp}`);
  ok(guestXp > 0 && await D.p.evaluate(x => state.xp, null) === be.db.progress[uid].xp, 'Gerät zeigt zusammengeführte XP: ' + await D.p.evaluate(() => state.xp));
  await D.p.reload(); await D.p.waitForFunction(() => !document.body.classList.contains('booting')); await D.p.waitForTimeout(700);
  ok(!(await D.p.$eval('#dialog', d => d.open)), 'Dialog wird nicht erneut angeboten');

  console.log('12) Server nicht erreichbar (Supabase-Skript fehlt)');
  const E = await (async () => { const ctx = await browser.newContext({viewport: {width: 400, height: 860}, serviceWorkers: 'block'}); await ctx.route(/cdn\.jsdelivr/, r => r.abort()); await ctx.route(/fonts\./, r => r.abort()); const p = await ctx.newPage(); p.on('pageerror', e => errs.push('E: ' + e.message)); await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting')); return {ctx, p}; })();
  ok(await view(E.p) === 'onboarding', 'Erster Start ohne Server: Onboarding funktioniert offline');
  await E.p.click('[data-signin]');
  ok(await view(E.p) === 'auth' && await E.p.isVisible('#authOffline'), 'Auth-Screen mit Offline-Hinweis');
  await E.p.fill('#authUser', 'Nils'); await E.p.fill('#authPass', 'geheim123'); await E.p.click('#authSubmit'); await E.p.waitForTimeout(300);
  ok((await E.p.textContent('#authError')).includes('nicht erreichbar'), 'Verständliche Meldung beim Login ohne Server');
  await E.p.click('#guestBtn');
  ok(await view(E.p) === 'home', 'Gastmodus funktioniert ohne Server');

  console.log('13) Profil-Screen');
  await A.p.evaluate(() => show('profile')); await A.p.waitForTimeout(800);
  ok(await A.p.textContent('#profileTitle') === 'Nils' && await A.p.isVisible('#profileLogout'), 'Profil zeigt Username und Abmelden');
  await A.p.screenshot({path: SHOTS + '-profile-m.png'});
  await A.p.setViewportSize({width: 1280, height: 860}); await A.p.evaluate(() => Account.showAuth('signup')); await A.p.waitForTimeout(800);
  await A.p.screenshot({path: SHOTS + '-signup-d.png'});

  console.log('\nPage errors:', errs.length ? errs : 'keine');
  console.log(failures ? `\n${failures} FEHLGESCHLAGEN` : '\nALLE TESTS BESTANDEN');
  await browser.close();
  process.exit(failures || errs.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
