const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const be = makeBackend(); const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({viewport: {width: 400, height: 860}, serviceWorkers: 'block'}); await be.attach(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
  await p.click('#guestBtn');
  const run = (id) => p.evaluate(id => { const x = KORAK_EXERCISES.find(e => e.id === id); startSession(authoredItems(x), 'lesson', lessonById('b1-7-1')); }, id); // Konoba: seit Task 3 B1 (früher a2-16-1)
  // Mehrzügiges Rollenspiel: Reihenfolge + Verlauf
  await run('rp-kon');
  ok(await p.evaluate(() => queue.map(q => q.turn).join(',')) === '1,2,3', 'Rollenspiel: drei Züge in Reihenfolge');
  ok(await p.textContent('#kind') === 'Mini-Rollenspiel · 1 von 3', 'Kopfzeile zeigt Zug 1 von 3');
  await p.evaluate(() => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value === queue[pos].answer).click()); await p.click('#check'); await p.click('#next');
  ok(await p.$$eval('.bubble.past', b => b.length) === 2, 'Zug 2 zeigt den bisherigen Verlauf');
  await p.evaluate(() => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value !== queue[pos].answer).click()); await p.click('#check');
  const fb = await p.textContent('#fbText');
  ok(fb.includes('Besser: „Što nam preporučujete?“'), 'Falsche Antwort: Begründung + bessere Antwort: ' + fb.replace(/\n/g, ' | ').slice(0, 90));
  // Task 8 / Ruling 10: Die Wiederholung käme direkt nach Zug 3 (zweimal Rollenspiel) – davor steht eine kurze Füllaufgabe.
  ok(await p.evaluate(() => queue.length === 5 && queue[4].turn === 2 && queue[4].type === 'roleplay' && queue[3].filler && queue[3].type !== 'roleplay'), 'Falscher Zug wird später wiederholt (nach einer Füllaufgabe)');
  await p.screenshot({path: shot('type-roleplay.png')});
  // Szenario
  await run('sc-16-2'); await p.waitForTimeout(300);
  ok(await p.isVisible('.ctx-menu') && (await p.$$eval('.ctx dl div', d => d.length)) === 5, 'Szenario: Speisekarte mit 5 Zeilen');
  ok(await p.textContent('#kind') === 'Alltagsszenario', 'Szenario-Label');
  await p.evaluate(() => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value === queue[pos].answer).click()); await p.click('#check');
  ok((await p.textContent('#fbText')).includes('najava dan ranije'), 'Richtige Antwort erklärt');
  await p.screenshot({path: shot('type-scenario.png')});
  await run('sc-16-3'); ok(await p.textContent('#kind') === 'Was würdest du sagen?', 'Sag-Szenario-Label');
  // Fehler-Korrektur: falsches Wort gewählt
  await run('fx-a1-3');
  ok(await p.isHidden('.fixOptions'), 'Ersatzformen erst nach Antippen');
  await p.click('.fixWord >> nth=2'); ok(await p.isVisible('.fixOptions'), 'Ersatzformen erscheinen');
  ok(await p.isDisabled('#check'), 'Prüfen erst nach Auswahl der Form');
  await p.click('.fixOptions .chip >> text="kavu"'); await p.click('#check');
  const t = await p.textContent('#fbText');
  ok(t.includes('Der Fehler steckt in „kava“') && t.includes('Jednu kavu, molim.'), 'Falsches Wort: Hinweis auf den eigentlichen Fehler');
  ok(await p.textContent('.fixWord.fixed') === 'kavu,', 'Satz wird korrigiert angezeigt (mit Satzzeichen)');
  await p.screenshot({path: shot('type-fix.png')});
  // Fehler-Korrektur richtig
  await run('fx-15-1'); await p.evaluate(() => { const q = queue[pos]; document.querySelectorAll('.fixWord')[q.wrongIndex].click(); });
  await p.click('.fixOptions .chip >> text="katu"'); await p.click('#check');
  ok(await p.evaluate(() => session.correct) === 1 && (await p.textContent('#fbTitle')) !== 'Nicht ganz', 'Richtige Korrektur wird gewertet');
  console.log('Fehler:', errs.length ? errs : 'keine'); console.log(fails ? fails + ' FEHLGESCHLAGEN' : 'ALLE TESTS BESTANDEN'); await b.close(); process.exit(fails || errs.length ? 1 : 0);
})();
