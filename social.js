/* Korak – Hafen: Crew (Freunde), Regatta der Woche (Liga), „Vala besucht Freunde“ und Hinweise.
 * Daten kommen ausschließlich über die Funktionen aus supabase/social.sql; über andere Nutzer
 * kennt die App nur Username, Serie, Wochen-XP und die Zahl bestandener Kapiteltests.
 * Gäste sehen einen Hinweis statt des Hafens – sonst ändert sich für sie nichts.
 */
(function () {
  const $ = s => document.querySelector(s);
  const INK = "#243328";
  const COLORS = ["#0f6b73", "#c0643d", "#6f7a3b", "#2f9c98", "#9a4526", "#14324a"];
  const S = { uid: null, overview: [], standings: [], loadedAt: 0, loading: null, poll: null, lastCheck: 0, error: null };

  const esc = t => String(t == null ? "" : t).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const colorFor = name => { let h = 0; for (const c of String(name)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return COLORS[h % COLORS.length]; };
  const readJSON = k => { try { return JSON.parse(localStorage.getItem(k) || "null"); } catch (e) { return null; } };
  const writeJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };
  const loggedIn = () => !!(window.Account && Account.user && window.Cloud && Cloud.available);
  const friends = () => S.overview.filter(r => r.relation === "friend");
  const incoming = () => S.overview.filter(r => r.relation === "incoming");
  /** Ort auf der Reise: Anzahl bestandener Kapiteltests = Index der aktuellen Station. */
  const stationIndex = n => Math.max(0, Math.min(Number(n) || 0, Coast.STATIONS.length - 1));
  const stationOf = n => Coast.STATIONS[stationIndex(n)];
  const levelOf = s => s.id.slice(0, 2).toUpperCase();

  // ---------- Laden ----------
  async function load(force) {
    if (!loggedIn()) return false;
    if (S.uid !== Account.user.id) { S.uid = Account.user.id; S.overview = []; S.standings = []; S.loadedAt = 0; }
    if (!force && Date.now() - S.loadedAt < 15000) return true;
    if (S.loading) return S.loading;
    S.loading = (async () => {
      try {
        const [o, l] = await Promise.all([Cloud.socialOverview(), Cloud.leagueStandings()]);
        if (!Account.user || S.uid !== Account.user.id) return false;
        S.overview = o || []; S.standings = l || []; S.loadedAt = Date.now(); S.error = null;
        updateBadge();
        return true;
      } catch (e) {
        S.error = e;
        return false;
      } finally { S.loading = null; }
    })();
    return S.loading;
  }

  function updateBadge() {
    const b = document.querySelector('.dock [data-screen="hafen"]');
    if (b) b.classList.toggle("hasNews", loggedIn() && incoming().length > 0);
  }

  // ---------- Hafen-Screen ----------
  async function render() {
    const guest = !loggedIn();
    $("#hafenGuest").classList.toggle("hidden", !guest);
    $("#hafenMain").classList.toggle("hidden", guest);
    if (guest) {
      if (!$("#hafenGuestVala").firstChild) $("#hafenGuestVala").innerHTML = Vala.svg({ mood: "idle" });
      $("#hafenError").classList.add("hidden");
      return;
    }
    paint();
    const ok = await load(true);
    if (!$("#hafen").classList.contains("active")) return;
    paint();
    if (ok) markSeen();
    clearInterval(S.poll);
    S.poll = setInterval(async () => {
      if (!$("#hafen").classList.contains("active") || document.hidden) return;
      if (await load(true)) { paintRegatta(); paintCrew(); markSeen(); }
    }, 60000);
  }

  function paint() {
    const err = $("#hafenError");
    err.classList.toggle("hidden", !S.error);
    if (S.error) err.textContent = S.error.field === "setup" ? S.error.message : "Der Hafen braucht eine Verbindung zum Server. " + (S.error.message || "");
    paintRegatta();
    paintCrew();
  }

  // ---------- Regatta ----------
  function boatSvg(color, me) {
    return `<svg class="boat" viewBox="0 0 64 50" aria-hidden="true"><g filter="url(#ink)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round">
      <path d="M31 4 V36" fill="none"/>
      <path d="M33 7 C44 14 50 24 52 33 H33 Z" fill="${me ? "#e7ae2f" : "#fbf7ee"}"/>
      <path d="M29 11 C22 18 17 26 15 33 H29 Z" fill="${color}"/>
      <path d="M31 4 l9 3 -9 3" fill="${me ? "#c0643d" : color}"/>
      <path d="M6 36 H58 L50 45 H15 Z" fill="${me ? "#c0643d" : "#8a4a2b"}"/>
    </g></svg>`;
  }

  function daysLeft(weekStart) {
    const end = new Date(weekStart + "T00:00:00");
    end.setDate(end.getDate() + 7);
    return Math.max(0, Math.ceil((end - Date.now()) / 864e5));
  }

  function paintRegatta() {
    const sea = $("#regattaSea"), list = $("#regattaList"), ends = $("#regattaEnds");
    const st = S.standings;
    if (!st.length) {
      ends.textContent = "Start: sobald du diese Woche XP sammelst";
      sea.innerHTML = `<div class="regattaEmpty"><div class="regattaEmptyVala">${Vala.svg({ mood: "idle" })}</div><p>Die Boote liegen noch im Hafen. Mach eine Lektion – dann segelst du in dieser Woche mit gut 20 anderen um die Wette.</p><button type="button" class="btn btnPrimary" data-hafen-learn>Lektion starten</button></div>`;
      list.innerHTML = "";
      const b = sea.querySelector("[data-hafen-learn]");
      if (b) b.onclick = () => { const btn = $("#continueBtn"); if (btn) btn.click(); };
      return;
    }
    const days = daysLeft(st[0].week_start);
    ends.textContent = days <= 1 ? "Zieleinlauf heute um Mitternacht" : `Zieleinlauf in ${days} Tagen`;
    const top = st.slice(0, 5), me = st.find(r => r.is_me);
    const boats = me && !top.includes(me) ? top.concat(me) : top;
    const max = Math.max(1, st[0].weekly_xp);
    sea.innerHTML = `<div class="course"><span class="buoy start" aria-hidden="true"></span><span class="buoy finish" aria-hidden="true"></span>${boats.map((r, i) => {
      const x = 4 + 78 * (r.weekly_xp / max);
      return `<div class="lane${r.is_me ? " me" : ""}" style="--lane:${i}"><div class="boatWrap" style="--x:${x.toFixed(1)}%">${boatSvg(colorFor(r.username), r.is_me)}<span class="boatName">${r.rank}. ${esc(r.is_me ? "Du" : r.username)}</span></div></div>`;
    }).join("")}</div>`;
    requestAnimationFrame(() => sea.querySelectorAll(".boatWrap").forEach(b => b.classList.add("sail")));
    list.innerHTML = st.map(r => `<li class="${r.is_me ? "me" : ""}${r.rank <= 3 ? " podium p" + r.rank : ""}"><span class="rk">${r.rank}</span><span class="nm">${esc(r.username)}${r.is_me ? " <small>(du)</small>" : r.is_friend ? ' <small class="crewTag">Crew</small>' : ""}</span><b>${r.weekly_xp} XP</b></li>`).join("");
    $("#regattaSize").textContent = `${st[0].league_size} Boote in deiner Gruppe`;
  }

  // ---------- Crew ----------
  function monogram(name) {
    return `<span class="mono" style="--c:${colorFor(name)}" aria-hidden="true">${esc(String(name).charAt(0).toUpperCase())}</span>`;
  }
  const bottle = `<svg class="bottle" viewBox="0 0 48 48" aria-hidden="true"><g filter="url(#ink)" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"><path d="M8 30 C8 24 12 21 18 21 H30 L36 17 H42 V27 H36 L30 23" fill="#cfe4dc" transform="rotate(-18 24 24)"/><path d="M14 25 H28" stroke="#c0643d" stroke-width="2.2" transform="rotate(-18 24 24)"/><path d="M4 38 q5 -3 10 0 t10 0 t10 0 t10 0" fill="none" stroke="#2f9c98"/></g></svg>`;

  function paintCrew() {
    const inc = incoming(), out = S.overview.filter(r => r.relation === "outgoing"), fr = friends();
    $("#crewRequests").innerHTML = inc.map(r => `<article class="bottleCard" data-id="${r.friendship_id}">${bottle}<p><b>${esc(r.username)}</b> möchte mit dir segeln.</p><div class="bottleActions"><button type="button" class="btn btnPrimary" data-accept>Annehmen</button><button type="button" class="btn btnQuiet" data-decline>Ablehnen</button></div></article>`).join("")
      + (out.length ? `<div class="outgoing"><h3>Unterwegs</h3>${out.map(r => `<div class="outRow" data-id="${r.friendship_id}"><span>Flaschenpost an <b>${esc(r.username)}</b> wartet auf Antwort</span><button type="button" class="linkBtn" data-withdraw>Zurückziehen</button></div>`).join("")}</div>` : "");
    $("#crewCount").textContent = fr.length ? `${fr.length} ${fr.length === 1 ? "Person" : "Personen"}` : "";
    $("#crewList").innerHTML = fr.length ? fr.map(r => {
      const s = stationOf(r.chapters_done);
      return `<article class="mate" data-id="${r.friendship_id}" data-name="${esc(r.username)}">${monogram(r.username)}<div class="mateText"><b>${esc(r.username)}</b><small>gerade in ${esc(s.name)}</small></div><dl class="mateStats"><div title="Lernserie"><dt><svg class="ico"><use href="#i-flame"/></svg></dt><dd>${r.streak || 0}</dd></div><div title="XP diese Woche"><dt><svg class="ico"><use href="#i-spark"/></svg></dt><dd>${r.weekly_xp || 0}</dd></div></dl><div class="mateActions"><button type="button" class="iconBtn" data-visit aria-label="${esc(r.username)} auf der Karte besuchen" title="Auf der Karte besuchen"><svg class="ico"><use href="#i-map"/></svg></button><button type="button" class="iconBtn" data-remove aria-label="${esc(r.username)} aus der Crew entfernen" title="Aus der Crew entfernen"><svg class="ico"><use href="#i-close"/></svg></button></div></article>`;
    }).join("") : `<p class="crewEmpty">Noch keine Crew an Bord. Such oben nach dem Username deiner Freunde – sie müssen deine Anfrage annehmen.</p>`;
  }

  async function act(fn, okMsg) {
    try {
      const res = await fn();
      if (okMsg) toast(typeof okMsg === "function" ? okMsg(res) : okMsg);
    } catch (e) {
      toast(e.message || "Das hat nicht geklappt.");
    }
    await load(true);
    paint();
    if ($("#crewSearch").value.trim().length >= 3) search();
  }

  function onCrewClick(e) {
    const card = e.target.closest("[data-id]");
    if (!card) return;
    const id = Number(card.dataset.id);
    if (e.target.closest("[data-accept]")) act(() => Cloud.respondFriendRequest(id, true), "Willkommen an Bord! Ihr seid jetzt eine Crew.");
    else if (e.target.closest("[data-decline]")) act(() => Cloud.respondFriendRequest(id, false), "Anfrage abgelehnt.");
    else if (e.target.closest("[data-withdraw]")) act(() => Cloud.removeFriend(id), "Flaschenpost zurückgeholt.");
    else if (e.target.closest("[data-visit]")) visitOnMap(card.dataset.name);
    else if (e.target.closest("[data-remove]")) {
      const b = e.target.closest("[data-remove]");
      if (b.dataset.confirm) act(() => Cloud.removeFriend(id), `${card.dataset.name} ist nicht mehr in deiner Crew.`);
      else { b.dataset.confirm = "1"; b.classList.add("confirm"); b.title = "Nochmal tippen zum Entfernen"; b.setAttribute("aria-label", "Wirklich entfernen? Nochmal tippen"); setTimeout(() => { if (b.isConnected) { delete b.dataset.confirm; b.classList.remove("confirm"); } }, 3000); }
    }
  }

  // ---------- Suche ----------
  let searchTimer = null, searchSeq = 0;
  async function search() {
    const q = $("#crewSearch").value.trim(), box = $("#crewResults");
    if (q.length < 3) { box.innerHTML = q ? '<p class="crewHint">Mindestens 3 Zeichen …</p>' : ""; return; }
    const seq = ++searchSeq;
    let rows;
    try { rows = await Cloud.searchUsers(q); } catch (e) { box.innerHTML = `<p class="crewHint">${esc(e.message)}</p>`; return; }
    if (seq !== searchSeq) return;
    const rel = Object.fromEntries(S.overview.map(r => [r.username.toLowerCase(), r]));
    box.innerHTML = rows && rows.length ? rows.map(r => {
      const x = rel[r.username.toLowerCase()];
      const action = !x ? `<button type="button" class="btn btnQuiet" data-send>Anfrage senden</button>`
        : x.relation === "friend" ? `<span class="resultState">in deiner Crew</span>`
        : x.relation === "outgoing" ? `<span class="resultState">angefragt</span>`
        : `<button type="button" class="btn btnPrimary" data-send>Annehmen</button>`;
      return `<div class="result" data-name="${esc(r.username)}">${monogram(r.username)}<b>${esc(r.username)}</b>${action}</div>`;
    }).join("") : '<p class="crewHint">Niemand mit diesem Namen an Bord.</p>';
  }
  function onResultClick(e) {
    const b = e.target.closest("[data-send]"), row = e.target.closest(".result");
    if (!b || !row) return;
    b.disabled = true;
    const name = row.dataset.name;
    act(() => Cloud.sendFriendRequest(name), res => ({
      sent: `Flaschenpost an ${name} ist unterwegs.`,
      accepted: `${name} hatte dich schon angefragt – ihr seid jetzt eine Crew!`,
      exists: `Mit ${name} bist du schon verbunden.`,
      not_found: "Diesen Username gibt es nicht.",
      self: "Das bist du selbst.",
      limit: "Zu viele offene Anfragen. Warte, bis einige beantwortet sind."
    }[res] || "Erledigt."));
  }

  // ---------- Vala besucht Freunde (Küstenkarte) ----------
  function flagsSvg(list, st) {
    const shown = list.slice(0, 3), more = list.length - shown.length;
    return `<g class="friendFlags" transform="translate(${st.x + (st.side === "l" ? 12 : -12)} ${st.y - 6})">${shown.map((f, i) => {
      const dx = (st.side === "l" ? 1 : -1) * i * 11;
      return `<g class="friendFlag" data-name="${esc(f.username)}" data-station="${stationIndex(f.chapters_done)}" transform="translate(${dx} 0)" tabindex="0" role="button" aria-label="${esc(f.username)} ist gerade in ${esc(st.name)} – Vala schickt Grüße">
        <path d="M0 0 V-24" stroke="${INK}" stroke-width="1.4" fill="none"/>
        <path d="M0 -24 L12 -20 L0 -15 Z" fill="${colorFor(f.username)}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>
        <text x="4.2" y="-17.6" class="flagInitial">${esc(f.username.charAt(0).toUpperCase())}</text>
      </g>`;
    }).join("")}${more > 0 ? `<text class="flagMore" x="${(st.side === "l" ? 1 : -1) * shown.length * 11}" y="-14">+${more}</text>` : ""}</g>`;
  }

  async function decorateMap(map, level) {
    if (!map || !loggedIn()) return;
    if (!(await load(false)) && !S.loadedAt) return;
    if (!map.isConnected) return;
    const svg = map.querySelector(".coastSvg");
    svg.querySelectorAll(".friendFlags").forEach(g => g.remove());
    const by = {};
    friends().forEach(f => { const i = stationIndex(f.chapters_done); if (levelOf(Coast.STATIONS[i]) === level) (by[i] = by[i] || []).push(f); });
    Object.entries(by).forEach(([i, list]) => svg.insertAdjacentHTML("beforeend", flagsSvg(list, Coast.STATIONS[i])));
    svg.querySelectorAll(".friendFlag").forEach(g => {
      const go = e => { e.stopPropagation(); visit(map, level, g.dataset.name, Number(g.dataset.station)); };
      g.addEventListener("click", go);
      g.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go(e); } });
    });
  }

  function say(map, text) {
    map.querySelectorAll(".visitSays").forEach(n => n.remove());
    const m = map.querySelector(".valaMarker"), p = document.createElement("p");
    p.className = "visitSays";
    p.textContent = text;
    p.style.left = m.style.left; p.style.top = m.style.top;
    map.appendChild(p);
    setTimeout(() => p.remove(), 2600);
  }

  function visit(map, level, name, target) {
    const m = map.querySelector(".valaMarker");
    if (!m || m.classList.contains("travelling") || map.dataset.visiting) return;
    const home = Coast.currentIndex(level), place = Coast.STATIONS[target].name;
    const greet = [`Pozdrav, ${name}! Schön hier in ${place}.`, `Bok ${name}! Ich bring dir Grüße vorbei.`, `${name} ist schon in ${place} – bravo!`][Math.floor(Math.random() * 3)];
    Sound.play("travel");
    if (home === target) { Vala.react(m.querySelector(".vala"), "cheer", 1600); say(map, greet); return; }
    map.dataset.visiting = "1";
    const back = { left: m.style.left, top: m.style.top };
    Coast.travel(map, home, target, level, () => {
      say(map, greet);
      // zurück nach Hause – danach wieder exakt auf die eigene Ortsmarke
      setTimeout(() => Coast.travel(map, target, home, level, () => { m.style.left = back.left; m.style.top = back.top; m.classList.remove("flip"); delete map.dataset.visiting; }), 2400);
    });
  }

  /** Aus der Crew-Liste: Karte des passenden Levels öffnen und Vala losschicken. */
  function visitOnMap(name) {
    const f = friends().find(x => x.username === name);
    if (!f) return;
    const i = stationIndex(f.chapters_done), level = levelOf(Coast.STATIONS[i]);
    show("levels");
    openLevel(level);
    setTimeout(async () => {
      const map = $("#coastHost .coastMap");
      if (!map) return;
      await decorateMap(map, level);
      const flag = map.querySelector(`.friendFlag[data-name="${CSS.escape(name)}"]`);
      if (flag) flag.scrollIntoView({ block: "center", behavior: "smooth" });
      visit(map, level, name, i);
    }, 700);
  }

  // ---------- Hinweise beim nächsten Besuch ----------
  const seenKey = () => `korak-hafen-seen-${S.uid}`;
  const snapKey = () => `korak-regatta-${S.uid}`;
  function snapshot() {
    const me = S.standings.find(r => r.is_me);
    if (!me) return;
    writeJSON(snapKey(), { week: me.week_start, rank: me.rank, behind: S.standings.filter(r => r.rank > me.rank).map(r => r.username) });
  }
  function markSeen() {
    writeJSON(seenKey(), incoming().map(r => r.friendship_id));
    snapshot();
  }

  async function check() {
    if (!loggedIn() || document.body.classList.contains("inAuth")) return;
    if (document.body.classList.contains("inLesson")) { setTimeout(check, 30000); return; }
    S.lastCheck = Date.now();
    if (!(await load(true))) return;
    const msgs = [];
    const seen = readJSON(seenKey()) || [];
    const fresh = incoming().filter(r => !seen.includes(r.friendship_id));
    if (fresh.length) msgs.push(fresh.length === 1 ? `Flaschenpost von <b>${esc(fresh[0].username)}</b>: möchte mit dir segeln.` : `${fresh.length} neue Flaschenposten: ${fresh.map(r => `<b>${esc(r.username)}</b>`).join(", ")} möchten mit dir segeln.`);
    const snap = readJSON(snapKey()), me = S.standings.find(r => r.is_me);
    if (snap && me && snap.week === me.week_start) {
      const by = S.standings.filter(r => r.rank < me.rank && (snap.behind || []).includes(r.username));
      if (by.length) msgs.push(`${by.map(r => `<b>${esc(r.username)}</b>`).join(" und ")} ${by.length === 1 ? "hat" : "haben"} dich in der Regatta überholt – du bist jetzt auf Platz ${me.rank}.`);
    }
    writeJSON(seenKey(), Array.from(new Set(seen.concat(fresh.map(r => r.friendship_id)))));
    snapshot();
    if (msgs.length) note(msgs);
  }

  function note(msgs) {
    let n = $("#hafenNote");
    if (!n) {
      n = document.createElement("aside");
      n.id = "hafenNote"; n.className = "hafenNote"; n.setAttribute("role", "status");
      document.body.appendChild(n);
    }
    n.innerHTML = `<div class="noteVala">${Vala.svg({ mood: "jump" })}</div><div class="noteText"><span class="noteLabel">Nachricht aus dem Hafen</span>${msgs.map(m => `<p>${m}</p>`).join("")}</div><div class="noteActions"><button type="button" class="btn btnPrimary" data-go>Zum Hafen</button><button type="button" class="iconBtn" data-close aria-label="Hinweis schließen"><svg class="ico"><use href="#i-close"/></svg></button></div>`;
    n.classList.add("show");
    Sound.play("map");
    const hide = () => n.classList.remove("show");
    n.querySelector("[data-go]").onclick = () => { hide(); show("hafen"); };
    n.querySelector("[data-close]").onclick = hide;
    clearTimeout(note.t);
    note.t = setTimeout(hide, 12000);
  }

  // ---------- Verdrahtung ----------
  function init() {
    if (!$("#hafen")) return;
    $("#crewRequests").addEventListener("click", onCrewClick);
    $("#crewList").addEventListener("click", onCrewClick);
    $("#crewResults").addEventListener("click", onResultClick);
    $("#crewSearch").addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(search, 300); });
    $("#crewSearch").addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(searchTimer); search(); } });
    $("#hafenSignup").onclick = () => { const b = $("#profileSignup") || $("#menuLogin"); if (b) b.click(); };
    document.addEventListener("visibilitychange", () => { if (!document.hidden && Date.now() - S.lastCheck > 5 * 60000) check(); });
  }
  init();

  window.Social = { render, check, decorateMap, load, updateBadge, _state: S };
})();
