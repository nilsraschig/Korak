/* Korak – Vala, die Mauereidechse, und ihre Souvenirs.
 * Alles als SVG mit Papier-/Aquarellfiltern (#paint, #ink im Sprite von index.html).
 * Die Figur ist bewusst aus Einzelteilen aufgebaut (Schwanz, Körper, Beine, Kopf, Tasche),
 * damit Posen per CSS animiert und die Zeichnung später durch Illustrationen ersetzt werden kann.
 */
(function () {
  const INK = "#243328";

  /** Vala als Inline-SVG. mood: idle | jump | tilt | cheer | walk */
  function svg(opts = {}) {
    const cls = ["vala", opts.mood || "idle", opts.className || ""].join(" ").trim();
    const label = opts.label ? `role="img" aria-label="${opts.label}"` : 'aria-hidden="true"';
    return `<svg class="${cls}" viewBox="0 0 200 150" ${label}>
  <ellipse class="v-shadow" cx="112" cy="130" rx="62" ry="7"/>
  <g class="v-tail"><path filter="url(#paint)" fill="#7f9b4b" d="M72 90 C55 99 36 103 24 96 C12 89 13 74 25 71 C34 69 39 78 33 83 C31 80 27 79 25 82 C22 86 27 92 35 92 C50 93 60 91 72 100 Z"/>
    <path fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" filter="url(#ink)" d="M72 90 C55 99 36 103 24 96 C12 89 13 74 25 71 C34 69 39 78 33 83 M72 100 C60 91 50 93 35 92 C27 92 22 86 25 82"/>
    <path fill="none" stroke="#4f6a2e" stroke-width="2" stroke-linecap="round" stroke-dasharray="3 5" d="M64 95 C50 100 36 99 28 93"/></g>
  <g class="v-legs back" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="${INK}" stroke-width="8" d="M98 102 C100 109 102 113 107 116"/><path stroke="#6f8a45" stroke-width="4.6" d="M98 102 C100 109 102 113 107 116"/>
    <path stroke="${INK}" stroke-width="8" d="M126 100 C125 107 122 111 117 114"/><path stroke="#6f8a45" stroke-width="4.6" d="M126 100 C125 107 122 111 117 114"/>
  </g>
  <g class="v-body">
    <path filter="url(#paint)" fill="#8aa653" d="M62 94 C64 80 86 72 108 73 C124 74 136 76 142 84 C140 98 124 106 102 107 C82 107 64 104 62 94 Z"/>
    <path filter="url(#paint)" fill="#e2cf92" opacity=".9" d="M72 101 C88 106 112 106 130 100 C122 104 108 107 96 106 C86 106 78 104 72 101 Z"/>
    <path fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" filter="url(#ink)" d="M62 94 C64 80 86 72 108 73 C124 74 136 76 142 84 C140 98 124 106 102 107 C82 107 64 104 62 94 Z"/>
    <g fill="#4f6a2e" opacity=".85"><circle cx="82" cy="82" r="2.4"/><circle cx="94" cy="78.5" r="2.1"/><circle cx="106" cy="77.5" r="2.4"/><circle cx="118" cy="78.5" r="2"/><circle cx="88" cy="90" r="1.6"/><circle cx="112" cy="88" r="1.7"/></g>
    <g fill="#2f9c98"><circle cx="100" cy="97" r="2.6"/><circle cx="114" cy="96" r="2.2"/><circle cx="87" cy="98" r="1.8"/></g>
  </g>
  <g class="v-legs front" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path stroke="${INK}" stroke-width="8.6" d="M80 99 C77 106 73 111 66 115"/><path stroke="#8aa653" stroke-width="5" d="M80 99 C77 106 73 111 66 115"/>
    <path stroke="${INK}" stroke-width="8.6" d="M137 92 C141 100 145 106 152 110"/><path stroke="#8aa653" stroke-width="5" d="M137 92 C141 100 145 106 152 110"/>
    <path stroke="${INK}" stroke-width="2.2" d="M66 115 l-6.5 0 M66 115 l-4.5 4.5 M66 115 l0 6 M152 110 l6.5 -1 M152 110 l5 4.5 M152 110 l1 6"/>
  </g>
  <g class="v-bag">
    <path d="M118 76 C112 86 104 96 98 104" fill="none" stroke="#8a4a2b" stroke-width="2.4" stroke-linecap="round"/>
    <path filter="url(#paint)" fill="#c0643d" d="M86 99 h22 a3 3 0 0 1 3 3 v11 a5 5 0 0 1 -5 5 h-18 a5 5 0 0 1 -5 -5 v-11 a3 3 0 0 1 3 -3 z"/>
    <path fill="none" stroke="${INK}" stroke-width="2" filter="url(#ink)" d="M86 99 h22 a3 3 0 0 1 3 3 v11 a5 5 0 0 1 -5 5 h-18 a5 5 0 0 1 -5 -5 v-11 a3 3 0 0 1 3 -3 z M84 105 h26"/>
    <g fill="#f1e3c4"><rect x="88" y="108" width="3.4" height="3.4" rx=".6"/><rect x="93" y="108" width="3.4" height="3.4" rx=".6" fill="#2f9c98"/><rect x="98" y="108" width="3.4" height="3.4" rx=".6"/><rect x="103" y="108" width="3.4" height="3.4" rx=".6" fill="#e7ae2f"/></g>
  </g>
  <g class="v-head">
    <path filter="url(#paint)" fill="#8aa653" d="M134 84 C136 70 150 58 168 58 C182 58 192 66 190 76 C189 84 178 89 164 90 C150 91 140 92 134 84 Z"/>
    <path filter="url(#paint)" fill="#2f9c98" opacity=".8" d="M142 88 C150 91 160 91 168 89 C160 93 150 94 142 88 Z"/>
    <path fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" filter="url(#ink)" d="M134 84 C136 70 150 58 168 58 C182 58 192 66 190 76 C189 84 178 89 164 90 C150 91 140 92 134 84 Z"/>
    <circle cx="167" cy="70" r="7.2" fill="#fffdf6" stroke="${INK}" stroke-width="2"/>
    <circle class="v-pupil" cx="169" cy="70.5" r="3.9" fill="${INK}"/>
    <circle cx="170.6" cy="68.6" r="1.3" fill="#fff"/>
    <ellipse class="v-lid" cx="167" cy="70" rx="7.6" ry="7.6" fill="#8aa653"/>
    <circle cx="186" cy="71.5" r="1.1" fill="${INK}"/>
    <path d="M175 81 C179 84 184 83 188 79" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    <path d="M150 64 C153 62 157 61 160 62" fill="none" stroke="#4f6a2e" stroke-width="2" stroke-linecap="round"/>
  </g>
  <g class="v-question"><text x="176" y="44" font-family="Caveat, cursive" font-size="30" font-weight="700" fill="#c0643d">?</text></g>
  <g class="v-sparkle" fill="#e7ae2f"><path d="M40 40 l3 8 8 3 -8 3 -3 8 -3 -8 -8 -3 8 -3z"/><path d="M178 28 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z"/></g>
</svg>`;
  }

  /** Spielt eine kurze Reaktion ab und kehrt danach in den Ruhezustand zurück. */
  function react(el, mood, ms = 1400) {
    if (!el) return;
    el.classList.remove("idle", "jump", "tilt", "cheer", "walk");
    void el.getBoundingClientRect();
    el.classList.add(mood);
    clearTimeout(el._valaT);
    if (mood !== "idle") el._valaT = setTimeout(() => { el.classList.remove(mood); el.classList.add("idle"); }, ms);
  }

  // ---------- Souvenirs (32×32, gezeichnet) ----------
  const S = (body) => `<svg class="souvenirArt" viewBox="0 0 32 32" aria-hidden="true"><g filter="url(#ink)" stroke="${INK}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;
  const ART = {
    olive: S(`<path fill="none" d="M5 27 C12 20 18 14 27 5"/><path fill="#8aa653" d="M11 20 C7 18 6 14 8 12 C11 14 12 17 11 20Z M16 15 C13 11 14 7 17 6 C18 9 18 12 16 15Z M16 16 C20 14 24 15 25 18 C22 19 19 18 16 16Z M22 10 C24 6 27 5 29 6 C28 9 26 10 22 10Z"/><ellipse cx="12.5" cy="23" rx="2.6" ry="2" fill="#4a3a5c"/><ellipse cx="21" cy="17" rx="2.4" ry="1.9" fill="#4a3a5c"/>`),
    mosaic: S(`<g stroke-width="1.1"><rect x="5" y="5" width="7" height="7" rx="1.4" fill="#c0643d"/><rect x="13.5" y="5" width="7" height="7" rx="1.4" fill="#f1e3c4"/><rect x="22" y="5" width="6" height="7" rx="1.4" fill="#16707a"/><rect x="5" y="13.5" width="7" height="7" rx="1.4" fill="#f1e3c4"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.4" fill="#e7ae2f"/><rect x="22" y="13.5" width="6" height="7" rx="1.4" fill="#f1e3c4"/><rect x="5" y="22" width="7" height="6" rx="1.4" fill="#16707a"/><rect x="13.5" y="22" width="7" height="6" rx="1.4" fill="#f1e3c4"/><rect x="22" y="22" width="6" height="6" rx="1.4" fill="#c0643d"/></g>`),
    shell: S(`<path fill="#f3d9b8" d="M16 27 C9 27 4 21 5 14 C6 8 11 5 16 5 C21 5 26 8 27 14 C28 21 23 27 16 27Z"/><path fill="none" d="M16 27 V6 M16 27 C12 21 10 13 11 6 M16 27 C20 21 22 13 21 6 M16 27 C9 22 6 16 6 11 M16 27 C23 22 26 16 26 11"/><path fill="#e0a57c" d="M12 27 h8 l-1.5 2.5 h-5 z"/>`),
    postcard: S(`<rect x="3.5" y="7" width="25" height="18" rx="1.6" fill="#fbf8f1"/><path fill="none" d="M16 9.5 V22.5"/><path fill="#16707a" d="M5.5 18 C8 16.5 10 16.5 13 18 V22.5 H5.5Z"/><circle cx="10.5" cy="12.5" r="2.4" fill="#e7ae2f"/><rect x="21" y="9.5" width="5" height="5.5" rx=".6" fill="#c0643d"/><path fill="none" d="M18.5 18 H26 M18.5 21 H24"/>`),
    lavender: S(`<path fill="none" stroke="#6f7a3b" d="M12 28 C12 20 11 14 9 7 M16 28 C16 20 16 13 16 5 M20 28 C20 20 21 14 23 7"/><g fill="#8b72b8"><circle cx="9" cy="8" r="1.8"/><circle cx="9.8" cy="11.5" r="1.8"/><circle cx="10.5" cy="15" r="1.7"/><circle cx="16" cy="6" r="1.8"/><circle cx="16" cy="9.5" r="1.8"/><circle cx="16" cy="13" r="1.7"/><circle cx="23" cy="8" r="1.8"/><circle cx="22.2" cy="11.5" r="1.8"/><circle cx="21.5" cy="15" r="1.7"/></g><path fill="#c0643d" d="M11 21 C14 23 18 23 21 21 L22 24 C18 26 14 26 10 24Z"/>`),
    botun: S(`<path fill="none" d="M16 4.5 C18.5 4.5 18.5 8 16 8 C13.5 8 13.5 4.5 16 4.5Z"/><circle cx="16" cy="18" r="10" fill="#d9dde2"/><g fill="none" stroke-width="1"><circle cx="16" cy="18" r="6.5"/><circle cx="16" cy="18" r="3"/><path d="M16 8 V11.5 M16 24.5 V28 M6 18 H9.5 M22.5 18 H26 M9 11 L11.5 13.5 M20.5 22.5 L23 25 M23 11 L20.5 13.5 M11.5 22.5 L9 25"/></g><circle cx="12" cy="14" r="1.6" fill="#fff" stroke="none"/>`),
    lace: S(`<path fill="#fbf8f1" d="M16 3 C18 5 20 3.5 21.5 5.8 C23.5 5 24.6 7.4 26 8.8 C28 9.5 27.6 12 28.8 13.8 C29.6 15.8 27.8 17.4 28.8 19.6 C28.4 21.8 26 22.4 25.6 24.6 C24.2 26.2 21.8 25.6 20.4 27.4 C18.4 28.4 17.2 26.6 16 28.8 C14.8 26.6 13.6 28.4 11.6 27.4 C10.2 25.6 7.8 26.2 6.4 24.6 C6 22.4 3.6 21.8 3.2 19.6 C4.2 17.4 2.4 15.8 3.2 13.8 C4.4 12 4 9.5 6 8.8 C7.4 7.4 8.5 5 10.5 5.8 C12 3.5 14 5 16 3Z"/><g fill="none" stroke-width="1"><circle cx="16" cy="16" r="8"/><circle cx="16" cy="16" r="3.5"/><path d="M16 8 V12.5 M16 19.5 V24 M8 16 H12.5 M19.5 16 H24 M10.3 10.3 L13.5 13.5 M18.5 18.5 L21.7 21.7 M21.7 10.3 L18.5 13.5 M13.5 18.5 L10.3 21.7"/></g>`),
    cup: S(`<path fill="#fbf8f1" d="M6 13 H23 V20 C23 24.5 19.5 27 14.5 27 C9.5 27 6 24.5 6 20Z"/><path fill="none" d="M23 15 C27.5 15 27.5 21 23 21"/><path fill="#6b4226" d="M7.2 14.2 H21.8 V15.8 H7.2Z" stroke="none"/><path fill="none" stroke="#9aa39b" d="M11 10 C9.5 8 12.5 7 11 4.5 M15.5 10 C14 8 17 7 15.5 4.5 M20 10 C18.5 8 21.5 7 20 4.5"/><path fill="#16707a" d="M4 27.5 H25 C24 29.5 22 30 20 30 H9 C7 30 5 29.5 4 27.5Z"/>`),
    lighthouse: S(`<path fill="#fbf8f1" d="M12 28 L13.5 11 H18.5 L20 28Z"/><path fill="#c0643d" d="M12.6 21 L12.9 17.5 H19.1 L19.4 21Z M13.2 14.5 L13.4 12.5 H18.6 L18.8 14.5Z"/><rect x="13" y="7" width="6" height="4" rx="1" fill="#e7ae2f"/><path fill="#16707a" d="M12 7 C12 4.5 20 4.5 20 7Z"/><path fill="none" stroke="#e7ae2f" d="M21.5 8 L28 5.5 M21.5 10 L28 11.5 M10.5 8 L4 5.5 M10.5 10 L4 11.5"/><path fill="#8aa653" d="M5 28.5 C9 26 23 26 27 28.5Z"/>`),
    kravata: S(`<path fill="#b0492f" d="M13 5 H19 L17.8 9.5 H14.2Z"/><path fill="#c0643d" d="M14.2 9.5 H17.8 L22 25 L16 29.5 L10 25Z"/><g fill="none" stroke="#f1e3c4" stroke-width="1.2"><path d="M12.5 17 L19.5 14 M11.5 21.5 L20.8 17.5 M13 25.5 L21.2 22"/></g>`),
    stamp: S(`<rect x="5" y="5" width="22" height="22" rx="2" fill="#fbf8f1" stroke-dasharray="2 1.6"/><circle cx="16" cy="16" r="6.5" fill="none" stroke="#16707a"/><path fill="none" stroke="#16707a" d="M10.5 16 H21.5"/>`)
  };

  /** Souvenirs = die bisherigen Erfolge (gleiche Freischaltlogik) plus „10 Lektionen“. */
  const SOUVENIRS = [
    { id: "first", art: "olive", name: "Olivenzweig", hr: "maslinova grančica", text: "Für deine erste Lektion. Jede Reise beginnt mit einem Zweig am Wegrand." },
    { id: "ten", art: "mosaic", name: "Mosaikstein", hr: "kamenčić mozaika", text: "Zehn Lektionen – die ersten Steinchen deines Mosaiks liegen." },
    { id: "streak7", art: "shell", name: "Muschel", hr: "školjka", text: "Sieben Tage am Stück gelernt. Vala hat sie am Strand von Bol gefunden." },
    { id: "words100", art: "postcard", name: "Ansichtskarte", hr: "razglednica", text: "100 Begriffe trainiert – genug für die erste Karte nach Hause." },
    { id: "xp1000", art: "lavender", name: "Lavendel aus Hvar", hr: "lavanda", text: "1.000 Erfahrungspunkte. Duftet nach Sommer." },
    { id: "chapter", art: "botun", name: "Šibenik-Knopf", hr: "šibenski botun", text: "Erster Kapiteltest bestanden. Der silberne Knopf gehört zur Tracht aus Šibenik." },
    { id: "a1", art: "lace", name: "Spitze aus Pag", hr: "paška čipka", text: "Ganz A1 geschafft – so fein wie die Spitze aus Pag." },
    { id: "dialogue", art: "cup", name: "Kaffeetasse", hr: "šalica za kavu", text: "Dein erster Dialog. Idemo na kavu!" },
    { id: "accuracy", art: "lighthouse", name: "Leuchtturm", hr: "svjetionik", text: "90 % Treffsicherheit – du findest den Weg auch im Dunkeln." },
    { id: "stars3", art: "kravata", name: "Krawatte", hr: "kravata", text: "Drei Sterne in einem Test. Die Krawatte stammt übrigens aus Kroatien." }
  ];

  window.Vala = { svg, react, ART, SOUVENIRS };
})();
