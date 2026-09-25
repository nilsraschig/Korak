/* Korak – „Put uz obalu“: Lernpfad als handgezeichnete Küstenkarte (Istrien bis Dubrovnik).
 * Jedes Kapitel ist ein realer Ort. Die Karte ist ein einziges SVG (400 × 2100), das je Level
 * auf seinen Abschnitt zugeschnitten wird. Vala sitzt als eigenes HTML-Element über der Karte,
 * damit ihre Bewegung die gefilterte (teure) Karte nicht neu zeichnen muss.
 */
(function () {
  const INK = "#243328";

  // Kapitel → Ort (Reihenfolge = Reiseroute von Nord nach Süd)
  const STATIONS = [
    ["a1-begruessung", "Poreč", 84, 140, "tower", "r"],
    ["a1-obitelj", "Rovinj", 86, 212, "campanile", "r"],
    ["a1-hrana", "Pula", 132, 358, "arena", "r"],
    ["a1-kupovina", "Opatija", 244, 238, "palm", "l"],
    ["a1-putovanje", "Rijeka", 292, 226, "clock", "r"],
    ["a1-svakodnevica", "Krk", 282, 304, "tablet", "l"],
    ["a2-proslost", "Senj", 338, 352, "fort", "r"],
    ["a2-buducnost", "Rab", 300, 420, "towers", "l"],
    ["a2-smjestaj", "Pag", 268, 560, "lace", "l"],
    ["a2-restoran", "Nin", 304, 720, "chapel", "r"],
    ["a2-svakodnevica", "Zadar", 282, 800, "sun", "r"],
    ["a2-posao", "Šibenik", 304, 950, "dome", "l"],
    ["a2-hitno", "Krka", 340, 990, "falls", "r"],
    ["a2-promet", "Primošten", 310, 1050, "vines", "l"],
    ["a2-dom", "Trogir", 318, 1134, "fort", "l"],
    ["a2-vrijeme", "Split", 334, 1190, "palace", "r"],
    ["a2-novac", "Omiš", 350, 1260, "cliff", "r"],
    ["a2-tijelo", "Makarska", 360, 1360, "mountain", "r"],
    ["a2-ordinacija", "Bol", 268, 1297, "beach", "l"],
    ["a2-stanovanje", "Hvar", 206, 1348, "lavender", "l"],
    ["a2-susjedi", "Vis", 108, 1402, "boat", "r"],
    ["a2-konoba", "Korčula", 300, 1512, "roundtower", "r"],
    ["a2-kolodvor", "Orebić", 266, 1566, "anchor", "l"],
    ["a2-ured", "Mljet", 250, 1760, "island", "l"],
    ["b1-misljenje", "Ston", 338, 1832, "walls", "r"],
    ["b1-karijera", "Trsteno", 354, 1944, "tree", "r"],
    ["b1-drustvo", "Dubrovnik", 364, 2000, "citywalls", "l"]
  ].map(([id, name, x, y, mark, side], i) => ({ id, name, x, y, mark, side, n: i + 1 }));

  const CROP = { A1: [0, 440], A2: [300, 1810], B1: [1700, 2090] };
  const REGION = { A1: "Istrien & Kvarner", A2: "Dalmatien", B1: "Süddalmatien" };

  // Festlandküste (Land liegt rechts/östlich)
  const COAST = [[262, -20], [240, 22], [190, 34], [132, 42], [96, 62], [82, 98], [84, 140], [78, 178], [86, 212], [92, 250], [104, 290], [118, 330], [132, 360], [150, 388], [170, 384], [182, 360], [196, 330], [206, 296], [222, 262], [244, 238], [270, 224], [292, 226], [312, 244], [330, 290], [338, 350], [340, 410], [338, 470], [334, 540], [330, 610], [320, 680], [304, 720], [290, 760], [282, 800], [288, 850], [298, 900], [304, 950], [306, 1000], [310, 1050], [316, 1100], [318, 1134], [334, 1190], [346, 1230], [350, 1262], [356, 1310], [360, 1360], [362, 1420], [362, 1480], [360, 1540], [352, 1590], [346, 1640], [348, 1700], [352, 1780], [340, 1832], [350, 1900], [354, 1944], [364, 2000], [372, 2050], [382, 2120]];
  const ISLANDS = [[208, 380, 12, 92, 6], [196, 500, 9, 38, 12], [282, 300, 34, 24, -10], [300, 420, 16, 20, -20], [268, 560, 11, 92, -28], [200, 860, 9, 80, -30], [250, 850, 8, 60, -30], [215, 930, 6, 20, -30], [230, 962, 5, 14, -30], [268, 1280, 58, 18, -6], [220, 1224, 26, 9, -8], [238, 1350, 80, 12, -7], [108, 1402, 22, 14, -8], [236, 1515, 74, 12, -8], [300, 1690, 16, 148, -16], [250, 1760, 58, 9, -18], [130, 1640, 20, 8, -5], [352, 2022, 6, 4, 0]];

  // ---------- Geometrie ----------
  function catmull(pts, closed = false) {
    const p = closed ? [pts[pts.length - 1], ...pts, pts[0], pts[1]] : [pts[0], ...pts, pts[pts.length - 1]];
    let d = `M${p[1][0]} ${p[1][1]}`;
    for (let i = 1; i < p.length - 2; i++) {
      const [x0, y0] = p[i - 1], [x1, y1] = p[i], [x2, y2] = p[i + 1], [x3, y3] = p[i + 2];
      d += ` C${(x1 + (x2 - x0) / 6).toFixed(1)} ${(y1 + (y2 - y0) / 6).toFixed(1)} ${(x2 - (x3 - x1) / 6).toFixed(1)} ${(y2 - (y3 - y1) / 6).toFixed(1)} ${x2} ${y2}`;
    }
    return d;
  }
  // Leicht unregelmäßige Insel – deterministisch, damit sie bei jedem Rendern gleich aussieht
  function islandPath([cx, cy, rx, ry, rot], seed) {
    const pts = [], n = 14, a = rot * Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const t = i / n * Math.PI * 2, wob = 1 + 0.12 * Math.sin(t * 3 + seed) + 0.06 * Math.cos(t * 5 + seed * 2);
      const x = Math.cos(t) * rx * wob, y = Math.sin(t) * ry * wob;
      pts.push([+(cx + x * Math.cos(a) - y * Math.sin(a)).toFixed(1), +(cy + x * Math.sin(a) + y * Math.cos(a)).toFixed(1)]);
    }
    return catmull(pts, true) + "Z";
  }

  // ---------- Wahrzeichen (gezeichnet, ca. 28 × 28, Fußpunkt unten Mitte) ----------
  const W = "#f1e3c4", T = "#c0643d", S = "#16707a", O = "#6f7a3b", Y = "#e7ae2f";
  const MARKS = {
    tower: `<path fill="${W}" d="M-5 0 V-18 H5 V0Z"/><path fill="${T}" d="M-7 -18 L0 -27 L7 -18Z"/><path fill="none" d="M-2 -13 V-9 M2 -13 V-9"/>`,
    campanile: `<path fill="${W}" d="M-3.5 0 V-22 H3.5 V0Z"/><path fill="${T}" d="M-4.5 -22 L0 -33 L4.5 -22Z"/><path fill="none" d="M0 -33 V-37 M-1.5 -16 V-12 M1.5 -16 V-12"/><path fill="${W}" d="M-12 0 V-7 L-8 -10 L-4 -7 V0Z M4 0 V-8 L8 -11 L12 -8 V0Z"/>`,
    arena: `<ellipse cx="0" cy="-8" rx="15" ry="8" fill="${W}"/><path fill="none" d="M-15 -8 V-1 M15 -8 V-1 M-15 -1 C-10 3 10 3 15 -1"/><g fill="${T}" stroke="none"><rect x="-12" y="-7" width="2.4" height="3.2" rx="1"/><rect x="-7" y="-6" width="2.4" height="3.2" rx="1"/><rect x="-2" y="-6" width="2.4" height="3.2" rx="1"/><rect x="3" y="-6" width="2.4" height="3.2" rx="1"/><rect x="8" y="-7" width="2.4" height="3.2" rx="1"/></g><ellipse cx="0" cy="-9" rx="9" ry="3.6" fill="#d9c9a4"/>`,
    palm: `<path fill="none" stroke="#8a4a2b" stroke-width="2" d="M0 0 C1 -8 -1 -15 2 -22"/><path fill="${O}" d="M2 -22 C-6 -24 -11 -20 -12 -15 C-7 -19 -3 -20 2 -21Z M2 -22 C9 -25 14 -21 15 -16 C10 -20 6 -21 2 -21Z M2 -22 C-2 -29 3 -32 7 -31 C3 -29 2 -26 2 -22Z"/><path fill="${W}" d="M5 0 V-8 H16 V0Z"/><path fill="${T}" d="M4 -8 L10.5 -13 L17 -8Z"/>`,
    clock: `<path fill="${W}" d="M-5 0 V-24 H5 V0Z"/><path fill="${T}" d="M-6 -24 C-6 -30 6 -30 6 -24Z"/><circle cx="0" cy="-17" r="3.2" fill="#fff"/><path fill="none" d="M0 -17 V-19 M0 -17 H1.6"/>`,
    tablet: `<path fill="#d9d2c0" d="M-10 0 V-20 C-10 -23 10 -23 10 -20 V0Z"/><path fill="none" stroke-width="1.1" d="M-6 -16 H-2 V-12 M1 -16 C4 -16 4 -12 1 -12 M-6 -8 H-3 M0 -8 L4 -5 M-5 -4 H5"/>`,
    fort: `<path fill="${W}" d="M-12 0 V-14 H-9 V-17 H-6 V-14 H-3 V-17 H0 V-14 H3 V-17 H6 V-14 H9 V-17 H12 V-14 V0Z"/><path fill="none" d="M-2 0 V-5 C-2 -8 2 -8 2 -5 V0"/>`,
    towers: `<g fill="${W}"><path d="M-12 0 V-16 H-8 V0Z M-5 0 V-24 H-1 V0Z M2 0 V-20 H6 V0Z M9 0 V-13 H13 V0Z"/></g><g fill="${T}"><path d="M-13 -16 L-10 -21 L-7 -16Z M-6 -24 L-3 -30 L0 -24Z M1 -20 L4 -26 L7 -20Z M8 -13 L11 -18 L14 -13Z"/></g>`,
    lace: `<circle cx="0" cy="-12" r="11" fill="#fbf8f1"/><circle cx="0" cy="-12" r="6" fill="none"/><path fill="none" stroke-width="1" d="M0 -23 V-18 M0 -6 V-1 M-11 -12 H-6 M6 -12 H11 M-8 -20 L-4 -16 M4 -8 L8 -4 M8 -20 L4 -16 M-4 -8 L-8 -4"/>`,
    chapel: `<path fill="${W}" d="M-9 0 V-9 H9 V0Z M-4 -9 V-15 H4 V-9Z"/><path fill="${T}" d="M-5 -15 C-5 -21 5 -21 5 -15Z"/><path fill="none" d="M0 -21 V-25 M-1.6 -23.4 H1.6"/>`,
    sun: `<circle cx="0" cy="-12" r="6" fill="${Y}"/><g fill="${S}" stroke="none"><circle cx="0" cy="-23" r="1.6"/><circle cx="8" cy="-20" r="1.6"/><circle cx="11" cy="-12" r="1.6"/><circle cx="8" cy="-4" r="1.6"/><circle cx="-8" cy="-20" r="1.6"/><circle cx="-11" cy="-12" r="1.6"/><circle cx="-8" cy="-4" r="1.6"/></g><path fill="none" stroke="${S}" d="M-14 1 C-9 -2 -5 4 0 1 C5 -2 9 4 14 1"/>`,
    dome: `<path fill="${W}" d="M-12 0 V-10 H12 V0Z"/><path fill="#d9d2c0" d="M-8 -10 C-8 -22 8 -22 8 -10Z"/><path fill="none" d="M0 -20 V-26 M-4 -10 C-4 -17 4 -17 4 -10"/><circle cx="0" cy="-27" r="1.6" fill="${W}"/>`,
    falls: `<path fill="#9fb7a0" d="M-14 0 C-14 -12 -8 -22 0 -24 C8 -22 14 -12 14 0Z"/><path fill="none" stroke="${S}" stroke-width="1.8" d="M-6 -20 C-7 -12 -5 -6 -7 0 M0 -22 C-1 -14 1 -7 0 0 M6 -20 C5 -12 7 -6 5 0"/>`,
    vines: `<path fill="#9fb77a" d="M-14 0 C-10 -12 10 -12 14 0Z"/><path fill="none" stroke="${O}" d="M-10 -3 H10 M-8 -6 H8 M-5 -9 H5"/><path fill="${W}" d="M-2 -12 V-19 H2 V-12Z"/><path fill="${T}" d="M-3 -19 L0 -24 L3 -19Z"/>`,
    palace: `<path fill="${W}" d="M-15 0 V-10 H15 V0Z"/><g fill="#d9c9a4"><path d="M-12 0 V-6 C-12 -8.5 -9 -8.5 -9 -6 V0Z M-6 0 V-6 C-6 -8.5 -3 -8.5 -3 -6 V0Z M0 0 V-6 C0 -8.5 3 -8.5 3 -6 V0Z M6 0 V-6 C6 -8.5 9 -8.5 9 -6 V0Z"/></g><path fill="${W}" d="M9 -10 V-26 H14 V-10Z"/><path fill="${T}" d="M8 -26 L11.5 -33 L15 -26Z"/>`,
    cliff: `<path fill="#b9a98a" d="M-14 0 L-10 -14 L-4 -18 L2 -24 L8 -20 L14 0Z"/><path fill="${W}" d="M0 -24 V-31 H6 V-24Z"/><path fill="none" d="M0 -31 V-33 M3 -31 V-33 M6 -31 V-33"/>`,
    mountain: `<path fill="#a7a58d" d="M-16 0 L-6 -20 L-1 -14 L4 -26 L16 0Z"/><path fill="#fbf8f1" d="M4 -26 L-0.6 -17 L2 -18.5 L4 -16 L6.5 -19 L8.4 -17Z"/>`,
    beach: `<path fill="#f3d9b8" d="M-14 0 C-8 -3 -2 -3 2 -8 C5 -12 9 -14 13 -14 C10 -10 8 -5 4 -2 C0 1 -8 2 -14 0Z"/><path fill="none" stroke="${S}" d="M-14 3 C-9 1 -5 5 0 3 C5 1 9 5 14 3"/><path fill="${O}" d="M9 -15 C9 -20 13 -20 13 -15Z"/>`,
    lavender: `<path fill="${W}" d="M-8 -12 V-20 H8 V-12Z"/><path fill="none" d="M-8 -20 V-22 H-4 V-20 M-2 -20 V-22 H2 V-20 M4 -20 V-22 H8 V-20"/><path fill="#b8a3d6" d="M-15 0 C-10 -12 10 -12 15 0Z"/><g fill="#8b72b8" stroke="none"><circle cx="-9" cy="-4" r="1.4"/><circle cx="-4" cy="-6" r="1.4"/><circle cx="1" cy="-7" r="1.4"/><circle cx="6" cy="-6" r="1.4"/><circle cx="10" cy="-4" r="1.4"/></g>`,
    boat: `<path fill="${T}" d="M-14 -4 H14 L10 2 H-11Z"/><path fill="${W}" d="M-1 -5 V-26 L12 -6Z"/><path fill="none" d="M-1 -26 V-4"/><path fill="none" stroke="${S}" d="M-15 4 C-10 2 -6 6 -1 4 C4 2 8 6 13 4"/>`,
    roundtower: `<path fill="${W}" d="M-8 0 V-18 H8 V0Z"/><path fill="none" d="M-8 -18 V-21 H-5 V-18 M-2 -18 V-21 H2 V-18 M5 -18 V-21 H8 V-18 M-8 -4 C-3 -2 3 -2 8 -4"/><path fill="none" d="M-2 -12 V-8"/>`,
    anchor: `<path fill="none" stroke-width="2" d="M0 -24 V-2 M-10 -8 C-8 -1 8 -1 10 -8 M-5 -19 H5"/><circle cx="0" cy="-26" r="2.4" fill="none" stroke-width="2"/>`,
    island: `<path fill="#9fb77a" d="M-14 0 C-12 -8 12 -8 14 0Z"/><path fill="${W}" d="M-5 -6 V-13 H5 V-6Z"/><path fill="${T}" d="M-6 -13 L0 -18 L6 -13Z"/><path fill="none" stroke="${S}" d="M-16 2 C-11 0 -7 4 -2 2 C3 0 7 4 12 2"/>`,
    walls: `<path fill="#b9a98a" d="M-15 0 L-8 -12 L0 -18 L8 -10 L15 0Z"/><path fill="none" stroke-width="2" stroke="${W}" d="M-13 -2 L-8 -11 L-4 -8 L0 -17 L4 -12 L8 -9 L13 -2"/><path fill="none" stroke-width="1" d="M-13 -2 L-8 -11 L-4 -8 L0 -17 L4 -12 L8 -9 L13 -2"/>`,
    tree: `<path fill="none" stroke="#8a4a2b" stroke-width="2.4" d="M0 0 V-11"/><path fill="${O}" d="M0 -30 C9 -30 14 -22 11 -15 C9 -10 3 -10 0 -11 C-3 -10 -9 -10 -11 -15 C-14 -22 -9 -30 0 -30Z"/>`,
    citywalls: `<path fill="${W}" d="M-16 0 V-10 H-9 V-13 H-6 V-10 H6 V-13 H9 V-10 H16 V0Z"/><path fill="${W}" d="M-3 -10 V-22 C-3 -25 5 -25 5 -22 V-10Z"/><path fill="none" d="M-3 -22 H5 M-3 -19 V-22 M1 -19 V-22 M5 -19 V-22"/><path fill="none" d="M1 -25 V-31"/><path fill="${T}" d="M1 -31 L7 -29 L1 -27Z"/>`
  };

  const ROUTE_PATH = catmull(STATIONS.map(s => [s.x, s.y]));

  function stationState(i, level) {
    const lev = DATA.levels.find(l => l.id === level);
    const ci = lev.chapters.findIndex(c => c.id === STATIONS[i].id);
    const ch = lev.chapters[ci];
    if (!ch) return "hidden";
    if (state.completed.includes(ch.testId)) return "done";
    return chapterUnlocked(ch, ci) ? "open" : "locked";
  }
  /** Index der Station, an der Vala gerade ist: erstes offenes Kapitel des Levels, sonst letztes erledigtes. */
  function currentIndex(level) {
    const idx = STATIONS.map((s, i) => i).filter(i => stationLevel(i) === level);
    const open = idx.find(i => stationState(i, level) === "open");
    return open != null ? open : idx[idx.length - 1];
  }
  const stationLevel = i => STATIONS[i].id.slice(0, 2).toUpperCase();

  /** Rendert den Kartenausschnitt des Levels in host. onPick(chapterId) beim Antippen eines Ortes. */
  function render(host, level, onPick) {
    const [y0, y1] = CROP[level] || [0, 2100];
    const h = y1 - y0;
    const cur = currentIndex(level);
    const land = COAST.map(p => p);
    const landPath = catmull(land) + ` L420 ${land[land.length - 1][1]} L420 -40 Z`;
    const seaMarks = [];
    for (let y = y0 + 30; y < y1; y += 70) for (let k = 0; k < 2; k++) {
      const x = 30 + ((y * 7 + k * 97) % 150);
      seaMarks.push(`<path d="M${x} ${y + k * 30} q4 -4 8 0 t8 0"/>`);
    }
    const stations = STATIONS.map((s, i) => {
      if (stationLevel(i) !== level) return "";
      const st = stationState(i, level), labelX = s.side === "l" ? -14 : 14, anchor = s.side === "l" ? "end" : "start";
      const markX = s.side === "l" ? -30 : 30;
      return `<g class="station ${st}${i === cur ? " current" : ""}" data-chapter="${s.id}" transform="translate(${s.x} ${s.y})" tabindex="0" role="button" aria-label="${s.name}: ${st === "done" ? "abgeschlossen" : st === "locked" ? "noch gesperrt" : "offen"}">
        <g class="landmark" transform="translate(${markX} -6)" filter="url(#ink)" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round" stroke-linecap="round">${MARKS[s.mark] || MARKS.tower}</g>
        <circle class="pin" r="9"/>${st === "done" ? `<path class="pinCheck" d="M-4 0 l3 3 5 -6"/>` : `<text class="pinNo" y="4">${s.n}</text>`}
        <text class="placeName" x="${labelX}" y="${s.side === "l" ? 22 : 22}" text-anchor="${anchor}">${s.name}</text>
      </g>`;
    }).join("");
    host.innerHTML = `<div class="coastMap" style="--ratio:${(h / 400).toFixed(4)}">
      <svg class="coastSvg" viewBox="0 ${y0} 400 ${h}" role="group" aria-label="Küstenkarte ${REGION[level] || ""}">
        <rect class="sea" x="-20" y="${y0 - 20}" width="440" height="${h + 40}"/>
        <g class="seaMarks">${seaMarks.join("")}</g>
        <path class="land" d="${landPath}" filter="url(#paint)"/>
        <path class="coastline" d="${catmull(land)}" filter="url(#ink)"/>
        ${ISLANDS.map((isl, i) => `<path class="land island" d="${islandPath(isl, i + 1)}" filter="url(#paint)"/><path class="coastline" d="${islandPath(isl, i + 1)}" filter="url(#ink)"/>`).join("")}
        <path class="route" d="${ROUTE_PATH}"/>
        <path class="routeDone" d="${ROUTE_PATH}" style="stroke-dasharray:${routeDoneLength(cur)} 99999"/>
        <text class="seaName" x="40" y="${y0 + h * .55}" transform="rotate(-72 40 ${y0 + h * .55})">Jadransko more</text>
        ${stations}
      </svg>
      <div class="valaMarker" aria-hidden="true">${Vala.svg({ mood: "idle" })}</div>
    </div>`;
    const map = host.querySelector(".coastMap");
    map.style.setProperty("--y0", y0);
    placeVala(map, STATIONS[cur], y0, h);
    host.querySelectorAll(".station").forEach(g => {
      const go = () => onPick && onPick(g.dataset.chapter);
      g.addEventListener("click", go);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(); } });
    });
    return map;
  }

  // Länge der Route bis zur Station i – einmal entlang des Pfads abgetastet (die Route läuft nicht monoton nach Süden)
  let measure = null, LENS = null;
  function lens() {
    if (LENS) return LENS;
    if (!measure) {
      const holder = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      holder.setAttribute("aria-hidden", "true");
      holder.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
      measure = document.createElementNS("http://www.w3.org/2000/svg", "path");
      measure.setAttribute("d", ROUTE_PATH);
      holder.appendChild(measure);
      document.body.appendChild(holder);
    }
    const total = measure.getTotalLength(), samples = [];
    for (let l = 0; l <= total; l += 2) { const p = measure.getPointAtLength(l); samples.push([l, p.x, p.y]); }
    LENS = []; let from = 0;
    STATIONS.forEach(s => {
      let best = from, bd = Infinity;
      for (let k = from; k < samples.length; k++) {
        const d = (samples[k][1] - s.x) ** 2 + (samples[k][2] - s.y) ** 2;
        if (d < bd) { bd = d; best = k; }
        if (bd < 2 && d > 900) break;
      }
      LENS.push(samples[best][0]); from = best;
    });
    return LENS;
  }
  const routeLengthTo = i => lens()[i];
  function routeDoneLength(cur) {
    try { return Math.max(0, routeLengthTo(cur)).toFixed(0); } catch (e) { return 0; }
  }

  function placeVala(map, s, y0, h) {
    const m = map.querySelector(".valaMarker");
    m.style.left = (s.x / 400 * 100) + "%";
    m.style.top = ((s.y - y0) / h * 100) + "%";
  }

  /** Vala reist entlang der Route von Station a nach b (Indizes), danach Callback. */
  function travel(map, a, b, level, done) {
    const [y0, y1] = CROP[level];
    const h = y1 - y0, m = map.querySelector(".valaMarker"), vala = m.querySelector(".vala");
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { placeVala(map, STATIONS[b], y0, h); return done && done(); }
    const la = routeLengthTo(a), lb = routeLengthTo(b), dur = 2600, t0 = performance.now();
    Vala.react(vala, "walk", dur + 200);
    m.classList.add("travelling");
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = k < .5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      const p = measure.getPointAtLength(la + (lb - la) * e);
      m.style.left = (p.x / 400 * 100) + "%"; m.style.top = ((p.y - y0) / h * 100) + "%";
      m.classList.toggle("flip", lb < la);
      if (k < 1) requestAnimationFrame(step); else { m.classList.remove("travelling"); Vala.react(vala, "cheer", 1600); done && done(); }
    };
    requestAnimationFrame(step);
  }

  /** Fortschritt der ganzen Reise: [erledigte Stationen, gesamt, nächster Ort]. */
  function journey() {
    let done = 0, next = null;
    STATIONS.forEach((s, i) => {
      const lvl = stationLevel(i), st = stationState(i, lvl);
      if (st === "done") done++; else if (!next && st === "open") next = s;
    });
    return { done, total: STATIONS.length, next: next || STATIONS.find((s, i) => stationState(i, stationLevel(i)) !== "done") || STATIONS[STATIONS.length - 1] };
  }

  window.Coast = { STATIONS, REGION, render, travel, journey, currentIndex, stationFor: id => STATIONS.find(s => s.id === id), indexOf: id => STATIONS.findIndex(s => s.id === id), MARKS };
})();
