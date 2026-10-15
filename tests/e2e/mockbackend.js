// Nachbau der Supabase-Endpunkte (GoTrue + PostgREST), die Korak benutzt – für Browser-Tests.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const {execFileSync} = require('child_process');
const {OUT, ROOT} = require('./env');
const SB = 'https://dlppaluxzixubuclcxnu.supabase.co';
const SB_VERSION = '2.117.2'; // muss zum <script>-Tag (SRI-Hash) in index.html passen
const fontCache = {};

// supabase-js (UMD) für die CDN-Anfrage der Seite. Liegt nicht im Repo: wird einmalig per `npm pack`
// nach <tmp>/korak-e2e/sbpkg/ geladen und dort entpackt. Der SRI-Hash aus index.html wird geprüft.
function supabaseLib() {
  const dir = path.join(OUT, 'sbpkg');
  const file = path.join(dir, 'package', 'dist', 'umd', 'supabase.js');
  if (!fs.existsSync(file)) {
    fs.mkdirSync(dir, {recursive: true});
    const tgz = execFileSync('npm', ['pack', `@supabase/supabase-js@${SB_VERSION}`, '--silent'], {cwd: dir, encoding: 'utf8'}).trim().split('\n').pop();
    execFileSync('tar', ['-xzf', tgz, '-C', dir], {cwd: dir});
  }
  const lib = fs.readFileSync(file);
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const sri = (html.match(/supabase-js@[^"]+"\s+integrity="sha384-([^"]+)"/) || [])[1];
  const hash = crypto.createHash('sha384').update(lib).digest('base64');
  if (sri && sri !== hash) throw new Error(`supabase-js in ${file} passt nicht zum SRI-Hash in index.html (Version ${SB_VERSION}?)`);
  return lib;
}
const LIB = supabaseLib();

function makeBackend() {
  const db = {users: [], progress: {}, refresh: {}, log: []};
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const jwt = u => `${b64({alg: 'HS256', typ: 'JWT'})}.${b64({sub: u.id, role: 'authenticated', aud: 'authenticated', email: u.email, exp: Math.floor(Date.now() / 1000) + 86400})}.sig`;
  const pubUser = u => ({id: u.id, aud: 'authenticated', role: 'authenticated', email: u.email, user_metadata: u.meta, app_metadata: {provider: 'email'}, created_at: u.created});
  function session(u) {
    const rt = crypto.randomUUID();
    db.refresh[rt] = u.id;
    return {access_token: jwt(u), token_type: 'bearer', expires_in: 86400, expires_at: Math.floor(Date.now() / 1000) + 86400, refresh_token: rt, user: pubUser(u)};
  }
  const authUser = req => {
    const h = req.headers()['authorization'] || '';
    const tok = h.replace(/^Bearer /, '');
    try { const p = JSON.parse(Buffer.from(tok.split('.')[1], 'base64url').toString()); return db.users.find(u => u.id === p.sub) || null; } catch (e) { return null; }
  };
  const defaultRow = id => ({user_id: id, xp: 0, streak: 1, best_streak: 1, last_study: null, completed_lessons: [], item_stats: {}, test_stars: {}, daily: {}, total_answers: 0, correct_answers: 0, study_seconds: 0, last_lesson: null, selected_level: null, speech_rate: null, last_login: null, updated_at: new Date().toISOString()});

  const weekStart = () => { const d = new Date(new Date().toLocaleString('en-US', {timeZone: 'Europe/Berlin'})); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  function logXp(id, oldXp, newXp) { const delta = (newXp == null ? oldXp : newXp) - (oldXp || 0); if (delta > 0) (db.xp = db.xp || []).push({user: id, week: weekStart(), amount: Math.min(delta, 300)}); }
  db.addUser = (username, extra = {}) => { const u = {id: crypto.randomUUID(), email: username.toLowerCase() + '@korak.internal', meta: {username}, created: new Date().toISOString(), password: 'geheim123'}; db.users.push(u); db.progress[u.id] = Object.assign(defaultRow(u.id), extra); if (extra.weekly) (db.xp = db.xp || []).push({user: u.id, week: weekStart(), amount: extra.weekly}); return u; };
  async function handle(route) {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    const cors = {'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*'};
    const json = (status, body, extra = {}) => route.fulfill({status, headers: Object.assign({'content-type': 'application/json'}, cors, extra), body: body === undefined ? '' : JSON.stringify(body)});
    if (method === 'OPTIONS') return route.fulfill({status: 204, headers: cors});
    if (db.down) return route.abort('internetdisconnected');
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const p = url.pathname;
    db.log.push(`${method} ${p}${url.search}`);
    const one = (req.headers()['accept'] || '').includes('vnd.pgrst.object');
    // ---- Auth ----
    if (p === '/auth/v1/signup') {
      if ((body.password || '').length < 8) return json(422, {code: 'weak_password', message: 'Password should be at least 8 characters.', weak_password: {reasons: ['length']}});
      if (db.users.some(u => u.email === body.email)) return json(422, {code: 'user_already_exists', message: 'User already registered'});
      const name = (body.data && body.data.username) || body.email.split('@')[0];
      if (!/^[A-Za-z0-9_]{3,20}$/.test(name) || db.users.some(u => u.meta.username.toLowerCase() === name.toLowerCase())) return json(500, {code: 'unexpected_failure', message: 'Database error saving new user'});
      const u = {id: crypto.randomUUID(), email: body.email, password: body.password, meta: {username: name}, created: new Date().toISOString()};
      db.users.push(u); db.progress[u.id] = defaultRow(u.id);
      return json(200, session(u));
    }
    if (p === '/auth/v1/token') {
      const gt = url.searchParams.get('grant_type');
      if (gt === 'password') {
        const u = db.users.find(x => x.email === body.email && x.password === body.password);
        return u ? json(200, session(u)) : json(400, {code: 'invalid_credentials', message: 'Invalid login credentials'});
      }
      if (gt === 'refresh_token') {
        const id = db.refresh[body.refresh_token]; const u = db.users.find(x => x.id === id);
        return u ? json(200, session(u)) : json(400, {code: 'refresh_token_not_found', message: 'Invalid Refresh Token'});
      }
    }
    if (p === '/auth/v1/logout') return route.fulfill({status: 204, headers: cors});
    if (p === '/auth/v1/user') { const u = authUser(req); return u ? json(200, pubUser(u)) : json(401, {code: 'bad_jwt', message: 'invalid JWT'}); }
    // ---- REST ----
    if (p === '/rest/v1/rpc/username_available') return json(200, !db.users.some(u => u.meta.username.toLowerCase() === String(body.name).toLowerCase()));
    const user = authUser(req);
    const eqId = (url.searchParams.get('user_id') || '').replace(/^eq\./, '');
    if (p === '/rest/v1/profiles' && method === 'GET') {
      const rows = user && eqId === user.id ? [{username: user.meta.username}] : []; // RLS: nur eigene Zeile
      return one ? (rows.length ? json(200, rows[0]) : json(406, {code: 'PGRST116', message: 'no rows'})) : json(200, rows);
    }
    if (p === '/rest/v1/progress' && method === 'GET') {
      const rows = user && eqId === user.id && db.progress[user.id] ? [db.progress[user.id]] : [];
      return one ? (rows.length ? json(200, rows[0]) : json(406, {code: 'PGRST116', message: 'no rows'})) : json(200, rows);
    }
    if (p === '/rest/v1/progress' && method === 'POST') {
      const rows = Array.isArray(body) ? body : [body];
      if (!user || rows.some(r => r.user_id !== user.id)) return json(403, {code: '42501', message: 'new row violates row-level security policy for table "progress"'});
      for (const r of rows) logXp(r.user_id, (db.progress[r.user_id] || {}).xp || 0, r.xp);
      for (const r of rows) db.progress[r.user_id] = Object.assign(db.progress[r.user_id] || defaultRow(r.user_id), r, {updated_at: new Date(Date.now() + (db.tick = (db.tick || 0) + 1)).toISOString()});
      db.writes = (db.writes || 0) + 1;
      const out = rows.map(r => ({updated_at: db.progress[r.user_id].updated_at}));
      return json(201, one ? out[0] : out);
    }
    if (p === '/rest/v1/progress' && method === 'PATCH') {
      const cond = (url.searchParams.get('updated_at') || '').replace(/^eq\./, '');
      const row = user && eqId === user.id ? db.progress[user.id] : null; // RLS
      if (!row || (cond && row.updated_at !== cond)) return json(200, []);
      logXp(user.id, row.xp, body.xp);
      Object.assign(row, body, {updated_at: new Date(Date.now() + (db.tick = (db.tick || 0) + 1)).toISOString()});
      db.writes = (db.writes || 0) + 1;
      return json(200, [{updated_at: row.updated_at}]);
    }
    // ---- Sozial-Funktionen (Nachbau von supabase/social.sql) ----
    const rpc = p.startsWith('/rest/v1/rpc/') ? p.slice(13) : null;
    if (rpc && ['search_users','send_friend_request','respond_friend_request','remove_friend','social_overview','league_standings'].includes(rpc)) {
      if (db.socialMissing) return json(404, {code: 'PGRST202', message: 'Could not find the function public.' + rpc});
      if (!user) return json(401, {code: '42501', message: 'permission denied for function ' + rpc});
      const F = db.friendships = db.friendships || [];
      const me = user.id, nameOf = id => (db.users.find(u => u.id === id) || {meta: {}}).meta.username;
      const byName = n => db.users.find(u => u.meta.username.toLowerCase() === String(n).trim().toLowerCase());
      const pair = (a, b) => F.find(f => (f.requester === a && f.addressee === b) || (f.requester === b && f.addressee === a));
      const week = weekStart();
      const weekly = id => (db.xp || []).filter(x => x.user === id && x.week === week).reduce((s, x) => s + x.amount, 0);
      const stats = id => { const r = db.progress[id] || {}; const recent = r.last_study && (Date.now() - new Date(r.last_study + 'T12:00:00')) < 2.2 * 864e5; return {streak: recent ? r.streak : 0, weekly_xp: weekly(id), chapters_done: (r.completed_lessons || []).filter(c => c.endsWith('-test')).length}; };
      if (rpc === 'search_users') { const q = String(body.q || '').trim().toLowerCase(); if (q.length < 3) return json(200, []); return json(200, db.users.filter(u => u.id !== me && u.meta.username.toLowerCase().startsWith(q)).slice(0, 10).map(u => ({username: u.meta.username}))); }
      if (rpc === 'send_friend_request') {
        const o = byName(body.target); if (!o) return json(200, 'not_found'); if (o.id === me) return json(200, 'self');
        const f = pair(me, o.id);
        if (f) { if (f.status === 'pending' && f.addressee === me) { f.status = 'accepted'; return json(200, 'accepted'); } return json(200, 'exists'); }
        F.push({id: (db.fid = (db.fid || 0) + 1), requester: me, addressee: o.id, status: 'pending', created_at: new Date().toISOString()}); return json(200, 'sent');
      }
      if (rpc === 'respond_friend_request') { const f = F.find(x => x.id === body.request_id && x.addressee === me && x.status === 'pending'); if (!f) return json(200, false); if (body.accept) f.status = 'accepted'; else F.splice(F.indexOf(f), 1); return json(200, true); }
      if (rpc === 'remove_friend') { const f = F.find(x => x.id === body.friendship_id && (x.requester === me || x.addressee === me)); if (!f) return json(200, false); F.splice(F.indexOf(f), 1); return json(200, true); }
      if (rpc === 'social_overview') return json(200, F.filter(f => f.requester === me || f.addressee === me).map(f => { const other = f.requester === me ? f.addressee : f.requester; const rel = f.status === 'accepted' ? 'friend' : f.addressee === me ? 'incoming' : 'outgoing'; return Object.assign({friendship_id: f.id, username: nameOf(other), relation: rel, since: f.created_at}, rel === 'friend' ? stats(other) : {streak: null, weekly_xp: null, chapters_done: null}); }));
      if (rpc === 'league_standings') {
        const members = [...new Set((db.xp || []).filter(x => x.week === week).map(x => x.user))];
        if (!members.includes(me)) return json(200, []);
        const rows = members.map(id => ({id, username: nameOf(id), weekly_xp: weekly(id)})).sort((a, b) => b.weekly_xp - a.weekly_xp || a.username.toLowerCase().localeCompare(b.username.toLowerCase()));
        return json(200, rows.map((r, i) => ({rank: i + 1, username: r.username, weekly_xp: r.weekly_xp, is_me: r.id === me, is_friend: !!F.find(f => f.status === 'accepted' && pair(me, r.id) === f), week_start: week, league_size: rows.length})));
      }
    }
    return json(404, {message: 'not mocked: ' + method + ' ' + p});
  }

  async function attach(ctx, opts = {}) {
    // Ältere Suites testen den Start ohne Onboarding (wie vor Phase 1): Modul ausblenden
    if (!opts.onboarding) await ctx.addInitScript(() => { Object.defineProperty(window, 'Onboarding', {configurable: true, get() { return undefined; }, set(v) {}}); });
    await ctx.route(SB + '/**', handle);
    await ctx.route(/cdn\.jsdelivr\.net\/npm\/@supabase/, r => r.fulfill({body: LIB, headers: {'content-type': 'application/javascript', 'access-control-allow-origin': '*'}}));
    // Schriften über curl (nutzt den Proxy der Umgebung); ohne Netz gibt es leeres CSS, die Seite nimmt dann Ersatzschriften.
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, async r => { const u = r.request().url(); let body = fontCache[u]; if (!body) { try { body = fontCache[u] = execFileSync('curl', ['-sf', '--max-time', '20', '-A', 'Mozilla/5.0 Chrome/140', u], {maxBuffer: 1e8}); } catch (e) { body = ''; } } await r.fulfill({body, headers: {'content-type': u.includes('css2') ? 'text/css' : 'font/woff2', 'access-control-allow-origin': '*'}}); });
  }
  return {db, attach};
}
module.exports = {makeBackend, SB};
