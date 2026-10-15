#!/usr/bin/env node
/* Korak – alle Browser-Tests nacheinander ausführen.
 *
 *   node tests/e2e/run-all.js                 alle tests/e2e/*.e2e.js
 *   node tests/e2e/run-all.js auth migration  nur diese Suites (Name ohne .e2e.js)
 *
 * Läuft auf http://localhost:8123 schon ein Server, wird er benutzt; sonst startet das Skript
 * `npx http-server -p 8123 -s -c-1 .` im Projektordner und beendet ihn am Ende wieder.
 * Meldet je Suite bestanden/fehlgeschlagen; Exit-Code 1, wenn eine Suite fehlschlägt.
 */
"use strict";
const fs = require("fs");
const http = require("http");
const path = require("path");
const { spawn, spawnSync } = require("child_process");

const ROOT = path.join(__dirname, "..", "..");
const PORT = 8123;
const PROBE = `http://localhost:${PORT}/index.html`;
const SUITE_TIMEOUT = 10 * 60 * 1000;

function responds() {
  return new Promise(resolve => {
    const req = http.get(PROBE, res => { res.resume(); resolve(res.statusCode === 200); });
    req.on("error", () => resolve(false));
    req.setTimeout(2000, () => { req.destroy(); resolve(false); });
  });
}

async function ensureServer() {
  if (await responds()) return null;
  console.log(`Starte lokalen Server auf Port ${PORT} …`);
  const server = spawn("npx", ["http-server", "-p", String(PORT), "-s", "-c-1", "."], { cwd: ROOT, stdio: "ignore", detached: true });
  server.on("error", e => console.error("Server konnte nicht gestartet werden:", e.message));
  for (let i = 0; i < 60; i++) {
    if (await responds()) return server;
    await new Promise(r => setTimeout(r, 500));
  }
  stopServer(server);
  throw new Error(`Kein Server auf Port ${PORT} erreichbar`);
}

function stopServer(server) {
  if (!server) return;
  try { process.kill(-server.pid, "SIGTERM"); } catch (e) { try { server.kill("SIGTERM"); } catch (e2) { /* schon beendet */ } }
}

async function main(args) {
  const all = fs.readdirSync(__dirname).filter(f => f.endsWith(".e2e.js")).sort();
  const suites = args.length ? all.filter(f => args.includes(f.replace(/\.e2e\.js$/, ""))) : all;
  if (args.length && suites.length !== args.length) {
    const known = all.map(f => f.replace(/\.e2e\.js$/, ""));
    console.error(`Unbekannte Suite: ${args.filter(a => !known.includes(a)).join(", ")} (vorhanden: ${known.join(", ")})`);
    return 2;
  }
  let server = null;
  try { server = await ensureServer(); } catch (e) { console.error("✘ " + e.message); return 1; }
  const results = [];
  try {
    for (const file of suites) {
      console.log(`\n▶ ${file}`);
      const t0 = Date.now();
      const r = spawnSync(process.execPath, [path.join(__dirname, file)], { cwd: ROOT, stdio: "inherit", timeout: SUITE_TIMEOUT });
      const secs = ((Date.now() - t0) / 1000).toFixed(1);
      const passed = r.status === 0;
      const why = r.error ? r.error.message : r.signal ? `Signal ${r.signal}` : `Exit-Code ${r.status}`;
      results.push({ file, passed, secs, why });
      console.log(passed ? `✔ ${file} bestanden (${secs} s)` : `✘ ${file} fehlgeschlagen (${why}, ${secs} s)`);
    }
  } finally {
    stopServer(server);
  }
  console.log("\nZusammenfassung:");
  results.forEach(r => console.log(`  ${r.passed ? "✔ bestanden      " : "✘ fehlgeschlagen "} ${r.file}`));
  const failed = results.filter(r => !r.passed).length;
  console.log(failed ? `\n${failed} von ${results.length} Suites fehlgeschlagen.` : `\nAlle ${results.length} Suites bestanden.`);
  return failed ? 1 : 0;
}

main(process.argv.slice(2)).then(code => { process.exitCode = code; });
