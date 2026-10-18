const {chromium, URL, shot: out} = require('./env');
const {makeBackend} = require('./mockbackend');
let fails = 0; const ok = (c, m) => { console.log((c ? '  ✔ ' : '  ✘ ') + m); if (!c) fails++; };
(async () => {
  const be = makeBackend(); const browser = await chromium.launch(); const errs = [];
  async function device(name, opts = {}) {
    const ctx = await browser.newContext({viewport: {width: 375, height: 812}, serviceWorkers: 'block', reducedMotion: opts.reduced ? 'reduce' : 'no-preference'}); await be.attach(ctx, {onboarding: true});
    if (opts.init) await ctx.addInitScript(opts.init);
    const p = await ctx.newPage(); p.setDefaultTimeout(8000);
    p.on('pageerror', e => errs.push(`${name}: ${e.message}`));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|favicon|status of 40[04]/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
    await p.goto(URL); await p.waitForFunction(() => !document.body.classList.contains('booting'));
    return {ctx, p};
  }
  const says = p => p.textContent('#obSays');
  const overflow = p => p.evaluate(() => [...document.querySelectorAll('#onboarding *')].filter(e => { const r = e.getBoundingClientRect(); return r.width && (r.right > innerWidth + 1 || r.left < -1) && !e.closest('.obScene,.obChart'); }).map(e => e.className.baseVal ?? e.className).slice(0, 4));
  const shots = [];
  const shot = async (p, n) => { await p.waitForTimeout(700); await p.screenshot({path: out(`ob-${n}.png`)}); };

  console.log('1) Allererster Start → Onboarding');
  const A = await device('A'); const p = A.p;
  await p.waitForSelector('#onboarding.active');
  ok(await p.isHidden('.topbar') && await p.isHidden('.dock') && await p.isHidden('.dictFab'), 'Ohne Kopfzeile, Dock und Wörterbuch-Knopf');
  ok(/Bok! Ich bin Vala/.test(await says(p)), 'Schritt 1: Vala begrüßt');
  ok(!(await p.$('.obBack')), 'Schritt 1 ohne Zurück-Pfeil');
  ok(await p.evaluate(() => document.activeElement.id) === 'obSays', 'Fokus auf Valas Frage');
  await shot(p, '01-welcome');
  await p.click('.obNext');

  console.log('2) Niveau – Tastatur und Zurück');
  ok(/Wie viel Kroatisch/.test(await says(p)) && await p.isVisible('.obBack'), 'Schritt 2 mit Zurück-Pfeil');
  ok(await p.isDisabled('.obNext'), '„Weiter“ erst nach Antwort');
  await p.focus('.obOption[data-value=A0]'); await p.keyboard.press('ArrowDown'); await p.keyboard.press('ArrowDown');
  ok(await p.evaluate(() => document.activeElement.dataset.value) === 'A2' && await p.getAttribute('.obOption[data-value=A2]', 'aria-checked') === 'true', 'Pfeiltasten wählen (A2), ohne weiterzuspringen');
  ok(await p.evaluate(() => document.querySelectorAll('.obSlot.full').length) === 1, 'Vala packt das erste Souvenir ein');
  await shot(p, '02-level');
  await p.click('.obNext');
  ok(/erreichen/.test(await says(p)), 'Weiter zu Schritt 3 (Ziel)');
  await p.click('.obBack');
  ok(/Wie viel Kroatisch/.test(await says(p)) && await p.getAttribute('.obOption[data-value=A2]', 'aria-checked') === 'true', 'Zurück: Antwort bleibt erhalten');
  await p.focus('.obNext'); await p.keyboard.press('Enter');

  console.log('3) Ziel, Szene, Grund, Lernstil, Kurve');
  await p.click('.obOption[data-value=sprechen]'); await p.waitForFunction(() => /Poreč/.test(document.querySelector('#obSays').textContent));
  ok(true, 'Antwort klicken springt automatisch weiter (Szene)');
  ok(await p.isVisible('.obScene .obBoat'), 'Szene: Boot legt in Poreč ab');
  await shot(p, '04-scene');
  await p.click('.obNext');
  ok(await p.evaluate(() => document.querySelectorAll('.obOption').length) === 7, 'Hauptgrund: 7 Antworten');
  await shot(p, '05-reason');
  await p.click('.obOption[data-value=urlaub]'); await p.waitForFunction(() => /am liebsten/.test(document.querySelector('#obSays').textContent));
  await p.click('.obOption[data-value=sprechen]'); await p.waitForSelector('.obChart');
  ok(await p.evaluate(() => document.querySelectorAll('.obChart .curve').length === 2 && !!document.querySelector('.obChart .levelLine') && /Beispielhafte Darstellung/.test(document.querySelector('.obChart figcaption').textContent)), 'Lernkurve: zwei Kurven, A1-Linie, Hinweis');
  await p.waitForTimeout(2600);
  ok(await p.evaluate(() => getComputedStyle(document.querySelector('.curve.with')).strokeDashoffset === '0px' || getComputedStyle(document.querySelector('.curve.with')).strokeDashoffset === '0'), 'Kurve wird gezeichnet (Animation endet bei 0)');
  await shot(p, '07-curve');
  ok(!(await overflow(p)).length, '375 px: nichts ragt heraus (Kurve)');
  await p.click('.obNext');

  console.log('4) Minuten + Uhrzeit, Planerstellung, Plan');
  await p.click('.obOption[data-value="10"]');
  ok(await p.isVisible('.obTime input[type=time]'), 'Uhrzeit-Feld vorhanden');
  await p.fill('#obTime', '07:30'); await p.dispatchEvent('#obTime', 'change');
  await shot(p, '08-minutes');
  await p.click('.obNext');
  ok(/packe deinen Plan/.test(await says(p)), 'Schritt 9: Plan wird erstellt');
  await p.waitForTimeout(900); await p.screenshot({path: out('ob-09-building.png')});
  await p.waitForSelector('.obPlan', {timeout: 6000});
  ok(await p.evaluate(() => document.querySelectorAll('.obSlot.full').length) === 5, 'Tasche voll: 5 Souvenirs');
  const plan = (await p.textContent('.obPlan')).replace(/\s+/g, ' ');
  ok(/Senj/.test(plan) && /A2 · Kapitel 1/.test(plan), 'Startort Senj (A2, Kapitel 1)');
  ok(/2 Einheiten/.test(plan) && /16 Übungen/.test(plan) && /07:30/.test(plan), 'Tagesziel 2 Einheiten ≈ 16 Übungen, Erinnerung 07:30');
  ok(/A2 ca\. am \d+\. \S+ 20\d\d/.test(plan), 'Prognose mit Datum: ' + plan.match(/A2 ca\. am [^U]*/)[0].trim());
  ok(/Urlaub/.test(plan), 'Satz zum Hauptgrund');
  ok(await p.isVisible('[data-signup]') && await p.isVisible('[data-guest]'), 'Buttons „Plan sichern“ und „Ohne Konto weiter“');
  await shot(p, '10-plan');
  ok(!(await overflow(p)).length, '375 px: nichts ragt heraus (Plan)');
  await p.click('.obBack');
  ok(/Zeit/.test(await says(p)), 'Zurück vom Plan überspringt die Ladeanimation');
  await p.click('.obNext'); await p.waitForSelector('.obPlan', {timeout: 6000});

  console.log('5) Ohne Konto weiter → Start zeigt den Plan');
  await p.click('[data-guest]'); await p.waitForSelector('#home.active');
  const prof = await p.evaluate(() => JSON.parse(localStorage.getItem('korak-profile')));
  ok(prof.level === 'A2' && prof.goal === 'sprechen' && prof.reason === 'urlaub' && prof.style === 'sprechen' && prof.minutesPerDay === 10 && prof.reminderTime === '07:30' && !!prof.onboardedAt, 'Profil gespeichert: ' + JSON.stringify(prof));
  ok(await p.evaluate(() => localStorage.getItem('korak-mode')) === 'guest', 'Gastmodus aktiv');
  ok(await p.isVisible('#planCard') && /Start in Senj/.test(await p.textContent('#planCard')), 'Plan-Karte auf der Startseite');
  ok(/0 von 16 Übungen/.test(await p.textContent('#dailyGoalLabel')) && /16 Übungen/.test(await p.textContent('#goalExercises')), 'Tagesziel aus dem Profil (16 Übungen)');
  ok(await p.evaluate(() => nextLesson().id) === 'a2-1-1' && /In Senj/.test(await p.textContent('#continueMeta')), 'Weiterlernen startet in Senj (a2-1-1)');
  await p.waitForTimeout(1500); await p.screenshot({path: out('ob-11-home.png')});
  await p.evaluate(() => { show('levels'); openLevel('A1'); });
  ok(await p.evaluate(() => document.querySelectorAll('.chapter.chapterLocked').length) === 0, 'A1: alle Kapitel offen (überspringbar)');
  ok(await p.evaluate(() => document.querySelectorAll('.skipHint').length) === 12, 'Hinweis „mit Kapiteltest überspringen“ an 12 A1-Kapiteln');
  ok(await p.evaluate(() => !document.querySelector('#ch-a1-begruessung .stone.test').disabled), 'Kapiteltest von Kapitel 1 sofort wählbar');
  await p.evaluate(() => { show('levels'); openLevel('A2'); });
  ok(await p.evaluate(() => document.querySelector('#coastHost .station.current').dataset.chapter) === 'a2-proslost', 'Vala wartet auf der Karte in Senj');
  ok(await p.evaluate(() => document.querySelector('#ch-a2-buducnost').classList.contains('chapterLocked')), 'Kapitel nach dem Start bleiben gesperrt');

  console.log('6) Neu laden: kein Onboarding mehr; Plan anpassen');
  await p.reload(); await p.waitForSelector('#home.active');
  ok(true, 'Nach dem Neuladen direkt die Startseite');
  await p.evaluate(() => { state.completed.push('a2-1-1'); state.xp = 30; save(); });
  await p.click('.dock [data-screen=profile]'); await p.waitForSelector('#planEdit');
  ok(/Senj/.test(await p.textContent('#planSummary')), 'Profil: Plan-Zusammenfassung');
  await p.click('#planEdit'); await p.waitForSelector('#onboarding.active');
  ok(/Wie viel Kroatisch/.test(await says(p)) && await p.getAttribute('.obOption[data-value=A2]', 'aria-checked') === 'true' && await p.isVisible('.obClose'), 'Plan anpassen: startet bei Niveau, Antworten vorausgewählt, Abbrechen möglich');
  await p.keyboard.press('Escape'); await p.waitForSelector('#profile.active');
  ok(true, 'Esc bricht ab, zurück im Profil');
  await p.click('#planEdit'); await p.waitForSelector('#onboarding.active');
  await p.click('.obOption[data-value=A0]');
  for (let i = 0; i < 6; i++) { await p.waitForTimeout(500); if (await p.$('.obPlan')) break; const n = await p.$('.obNext:not([disabled])'); if (n) await n.click(); }
  await p.waitForSelector('.obPlan', {timeout: 8000});
  ok(await p.isVisible('[data-apply]'), 'Bearbeiten-Modus: „Plan übernehmen“');
  await p.click('[data-apply]'); await p.waitForSelector('#home.active');
  ok(/Start in Poreč/.test(await p.textContent('#planCard')), 'Neuer Plan: Start in Poreč');
  ok(await p.evaluate(() => state.completed.includes('a2-1-1') && state.xp === 30), 'Fortschritt bleibt erhalten');

  console.log('7) Bestehender Nutzer mit Fortschritt: kein Pflicht-Onboarding');
  const B = await device('B', {init: () => { if (!sessionStorage.getItem('x')) { sessionStorage.setItem('x', 1); localStorage.setItem('korak-v6', JSON.stringify({xp: 120, completed: ['a1-1-1', 'a1-1-2'], selectedLevel: 'A1', daily: {date: '', exercises: 0, reviews: 0, dialogues: 0}})); } }});
  await B.p.waitForTimeout(800);
  ok(await B.p.evaluate(() => !document.querySelector('#onboarding.active')), 'Kein Onboarding');
  ok(await B.p.evaluate(() => document.querySelector('#auth.active') !== null), 'Wie bisher: Anmeldebildschirm');
  await B.p.click('#guestBtn'); await B.p.waitForSelector('#home.active');
  ok(await B.p.evaluate(() => state.xp === 120 && state.completed.length === 2), 'Gast-Fortschritt unverändert');
  ok(await B.p.isHidden('#planCard') && /von 20 Übungen/.test(await B.p.textContent('#dailyGoalLabel')), 'Ohne Profil: Startseite wie bisher (20 Übungen)');
  ok(await B.p.evaluate(() => nextLesson().id) === 'a1-1-3', 'Weiterlernen wie bisher (a1-1-3)');

  console.log('8) Anmelden/Registrieren aus dem Onboarding; reduzierte Bewegung');
  const C = await device('C'); await C.p.waitForSelector('#onboarding.active');
  await C.p.click('[data-signin]'); await C.p.waitForSelector('#auth.active');
  ok(await C.p.evaluate(() => document.querySelector('[data-tab=signin]').classList.contains('active')), '„Ich habe einen Account“ öffnet die Anmeldung');
  const D = await device('D', {reduced: true}); const q = D.p; await q.waitForSelector('#onboarding.active');
  await q.evaluate(() => { const d = Onboarding._draft(); Object.assign(d, {level: 'A0', goal: 'grundlagen', reason: 'familie', style: 'lesen', minutesPerDay: 5}); });
  for (let i = 0; i < 7; i++) { const n = await q.$('.obNext:not([disabled])'); if (n) await n.click(); await q.waitForTimeout(150); if (await q.$('.obChart')) break; }
  ok(await q.evaluate(() => getComputedStyle(document.querySelector('.curve.with')).strokeDashoffset.startsWith('0')), 'Reduzierte Bewegung: Kurve sofort sichtbar');
  for (let i = 0; i < 4; i++) { const n = await q.$('.obNext:not([disabled])'); if (n) await n.click(); await q.waitForTimeout(400); if (await q.$('.obPlan')) break; }
  await q.waitForSelector('.obPlan', {timeout: 4000});
  ok(/Poreč/.test(await q.textContent('.obPlan')) && /1 Einheit/.test(await q.textContent('.obPlan')), 'Plan: Poreč, 1 Einheit');
  await q.click('[data-signup]'); await q.waitForSelector('#auth.active');
  ok(await q.evaluate(() => document.querySelector('[data-tab=signup]').classList.contains('active')), '„Plan sichern“ öffnet die Registrierung');
  await q.fill('#authUser', 'Neu_hier'); await q.fill('#authPass', 'geheim123'); await q.fill('#authConfirm', 'geheim123'); await q.click('#authSubmit');
  await q.waitForSelector('#home.active');
  ok(/Start in Poreč/.test(await q.textContent('#planCard')) && /von 8 Übungen/.test(await q.textContent('#dailyGoalLabel')), 'Nach Registrierung: Plan auf der Startseite (8 Übungen)');

  console.log('Fehler:', errs.length ? errs : 'keine'); if (errs.length) fails++;
  console.log(fails ? `${fails} FEHLGESCHLAGEN` : 'ALLE TESTS BESTANDEN');
  await browser.close(); process.exit(fails ? 1 : 0);
})();
