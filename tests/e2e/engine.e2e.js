// Task 8: Die App spielt alle Sitzungen über die Lern-Engine (engine/*.js) ab.
// Lektion a1-3-1 → 20 Aufgaben nach den Session-Regeln; „Endung wählen“ und „Richtig/Falsch“ werden dargestellt;
// Tippfehler bei Sonderzeichen zählen als „Fast perfekt“ und landen in der Fehler-DNA; das Profil zeigt
// „Deine Stolpersteine“; „Schwachstelle üben“ übt die schwachen Konzepte; Wiederholungen nach Fehlern
// halten die Nachbar-Regeln bis zum Sessionende ein; ohne Sprachausgabe keine Hör-Aufgaben; 375 px ohne Überstand.
//
// Ruling 1: Die Kursdaten haben noch keine forms/concepts/fact. Der Test ergänzt sie für a1-3-1 in den
// geladenen Daten (inject) – der Produktcode weiß davon nichts.
const {chromium, URL, shot} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };

const FACT = {title: 'Marenda am Vormittag', text: 'In Dalmatien isst man am späten Vormittag eine warme Zwischenmahlzeit: die marenda.'};
const PRAISE = ['Richtig!', 'Super!', 'Odlično!', 'Bravo!', 'Točno!'];

// Testdaten im Browser: Nomen „juha“ mit Fällen und Konzept, vier angehängte Items (Lektion erreicht wie die
// künftige Vorlage 12 Items), ein „Wusstest du?“ – und Fortschritt: Kapitel 1–2 gelernt, nichts fällig.
function inject(fact) {
  const l = lessonById('a1-3-1');
  const juha = l.items.find(i => i.hr === 'juha');
  Object.assign(juha, {pos: 'noun', category: 'food', gender: 'f', forms: {nom: 'juha', gen: 'juhe', dat: 'juhi', acc: 'juhu', ins: 'juhom', loc: 'juhi'}, concepts: ['case-acc']});
  l.items.push(
    {hr: 'čaša', de: 'Glas', pos: 'noun', category: 'home', gender: 'f', concepts: ['diacritics-c', 'diacritics-sz']},
    {hr: 'tanjur', de: 'Teller', pos: 'noun', category: 'home', gender: 'm', concepts: ['gender']},
    {hr: 'vilica', de: 'Gabel', pos: 'noun', category: 'home', gender: 'f', concepts: ['gender']},
    {hr: 'žlica', de: 'Löffel', pos: 'noun', category: 'home', gender: 'f', concepts: ['diacritics-sz']});
  l.fact = fact;
  const done = LESSONS.filter(x => x.chapterId === 'a1-begruessung' || x.chapterId === 'a1-obitelj');
  state.completed = done.map(x => x.id);
  done.filter(x => !x.isTest).forEach(x => x.items.forEach((it, i) => { state.items[`${x.id}-${i}`] = {box: 3, due: Date.now() + 5 * 864e5, seen: 2, correct: 2, wrong: 0}; }));
  save();
}

// Nachbar-Regeln der ganzen Queue: kein Typ und kein Wort zweimal hintereinander. Ausnahme: aufeinanderfolgende
// Züge desselben Autoren-Blocks (mehrzügiges Rollenspiel gilt als ein Platz).
const adjacency = p => p.evaluate(() => {
  const ks = t => (Array.isArray(t.keys) ? t.keys : t.key != null ? [t.key] : []);
  const out = [];
  for (let i = 1; i < queue.length; i++) {
    const a = queue[i - 1], b = queue[i];
    if (a.authored && a.authored === b.authored && b.turn === a.turn + 1) continue;
    if (a.type === b.type) out.push(`${i - 1}/${i}: Typ ${a.type}`);
    ks(a).forEach(k => { if (ks(b).includes(k)) out.push(`${i - 1}/${i}: Wort ${k}`); });
  }
  return out;
});

