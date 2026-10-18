const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
const today = new Date().toISOString().slice(0, 10);
(async () => {
  const be = makeBackend(), db = be.db;
  const tests = ['a1-begruessung','a1-obitelj','a1-hrana','a1-kupovina','a1-putovanje','a1-svakodnevica','a2-proslost','a2-buducnost','a2-smjestaj','a2-restoran'].map(c => c + '-test');
  const ana = db.addUser('ana_22', {completed_lessons: tests, last_study: today, streak: 5, weekly: 420});
  const marko = db.addUser('marko', {weekly: 90});
  for (let i = 1; i <= 6; i++) db.addUser('seglerin' + i, {weekly: 30 * i});
  const browser = await chromium.launch(); const errs = [];
  async function device(name, vp = {width: 390, height: 844}) {
    const ctx = await browser.newContext({viewport: vp, serviceWorkers: 'block'}); await be.attach(ctx);
    const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|favicon|status of 40[04]/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
    await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
    return {ctx, p};
  }
  const toastText = p => p.textContent('#toast');

  console.log('1) Registrieren, Dock mit Hafen');
  const A = await device('A', {width: 360, height: 780}); const p = A.p;
  await p.click('.authTabs [data-tab=signup]');
  await p.fill('#authUser', 'Nils'); await p.fill('#authPass', 'geheim123'); await p.fill('#authConfirm', 'geheim123');
  await p.click('#authSubmit'); await p.waitForSelector('#home.active');
  ok(await p.evaluate(() => document.querySelectorAll('.dock button').length) === 6, 'Dock hat 6 Punkte');
  ok(await p.evaluate(() => [...document.querySelectorAll('.dock button')].every(b => b.scrollWidth <= b.clientWidth + 1)), '360 px: Dock-Beschriftungen passen');
  await p.click('.dock [data-screen=hafen]'); await p.waitForSelector('#hafen.active');
  await p.waitForSelector('.regattaEmpty');
  ok(await p.isHidden('#hafenGuest') && await p.isVisible('#hafenMain'), 'Angemeldet: Hafen statt Gast-Hinweis');
  ok(/Boote liegen noch im Hafen/.test(await p.textContent('#regattaSea')), 'Ohne XP diese Woche: Regatta-Hinweis');
  ok(/Noch keine Crew/.test(await p.textContent('#crewList')), 'Leere Crew-Liste erklärt');

  console.log('2) Suche und Anfrage');
  await p.fill('#crewSearch', 'an'); await p.waitForTimeout(450);
  ok(/Mindestens 3/.test(await p.textContent('#crewResults')), 'Suche erst ab 3 Zeichen');
  await p.fill('#crewSearch', 'ANA'); await p.waitForSelector('.result[data-name=ana_22]');
  ok(await p.evaluate(() => document.querySelectorAll('.result').length) === 1, 'Suche findet ana_22 (Groß/klein egal)');
  await p.click('.result[data-name=ana_22] [data-send]'); await p.waitForSelector('.outRow');
  ok(/unterwegs/.test(await toastText(p)), 'Toast: Flaschenpost unterwegs');
  ok(/angefragt/.test(await p.textContent('#crewResults')), 'Suchergebnis zeigt „angefragt“');
  ok(db.friendships.length === 1 && db.friendships[0].status === 'pending', 'Anfrage ist „pending“ (kein automatisches Folgen)');
  await p.fill('#crewSearch', 'nils'); await p.waitForTimeout(500);
  ok(!(await p.textContent('#crewResults')).includes('Nils'), 'Man findet sich nicht selbst');

  console.log('3) Eingehende Anfrage: Hinweis beim nächsten Besuch, Annehmen');
  const nils = db.users.find(u => u.meta.username === 'Nils');
  db.friendships.push({id: 99, requester: marko.id, addressee: nils.id, status: 'pending', created_at: new Date().toISOString()});
  await p.reload(); await p.waitForSelector('#home.active');
  await p.waitForSelector('#hafenNote.show');
  ok(/Flaschenpost von marko/.test(await p.textContent('#hafenNote')), 'Hinweis: Flaschenpost von marko');
  ok(await p.evaluate(() => document.querySelector('.dock [data-screen=hafen]').classList.contains('hasNews')), 'Markierung am Hafen-Symbol');
  await p.click('#hafenNote [data-go]'); await p.waitForSelector('.bottleCard');
  await p.click('.bottleCard [data-accept]'); await p.waitForSelector('.mate[data-name=marko]');
  ok(db.friendships.find(f => f.id === 99).status === 'accepted', 'Annehmen setzt „accepted“');
  ok(!(await p.evaluate(() => document.querySelector('.dock [data-screen=hafen]').classList.contains('hasNews'))), 'Markierung verschwindet');
  await p.reload(); await p.waitForSelector('#home.active'); await p.waitForTimeout(1500);
  ok(!(await p.evaluate(() => document.querySelector('#hafenNote.show'))), 'Kein doppelter Hinweis beim nächsten Besuch');

  console.log('4) ana nimmt an: Crew mit öffentlichen Kennzahlen');
  db.friendships.find(f => f.requester === nils.id).status = 'accepted';
  await p.click('.dock [data-screen=hafen]'); await p.waitForSelector('.mate[data-name=ana_22]');
  const anaTxt = await p.textContent('.mate[data-name=ana_22]');
  ok(/gerade in Rab/.test(anaTxt), 'Ort aus Kapitelzahl (10 Tests → 11. Station Rab): ' + anaTxt.replace(/\s+/g, ' ').trim());
  ok(/5/.test(anaTxt) && /420/.test(anaTxt), 'Serie 5 und 420 Wochen-XP sichtbar');

  console.log('5) XP sammeln → Regatta');
  await p.evaluate(async () => { state.xp += 100; save(); await Account.flush(); });
  await p.waitForFunction(() => Account.status === 'saved');
  await p.evaluate(() => Social.render()); await p.waitForSelector('.regattaList li.me');
  const list = await p.$$eval('.regattaList li', ls => ls.map(l => l.innerText.replace(/\s+/g, ' ').trim()));
  ok(list.length === 9 && /^1 ana_22/.test(list[0]), 'Rangliste: 9 Boote, ana_22 vorn');
  const meRow = list.find(t => /Nils/.test(t));
  ok(/^5 Nils \(du\) 100 XP/.test(meRow), 'Eigene Zeile markiert: ' + meRow);
  ok(/Crew/.test(list[0]), 'Crew-Mitglied in der Rangliste markiert');
  ok(await p.evaluate(() => document.querySelectorAll('.lane').length) === 5 && await p.evaluate(() => !!document.querySelector('.lane.me')), 'Boote: Top 5 inkl. eigenem Boot');
  ok(/Zieleinlauf/.test(await p.textContent('#regattaEnds')), 'Countdown sichtbar');

  console.log('6) Überholt-Hinweis');
  (db.xp).push({user: marko.id, week: db.xp[0].week, amount: 60});  // marko 150 > Nils 100 (Nils lag vorher vor marko)
  await p.click('.dock [data-screen=home]');
  await p.evaluate(() => Social.check()); await p.waitForSelector('#hafenNote.show');
  ok(/marko hat dich in der Regatta überholt – du bist jetzt auf Platz 6/.test(await p.textContent('#hafenNote')), 'Hinweis: marko hat dich überholt');
  await p.click('#hafenNote [data-close]');

  console.log('7) Vala besucht Freunde auf der Karte');
  await p.evaluate(() => { show('levels'); openLevel('A2'); }); await p.waitForSelector('.friendFlag[data-name=ana_22]');
  ok(await p.evaluate(() => !document.querySelector('.friendFlag[data-name=marko]')), 'marko (A1-Anfang) nicht auf der A2-Karte');
  await p.evaluate(() => { show('levels'); openLevel('A1'); }); await p.waitForSelector('.friendFlag[data-name=marko]');
  ok(true, 'marko-Wimpel auf der A1-Karte (Poreč)');
  await p.evaluate(() => { show('levels'); openLevel('A2'); }); await p.waitForSelector('.friendFlag[data-name=ana_22]');
  const top0 = await p.evaluate(() => document.querySelector('.valaMarker').style.top);
  await p.evaluate(() => document.querySelector('.friendFlag[data-name=ana_22]').dispatchEvent(new MouseEvent('click', {bubbles: true})));
  await p.waitForSelector('.visitSays', {timeout: 6000});
  ok(/ana_22|Rab/.test(await p.textContent('.visitSays')), 'Vala grüßt: ' + await p.textContent('.visitSays'));
  ok(await p.evaluate(t => document.querySelector('.valaMarker').style.top !== t, top0), 'Vala ist zu ana gereist');
  await p.waitForFunction(() => !document.querySelector('.coastMap').dataset.visiting, null, {timeout: 9000});
  ok(await p.evaluate(t => document.querySelector('.valaMarker').style.top === t, top0), 'und wieder zurück');
  ok(await p.evaluate(() => state.completed.length === 0), 'Eigener Fortschritt unverändert');
  console.log('   aus der Crew-Liste:');
  await p.click('.dock [data-screen=hafen]'); await p.waitForSelector('.mate[data-name=ana_22]');
  await p.click('.mate[data-name=ana_22] [data-visit]'); await p.waitForSelector('#levels.active');
  await p.waitForSelector('.visitSays', {timeout: 6000}); ok(true, '„Auf der Karte besuchen“ öffnet A2 und schickt Vala los');

  console.log('8) Freund entfernen (mit Bestätigung)');
  await p.click('.dock [data-screen=hafen]'); await p.waitForSelector('.mate[data-name=marko]');
  await p.click('.mate[data-name=marko] [data-remove]');
  ok(await p.isVisible('.mate[data-name=marko]') && await p.evaluate(() => document.querySelector('.mate[data-name=marko] [data-remove]').classList.contains('confirm')), 'Erster Tipp fragt nach');
  await p.click('.mate[data-name=marko] [data-remove]'); await p.waitForSelector('.mate[data-name=marko]', {state: 'detached'});
  ok(!db.friendships.some(f => f.id === 99), 'Freundschaft gelöscht');

  console.log('9) Layout');
  for (const w of [360, 1280]) {
    await p.setViewportSize({width: w, height: 800}); await p.waitForTimeout(400);
    const bad = await p.evaluate(() => [...document.querySelectorAll('#hafen *')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width || e.closest('.regattaSea,.boatWrap')) return false; return r.right > innerWidth + 1; }).map(e => e.className).slice(0, 5));
    ok(!bad.length, `${w}px: nichts ragt über den Rand ${bad.join(',')}`);
    await p.screenshot({path: shot(`hafen-${w}.png`), fullPage: true});
  }

  console.log('10) Gast und fehlendes SQL');
  const G = await device('G');
  await G.p.click('#guestBtn'); await G.p.waitForSelector('#home.active');
  const before = db.log.length;
  await G.p.click('.dock [data-screen=hafen]'); await G.p.waitForSelector('#hafenGuest:not(.hidden)');
  ok(await G.p.isHidden('#hafenMain'), 'Gast: Hinweis „Mit Account segelst du mit“');
  await G.p.evaluate(() => { show('levels'); openLevel('A1'); }); await G.p.waitForTimeout(600);
  ok(await G.p.evaluate(() => !document.querySelector('.friendFlag')), 'Gast: keine Wimpel');
  ok(!db.log.slice(before).some(l => l.includes('/rpc/')), 'Gast: keine Sozial-Anfragen an den Server');
  await G.p.click('.dock [data-screen=hafen]'); await G.p.click('#hafenSignup');
  ok(await G.p.isVisible('#auth.active, #authForm'), 'Gast: „Account erstellen“ öffnet Registrierung');
  db.socialMissing = true;
  await p.evaluate(() => { Social._state.loadedAt = 0; show('hafen'); }); await p.waitForSelector('#hafenError:not(.hidden)');
  ok(/social\.sql/.test(await p.textContent('#hafenError')), 'SQL fehlt: verständlicher Hinweis');
  await p.evaluate(() => show('home')); ok(await p.isVisible('#continueBtn'), 'Rest der App läuft weiter');
  db.socialMissing = false;

  console.log('Fehler:', errs.length ? errs : 'keine'); if (errs.length) fails++;
  console.log(fails ? `${fails} FEHLGESCHLAGEN` : 'ALLE TESTS BESTANDEN');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
