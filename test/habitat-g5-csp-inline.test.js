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

test("nomes locais do app.whenReady não são usados fora dele (ReferenceError no painel)", () => {
  const lines = fs.readFileSync(path.join(HABITAT_DIR, "habitat-app-main.js"), "utf8").split(/\r?\n/);
  const start = lines.findIndex((line) => line.includes("app.whenReady().then(async () => {"));
  assert.ok(start >= 0);
  let depth = 0;
  let end = start;
  for (; end < lines.length; end++) {
    depth += (lines[end].match(/\{/g) || []).length - (lines[end].match(/\}/g) || []).length;
    if (depth === 0) break;
  }
  const inner = lines.slice(start + 1, end);
  // shortcut: só olha declarações no primeiro nível do callback (4 espaços); suficiente para este arquivo.
  const locals = inner.map((line) => line.match(/^ {4}(?:const|let|function)\s+([A-Za-z_$][\w$]*)/)).filter(Boolean).map((m) => m[1]);
  for (const name of locals) {
    const pattern = new RegExp(`\\b${name}\\b`);
    const redeclared = new RegExp(`(?:const|let|var|function)\\s+${name}\\b|function\\b[^(]*\\([^)]*\\b${name}\\b`);
    const outside = lines.filter((line, i) => (i < start || i > end) && pattern.test(line));
    if (outside.length === 0) continue;
    // Homônimo redeclarado no escopo externo é outro binding; só é erro se nunca for declarado fora.
    assert.ok(outside.some((line) => redeclared.test(line)), `${name} é local do whenReady mas usado fora: ${outside[0].trim()}`);
  }
});

test("CSS do Habitat não tem declaração fora de regra (G4 perdeu o :root do painel)", () => {
  for (const name of fs.readdirSync(HABITAT_DIR).filter((n) => n.endsWith(".css"))) {
    let depth = 0;
    for (const line of fs.readFileSync(path.join(HABITAT_DIR, name), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/)) {
      if (depth === 0) assert.doesNotMatch(line, /^\s*--?[\w-]+\s*:[^{]*;/, `${name}: declaração solta "${line.trim()}"`);
      depth += (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length;
      assert.ok(depth >= 0, `${name}: chave } sobrando`);
    }
    assert.strictEqual(depth, 0, `${name}: chaves desbalanceadas`);
  }
});

test("hook do Habitat no app empacotado aponta para app.asar.unpacked (node externo não lê o asar)", () => {
  const { resolveDefaultHookScriptPath } = require("../src/habitat/habitat-hook-sync");
  const packaged = path.join("C:", "Apps", "Agent Habitat", "resources", "app.asar", "src", "habitat");
  assert.strictEqual(
    resolveDefaultHookScriptPath(packaged),
    path.join("C:", "Apps", "Agent Habitat", "resources", "app.asar.unpacked", "hooks", "agent-habitat-hook.js")
  );
  const dev = resolveDefaultHookScriptPath(HABITAT_DIR);
  assert.strictEqual(dev, path.join(__dirname, "..", "hooks", "agent-habitat-hook.js"));
  assert.ok(fs.existsSync(dev));
});

test("app real inicia o loop do Stage (wake sem start não envia quadros e ninguém sai da cabana)", () => {
  const source = fs.readFileSync(path.join(HABITAT_DIR, "habitat-app-main.js"), "utf8");
  assert.match(source, /stageLoop = createAdaptiveStageLoop\([\s\S]*?\n {4}\}\);\s*(?:\/\/[^\n]*\n\s*)?stageLoop\.start\(\);/);
  const { createAdaptiveStageLoop } = require("../src/habitat/habitat-app-main");
  let ticks = 0;
  const timers = [];
  const loop = createAdaptiveStageLoop({
    isIdle000: () => false,
    onTick: () => ticks++,
    setIntervalFn: (fn) => { timers.push(fn); return timers.length; },
    clearIntervalFn: () => {}
  });
  loop.wake();
  assert.strictEqual(timers.length, 0, "wake antes de start não agenda tick");
  loop.start();
  timers[0]();
  assert.strictEqual(ticks, 1);
});

test("habitat-app-main declara o estado que atribui depois (modo estrito)", () => {
  const source = fs.readFileSync(path.join(HABITAT_DIR, "habitat-app-main.js"), "utf8");
  for (const name of ["hitActivationRuntime", "stageLoop"]) {
    assert.match(source, new RegExp(`\\blet ${name}\\b`), `${name} sem declaração lança ReferenceError no app real`);
  }
});
