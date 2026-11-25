"use strict";

// T29 (P1.1): cotas reais só de leitura; ausência de dado vira "sem dados".
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const test = require("node:test");
const { readHabitatQuota } = require("../src/habitat/habitat-quota-reader");

function tmpFile(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-quota-"));
  const file = path.join(dir, "account-quota.json");
  if (content !== undefined) fs.writeFileSync(file, typeof content === "string" ? content : JSON.stringify(content));
  return { dir, file };
}

const NOW = 1_800_000_000_000;
const sample = {
  version: 6,
  sources: [
    {
      sourceKey: "",
      host: null,
      codexQuota: { group: { codexFiveHour: { usedPercent: 12.5, resetAt: NOW + 3600_000 }, codexWeekly: { usedPercent: 140, resetAt: NOW - 1 } }, updatedAt: NOW - 5000, lastSeenAt: NOW - 1000 },
      antigravityQuota: { group: { geminiFiveHour: { usedPercent: 10, resetAt: NOW + 1000 } }, updatedAt: NOW, lastSeenAt: NOW }
    },
    { sourceKey: "ssh:outra", host: "outra", claudeQuota: { group: { claudeFiveHour: { usedPercent: 99, resetAt: NOW + 1000 } } } }
  ]
};

test("T29: lê cotas reais da máquina local, marca janela vencida e limita a 0-100", () => {
  const { file } = tmpFile(sample);
  const r = readHabitatQuota({ filePath: file, now: NOW });
  assert.strictEqual(r.file, "ok");
  assert.strictEqual(r.providers.codex.status, "ok");
  const [five, week] = r.providers.codex.buckets;
  assert.strictEqual(five.usedPercent, 12.5);
  assert.strictEqual(five.expired, false);
  assert.strictEqual(week.usedPercent, 100, "percentual acima de 100 é limitado");
  assert.strictEqual(week.expired, true);
  assert.strictEqual(r.providers.antigravity.buckets[0].label, "Gemini 5 horas");
});

test("T29: provedor sem cota e fontes remotas viram sem-dados, nunca valor inventado", () => {
  const { file } = tmpFile(sample);
  const r = readHabitatQuota({ filePath: file, now: NOW });
  assert.strictEqual(r.providers.claude.status, "sem-dados");
  assert.deepStrictEqual(r.providers.claude.buckets, []);
});

test("T29: arquivo ausente ou inválido não quebra e retorna sem-dados", () => {
  const missing = readHabitatQuota({ filePath: path.join(os.tmpdir(), "nao-existe-habitat.json"), now: NOW });
  assert.strictEqual(missing.file, "missing");
  const bad = readHabitatQuota({ filePath: tmpFile("{nao-json").file, now: NOW });
  assert.strictEqual(bad.file, "invalid");
  for (const r of [missing, bad]) for (const p of Object.values(r.providers)) assert.strictEqual(p.status, "sem-dados");
});

test("T29: o leitor é somente leitura (não grava nem altera o arquivo)", () => {
  const { file } = tmpFile(sample);
  const before = fs.statSync(file).mtimeMs;
  const content = fs.readFileSync(file, "utf8");
  readHabitatQuota({ filePath: file, now: NOW });
  assert.strictEqual(fs.statSync(file).mtimeMs, before);
  assert.strictEqual(fs.readFileSync(file, "utf8"), content);
  const src = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-quota-reader.js"), "utf8");
  assert.doesNotMatch(src, /writeFile|appendFile|rename|unlink|mkdir|createWriteStream/, "o leitor não pode escrever");
});

// ---- contador de uso observado e estado do painel ----
const { createUsageCounter } = require("../src/habitat/habitat-usage-counter");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const { buildHabitatPanelState } = require("../src/habitat/habitat-app-main");

const DAY = 86400000;
const T0 = new Date(2026, 10, 25, 12, 0, 0).getTime();

test("T29: contador conta sessão uma vez e interação só em prompt/invocação, separando hoje de 7 dias", () => {
  const { dir, file } = tmpFile();
  const c = createUsageCounter({ filePath: path.join(dir, "usage.json") });
  c.record({ provider: "claude", sessionId: "s1", event: "SessionStart" }, T0);
  c.record({ provider: "claude", sessionId: "s1", event: "UserPromptSubmit" }, T0);
  c.record({ provider: "claude", sessionId: "s1", event: "PostToolUse" }, T0);
  c.record({ provider: "antigravity", sessionId: "a1", event: "PreInvocation" }, T0 - 2 * DAY);
  c.record({ provider: "desconhecido", sessionId: "x", event: "UserPromptSubmit" }, T0);
  assert.deepStrictEqual(c.getUsage("today", T0).claude, { sessions: 1, interactions: 1 });
  assert.deepStrictEqual(c.getUsage("today", T0).antigravity, { sessions: 0, interactions: 0 });
  assert.deepStrictEqual(c.getUsage("7d", T0).antigravity, { sessions: 1, interactions: 1 });
});

test("T29: o contador grava só números (nenhum id de sessão no disco) e sobrevive a reinício", () => {
  const { dir } = tmpFile();
  const f = path.join(dir, "usage.json");
  const c = createUsageCounter({ filePath: f });
  c.record({ provider: "codex", sessionId: "segredo-de-sessao-123", event: "UserPromptSubmit" }, T0);
  assert.doesNotMatch(fs.readFileSync(f, "utf8"), /segredo-de-sessao-123/);
  assert.deepStrictEqual(createUsageCounter({ filePath: f }).getUsage("today", T0).codex, { sessions: 1, interactions: 1 });
});

test("T29: o runtime notifica o contador só para eventos aceitos", () => {
  const seen = [];
  const rt = createHabitatRuntime({ onAcceptedEvent: (e) => seen.push(e) });
  rt.handleHttpEvent({ provider: "claude", event: "UserPromptSubmit", sessionId: "rt-1", cwdName: "p", surface: "claude-code", pid: process.pid }, T0);
  assert.strictEqual(seen.length, 1);
  assert.strictEqual(seen[0].provider, "claude");
  assert.strictEqual(seen[0].sessionId, "rt-1");
  rt.handleHttpEvent({ provider: "provedor-inexistente", event: "UserPromptSubmit", sessionId: "rt-2" }, T0);
  assert.strictEqual(seen.length, 1);
});

test("T29: o estado do painel carrega cota e uso, e o cliente mostra 'sem dados' em vez de inventar", () => {
  const quota = readHabitatQuota({ filePath: tmpFile(sample).file, now: NOW });
  const usage = { today: { claude: { sessions: 2, interactions: 5 } }, week: {} };
  const state = buildHabitatPanelState({ prefs: {}, demoMode: false, runtime: createHabitatRuntime({}), diagnostics: {}, quota, usage });
  assert.strictEqual(state.metrics.quota.providers.codex.status, "ok");
  assert.strictEqual(state.metrics.usage.today.claude.interactions, 5);
  const client = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-panel-client.js"), "utf8");
  assert.match(client, /Sem dados de cota/);
  const html = fs.readFileSync(path.join(__dirname, "..", "src", "habitat", "habitat-panel.html"), "utf8");
  assert.match(html, /metrics-period-today/);
  assert.match(html, /metrics-period-week/);
});
