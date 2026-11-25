"use strict";

// G5.2: com CSP script-src 'self', script inline é bloqueado e a cabana renderiza em branco no app real.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const HABITAT_DIR = path.join(__dirname, "..", "src", "habitat");

test("páginas do Habitat com CSP script-src 'self' não têm script inline", () => {
  const pages = fs.readdirSync(HABITAT_DIR).filter((name) => name.endsWith(".html"));
  assert.ok(pages.includes("habitat-stage.html") && pages.includes("habitat-hit.html"));
  for (const name of pages) {
    const html = fs.readFileSync(path.join(HABITAT_DIR, name), "utf8");
    if (!/script-src 'self'/.test(html)) continue;
    assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>\s*\S/, `${name} tem script inline bloqueado pela CSP`);
    for (const [, src] of html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)) {
      assert.ok(fs.existsSync(path.join(HABITAT_DIR, src)), `${name} referencia ${src} inexistente`);
    }
  }
});

test("habitat-app-main declara o estado que atribui depois (modo estrito)", () => {
  const source = fs.readFileSync(path.join(HABITAT_DIR, "habitat-app-main.js"), "utf8");
  for (const name of ["hitActivationRuntime", "stageLoop"]) {
    assert.match(source, new RegExp(`\\blet ${name}\\b`), `${name} sem declaração lança ReferenceError no app real`);
  }
});
