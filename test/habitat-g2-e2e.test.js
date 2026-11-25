"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const os = require("os");
const http = require("http");
const { execFile } = require("child_process");

const initServer = require("../src/server");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const { detectWindowsMvpSurfaces } = require("../src/habitat/habitat-adapters");
const { planHabitatHookSync } = require("../src/habitat/habitat-hook-sync");

test("Habitat G2 End-to-End & Smoke Validation", async (t) => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-e2e-"));
  const runtimeConfigPath = path.join(tmpDir, "runtime.json");
  const repoRoot = path.resolve(__dirname, "..");

  // Record real $HOME user files mtimeMs check (Requirement 3)
  const home = os.homedir();
  const claudeSettingsPath = path.join(home, ".claude", "settings.json");
  const codexHooksPath = path.join(home, ".codex", "hooks.json");
  const geminiHooksPath = path.join(home, ".gemini", "config", "hooks.json");

  function getMtime(p) {
    try {
      return fs.statSync(p).mtimeMs;
    } catch {
      return null;
    }
  }

  const mtimeBefore = {
    claude: getMtime(claudeSettingsPath),
    codex: getMtime(codexHooksPath),
    gemini: getMtime(geminiHooksPath),
  };

  const habitatRuntime = createHabitatRuntime({ repoRoot, reducedMotion: true });

  const serverCtx = {
    runtimeConfigPath,
    getPortCandidates: () => [0],
    staticServerPorts: [0],
    syncIntegrationsOnStartup: false,
    habitatRuntime,
    isAgentEnabled: () => true,
    doNotDisturb: false,
    addPendingPermission: () => {},
    resolvePermissionEntry: () => {},
    showPermissionBubble: () => {},
    syncPermissionBubbleContent: () => {},
  };

  const server = initServer(serverCtx);
  const port = await server.startHttpServer();
  assert.ok(port > 0, "Server started on a valid port");

  const hookScript = path.join(repoRoot, "hooks", "agent-habitat-hook.js");

  function fireHook(provider, eventName, stdinInput = {}) {
    const inputStr = JSON.stringify(stdinInput);
    return new Promise((resolve, reject) => {
      const child = execFile(
        process.execPath,
        [hookScript, provider, eventName],
        {
          encoding: "utf-8",
          env: {
            ...process.env,
            AGENT_HABITAT_PORT: String(port),
          },
          timeout: 2000,
          windowsHide: true,
        },
        (err, stdout) => {
          if (err) return reject(err);
          assert.ok(stdout !== undefined);
          resolve(stdout);
        }
      );
      child.stdin.end(inputStr);
    });
  }

  async function fetchSnapshot() {
    return new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/habitat/snapshot`, (res) => {
        let raw = "";
        res.on("data", (chunk) => (raw += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      }).on("error", reject);
    });
  }

  async function postEvent(payload, headers = {}) {
    return new Promise((resolve, reject) => {
      const data = JSON.stringify(payload);
      const req = http.request(
        {
          hostname: "127.0.0.1",
          port,
          path: "/habitat/event",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(data),
            ...headers,
          },
        },
        (res) => {
          let raw = "";
          res.on("data", (chunk) => (raw += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(raw) });
            } catch (e) {
              resolve({ status: res.statusCode, body: raw });
            }
          });
        }
      );
      req.on("error", reject);
      req.write(data);
      req.end();
    });
  }

  try {
    await t.test("1. SessionStart for claude, codex, antigravity -> inside, lights night", async () => {
      await fireHook("claude", "SessionStart", { session_id: "s-claude" });
      await fireHook("codex", "SessionStart", { thread_id: "s-codex" });
      await fireHook("antigravity", "SessionStart", { sessionId: "s-ag" });

      const snap = await fetchSnapshot();
      assert.equal(snap.schema, 1);
      assert.equal(snap.scene.cottage.lights, "night");
      assert.equal(snap.scene.residents.claude.presence, "inside");
      assert.equal(snap.scene.residents.codex.presence, "inside");
      assert.equal(snap.scene.residents.antigravity.presence, "inside");
    });

    await t.test("2. UserPromptSubmit in claude -> busy/outside", async () => {
      await fireHook("claude", "UserPromptSubmit", { session_id: "s-claude" });
      const snap = await fetchSnapshot();
      assert.equal(snap.scene.residents.claude.presence, "outside");
      assert.equal(snap.scene.residents.codex.presence, "inside");
      assert.equal(snap.scene.residents.antigravity.presence, "inside");
    });

    await t.test("3. PreToolUse in codex + PreInvocation in antigravity -> both active", async () => {
      await fireHook("codex", "PreToolUse", { thread_id: "s-codex", tool_name: "bash" });
      await fireHook("antigravity", "PreInvocation", { sessionId: "s-ag" });

      const snap = await fetchSnapshot();
      assert.equal(snap.scene.residents.codex.presence, "outside");
      assert.equal(snap.scene.residents.antigravity.presence, "outside");
    });

    await t.test("4. PermissionRequest in codex -> needs_approval; Stop in claude -> done/idle; SessionEnd in antigravity -> offline", async () => {
      await fireHook("codex", "PermissionRequest", { thread_id: "s-codex" });
      await fireHook("claude", "Stop", { session_id: "s-claude" });
      await fireHook("antigravity", "SessionEnd", { sessionId: "s-ag" });

      const snap = await fetchSnapshot();
      assert.equal(snap.scene.residents.codex.logicalState, "needs_approval");
      assert.equal(snap.scene.residents.antigravity.logicalState, "offline");
      assert.equal(snap.scene.residents.antigravity.presence, "inside");
    });

    await t.test("5. ingestRolloutLine with codex JSON rollout line updates codex", async () => {
      habitatRuntime.ingestRolloutLine(JSON.stringify({ type: "event_msg", subType: "task_started", sessionId: "s-codex", originator: "orca_desktop" }));
      const snap = await fetchSnapshot();
      assert.equal(snap.scene.residents.codex.logicalState, "busy");
      assert.equal(snap.scene.residents.claude.presence, "inside");
      assert.equal(snap.scene.residents.antigravity.presence, "inside");
    });

    await t.test("6. Origin: https://evil.example in POST /habitat/event -> rejected with 403", async () => {
      const res = await postEvent({ schema: 1, provider: "claude", event: "UserPromptSubmit" }, { "Origin": "https://evil.example" });
      assert.equal(res.status, 403);
    });

    await t.test("7. Read-only smoke test: detectWindowsMvpSurfaces and planHabitatHookSync do not modify user $HOME mtimes", async () => {
      const surfaces = detectWindowsMvpSurfaces({ inspectLiveProcesses: true });
      assert.ok(surfaces && typeof surfaces === "object");

      const plan = planHabitatHookSync();
      assert.ok(plan && typeof plan === "object");

      const mtimeAfter = {
        claude: getMtime(claudeSettingsPath),
        codex: getMtime(codexHooksPath),
        gemini: getMtime(geminiHooksPath),
      };

      if (mtimeBefore.claude !== null) {
        assert.equal(mtimeAfter.claude, mtimeBefore.claude, "Claude settings mtime unchanged");
      }
      if (mtimeBefore.codex !== null) {
        assert.equal(mtimeAfter.codex, mtimeBefore.codex, "Codex hooks mtime unchanged");
      }
      if (mtimeBefore.gemini !== null) {
        assert.equal(mtimeAfter.gemini, mtimeBefore.gemini, "Gemini hooks mtime unchanged");
      }
    });
  } finally {
    server.cleanup();
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {}
  }
});
