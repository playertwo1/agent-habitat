"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { execFileSync } = require("node:child_process");

const {
  detectWindowsMvpSurfaces,
  parseCodexRolloutLine,
  normalizeHookPayloadToAggregatorEvent,
} = require("../src/habitat/habitat-adapters");

const {
  planHabitatHookSync,
  installHabitatHooks,
  uninstallHabitatHooks,
} = require("../src/habitat/habitat-hook-sync");

const hookScriptPath = path.resolve(__dirname, "../hooks/agent-habitat-hook.js");

test("detectWindowsMvpSurfaces mocks all 6 surfaces correctly", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-surf-"));
  try {
    const localAppData = path.join(tmp, "LocalAppData");
    const roamingAppData = path.join(tmp, "AppDataRoaming");
    const homeDir = path.join(tmp, "Home");

    const claudeBin = path.join(homeDir, ".local", "bin", "claude.exe");
    const anthropicDir = path.join(localAppData, "AnthropicClaude");
    const codexBin = path.join(localAppData, "Programs", "OpenAI", "Codex", "bin", "codex.exe");
    const codexSessions = path.join(homeDir, ".codex", "sessions");
    const agyBin = path.join(homeDir, ".gemini", "bin", "agy.exe");
    const ideExe = path.join(localAppData, "Programs", "antigravity", "Antigravity.exe");

    fs.mkdirSync(path.dirname(claudeBin), { recursive: true });
    fs.writeFileSync(claudeBin, "bin");

    fs.mkdirSync(anthropicDir, { recursive: true });
    fs.mkdirSync(path.dirname(codexBin), { recursive: true });
    fs.writeFileSync(codexBin, "bin");

    fs.mkdirSync(codexSessions, { recursive: true });
    fs.mkdirSync(path.dirname(agyBin), { recursive: true });
    fs.writeFileSync(agyBin, "bin");

    fs.mkdirSync(path.dirname(ideExe), { recursive: true });
    fs.writeFileSync(ideExe, "bin");

    const surfaces = detectWindowsMvpSurfaces({
      fs,
      env: { LOCALAPPDATA: localAppData, APPDATA: roamingAppData },
      homeDir,
      runningProcesses: ["Antigravity.exe", "ChatGPT.exe"],
      hasActiveTurn: false,
    });

    assert.equal(surfaces.claudeCli, true);
    assert.equal(surfaces.claudeDesktop, true);
    assert.equal(surfaces.codexCli, true);
    assert.equal(surfaces.codexDesktop, true);
    assert.equal(surfaces.antigravityCli, true);
    assert.equal(surfaces.antigravityIde, true);
    assert.equal(surfaces.summary.idleOnlyRunning, true);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("parseCodexRolloutLine parses events correctly", () => {
  const metaLine = JSON.stringify({ type: "session_meta", sessionId: "s1", originator: "orca_desktop" });
  const parsedMeta = parseCodexRolloutLine(metaLine);
  assert.equal(parsedMeta.event, "SessionStart");
  assert.equal(parsedMeta.isCodexDesktop, true);

  const taskStart = JSON.stringify({ type: "event_msg", subType: "task_started", sessionId: "s1" });
  assert.equal(parseCodexRolloutLine(taskStart).state, "busy");

  const taskComplete = JSON.stringify({ type: "event_msg", subType: "task_complete", sessionId: "s1" });
  assert.equal(parseCodexRolloutLine(taskComplete).event, "Stop");
  assert.equal(parseCodexRolloutLine(taskComplete).state, "done");

  const aborted = JSON.stringify({ type: "event_msg", subType: "turn_aborted", sessionId: "s1" });
  assert.equal(parseCodexRolloutLine(aborted).state, "idle");

  assert.equal(parseCodexRolloutLine("invalid json"), null);
});

test("normalizeHookPayloadToAggregatorEvent maps new G2 events", () => {
  const ev1 = normalizeHookPayloadToAggregatorEvent({ provider: "claude", event: "TeammateIdle" });
  assert.equal(ev1.state, "idle");

  const ev2 = normalizeHookPayloadToAggregatorEvent({ provider: "claude", event: "Elicitation" });
  assert.equal(ev2.state, "waiting_input");

  const ev3 = normalizeHookPayloadToAggregatorEvent({ provider: "claude", event: "ElicitationResult" });
  assert.equal(ev3.state, "busy");

  const ev4 = normalizeHookPayloadToAggregatorEvent({ provider: "antigravity", event: "PreInvocation" });
  assert.equal(ev4.state, "busy");

  const ev5 = normalizeHookPayloadToAggregatorEvent({ provider: "antigravity", event: "PostInvocation" });
  assert.equal(ev5.state, "idle");

  const ev6 = normalizeHookPayloadToAggregatorEvent({ provider: "claude", event: "SessionEnd" });
  assert.equal(ev6.state, "offline");
});

test("planHabitatHookSync, installHabitatHooks, and uninstallHabitatHooks work securely with real schemas in tmpdir", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-sync-"));
  try {
    const claudeSettings = path.join(tmp, ".claude", "settings.json");
    const codexHooks = path.join(tmp, ".codex", "hooks.json");
    const antigravityHooks = path.join(tmp, ".gemini", "config", "hooks.json");

    // Seed files with real schemas
    fs.mkdirSync(path.dirname(claudeSettings), { recursive: true });
    fs.writeFileSync(claudeSettings, JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "clawd-hook.js", timeout: 10 }] }] } }, null, 2));

    fs.mkdirSync(path.dirname(codexHooks), { recursive: true });
    fs.writeFileSync(codexHooks, JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: "command", command: "codex-hook.js", timeout: 10 }] }, { hooks: [{ type: "command", command: "coucou-hook.exe", timeout: 10 }] }] } }, null, 2));

    fs.mkdirSync(path.dirname(antigravityHooks), { recursive: true });
    fs.writeFileSync(antigravityHooks, JSON.stringify({ clawd: { Stop: [{ type: "command", command: "antigravity-hook.js", timeout: 10 }] }, coucou: { Stop: [{ type: "command", command: "coucou-hook.exe", timeout: 10 }] } }, null, 2));

    // Plan (read-only)
    const plan = planHabitatHookSync({
      claudeSettingsPath: claudeSettings,
      codexHooksPath: codexHooks,
      antigravityHooksPath: antigravityHooks,
      hookScriptPath,
    });

    assert.equal(plan.targets.claude.exists, true);
    assert.equal(plan.targets.claude.hasMarker, false);

    // Install with confirm: true
    const resConfirm = installHabitatHooks({
      claudeSettingsPath: claudeSettings,
      codexHooksPath: codexHooks,
      antigravityHooksPath: antigravityHooks,
      confirm: true,
      hookScriptPath,
    });
    assert.equal(resConfirm.ok, true);

    const clData = JSON.parse(fs.readFileSync(claudeSettings, "utf-8"));
    assert.equal(clData.hooks.SessionStart.length, 2);
    assert.deepEqual(clData.hooks.SessionStart[0], { hooks: [{ type: "command", command: "clawd-hook.js", timeout: 10 }] });

    const cxData = JSON.parse(fs.readFileSync(codexHooks, "utf-8"));
    assert.equal(cxData.hooks.SessionStart.length, 3);

    const agData = JSON.parse(fs.readFileSync(antigravityHooks, "utf-8"));
    assert.equal(agData.hooks, undefined);
    assert.equal(agData["agent-habitat"].PreToolUse, undefined);
    assert.equal(agData["agent-habitat"].PostToolUse[0].matcher, "*");
    assert.ok(agData["agent-habitat"].PreInvocation);
    assert.ok(agData["agent-habitat"].PostInvocation);
    assert.ok(agData["agent-habitat"].Stop);
    assert.ok(agData.clawd);
    assert.ok(agData.coucou);

    // Uninstall
    const unRes = uninstallHabitatHooks({
      claudeSettingsPath: claudeSettings,
      codexHooksPath: codexHooks,
      antigravityHooksPath: antigravityHooks,
    });
    assert.equal(unRes.ok, true);

    const agDataAfter = JSON.parse(fs.readFileSync(antigravityHooks, "utf-8"));
    assert.equal(agDataAfter["agent-habitat"], undefined);
    assert.ok(agDataAfter.clawd);
    assert.ok(agDataAfter.coucou);

    const clDataAfter = JSON.parse(fs.readFileSync(claudeSettings, "utf-8"));
    assert.deepEqual(clDataAfter.hooks.SessionStart, [{ hooks: [{ type: "command", command: "clawd-hook.js", timeout: 10 }] }]);

    const cxDataAfter = JSON.parse(fs.readFileSync(codexHooks, "utf-8"));
    assert.equal(cxDataAfter.hooks.SessionStart.length, 2);

    // Verify backups exist
    const files = fs.readdirSync(path.dirname(claudeSettings));
    assert.ok(files.some((f) => f.includes(".agent-habitat-") && f.endsWith(".bak")));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});

