const { chromium, URL } = require('./env');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const b = await chromium.launch(); const errs = [];
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  p.setDefaultTimeout(8000);
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/ERR_TUNNEL|ERR_NAME|Failed to load resource/.test(m.text())) errs.push(m.text()) });
  await p.goto(URL);
  await p.waitForFunction(() => !document.body.classList.contains('booting'));
  if (await p.isVisible('#onboarding.active [data-signin]')) await p.click('[data-signin]');
  ok(await p.evaluate(() => !!document.querySelector('#authVala svg.vala')), 'Anmeldeseite zeigt Vala');
  if (await p.isVisible('#guestBtn')) await p.click('#guestBtn');
  await p.evaluate(() => show('home'));
  ok(await p.isVisible('.topbar'), 'Kopfzeile sichtbar');
  ok(await p.evaluate(() => !!document.querySelector('#homeVala svg.vala.idle')), 'Start: Vala im Ruhezustand');
  ok((await p.textContent('#valaSays')).length > 10, 'Start: Sprechblase gefüllt: ' + await p.textContent('#valaSays'));
  ok(await p.evaluate(() => document.querySelectorAll('#journeyTrack .jStop').length) === 27, 'Reiseleiste: 27 Orte');
  ok(await p.evaluate(() => document.querySelectorAll('#journeyTrack .jStop.current').length) === 1, 'Reiseleiste: genau ein aktueller Ort');
  ok(/0 von 10 Souvenirs/.test(await p.textContent('#bagCount')), 'Tasche leer zu Beginn');
  // Klang-Schalter
  await p.evaluate(() => show('profile'));
  ok(!(await p.isChecked('#soundToggle')), 'Klänge standardmäßig aus');
  await p.click('#soundToggle');
  ok(await p.evaluate(() => localStorage.getItem('korak-sound')) === 'on', 'Klänge einschalten wird gespeichert');
  ok(await p.evaluate(() => { try { Sound.play('map'); Sound.play('correct'); return true } catch (e) { return false } }), 'Klänge abspielbar ohne Fehler');
  await p.click('#soundToggle');
  ok(await p.evaluate(() => localStorage.getItem('korak-sound')) === 'off', 'Klänge ausschalten wird gespeichert');
  // Karte
  await p.evaluate(() => { show('levels'); openLevel('A1') });
  ok(await p.evaluate(() => document.querySelectorAll('#coastHost .station').length) === 6, 'A1-Karte: 6 Orte');
  ok(await p.evaluate(() => document.querySelector('#coastHost .station.current') && document.querySelector('#coastHost .station.current').dataset.chapter === DATA.levels[0].chapters[0].id), 'Aktueller Ort = erstes Kapitel');
  await p.evaluate(() => document.querySelectorAll('#coastHost .station')[1].dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForTimeout(300);
  ok(await p.evaluate(() => document.getElementById('ch-' + DATA.levels[0].chapters[1].id).classList.contains('flash')), 'Ort antippen springt zum Kapitel');
  // Lektion: richtig → Welle + Vala springt; falsch → Vala legt Kopf schief
  await p.evaluate(() => { const l = lessonById('a1-1-1'); startSession([ex('choice-de', lessonItems(l)[0]), ex('choice-de', lessonItems(l)[1])], 'lesson', l) });
  await p.evaluate(() => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value === queue[pos].answer).click());
  await p.click('#check');
  ok(await p.evaluate(() => document.getElementById('sheet').classList.contains('waving') && document.getElementById('sheet').classList.contains('ok')), 'Richtig: Wellen-Animation');
  ok(await p.evaluate(() => document.querySelector('#fbVala .vala').classList.contains('jump')), 'Richtig: Vala springt');
  ok(await p.evaluate(() => !document.querySelector('.particle,.confetti')), 'Kein Konfetti/Partikel mehr');
  await p.click('#next');
  await p.evaluate(() => [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value !== queue[pos].answer).click());
  await p.click('#check');
  ok(await p.evaluate(() => document.querySelector('#fbVala .vala').classList.contains('tilt') && !document.getElementById('sheet').classList.contains('waving')), 'Falsch: Vala legt den Kopf schief, keine Welle');
  await p.click('#next');
  for (let k = 0; k < 6 && !(await p.evaluate(() => document.getElementById('done').classList.contains('active'))); k++) {
    await p.evaluate(() => { const q = queue[pos]; if (q.type === 'match') { q.pairs.forEach(pr => { [...document.querySelectorAll('.matchCol:nth-child(1) .matchItem')].find(b => b.textContent === pr.hr).click(); [...document.querySelectorAll('.matchCol:nth-child(2) .matchItem')].find(b => b.textContent === pr.de).click() }) } else if (q.type === 'input-hr' || q.type === 'listen') { const i = document.querySelector('.textInput'); i.value = q.answer; i.dispatchEvent(new Event('input', { bubbles: true })) } else [...document.querySelectorAll('#answerArea .choice')].find(b => b.dataset.value === q.answer).click() });
    if (await p.isVisible('#check:not([disabled])')) await p.click('#check');
    await p.click('#next');
  }
  await p.waitForSelector('#done.active');
  ok(await p.evaluate(() => !document.getElementById('doneSouvenir').classList.contains('hidden') && /Olivenzweig/.test(document.getElementById('doneSouvenir').textContent)), 'Abschluss: neues Souvenir „Olivenzweig“');
  ok(await p.evaluate(() => !!document.querySelector('#doneVala svg.vala')), 'Abschluss: Vala sichtbar');
  // Kapiteltest bestanden → Reise zur nächsten Station
  await p.evaluate(() => { const ch = DATA.levels[0].chapters[0]; state.completed = [...new Set([...state.completed, ...ch.lessons.map(l => l.id)])]; save(); active = lessonById(ch.testId); mode = 'test'; session = { correct: 9, total: 10, start: Date.now(), had: new Set() }; finish() });
  ok(await p.evaluate(() => JSON.parse(sessionStorage.getItem('korak-travel') || 'null')?.to === 1), 'Kapiteltest setzt Reiseziel');
  ok(/nächster Halt Rovinj/.test(await p.textContent('#doneSouvenir')), 'Abschluss nennt nächsten Halt');
  await p.evaluate(() => { show('levels'); openLevel('A1') });
  const x0 = await p.evaluate(() => document.querySelector('.valaMarker').style.top);
  await p.waitForTimeout(3600);
  const x1 = await p.evaluate(() => document.querySelector('.valaMarker').style.top);
  ok(x0 !== x1, `Vala reist auf der Karte (${x0} → ${x1})`);
  ok(await p.evaluate(() => sessionStorage.getItem('korak-travel') === null), 'Reise nur einmal abgespielt');
  ok(await p.evaluate(() => document.querySelector('#coastHost .station.current').dataset.chapter === DATA.levels[0].chapters[1].id), 'Neuer aktueller Ort');
  // Souvenirs
  await p.evaluate(() => show('achievements'));
  ok(await p.evaluate(() => document.querySelectorAll('.souvenir').length) === 10, '10 Souvenirs');
  ok(await p.evaluate(() => document.querySelectorAll('.souvenir.earned').length === souvenirs().filter(s => s.ok).length), 'Verdiente Souvenirs markiert');
  ok(await p.evaluate(() => state.completed.filter(id => { const l = lessonById(id); return l && !l.isTest }).length < 10 ? !souvenirs().find(s => s.id === 'ten').ok : true), '„Mosaikstein“ erst ab 10 Lektionen');
  // Kein seitliches Scrollen
  for (const s of ['home', 'levels', 'practice', 'profile', 'achievements']) {
    await p.evaluate(s => { show(s); if (s === 'levels') openLevel('A2') }, s); await p.waitForTimeout(250);
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `390px: kein horizontales Scrollen (${s})`);
  }
  // Reduzierte Bewegung: Reise springt direkt
  await p.emulateMedia({ reducedMotion: 'reduce' });
  await p.evaluate(() => { sessionStorage.setItem('korak-travel', JSON.stringify({ from: 1, to: 2, level: 'A1' })); show('levels'); openLevel('A1') });
  await p.waitForTimeout(700);
  ok(await p.evaluate(() => !document.querySelector('.valaMarker').classList.contains('travelling')), 'Reduzierte Bewegung: keine Laufanimation');
  console.log('Fehler:', errs.length ? errs : 'keine'); if (errs.length) fails++;
  console.log(fails ? `${fails} FEHLGESCHLAGEN` : 'ALLE TESTS BESTANDEN');
  await b.close(); process.exit(fails ? 1 : 0);
})();