// Ragt ein sichtbares Element im aktiven Bildschirm über den Rand (375 px)? Gemessen wird der sichtbare Teil:
// Vorfahren mit overflow ≠ visible schneiden ab (z. B. die breite Welle im Rückmeldungsbereich).
const overflow = (p, sel) => p.evaluate(sel => {
  const w = document.documentElement.clientWidth, out = [];
  if (document.documentElement.scrollWidth > w) out.push('Seite scrollt seitlich: ' + document.documentElement.scrollWidth);
  document.querySelectorAll(sel).forEach(root => [root, ...root.querySelectorAll('*')].forEach(el => {
    const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
    if (!r.width || !r.height || cs.visibility === 'hidden' || cs.display === 'none') return;
    let left = r.left, right = r.right;
    for (let a = el.parentElement; a && a !== document.documentElement; a = a.parentElement) {
      if (getComputedStyle(a).overflowX === 'visible') continue;
      const ar = a.getBoundingClientRect(); left = Math.max(left, ar.left); right = Math.min(right, ar.right);
    }
    if (right > left && (right > w + 0.5 || left < -0.5)) out.push(`${el.tagName.toLowerCase()}${el.id ? '#' + el.id : ''}.${[...el.classList].join('.')} ${Math.round(left)}–${Math.round(right)}`);
  }));
  return out;
}, sel);
const noOverflow = async (p, sel, what) => { const o = await overflow(p, sel); ok(o.length === 0, `375 px: nichts ragt über den Rand (${what})` + (o.length ? ': ' + o.slice(0, 4).join(' | ') : '')); };

// Beantwortet die aktuelle Aufgabe (richtig oder absichtlich falsch) und prüft sie.
async function answer(p, wrong) {
  const q = await p.evaluate(() => { const q = queue[pos]; return {type: q.type, answer: q.answer, pairs: q.pairs, words: q.words}; });
  if (q.type === 'match') {
    if (wrong) { await p.click(`.matchCol:nth-child(1) .matchItem >> text="${q.pairs[0].hr}"`); await p.click(`.matchCol:nth-child(2) .matchItem >> text="${q.pairs[1].de}"`); }
    for (const pr of q.pairs) { await p.click(`.matchCol:nth-child(1) .matchItem:not(.matched) >> text="${pr.hr}"`); await p.click(`.matchCol:nth-child(2) .matchItem:not(.matched) >> text="${pr.de}"`); }
    await p.waitForSelector('#next:not(.hidden)');
  } else {
    if (q.type === 'order') {
      const right = q.answer.split(' '), rev = [...right].reverse();
      for (const w of wrong && rev.join(' ') !== q.answer ? rev : right) await p.click(`.wordBank .chip >> text="${w}"`);
    } else if (q.type === 'fix') await p.evaluate(w => { const q = queue[pos]; document.querySelectorAll('#answerArea .fixWord')[w ? (q.wrongIndex + 1) % q.words.length : q.wrongIndex].click(); [...document.querySelectorAll('#answerArea .fixOptions .chip')].find(c => c.textContent === q.right).click(); }, wrong);
    else if (['input-hr', 'listen'].includes(q.type)) await p.fill('.textInput', wrong ? 'xyz' : q.answer);
    else await p.evaluate(([a, w]) => { const bs = [...document.querySelectorAll('#answerArea .choice')]; (w ? bs.find(b => b.dataset.value !== a) : bs.find(b => b.dataset.value === a)).click(); }, [q.answer, wrong]);
    await p.click('#check');
  }
  return q.type;
}

// Sucht per Seed eine Lektions-Session (sessionFor mit festem Zufall), die eine passende Aufgabe enthält,
// startet sie und springt zu dieser Aufgabe.
const startAt = (p, test) => p.evaluate(test => {
  const l = lessonById('a1-3-1'), hit = new Function('t', 'return ' + test);
  for (let s = 1; s < 500; s++) {
    const tasks = sessionFor('lesson', l, KorakEngine.makeRng(s)), i = tasks.findIndex(t => hit(t));
    if (i < 0) continue;
    startSession(tasks, 'lesson', l); pos = i; renderQ();
    return {seed: s, index: i, type: tasks[i].type, prompt: tasks[i].prompt, answer: tasks[i].answer, concepts: tasks[i].concepts};
  }
  return null;
}, test);

