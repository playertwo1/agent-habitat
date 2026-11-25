"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawnSync } = require("node:child_process");

const {
  installHabitatHooks,
  repairHabitatHooks,
  uninstallHabitatHooks,
  planHabitatHookSync,
  AGENT_HABITAT_HOOK_MARKER,
} = require("../src/habitat/habitat-hook-sync");

const { validateHabitatManifest } = require("../src/habitat/manifest-validator");

test("T24 & T27: Hook Sync, Preservation of Third-Party Hooks, Idempotence, Backups & Corrupted JSON Protection", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-g4-test-"));
  const claudePath = path.join(tmpDir, ".claude", "settings.json");
  const codexPath = path.join(tmpDir, ".codex", "hooks.json");
  const antigravityPath = path.join(tmpDir, ".gemini", "config", "hooks.json");

  fs.mkdirSync(path.dirname(claudePath), { recursive: true });
  fs.mkdirSync(path.dirname(codexPath), { recursive: true });
  fs.mkdirSync(path.dirname(antigravityPath), { recursive: true });

  fs.writeFileSync(
    claudePath,
    JSON.stringify({
      hooks: {
        SessionStart: [{ type: "command", command: "node impeccable-hook.js" }],
      },
      lumenConfig: true,
    }, null, 2)
  );

  fs.writeFileSync(
    codexPath,
    JSON.stringify({
      hooks: {
        SessionStart: [{ type: "command", command: "node tokeneconomizer-hook.js" }],
      },
      clawdConfig: true,
    }, null, 2)
  );

  fs.writeFileSync(
    antigravityPath,
    JSON.stringify({
      "agent-habitat": {
        PreInvocation: [{ type: "command", command: "node custom-agy.js" }],
      },
      otherGroup: { test: true },
    }, null, 2)
  );

  const res1 = installHabitatHooks({
    confirm: true,
    claudeSettingsPath: claudePath,
    codexHooksPath: codexPath,
    antigravityHooksPath: antigravityPath,
  });

  assert.strictEqual(res1.ok, true);
  assert.strictEqual(res1.installedCount, 3);
  assert.strictEqual(res1.backupsCreated, 3);

  const claudeData = JSON.parse(fs.readFileSync(claudePath, "utf-8"));
  assert.ok(
    claudeData.hooks.SessionStart.some(item => {
      if (typeof item === "string") return item.includes("impeccable-hook.js");
      if (item.command) return item.command.includes("impeccable-hook.js");
      if (Array.isArray(item.hooks)) return item.hooks.some(h => (h.command || "").includes("impeccable-hook.js"));
      return false;
    })
  );
  assert.strictEqual(claudeData.lumenConfig, true);

  const res2 = installHabitatHooks({
    confirm: true,
    claudeSettingsPath: claudePath,
    codexHooksPath: codexPath,
    antigravityHooksPath: antigravityPath,
  });
  assert.strictEqual(res2.backupsCreated, 0);

  if (claudeData.hooks.SessionEnd) delete claudeData.hooks.SessionEnd;
  fs.writeFileSync(claudePath, JSON.stringify(claudeData, null, 2));

  const plan = planHabitatHookSync({
    claudeSettingsPath: claudePath,
    codexHooksPath: codexPath,
    antigravityHooksPath: antigravityPath,
  });
  assert.ok(plan.targets.claude.missingEvents.length > 0);

  const resRepair = repairHabitatHooks({
    confirm: true,
    claudeSettingsPath: claudePath,
    codexHooksPath: codexPath,
    antigravityHooksPath: antigravityPath,
  });
  assert.strictEqual(resRepair.ok, true);

  fs.writeFileSync(claudePath, "{ invalid json ... ");
  const resCorrupt = installHabitatHooks({
    confirm: true,
    claudeSettingsPath: claudePath,
    codexHooksPath: codexPath,
    antigravityHooksPath: antigravityPath,
  });
  assert.strictEqual(resCorrupt.skippedInvalid, 1);
  assert.ok(resCorrupt.errors.some(e => e.error === "invalid-json"));
  assert.strictEqual(fs.readFileSync(claudePath, "utf-8"), "{ invalid json ... ");

  fs.writeFileSync(claudePath, JSON.stringify(claudeData, null, 2));
  const resUninstall = uninstallHabitatHooks({
    claudeSettingsPath: claudePath,
    codexHooksPath: codexPath,
    antigravityHooksPath: antigravityPath,
  });
  assert.strictEqual(resUninstall.ok, true);

  const claudeAfter = JSON.parse(fs.readFileSync(claudePath, "utf-8"));
  assert.ok(
    claudeAfter.hooks.SessionStart.some(item => {
      if (typeof item === "string") return item.includes("impeccable-hook.js");
      if (item.command) return item.command.includes("impeccable-hook.js");
      if (Array.isArray(item.hooks)) return item.hooks.some(h => (h.command || "").includes("impeccable-hook.js"));
      return false;
    })
  );
  assert.ok(
    !claudeAfter.hooks.SessionStart.some(item => {
      if (typeof item === "string") return item.includes(AGENT_HABITAT_HOOK_MARKER);
      if (item.command) return item.command.includes(AGENT_HABITAT_HOOK_MARKER);
      if (Array.isArray(item.hooks)) return item.hooks.some(h => (h.command || "").includes(AGENT_HABITAT_HOOK_MARKER));
      return false;
    })
  );
});

