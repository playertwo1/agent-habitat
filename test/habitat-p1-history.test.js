"use strict";

// T30 (P1.2) e T31 (P1.2b): histórico próprio; Claude e Codex retomam só por pedido explícito e revalidado.
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { createHistoryStore, buildHistoryView, resumeHistorySession } = require("../src/habitat/habitat-history");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");

const T0 = 1_800_000_000_000;
const CWD = path.resolve(os.tmpdir());
const CX = "01a21547-7d8c-4eb0-83e0-d55c786095db";

function store() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-hist-"));
  const file = path.join(dir, "history.json");
  return { file, s: createHistoryStore({ filePath: file }) };
}
const deps = (over = {}) => ({ now: T0 + 3_600_000, probe: () => true, dirExists: () => true, launch: async () => ({ ok: true }), ...over });

test("T30: lista só sessões reais de Claude e Codex, mais recentes primeiro, limitada a 10", () => {
  const { s } = store();
  for (let i = 0; i < 12; i++) s.record({ provider: "claude", sessionId: `s${i}`, cwd: CWD }, T0 + i);
  s.record({ provider: "antigravity", sessionId: "a", cwd: CWD }, T0 + 99);
  s.record({ provider: "codex", sessionId: "c", cwd: CWD }, T0 + 50);
  const v = buildHistoryView(s, deps());
  assert.strictEqual(v.length, 10);
  assert.strictEqual(v[0].sessionId, "c");
  assert.ok(!v.some((r) => r.provider === "antigravity"));
});

test("T30: Codex só retoma com id UUID válido; id estranho é bloqueado com a razão", () => {
  const { s } = store();
  s.record({ provider: "codex", sessionId: "c", cwd: CWD }, T0);
  const [row] = buildHistoryView(s, deps());
  assert.strictEqual(row.canResume, false);
  assert.strictEqual(row.reason, "sessao-invalida");
});

test("T30: transcrição ausente, pasta ausente e sessão em andamento desabilitam a retomada", () => {
  const { s } = store();
  s.record({ provider: "claude", sessionId: "x", cwd: CWD }, T0);
  assert.strictEqual(buildHistoryView(s, deps())[0].canResume, true);
  assert.strictEqual(buildHistoryView(s, deps({ probe: () => false }))[0].reason, "transcricao-ausente");
  assert.strictEqual(buildHistoryView(s, deps({ dirExists: () => false }))[0].reason, "pasta-ausente");
  assert.strictEqual(buildHistoryView(s, deps({ now: T0 + 1000 }))[0].reason, "em-andamento");
});

test("T30: retomar exige pedido explícito, revalida e só abre o Claude", async () => {
  const { s } = store();
  s.record({ provider: "claude", sessionId: "ok", cwd: CWD }, T0);
  s.record({ provider: "codex", sessionId: "cx", cwd: CWD }, T0);
  s.record({ provider: "codex", sessionId: CX, cwd: CWD }, T0);
  const calls = [];
  const launch = async (...a) => { calls.push(a); return { ok: true }; };
  assert.deepStrictEqual(await resumeHistorySession(s, { provider: "claude", sessionId: "inexistente" }, deps({ launch })), { ok: false, reason: "desconhecida" });
  assert.strictEqual((await resumeHistorySession(s, { provider: "codex", sessionId: "cx" }, deps({ launch }))).ok, false);
  assert.deepStrictEqual(await resumeHistorySession(s, { provider: "codex", sessionId: CX }, deps({ launch })), { ok: true });
  assert.deepStrictEqual(calls.pop(), ["codex-resume", CWD, CX]);
  assert.strictEqual((await resumeHistorySession(s, { provider: "claude", sessionId: "ok" }, deps({ launch, probe: () => false }))).reason, "transcricao-ausente");
  assert.strictEqual(calls.length, 0, "nada abre sem passar pelas checagens");
  assert.deepStrictEqual(await resumeHistorySession(s, { provider: "claude", sessionId: "ok" }, deps({ launch })), { ok: true });
  assert.deepStrictEqual(calls, [["resume", CWD, "ok"]]);
});

test("T30: grava só provedor, id, pasta e horários, e sobrevive a reinício", () => {
  const { file, s } = store();
  s.record({ provider: "claude", sessionId: "p1", cwd: CWD }, T0);
  s.record({ provider: "claude", sessionId: "p2", cwd: "relativo/invalido" }, T0);
  const disk = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.deepStrictEqual(Object.keys(disk.sessions[0]).sort(), ["cwd", "firstSeenAt", "lastEventAt", "provider", "sessionId"]);
  assert.strictEqual(disk.sessions[1].cwd, "", "pasta não absoluta é descartada");
  assert.strictEqual(createHistoryStore({ filePath: file }).find("claude", "p1").cwd, CWD);
});

test("T30: o runtime entrega o cwd completo aos ouvintes e o hook o envia", () => {
  const seen = [];
  const rt = createHabitatRuntime({ onAcceptedEvent: (e) => seen.push(e) });
  rt.handleHttpEvent({ provider: "claude", event: "UserPromptSubmit", sessionId: "rt", cwd: CWD, cwdName: "x", surface: "claude-code", pid: process.pid }, T0);
  assert.strictEqual(seen[0].cwd, CWD);
  const hook = fs.readFileSync(path.join(__dirname, "..", "hooks", "agent-habitat-hook.js"), "utf8");
  assert.match(hook, /cwd: stdinData\.cwd/);
});

test("T30: o painel tem a aba Histórico e nada do módulo escreve em ~/.clawd", () => {
  const html = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-panel.html"), "utf8");
  assert.match(html, /id="tab-history"/);
  assert.match(html, /id="history-list"/);
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-history.js"), "utf8");
  assert.doesNotMatch(src, /["'`]\.clawd/);
});

test("T31: o Codex abre num terminal com 'codex resume <uuid>' e recusa id fora do formato", async () => {
  const { launchCodexResume } = require("../src/habitat/habitat-codex-launch");
  const seen = [];
  const tryLaunch = async (bin, args) => { seen.push([bin, args.join(" ")]); return { ok: true }; };
  assert.strictEqual((await launchCodexResume(CWD, "x; calc", { tryLaunch })).ok, false);
  assert.strictEqual(seen.length, 0, "id inválido nunca chega a um shell");
  const r = await launchCodexResume(CWD, CX, { tryLaunch, platform: () => "win32" });
  assert.strictEqual(r.ok, true);
  assert.match(seen[0][1], new RegExp(`codex.*resume.*${CX}`));
});
