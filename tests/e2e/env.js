/* Korak – gemeinsame Einstellungen der Browser-Tests (tests/e2e/*.e2e.js).
 *
 *   const { chromium, URL, OUT } = require("./env");
 *
 * - Playwright: require("playwright"), sonst die globale Installation unter /opt/node22.
 * - Die App läuft auf einem lokalen statischen Server: http://localhost:8123 (node tests/e2e/run-all.js
 *   startet ihn bei Bedarf selbst; sonst: npx http-server -p 8123 -s -c-1 .).
 * - Screenshots und heruntergeladene Hilfsdateien landen in <tmp>/korak-e2e/, nie im Repo.
 */
"use strict";
const fs = require("fs");
const os = require("os");
const path = require("path");

function loadPlaywright() {
  try {
    return require("playwright");
  } catch (e) {
    if (e.code !== "MODULE_NOT_FOUND") throw e;
    return require("/opt/node22/lib/node_modules/playwright");
  }
}

const PORT = 8123;
const BASE = `http://localhost:${PORT}/`;
const URL = BASE + "index.html";
const ROOT = path.join(__dirname, "..", "..");
const OUT = path.join(os.tmpdir(), "korak-e2e");
fs.mkdirSync(OUT, { recursive: true });

module.exports = { chromium: loadPlaywright().chromium, PORT, BASE, URL, ROOT, OUT, shot: name => path.join(OUT, name) };