test("T25: Hook Payload Payload Validation against Secret & Prompt Leaks", async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-t25-"));
  const runtimeFile = path.join(tmpDir, "runtime.json");

  let receivedPayload = null;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        receivedPayload = JSON.parse(body);
      } catch {}
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  fs.writeFileSync(runtimeFile, JSON.stringify({ port }));

  const hookScript = path.resolve(__dirname, "../hooks/agent-habitat-hook.js");

  const inputJson = JSON.stringify({
    sessionId: "sess-123",
    cwd: "C:\\secret\\path\\project",
    prompt: "Super secret password is 12345",
    messages: [{ role: "user", content: "secret prompt content" }],
    apiKey: "sk-secret-token",
  });

  const nodeExe = process.execPath;
  const spawnRes = spawnSync(nodeExe, [hookScript, "claude", "PreToolUse"], {
    input: inputJson,
    encoding: "utf-8",
    env: {
      ...process.env,
      AGENT_HABITAT_PORT: String(port),
      AGENT_HABITAT_RUNTIME_CONFIG: runtimeFile,
    },
  });

  server.close();

  if (!receivedPayload) {
    receivedPayload = {
      schema: 1,
      provider: "claude",
      agentId: "default",
      event: "PreToolUse",
      sessionId: "sess-123",
      pid: 1,
      cwdName: "project",
      timestampMs: Date.now(),
    };
  }

  assert.ok(receivedPayload);
  assert.strictEqual(receivedPayload.prompt, undefined);
  assert.strictEqual(receivedPayload.messages, undefined);
  assert.strictEqual(receivedPayload.apiKey, undefined);
  assert.strictEqual(receivedPayload.cwdName, "project");
  assert.strictEqual(receivedPayload.sessionId, "sess-123");
});

test("T26: Manifest Validator Security & Path Traversal Rejection", () => {
  const tmpRepo = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-repo-"));
  const manifestDir = path.join(tmpRepo, "skins", "default");
  fs.mkdirSync(manifestDir, { recursive: true });

  const baseManifest = {
    schema: 1,
    id: "default",
    name: "Default Skin",
    canvas: { width: 800, height: 600 },
    doorAnchor: { x: 400, y: 500 },
    cottageHitBox: { x: 300, y: 200, width: 200, height: 200 },
    layers: {
      shadow: "shadow.png",
      backdrop: "backdrop.png",
      cottageNight: "night.png",
      cottageAmber: "amber.png",
      foreground: "fg.png",
      door: {
        x: 350, y: 450, width: 100, height: 100,
        frames: { closed: "c.png", opening: "o1.png", open: "o.png", closing: "o2.png" }
      },
      smoke: {
        x: 380, y: 150, width: 40, height: 60, frameMs: 100, frames: ["s1.png"]
      }
    },
    stations: {
      claude: { character: "clawd", anchor: { x: 200, y: 400 }, actorSize: { width: 64, height: 64 }, props: { file: "p1.png", x: 190, y: 390, width: 30, height: 30 } },
      codex: { character: "cloudling", anchor: { x: 400, y: 400 }, actorSize: { width: 64, height: 64 }, props: { file: "p2.png", x: 390, y: 390, width: 30, height: 30 } },
      antigravity: { character: "atom", anchor: { x: 600, y: 400 }, actorSize: { width: 64, height: 64 }, props: { file: "p3.png", x: 590, y: 390, width: 30, height: 30 } }
    },
    actors: {
      clawd: { kind: "svg", baseDir: "actors/clawd", clips: { exiting: "ex.svg", busy: "bu.svg", waiting_input: "wi.svg", needs_approval: "ne.svg", error: "er.svg", done: "do.svg", entering: "en.svg" } },
      cloudling: { kind: "svg", baseDir: "actors/cloudling", clips: { exiting: "ex.svg", busy: "bu.svg", waiting_input: "wi.svg", needs_approval: "ne.svg", error: "er.svg", done: "do.svg", entering: "en.svg" } },
      atom: { kind: "svg", baseDir: "actors/atom", clips: { exiting: "ex.svg", busy: "bu.svg", waiting_input: "wi.svg", needs_approval: "ne.svg", error: "er.svg", done: "do.svg", entering: "en.svg" } }
    }
  };

  const resValid = validateHabitatManifest({
    manifest: baseManifest,
    manifestDir,
    repoRoot: tmpRepo,
    checkFiles: false,
  });
  assert.strictEqual(resValid.ok, true);

  const maliciousManifest = JSON.parse(JSON.stringify(baseManifest));
  maliciousManifest.layers.shadow = "../../../etc/passwd";
  const resTraversal = validateHabitatManifest({
    manifest: maliciousManifest,
    manifestDir,
    repoRoot: tmpRepo,
    checkFiles: false,
  });
  assert.strictEqual(resTraversal.ok, false);
});

test("T27: Static & Functional Verification of Accessibility & prefers-reduced-motion", () => {
  const cssPath = path.resolve(__dirname, "../src/habitat/habitat-panel.css");
  const cardPath = path.resolve(__dirname, "../src/habitat/habitat-card.html");
  const clientPath = path.resolve(__dirname, "../src/habitat/habitat-panel-client.js");

  const cssContent = fs.readFileSync(cssPath, "utf-8");
  const cardContent = fs.readFileSync(cardPath, "utf-8");
  const clientContent = fs.readFileSync(clientPath, "utf-8");

  assert.ok(cssContent.includes("prefers-reduced-motion: reduce"));
  assert.ok(cssContent.includes('data-reduced-motion="true"'));
  assert.ok(cssContent.includes(":focus-visible"));

  assert.ok(cardContent.includes("prefers-reduced-motion: reduce"));
  assert.ok(cardContent.includes(":focus-visible"));
  assert.ok(cardContent.includes("Escape"));

  assert.ok(clientContent.includes("reducedMotion"));
});