test("hooks/agent-habitat-hook.js CLI execution against ephemeral server", async () => {
  let receivedBody = null;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        receivedBody = JSON.parse(body);
      } catch {}
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const inputPayload = JSON.stringify({
      session_id: "test_session_123",
      cwd: "C:\\Users\\demo\\projects\\agent-habitat",
      prompt: "SECRET PROMPT SHOULD BE STRIPPED",
      tool_input: "SECRET TOOL INPUT",
    });

    const stdoutOut = execFileSync(process.execPath, [hookScriptPath, "antigravity", "Stop"], {
      input: inputPayload,
      env: {
        ...process.env,
        AGENT_HABITAT_PORT: String(port),
      },
      encoding: "utf-8",
      timeout: 5000,
    });

    for (let i = 0; i < 20 && !receivedBody; i++) {
      await new Promise((r) => setTimeout(r, 50));
    }

    assert.ok(stdoutOut.includes("allow") || stdoutOut.includes("{}"));
    assert.ok(receivedBody, "receivedBody should not be null");
    assert.equal(receivedBody.sessionId, "test_session_123");
    assert.equal(receivedBody.cwdName, "agent-habitat");
    assert.equal(receivedBody.prompt, undefined);
    assert.equal(receivedBody.tool_input, undefined);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