(async () => {
  const be = makeBackend(); const b = await chromium.launch(); const errs = [];
  async function device(name, init) {
    const ctx = await b.newContext({viewport: {width: 375, height: 812}, serviceWorkers: 'block'}); await be.attach(ctx);
    if (init) await ctx.addInitScript(init);
    const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|favicon|ERR_INTERNET_DISCONNECTED/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
    await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
    await p.click('#guestBtn');
    await p.evaluate(inject, FACT);
    return p;
  }

  console.log('1) Lektion a1-3-1: 20 Aufgaben nach den Session-Regeln');
  const p = await device('A');
  await p.evaluate(() => startLesson('a1-3-1'));
  const s1 = await p.evaluate(() => ({n: queue.length, errors: KorakEngine.checkSession(queue), counter: document.getElementById('counter').textContent, kinds: [...new Set(queue.map(t => t.type))], sources: [...new Set(queue.map(t => t.source))]}));
  ok(s1.n === 20, 'Session hat 20 Aufgaben: ' + s1.n);
  ok(s1.errors.length === 0, 'checkSession(queue) ohne Verstöße' + (s1.errors.length ? ': ' + s1.errors.join(' | ') : ''));
  ok(s1.counter === '1/20', 'Zähler zeigt 1/20: ' + s1.counter);
  console.log('    Typen:', s1.kinds.join(', '), '· Quellen:', s1.sources.join(', '));
  const many = await p.evaluate(() => { const out = []; const l = lessonById('a1-3-1'); for (let s = 1; s <= 30; s++) { const t = sessionFor('lesson', l, KorakEngine.makeRng(s)); out.push(...KorakEngine.checkSession(t, {size: 20}).map(e => `Seed ${s}: ${e}`)); } return out; });
  ok(many.length === 0, '30 weitere Lektions-Sessions (Seeds 1–30) regelkonform' + (many.length ? ': ' + many.slice(0, 3).join(' | ') : ''));
  // Ruling 16: Lektion zur Hälfte gesehen (6 von 12 Items, nichts fällig, keine Fehler-DNA) → alle Lektions-Items, ≥ 10 Wörter
  const half = await p.evaluate(() => {
    const l = lessonById('a1-3-1'), its = lessonItems(l), out = [], words = [];
    its.slice(0, 6).forEach(it => { state.items[it.key] = {box: 2, due: Date.now() + 3 * 864e5, seen: 1, correct: 1, wrong: 0}; });
    for (let s = 1; s <= 20; s++) {
      const t = sessionFor('lesson', l, KorakEngine.makeRng(s));
      words.push(new Set(t.flatMap(x => x.keys || [])).size);
      out.push(...KorakEngine.checkSession(t, {size: 20, minWords: 10}).map(e => `Seed ${s}: ${e}`));
    }
    its.slice(0, 6).forEach(it => { delete state.items[it.key]; });
    return {due: due().length, errors: out, words: Math.min(...words)};
  });
  ok(half.due === 0 && half.errors.length === 0 && half.words >= 10, `6 von 12 Items gesehen, nichts fällig: 20 Sessions mit ≥ 10 Wörtern (mindestens ${half.words})` + (half.errors.length ? ': ' + half.errors.slice(0, 3).join(' | ') : ''));

  console.log('2) „Endung wählen“ (per Seed erzwungen)');
  const e = await startAt(p, "t.type === 'ending' && t.concepts[0] === 'case-acc'");
  ok(!!e, 'Seed mit Endungs-Aufgabe im Akkusativ gefunden: ' + (e && `Seed ${e.seed}, Aufgabe ${e.index + 1}`));
  ok(await p.textContent('#kind') === 'Endung wählen', 'Kopfzeile „Endung wählen“');
  ok(await p.textContent('#prompt') === 'Vidim ___.', 'Rahmen „Vidim ___.“: ' + await p.textContent('#prompt'));
  ok(await p.isVisible('#promptHint') && (await p.textContent('#promptHint')).includes('juha'), 'Hinweis nennt das Wort: ' + await p.textContent('#promptHint'));
  const eopts = await p.$$eval('#answerArea .choice', bs => bs.map(x => x.dataset.value));
  ok(eopts.length === 4 && eopts.includes('juhu') && new Set(eopts).size === 4, 'Vier verschiedene Optionen mit „juhu“: ' + eopts.join(', '));
  await p.evaluate(() => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value === queue[pos].answer).click());
  await p.waitForTimeout(600);
  await p.screenshot({path: shot('engine-ending.png')});
  await noOverflow(p, '#lesson', 'Endung wählen');
  await p.click('#check');
  ok(await p.evaluate(() => document.getElementById('feedback').classList.contains('ok')) && PRAISE.includes(await p.textContent('#fbTitle')), 'Richtige Wahl → „' + await p.textContent('#fbTitle') + '“');
  ok((await p.textContent('#fbText')).includes('Vidim juhu.'), 'Rückmeldung zeigt den vollständigen Satz: ' + await p.textContent('#fbText'));
  ok(await p.evaluate(() => JSON.stringify(state.items[lessonItems(lessonById('a1-3-1')).find(i => i.hr === 'juha').key].dna)) === '{"case-acc":[1,0]}', 'Fehler-DNA zählt den Akkusativ als richtig');

  console.log('3) „Richtig oder falsch?“');
  const tf = await startAt(p, "t.type === 'truefalse' && t.answer === 'Falsch'");
  ok(!!tf, 'Seed mit Richtig/Falsch-Aufgabe gefunden: ' + (tf && `Seed ${tf.seed}, „${tf.prompt}“`));
  ok(await p.textContent('#kind') === 'Richtig oder falsch?', 'Kopfzeile „Richtig oder falsch?“');
  ok(JSON.stringify(await p.$$eval('#answerArea .choice', bs => bs.map(x => x.dataset.value))) === '["Richtig","Falsch"]', 'Optionen „Richtig“ und „Falsch“ in fester Reihenfolge');
  await p.keyboard.press('2');
  ok(await p.evaluate(() => document.querySelectorAll('#answerArea .choice.selected').length === 1 && !document.getElementById('check').disabled), 'Tastatur: Taste 2 wählt „Falsch“');
  await p.waitForTimeout(600);
  await p.screenshot({path: shot('engine-truefalse.png')});
  await noOverflow(p, '#lesson', 'Richtig/Falsch');
  await p.keyboard.press('Enter');
  ok(await p.evaluate(() => document.getElementById('feedback').classList.contains('ok')), 'Richtig erkannt, dass die Aussage falsch ist: ' + await p.textContent('#fbText'));

  console.log('4) Tippen: „casa“ für „čaša“');
  const casa = await p.evaluate(() => {
    const l = lessonById('a1-3-1'), it = lessonItems(l).find(i => i.hr === 'čaša');
    const t = Object.assign(KorakEngine.buildTask('input-hr', it, {pool: lessonItems(l)}), {source: 'new'});
    startSession([t], 'lesson', l); return it.key;
  });
  await p.fill('.textInput', 'casa'); await p.press('.textInput', 'Enter');
  ok(await p.evaluate(() => session.correct === 1 && document.getElementById('feedback').classList.contains('ok')), 'zählt als richtig');
  const fbTitle = await p.textContent('#fbTitle');
  ok(fbTitle === 'Fast perfekt – achte auf č, š', 'Rückmeldung nennt „č, š“: ' + fbTitle + ' / ' + await p.textContent('#fbText'));
  const dnaCasa = await p.evaluate(k => state.items[k].dna, casa);
  ok(dnaCasa && dnaCasa['diacritics-c'] && dnaCasa['diacritics-c'][1] === 1, 'state.items[key].dna["diacritics-c"][1] === 1: ' + JSON.stringify(dnaCasa));
  ok(dnaCasa && dnaCasa['diacritics-sz'] && dnaCasa['diacritics-sz'][1] === 1, 'š landet unter „diacritics-sz“');
  await p.waitForTimeout(400); await p.screenshot({path: shot('engine-near.png')});
  await noOverflow(p, '#lesson, #sheet', 'Rückmeldung „Fast perfekt – achte auf č, š“');
  const ruling9 = await p.evaluate(() => { const l = lessonById('a1-3-1'), it = lessonItems(l).find(i => i.hr === 'čaša'); startSession([Object.assign(KorakEngine.buildTask('input-hr', it, {pool: lessonItems(l)}), {source: 'new'})], 'lesson', l); return true; });
  await p.fill('.textInput', 'ćaša'); await p.press('.textInput', 'Enter');
  ok(ruling9 && await p.textContent('#fbTitle') === 'Fast perfekt – achte auf č', 'Falsches Diakritikum „ćaša“ → „Fast perfekt – achte auf č“');
  // Ruling 17: Sonderzeichen zählen nur beim Tippen; bei „Fast perfekt“ nur die fehlenden Buchstaben als Fehler
  const dnaOf = () => p.evaluate(k => JSON.parse(JSON.stringify(state.items[k].dna)), casa);
  const before = await dnaOf();
  await p.evaluate(() => { const l = lessonById('a1-3-1'), it = lessonItems(l).find(i => i.hr === 'čaša'); startSession([Object.assign(KorakEngine.buildTask('input-hr', it, {pool: lessonItems(l)}), {source: 'new'})], 'lesson', l); });
  await p.fill('.textInput', 'časa'); await p.press('.textInput', 'Enter');
  const afterNear = await dnaOf();
  const d = (a, b, c, i) => b[c][i] - a[c][i];
  ok(await p.textContent('#fbTitle') === 'Fast perfekt – achte auf š' && d(before, afterNear, 'diacritics-sz', 1) === 1 && d(before, afterNear, 'diacritics-sz', 0) === 0 &&
     d(before, afterNear, 'diacritics-c', 0) === 1 && d(before, afterNear, 'diacritics-c', 1) === 0,
     `„časa“ (nur š fehlt): diacritics-sz +1 falsch, das richtig getippte č zählt richtig: ${JSON.stringify(before)} → ${JSON.stringify(afterNear)}`);
  for (const wrong of [false, true]) {
    await p.evaluate(() => { const l = lessonById('a1-3-1'), it = lessonItems(l).find(i => i.hr === 'čaša'); startSession([Object.assign(KorakEngine.buildTask('choice-de', it, {pool: lessonItems(l)}), {source: 'new'})], 'lesson', l); });
    await answer(p, wrong);
  }
  ok(JSON.stringify(await dnaOf()) === JSON.stringify(afterNear), 'Auswahlaufgabe zu „čaša“ (richtig und falsch): keine Sonderzeichen-Zählung');

  console.log('5) Ganze Session mit Fehlern (auch die letzte Aufgabe): Nachbar-Regeln bis zum Ende');
  await p.evaluate(() => startLesson('a1-3-1'));
  let n = 0, lastWrong = false; const clashes = [], types = {};
  while (await p.evaluate(() => document.getElementById('lesson').classList.contains('active'))) {
    const atEnd = await p.evaluate(() => pos === queue.length - 1);
    const wrong = (++n % 3 === 0) || (atEnd && !lastWrong);
    if (atEnd && wrong) lastWrong = true;
    const t = await answer(p, wrong); types[t] = (types[t] || 0) + 1;
    (await adjacency(p)).forEach(c => clashes.push(`nach Aufgabe ${n}: ${c}`));
    await p.click('#next');
    if (n > 80) throw new Error('Endlosschleife');
  }
  console.log('    Typen:', JSON.stringify(types));
  ok(lastWrong, 'Die letzte Aufgabe wurde falsch beantwortet');
  ok(clashes.length === 0, `Keine zwei gleichen Typen/Wörter hintereinander (${n} Bildschirme)` + (clashes.length ? ': ' + clashes.slice(0, 4).join(' | ') : ''));
  ok(await p.evaluate(() => document.getElementById('done').classList.contains('active')), 'Abschlussbildschirm erreicht');
  ok(await p.isVisible('#doneCulture') && await p.textContent('#cultureTitle') === FACT.title, 'Abschluss zeigt fact.title der Lektion: ' + await p.textContent('#cultureTitle'));

  console.log('6) Stolpersteine im Profil und „Schwachstelle üben“');
  const q = await device('B');
  await q.evaluate(() => show('profile'));
  ok(await q.isVisible('#profileWeak') && (await q.textContent('#profileWeak')).includes('Noch keine Stolpersteine – weiter so!'), 'Ohne Fehler: „Noch keine Stolpersteine – weiter so!“');
  await q.evaluate(() => show('practice'));
  await q.click('#practiceDna');
  ok(await q.evaluate(() => document.getElementById('practice').classList.contains('active')) && (await q.textContent('#toast')).includes('Stolpersteine'), 'Schwachstelle üben ohne Stolpersteine: Hinweis statt leerer Session');
  for (let k = 0; k < 3; k++) {
    const t = await startAt(q, "t.type === 'ending' && t.concepts[0] === 'case-acc'");
    ok(!!t, `Endung im Akkusativ #${k + 1} (Seed ${t && t.seed})`);
    await answer(q, true);
    ok(await q.evaluate(() => document.getElementById('feedback').classList.contains('no')), `Falsche Endung #${k + 1}: ${(await q.textContent('#fbText')).replace(/\n/g, ' ')}`);
    (await adjacency(q)).forEach(c => ok(false, 'Wiederholung nach falscher Endung: ' + c));
  }
  const juhaDna = await q.evaluate(() => state.items[lessonItems(lessonById('a1-3-1')).find(i => i.hr === 'juha').key].dna);
  ok(JSON.stringify(juhaDna) === '{"case-acc":[0,3]}', 'Fehler-DNA: Akkusativ 0 richtig, 3 falsch: ' + JSON.stringify(juhaDna));
  await q.evaluate(() => show('profile'));
  const weak = await q.$$eval('#profileWeak > div', rows => rows.map(r => ({b: r.querySelector('b').textContent, small: r.querySelector('small').textContent, count: r.querySelector('.misses').textContent})));
  const acc = await q.evaluate(() => KorakEngine.CONCEPTS['case-acc'].short);
  ok(weak.length >= 1 && weak[0].b === 'Akkusativ' && weak[0].small.replace(/\u2060/g, '') === acc, 'Deine Stolpersteine: „Akkusativ“ mit Kurzerklärung');
  ok(weak.length >= 1 && weak[0].count === '0 von 3 richtig', '„x von y richtig“: ' + (weak[0] && weak[0].count));
  await q.evaluate(() => { const el = document.getElementById('profileWeak').closest('section'); scrollTo(0, el.getBoundingClientRect().top + scrollY - 90); });
  await q.waitForFunction(() => !document.getElementById('toast').classList.contains('show'), null, {timeout: 6000});
  await q.waitForTimeout(500);
  await q.screenshot({path: shot('engine-profile.png')});
  await noOverflow(q, '#profile', 'Profil');
  await q.evaluate(() => show('practice'));
  ok((await q.textContent('#practiceDnaCount')).includes('Akkusativ'), 'Üben: Aktion nennt den Stolperstein: ' + await q.textContent('#practiceDnaCount'));
  await noOverflow(q, '#practice', 'Üben');
  await q.focus('#practiceDna'); await q.keyboard.press('Enter');
  const dna = await q.evaluate(() => ({mode, active: document.getElementById('lesson').classList.contains('active'), n: queue.length, dna: queue.filter(t => t.source === 'dna').map(t => ({type: t.type, concepts: t.concepts, hr: t.item && t.item.hr})), errors: KorakEngine.checkSession(queue)}));
  ok(dna.active && dna.mode === 'dna', 'Schwachstelle üben startet eine Session (Tastatur)');
  ok(dna.dna.length >= 1 && dna.dna.every(t => t.concepts.includes('case-acc')), `DNA-Aufgaben tragen „case-acc“: ${JSON.stringify(dna.dna)}`);
  ok(dna.n === 20 && dna.errors.length === 0, `Session regelkonform, 20 Aufgaben (${dna.n})` + (dna.errors.length ? ': ' + dna.errors.join(' | ') : ''));

  console.log('7) Ohne Sprachausgabe keine Hör-Aufgaben');
  const r = await device('C', () => { delete window.speechSynthesis; delete Window.prototype.speechSynthesis; });
  const noTts = await r.evaluate(() => {
    const out = [], l = lessonById('a1-3-1');
    for (let s = 1; s <= 25; s++) for (const [kind, les] of [['lesson', l], ['test', lessonById('a1-2-test')], ['random', null]]) {
      const t = sessionFor(kind, les, KorakEngine.makeRng(s));
      out.push(...KorakEngine.checkSession(t, {hasTTS: false}).map(e => `${kind} ${s}: ${e}`));
    }
    return {hasTts: HAS_TTS, errors: out};
  });
  ok(noTts.hasTts === false, 'speechSynthesis entfernt → HAS_TTS false');
  ok(noTts.errors.length === 0, '75 Sessions ohne Hör-Aufgaben und regelkonform' + (noTts.errors.length ? ': ' + noTts.errors.slice(0, 3).join(' | ') : ''));
  await r.evaluate(() => startLesson('a1-3-1'));
  let m = 0; const listen = [];
  while (await r.evaluate(() => document.getElementById('lesson').classList.contains('active'))) {
    if (await r.isVisible('#speakRow')) listen.push(`Aufgabe ${m + 1}: Anhören-Knöpfe sichtbar`);
    const t = await answer(r, ++m % 3 === 0); if (/listen/.test(t)) listen.push(`Aufgabe ${m}: ${t}`);
    await r.click('#next'); if (m > 120) throw new Error('Endlosschleife ohne TTS');
  }
  ok(listen.length === 0, `Lektion mit vielen Fehlern (${m} Bildschirme, Wiederholungen inklusive): keine Hör-Aufgabe` + (listen.length ? ': ' + listen.join(' | ') : ''));

  console.log('8) Mehrzügiges Rollenspiel (B1): ein Platz in der Session, drei Bildschirme im Zähler');
  const rp = await p.evaluate(() => {
    state.completed = LESSONS.map(l => l.id); save();
    const l = lessonById('b1-5-1');
    for (let s = 1; s < 300; s++) {
      const tasks = sessionFor('lesson', l, KorakEngine.makeRng(s)), i = tasks.findIndex(t => Array.isArray(t.block) && t.block.length === 3);
      if (i < 1) continue; // Block nicht an erster Stelle: dann gilt queue.length = 20 auch nach dem Rendern
      startSession(tasks, 'lesson', l);
      return {seed: s, i, n: queue.length, errors: KorakEngine.checkSession(queue), counter: document.getElementById('counter').textContent};
    }
    return null;
  });
  ok(!!rp, 'Seed mit dreizügigem Rollenspiel gefunden: ' + (rp && `Seed ${rp.seed}, Platz ${rp.i + 1}`));
  ok(rp && rp.n === 20 && rp.errors.length === 0, 'Session: 20 Plätze, regelkonform' + (rp && rp.errors.length ? ': ' + rp.errors.join(' | ') : ''));
  ok(rp && rp.counter === '1/22', 'Zähler zählt Bildschirme (20 Plätze, Block mit 3 Zügen): ' + (rp && rp.counter));
  let k = 0, wrongs = 0; const rpClash = [], turns = [];
  while (await p.evaluate(() => document.getElementById('lesson').classList.contains('active'))) {
    const cur = await p.evaluate(() => ({type: queue[pos].type, turn: queue[pos].turn, counter: document.getElementById('counter').textContent}));
    if (cur.type === 'roleplay') turns.push(cur);
    const wrong = ++k % 3 === 0; if (wrong) wrongs++;
    await answer(p, wrong);
    (await adjacency(p)).forEach(c => rpClash.push(`nach Bildschirm ${k}: ${c}`));
    await p.click('#next'); if (k > 80) throw new Error('Endlosschleife (B1)');
  }
  const at = turns.slice(0, 3).map(t => +t.counter.split('/')[0]);
  ok(turns.slice(0, 3).map(t => t.turn).join(',') === '1,2,3' && at[1] === at[0] + 1 && at[2] === at[0] + 2, `Züge 1–3 direkt nacheinander (Bildschirme ${at.join(', ')}; Block auf Platz ${rp.i + 1}, davor eingefügte Wiederholungen verschieben ihn)`);
  ok(rpClash.length === 0, `B1-Lektion mit Rollenspiel und ${wrongs} Fehlern: keine Typ-/Wort-Nachbarn` + (rpClash.length ? ': ' + rpClash.slice(0, 3).join(' | ') : ''));

  console.log('9) Wiederholungen nach Fehlern – 200 Sessions im Schnelldurchlauf (App-Funktionen expandBlock/placeRetry)');
  const stress = await p.evaluate(() => {
    const ks = t => (Array.isArray(t.keys) ? t.keys : t.key != null ? [t.key] : []), bad = [], saved = {queue, pos, active}, wrong = KorakEngine.makeRng(7);
    const cases = [['lesson', 'a1-3-2'], ['lesson', 'b1-5-1'], ['lesson', 'a2-4-3'], ['test', 'b1-5-test'], ['test', 'a1-2-test']];
    let n = 0, retries = 0;
    for (let s = 1; s <= 40; s++) for (const [kind, id] of cases) {
      const l = lessonById(id); active = l; queue = sessionFor(kind, l, KorakEngine.makeRng(s)); pos = 0; n++;
      let lastWrong = false;
      while (pos < queue.length && pos < 200) {
        expandBlock();
        const atEnd = pos === queue.length - 1 && !lastWrong;
        if (atEnd) lastWrong = true;
        if (atEnd || wrong() < 0.35) { placeRetry(queue[pos]); retries++; }
        pos++;
      }
      for (let i = 1; i < queue.length; i++) {
        const a = queue[i - 1], b = queue[i];
        if (a.authored && a.authored === b.authored && b.turn === a.turn + 1) continue;
        if (a.type === b.type || ks(a).some(x => ks(b).includes(x))) bad.push(`${kind} ${id} Seed ${s}: ${i - 1}/${i} ${a.type}/${b.type} ${ks(a)}/${ks(b)}`);
      }
    }
    queue = saved.queue; pos = saved.pos; active = saved.active;
    return {n, retries, bad};
  });
  ok(stress.bad.length === 0, `${stress.n} Sessions, ${stress.retries} falsche Antworten (jede letzte Aufgabe falsch): keine Typ-/Wort-Nachbarn` + (stress.bad.length ? ': ' + stress.bad.slice(0, 3).join(' | ') : ''));

  console.log('Fehler:', errs.length ? errs : 'keine'); if (errs.length) fails++;
  console.log(fails ? `${fails} FEHLGESCHLAGEN` : 'ALLE TESTS BESTANDEN');
  await b.close(); process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
