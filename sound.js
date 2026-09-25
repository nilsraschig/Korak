/* Korak – dezente Klänge, per Web Audio erzeugt (keine Audiodateien, keine Lizenzfragen).
 * Standardmäßig AUS; der Schalter liegt im Profil und wird nur auf diesem Gerät gespeichert.
 */
(function () {
  const KEY = "korak-sound";
  let ctx = null;
  const enabled = () => { try { return localStorage.getItem(KEY) === "on"; } catch (e) { return false; } };
  function ac() {
    if (!ctx) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ctx = new C(); }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }
  function tone(freq, t0, dur, { type = "sine", gain = 0.06, glide = null } = {}) {
    const a = ac(); if (!a) return;
    const o = a.createOscillator(), g = a.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, a.currentTime + t0);
    if (glide) o.frequency.exponentialRampToValueAtTime(glide, a.currentTime + t0 + dur);
    g.gain.setValueAtTime(0.0001, a.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(gain, a.currentTime + t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + t0 + dur);
    o.connect(g).connect(a.destination); o.start(a.currentTime + t0); o.stop(a.currentTime + t0 + dur + 0.05);
  }
  // Rauschen durch einen wandernden Tiefpass: klingt wie eine Welle, die aufläuft und zurückzieht
  function wave(t0 = 0, dur = 1.6, gain = 0.05) {
    const a = ac(); if (!a) return;
    const len = Math.floor(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { last = 0.97 * last + 0.03 * (Math.random() * 2 - 1); d[i] = last * 6; }
    const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain(), t = a.currentTime + t0;
    src.buffer = buf; f.type = "lowpass"; f.frequency.setValueAtTime(300, t); f.frequency.linearRampToValueAtTime(1400, t + dur * .45); f.frequency.linearRampToValueAtTime(250, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + dur * .4); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(a.destination); src.start(t); src.stop(t + dur);
  }
  function gull(t0 = 0) {
    [0, .22, .5].forEach((d, i) => tone(1500 - i * 80, t0 + d, .18, { type: "triangle", gain: .025, glide: 950 }));
  }
  const SOUNDS = {
    correct: () => { tone(660, 0, .18, { gain: .05 }); tone(990, .09, .26, { gain: .04 }); wave(.05, 1.1, .025); },
    wrong: () => tone(330, 0, .32, { type: "triangle", gain: .045, glide: 250 }),
    done: () => { [523, 659, 784, 1046].forEach((f, i) => tone(f, i * .11, .35, { gain: .045 })); wave(.2, 2, .03); },
    map: () => { wave(0, 2.4, .035); gull(.6); },
    travel: () => { wave(0, 2.6, .03); gull(1.4); }
  };
  window.Sound = {
    get on() { return enabled(); },
    set(on) { try { localStorage.setItem(KEY, on ? "on" : "off"); } catch (e) {} if (on) { ac(); SOUNDS.correct(); } },
    play(name) {
      if (!enabled() || !SOUNDS[name]) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches && name !== "correct" && name !== "wrong") return;
      try { SOUNDS[name](); } catch (e) { /* Audio nicht verfügbar */ }
    }
  };
})();
