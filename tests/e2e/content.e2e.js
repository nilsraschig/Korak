const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
async function answerOne(p) {
  const q = await p.evaluate(() => { const q = queue[pos]; return {type: q.type, answer: q.answer, pairs: q.pairs, parts: q.parts}; });
  if (q.type === 'match') { for (const pr of q.pairs) { await p.click(`.matchCol:nth-child(1) .matchItem:not(.matched) >> text="${pr.hr}"`); await p.click(`.matchCol:nth-child(2) .matchItem:not(.matched) >> text="${pr.de}"`); } await p.waitForSelector('#next:not(.hidden)'); }
  else {
    if (q.type === 'order') { for (const w of q.answer.split(' ')) await p.click(`.wordBank .chip >> text="${w}"`); }
    else if (q.type === 'fix') await p.evaluate(() => { const q = queue[pos]; document.querySelectorAll('#answerArea .fixWord')[q.wrongIndex].click(); [...document.querySelectorAll('#answerArea .fixOptions .chip')].find(c => c.textContent === q.right).click(); });
    else if (['input-hr', 'listen'].includes(q.type)) await p.fill('.textInput', q.answer);
    else await p.evaluate(a => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value === a).click(), q.answer);
    await p.click('#check');
  }
  await p.click('#next');
  return q.type;
}
(async () => {
  const be = makeBackend(); const b = await chromium.launch(); const errs = [];
  const ctx = await b.newContext({viewport: {width: 400, height: 860}, serviceWorkers: 'block'}); await be.attach(ctx);
  const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
  await p.click('#guestBtn');
  await p.evaluate(() => { state.completed = LESSONS.map(l => l.id); save(); });
  const types = {};
  // Alltags-Kapitel liegen seit Task 3 in B1 (früher a2-16-2, a2-18-test, a2-13-1)
  for (const id of ['b1-7-2', 'b1-9-test', 'b1-4-1']) {
    await p.evaluate(i => startLesson(i), id);
    ok(await p.evaluate(() => document.getElementById('lesson').classList.contains('active')), `${id} startet`);
    let n = 0; while (await p.evaluate(() => document.getElementById('lesson').classList.contains('active'))) { const t = await answerOne(p); types[t] = (types[t] || 0) + 1; if (++n > 120) break; }
    ok(await p.evaluate(() => document.getElementById('done').classList.contains('active')), `${id} abgeschlossen (${n} Aufgaben)`);
    const cul = await p.evaluate(() => !document.getElementById('doneCulture').classList.contains('hidden') && document.getElementById('cultureTitle').textContent);
    ok(!!cul, `${id}: Kulturbox am Ende „${cul}“`);
    if (id === 'b1-7-2') { ok(cul === 'Italienisch in Dalmatien', 'Lektionsspezifische Box hat Vorrang'); await p.waitForTimeout(700); await p.screenshot({path: shot('done-culture.png')}); }
  }
  console.log('  Aufgabentypen:', JSON.stringify(types));
  await p.evaluate(() => { show('levels'); openLevel('A2'); });
  ok(await p.$$eval('#chapters details.culture', d => d.length) === 12, 'A2-Kapitelansicht: 12 Kulturboxen');
  await p.evaluate(() => { show('levels'); openLevel('B1'); });
  ok(await p.$$eval('#chapters details.culture', d => d.length) === 9, 'B1-Kapitelansicht: 9 Kulturboxen');
  const titles = await p.$$eval('#chapters .chapterHead h2', h => h.map(x => x.textContent));
  ok(titles.slice(0, 6).join('|') === 'Beim Hausarzt|Wohnungssuche|Nachbarn & Small Talk|In der Konoba|Bahnhof & Busbahnhof|Auf dem Amt', 'Alltags-Kapitel als B1-Kapitel 1–6 in richtiger Reihenfolge');
  ok(titles.slice(6).join('|') === 'Meinungen & Diskussion|Beruf & Karriere|Medien & Gesellschaft', 'Danach Ston, Trsteno, Dubrovnik (B1-Kapitel 7–9)');
  await p.evaluate(() => { document.querySelectorAll('#chapters details.culture')[3].open = true; document.querySelectorAll('.chapter')[3].scrollIntoView(); });
  await p.waitForTimeout(900); await p.screenshot({path: shot('chapter-culture.png')});
  // „Was passt nicht?“: der falsche Ausdruck hat keine Kategorie der drei passenden (Review Task 10, Finding 9)
  const odd = await p.evaluate(() => {
    const bad = [], seen = {};
    ['a1-hrana', 'a1-kupovina', 'a1-svakodnevica', 'a1-more'].forEach(ch => {
      const its = LESSONS.filter(l => l.chapterId === ch && !l.isTest).flatMap(lessonItems);
      for (let k = 0; k < 400; k++) {
        const x = oddEx(its, ch, 'T'); if (!x) continue;
        const o = x.info[3], cats = x.info.slice(0, 3).map(i => i.category).filter(Boolean);
        seen[ch] = (seen[ch] || 0) + 1;
        if (o.category && cats.includes(o.category)) bad.push(`${ch}: ${o.hr} (${o.category})`);
      }
    });
    return {bad: [...new Set(bad)].slice(0, 6), seen};
  });
  ok(!odd.bad.length && Object.keys(odd.seen).length === 4, '„Was passt nicht?“ ohne gleiche Kategorie: ' + (odd.bad.join(', ') || JSON.stringify(odd.seen)));
  await p.evaluate(() => KorakDictionary.open()); await p.fill('.dict input', 'napojnica'); await p.waitForTimeout(250);
  ok((await p.$eval('.dictRow b', e => e.textContent).catch(() => '')).toLowerCase().includes('napojnic'), 'Wörterbuch kennt neue Wörter (napojnica)');
  console.log('Fehler:', errs.length ? errs : 'keine'); console.log(fails ? fails + ' FEHLGESCHLAGEN' : 'ALLE TESTS BESTANDEN'); await b.close(); process.exit(fails || errs.length ? 1 : 0);
})();
