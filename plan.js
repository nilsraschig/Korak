/* Korak – persönlicher Lernplan aus dem Onboarding-Profil.
 *
 *   buildPlan(profile, course)  →  { startChapterId, startLevel, startIndex, skippable[], weights,
 *                                    minutesPerDay, units, dailyExercises, target, forecastDate, ... }
 *
 * profile = { level, goal, reason, style, minutesPerDay, reminderTime, onboardedAt }  (localStorage "korak-profile")
 * course  = window.KORAK_DATA
 * Ohne Profil liefert window.Plan überall null bzw. die bisherigen Standardwerte – bestehende Nutzer
 * merken also nichts, solange sie kein Onboarding/„Plan anpassen“ durchlaufen.
 */
(function () {
  const KEY = "korak-profile";
  const MIN_PER_UNIT = 5;          // 5 Minuten ≈ 1 Einheit
  const EXERCISES_PER_UNIT = 8;    // 1 Einheit ≈ 8 Übungen
  const MIN_PER_LESSON = 12;       // eine Lektion inkl. Wiederholungen dauert ca. 12 Minuten

  // Niveau → Startkapitel (frühere Kapitel lassen sich per Kapiteltest überspringen)
  const START = { A0: "a1-begruessung", A1: "a1-hrana", A2: "a2-proslost", B1: "a2-posao" };
  // Niveau → Ziel der Prognose
  const TARGET = { A0: "A1", A1: "A1", A2: "A2", B1: "B1" };

  // Standard-Gewichte = bisheriges Verhalten von prodType/recogType in app.js
  const BASE = { prod: { "input-hr": 2, "choice-hr": 1, listen: 1, order: 2, cloze: 2 }, listenChoice: 0.3, roleplayBonus: 0 };
  const STYLE = {
    sprechen: { prod: { listen: 2, "choice-hr": 1 }, listenChoice: 0.4, roleplayBonus: 0.35 },
    lesen: { prod: { "input-hr": 2, order: 1, cloze: 1 }, listenChoice: 0.2, roleplayBonus: 0 },
    hoeren: { prod: { listen: 3 }, listenChoice: 0.55, roleplayBonus: 0.1 }
  };
  const GOAL = {
    grundlagen: { prod: { "choice-hr": 1 } },
    sprechen: { prod: { listen: 1 }, roleplayBonus: 0.15 },
    fliessend: { prod: { "input-hr": 1, order: 1 }, roleplayBonus: 0.1 },
    unsicher: {}
  };

  function weightsFor(profile) {
    const w = { prod: { ...BASE.prod }, listenChoice: BASE.listenChoice, roleplayBonus: BASE.roleplayBonus };
    [STYLE[profile.style], GOAL[profile.goal]].forEach(mod => {
      if (!mod) return;
      Object.entries(mod.prod || {}).forEach(([k, v]) => { w.prod[k] = (w.prod[k] || 0) + v; });
      if (typeof mod.listenChoice === "number") w.listenChoice = mod.listenChoice;
      w.roleplayBonus += mod.roleplayBonus || 0;
    });
    w.roleplayBonus = Math.min(0.6, w.roleplayBonus);
    return w;
  }

  function chaptersInOrder(course) {
    return course.levels.flatMap(l => l.chapters.map(c => ({ ...c, levelId: l.id })));
  }

  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }

  /** completed: optional Liste erledigter Lektions-IDs (für die Prognose bestehender Nutzer). */
  function buildPlan(profile, course, completed = []) {
    if (!profile || !course) return null;
    const chapters = chaptersInOrder(course);
    const startChapterId = START[profile.level] || START.A0;
    const startIndex = Math.max(0, chapters.findIndex(c => c.id === startChapterId));
    const start = chapters[startIndex];
    const minutes = [5, 10, 15, 30].includes(Number(profile.minutesPerDay)) ? Number(profile.minutesPerDay) : 10;
    const units = Math.max(1, Math.round(minutes / MIN_PER_UNIT));
    const target = TARGET[profile.level] || "A1";

    // Prognose: noch offene Lektionen (inkl. Kapiteltests) vom Startkapitel bis zum Ende des Ziel-Levels
    const done = new Set(completed);
    const targetPos = course.levels.findIndex(l => l.id === target);
    const remaining = chapters
      .slice(startIndex)
      .filter(c => course.levels.findIndex(l => l.id === c.levelId) <= targetPos)
      .reduce((n, c) => n + c.lessons.filter(l => !done.has(l.id)).length + (done.has(c.testId) ? 0 : 1), 0);
    const days = Math.max(1, Math.ceil(remaining * MIN_PER_LESSON / minutes));

    return {
      startChapterId,
      startChapterTitle: start.title,
      startLevel: start.levelId,
      startChapterNumber: start.number,
      startIndex,
      skippable: chapters.slice(0, startIndex).map(c => c.id),
      weights: weightsFor(profile),
      minutesPerDay: minutes,
      units,
      dailyExercises: units * EXERCISES_PER_UNIT,
      target,
      remainingLessons: remaining,
      forecastDays: days,
      forecastDate: addDays(new Date(), days)
    };
  }

  // ---------- Profil im Browser ----------
  function readProfile() {
    try { const p = JSON.parse(localStorage.getItem(KEY) || "null"); return p && typeof p === "object" ? p : null; } catch (e) { return null; }
  }
  function saveProfile(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    cache = null;
  }
  let cache = null;
  // state (app.js) ist eine globale Variable, aber keine window-Eigenschaft
  const completedNow = () => { try { return (typeof state !== "undefined" && state && state.completed) || []; } catch (e) { return []; } };
  function current() {
    let raw = null;
    try { raw = localStorage.getItem(KEY); } catch (e) {}
    const done = completedNow();
    if (cache && cache.raw === raw && cache.done === done.length) return cache.plan;
    const p = readProfile();
    const plan = p && window.KORAK_DATA ? buildPlan(p, window.KORAK_DATA, done) : null;
    cache = { raw, done: done.length, plan };
    return plan;
  }

  window.buildPlan = buildPlan;
  window.Plan = {
    KEY, MIN_PER_UNIT, EXERCISES_PER_UNIT, START, TARGET,
    readProfile, saveProfile, current,
    /** Kapitel liegt vor dem Startkapitel und ist noch nicht per Test erledigt → frei, überspringbar */
    skippable(chapterId) { const p = current(); return !!(p && p.skippable.includes(chapterId)); },
    /** Kapitel bis einschließlich Startkapitel sind sofort offen */
    unlocks(chapterId) { const p = current(); return !!(p && (p.skippable.includes(chapterId) || p.startChapterId === chapterId)); },
    weights() { const p = current(); return p ? p.weights : null; },
    dailyTarget() { const p = current(); return p ? p.dailyExercises : 20; },
    /** Datum hübsch auf Deutsch, z. B. „14. März 2027“ */
    formatDate(d) { return new Date(d).toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" }); }
  };
})();
