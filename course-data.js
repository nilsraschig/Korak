/* Korak – setzt die Kursdaten aus course/a1.js, course/a2.js und course/b1.js zusammen.
 * Ergebnis wie bisher: window.KORAK_DATA = { levels, lessons }.
 * lessons ist die flache Liste in Kursreihenfolge: je Kapitel die Lektionen, danach der Kapiteltest.
 * Die flachen Lektionen sind eigene Kopien (wie früher beim einzelnen JSON), damit Änderungen
 * an einer Liste die andere nicht berühren. Prüfen: node scripts/validate-course.js
 */
(function () {
  const ORDER = ["A1", "A2", "B1"];
  const parts = window.KORAK_COURSE || [];
  const copy = o => JSON.parse(JSON.stringify(o));
  const levels = [], lessons = [];
  ORDER.forEach(id => {
    const part = parts.find(p => p.level.id === id);
    if (!part) throw new Error("Kursdaten fehlen: " + id);
    levels.push(part.level);
    part.level.chapters.forEach(ch => {
      ch.lessons.forEach(l => lessons.push(copy(l)));
      const test = part.tests.find(t => t.id === ch.testId);
      if (!test) throw new Error("Kapiteltest fehlt: " + ch.testId);
      lessons.push(test);
    });
  });
  window.KORAK_DATA = { levels, lessons };
})();
