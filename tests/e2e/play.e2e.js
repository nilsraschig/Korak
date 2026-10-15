// Spielt ganze Lektionen und einen Kapiteltest durch (jede dritte Antwort absichtlich falsch):
// Jede Lektion muss bis zum Abschlussbildschirm laufen, ohne hängen zu bleiben und ohne Seitenfehler.
const {chromium, URL} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const be = makeBackend();
  const b = await chromium.launch();
  const ctx = await b.newContext({viewport: {width: 420, height: 860}, serviceWorkers: 'block'}); await be.attach(ctx);
  const p = await ctx.newPage();
  p.setDefaultTimeout(5000); p.on('crash', () => console.log('PAGE CRASHED'));
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|favicon/.test(m.text())) errs.push(m.text()); });
  await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
  await p.click('#guestBtn');
  // Alles freischalten: alle Lektionen und Tests als bestanden markieren
  await p.evaluate(() => { state.completed = LESSONS.map(l => l.id); save(); });
  const types = {};
  async function play(lessonId, wrongEvery) {
    await p.evaluate(id => startLesson(id), lessonId);
    let n = 0;
    while (await p.evaluate(() => document.querySelector('#lesson').classList.contains('active'))) {
      const q = await p.evaluate(() => { const q = queue[pos]; return {type: q.type, answer: q.answer, pairs: q.pairs, words: q.words, prompt: q.prompt}; });
      types[q.type] = (types[q.type] || 0) + 1; n++;
      const wrong = wrongEvery && n % wrongEvery === 0;
      if (q.type === 'match') {
        for (const pr of q.pairs) { await p.click(`.matchCol:nth-child(1) .matchItem:not(.matched) >> text="${pr.hr}"`); await p.click(`.matchCol:nth-child(2) .matchItem:not(.matched) >> text="${pr.de}"`); }
        await p.waitForSelector('#next:not(.hidden)');
      } else {
        if (q.type === 'order') { const target = wrong ? [...q.words].reverse() : q.answer.split(' '); for (const w of target) await p.click(`.wordBank .chip >> text="${w}"`); }
        else if (q.type === 'fix') await p.evaluate(w => { const q = queue[pos]; document.querySelectorAll('#answerArea .fixWord')[w ? (q.wrongIndex + 1) % q.words.length : q.wrongIndex].click(); [...document.querySelectorAll('#answerArea .fixOptions .chip')].find(c => c.textContent === q.right).click(); }, wrong);
        else if (['input-hr', 'listen'].includes(q.type)) await p.fill('.textInput', wrong ? 'xyz' : q.answer.normalize('NFD').replace(/[̀-ͯ]/g, ''));
        else await p.evaluate(([a, w]) => { const bs = [...document.querySelectorAll('#answerArea .choice')]; (w ? bs.find(b => b.dataset.value !== a) : bs.find(b => b.dataset.value === a)).click(); }, [q.answer, wrong]);
        await p.click('#check');
      }
      const fb = await p.textContent('#feedback');
      if (process.env.V) console.log('   ', q.type, '|', q.prompt.replace(/\n/g, ' / '), '=>', fb.replace(/\n/g, ' / '));
      await p.click('#next', {timeout: 4000});
      if (n > 120) throw new Error('Endlosschleife in ' + lessonId);
    }
    return {n, done: await p.evaluate(() => document.getElementById('done').classList.contains('active')), score: await p.evaluate(() => `${session.correct} von ${session.total} direkt richtig`)};
  }
  for (const id of ['a1-3-2', 'a2-10-test', 'b1-2-1']) {
    const r = await play(id, 3);
    ok(r.done && r.n > 0, `${id}: bis zum Abschluss gespielt (${r.n} Aufgaben, ${r.score})`);
  }
  console.log('  Aufgabentypen:', JSON.stringify(types));
  ok(Object.keys(types).length >= 6, 'Mindestens sechs verschiedene Aufgabentypen');
  const stars = await p.evaluate(() => state.testStars);
  ok(stars['a2-10-test'] >= 1, 'Kapiteltest vergibt Sterne: ' + JSON.stringify(stars));
  console.log('Fehler:', errs.length ? errs : 'keine'); if (errs.length) fails++;
  console.log(fails ? `${fails} FEHLGESCHLAGEN` : 'ALLE TESTS BESTANDEN');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
