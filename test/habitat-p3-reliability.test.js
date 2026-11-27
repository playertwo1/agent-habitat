"use strict";

// T36 — confiabilidade do P3.2: desinstalar/reinstalar hooks preserva grupos
// mistos (Habitat + terceiros) e o instalador NSIS só encerra o processo certo.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const sync = require("../src/habitat/habitat-hook-sync");

const MARK = sync.AGENT_HABITAT_HOOK_MARKER;
const mine = (ev) => ({ type: "command", command: `node "/x/${MARK}.js" claude ${ev}`, timeout: 10 });
const theirs = { type: "command", command: "node /outros/hook-de-terceiros.js", timeout: 5 };

function tmp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "p3-hooks-"));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test("T36a: desinstalar mantém o hook de terceiros num grupo misto (claude)", (t) => {
  const dir = tmp(t);
  const file = path.join(dir, "settings.json");
  fs.writeFileSync(file, JSON.stringify({
    hooks: { PreToolUse: [{ matcher: "*", hooks: [theirs, mine("PreToolUse")] }, { hooks: [mine("PreToolUse")] }] },
  }));
  const r = sync.uninstallHabitatHooks({ claudeSettingsPath: file, codexHooksPath: path.join(dir, "nao-existe-1"),
    antigravityHooksPath: path.join(dir, "nao-existe-2") });
  assert.equal(r.ok, true);
  const out = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.deepEqual(out.hooks.PreToolUse, [{ matcher: "*", hooks: [theirs] }]);
  assert.ok(!JSON.stringify(out).includes(MARK));
  assert.ok(fs.readdirSync(dir).some((f) => f.includes(".agent-habitat-") && f.endsWith(".bak")), "backup datado");
});

test("T36b: desinstalar mantém o hook de terceiros num grupo misto (antigravity)", (t) => {
  const dir = tmp(t);
  const file = path.join(dir, "hooks.json");
  fs.writeFileSync(file, JSON.stringify({
    "agent-habitat": { PostToolUse: [{ matcher: "*", hooks: [theirs, mine("PostToolUse")] }], Stop: [mine("Stop")] },
    outro: { Stop: [theirs] },
  }));
  const r = sync.uninstallHabitatHooks({ claudeSettingsPath: path.join(dir, "n1"), codexHooksPath: path.join(dir, "n2"),
    antigravityHooksPath: file });
  assert.equal(r.ok, true);
  const out = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.deepEqual(out["agent-habitat"], { PostToolUse: [{ matcher: "*", hooks: [theirs] }] });
  assert.deepEqual(out.outro, { Stop: [theirs] });
});

test("T36c: reinstalar não apaga o hook de terceiros do grupo misto", (t) => {
  const dir = tmp(t);
  const file = path.join(dir, "settings.json");
  fs.writeFileSync(file, JSON.stringify({ hooks: { PreToolUse: [{ matcher: "*", hooks: [theirs, mine("PreToolUse")] }] } }));
  const r = sync.installHabitatHooks({ confirm: true, claudeSettingsPath: file, codexHooksPath: path.join(dir, "n1"),
    antigravityHooksPath: path.join(dir, "n2") });
  assert.equal(r.ok, true);
  const text = fs.readFileSync(file, "utf8");
  assert.ok(text.includes("hook-de-terceiros.js"), "hook de terceiros preservado");
  const list = JSON.parse(text).hooks.PreToolUse;
  assert.equal(list.filter((g) => JSON.stringify(g).includes(MARK)).length, 1, "um único grupo do Habitat");
});

// ---- NSIS: o instalador só encerra processos de dentro da pasta de instalação ----
const { spawnSync } = require("node:child_process");
const NSH = fs.readFileSync(path.join(__dirname, "..", "build", "installer.nsh"), "utf8");

test("T36d: o instalador não usa o KILL_PROCESS do template (casa por prefixo)", () => {
  assert.ok(!/!insertmacro KILL_PROCESS\b/.test(NSH), "use CLAWD_KILL_PROCESS");
  assert.equal((NSH.match(/!insertmacro CLAWD_KILL_PROCESS /g) || []).length, 2);
});

test("T36e: todo filtro por caminho do NSIS termina o prefixo com barra invertida", () => {
  const BS = String.fromCharCode(92);
  const codigo = NSH.split(/\r?\n/).filter((l) => !l.trim().startsWith(";")).join("\n");
  const filtros = codigo.match(/StartsWith\('\$INSTDIR[^']*'/g) || [];
  assert.ok(filtros.length >= 2, "FIND e KILL em PowerShell");
  for (const f of filtros) assert.ok(f.endsWith(BS + "'"), `prefixo sem barra final: ${f}`);
});

test("T36f: o filtro exato casa a pasta do app e não a pasta irmã (PowerShell real)", { skip: process.platform !== "win32" }, () => {
  const BS = String.fromCharCode(92);
  const inst = ["C:", "Users", "x", "AppData", "Local", "Programs", "Agent Habitat"].join(BS);
  const exe = BS + "Agent Habitat.exe";
  const script = `$i='${inst}'; `
    + `$dentro=('${inst}${exe}').StartsWith($i + '${BS}', 'CurrentCultureIgnoreCase'); `
    + `$irma=('${inst} Beta${exe}').StartsWith($i + '${BS}', 'CurrentCultureIgnoreCase'); `
    + `$antigo=('${inst} Beta${exe}').StartsWith($i, 'CurrentCultureIgnoreCase'); `
    + `"$dentro $irma $antigo"`;
  const r = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf8" });
  assert.equal(r.stdout.trim(), "True False True", "o filtro antigo (sem barra) pegava a pasta irmã");
});
