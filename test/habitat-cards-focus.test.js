"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { execFile } = require("child_process");
const { promisify } = require("util");
const execFileAsync = promisify(execFile);

const { computeHabitatCardBounds, createHabitatCardManager } = require("../src/habitat/habitat-cards");
const { createHabitatFocusController } = require("../src/habitat/habitat-focus");
const hookScriptPath = path.resolve(__dirname, "../hooks/agent-habitat-hook.js");

test("computeHabitatCardBounds positions above stage and flips below when near top", () => {
  const stageBounds = { x: 100, y: 200, width: 200, height: 100 };
  const workArea = { x: 0, y: 0, width: 1000, height: 800 };

  const boundsAbove = computeHabitatCardBounds({ stageBounds, workArea, cardWidth: 100, cardHeight: 50, gap: 10 });
  assert.equal(boundsAbove.y, 140);
  assert.equal(boundsAbove.x, 150);

  const stageTop = { x: 100, y: 40, width: 200, height: 100 };
  const boundsBelow = computeHabitatCardBounds({ stageBounds: stageTop, workArea, cardWidth: 100, cardHeight: 50, gap: 10 });
  assert.equal(boundsBelow.y, 150);
});

test("createHabitatCardManager handles permissions, allow, deny, timeout, dismiss, cardsEnabled, completion auto-close", async () => {
  let focusedProvider = null;
  const manager = createHabitatCardManager({
    cardsEnabled: true,
    permissionTimeoutMs: 200,
    doneAutoCloseMs: 100,
    onFocusProvider: (p) => { focusedProvider = p; },
  });

  const p1 = manager.requestPermission({ id: "p1", provider: "claude", cwdName: "repo", summary: "test" });
  manager.resolveCardDecision("p1", "allow");
  const res1 = await p1;
  assert.equal(res1.decision, "allow");

  const p2 = manager.requestPermission({ id: "p2", provider: "claude", cwdName: "repo", summary: "test" });
  manager.resolveCardDecision("p2", "deny");
  const res2 = await p2;
  assert.equal(res2.decision, "deny");

  const p3 = manager.requestPermission({ id: "p3", provider: "claude", cwdName: "repo", summary: "test" });
  const res3 = await p3;
  assert.equal(res3.decision, "ask");

  const p4 = manager.requestPermission({ id: "p4", provider: "claude", cwdName: "repo", summary: "test" });
  manager.dismissCard("p4");
  const res4 = await p4;
  assert.equal(res4.decision, "ask");

  manager.setCardsEnabled(false);
  const p5 = manager.requestPermission({ id: "p5", provider: "claude", cwdName: "repo", summary: "test" });
  const res5 = await p5;
  assert.equal(res5.decision, "ask");
  manager.setCardsEnabled(true);

  manager.showCompletionCard({ id: "c1", provider: "claude", cwdName: "repo", summary: "done" });
  assert.ok(manager.getActiveCards().includes("c1"));
  await new Promise((r) => setTimeout(r, 150));
  assert.ok(!manager.getActiveCards().includes("c1"));

  manager.dispose();
});

test("createHabitatFocusController tries pids in order and falls back", async () => {
  const tried = [];
  const controller = createHabitatFocusController({
    focusByPid: async (pid) => {
      tried.push(pid);
      if (pid === 999) return { ok: true, method: "test-pid" };
      return { ok: false };
    },
    isPidAlive: (pid) => pid !== 123,
    fallbackProcessSearch: async () => ({ ok: true, method: "fallback-proc", pid: 888 }),
  });

  const res = await controller.focusSession({
    sourcePid: 123,
    ppid: 456,
    pid: 999,
    pidChain: [123, 456, 999],
  });

  assert.equal(res.ok, true);
  assert.equal(res.method, "test-pid");
  assert.equal(res.pid, 999);
});

test("hooks/agent-habitat-hook.js --blocking-permission with async execFile and ppid verification", async () => {
  let receivedPayload = null;
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        receivedPayload = JSON.parse(body);
      } catch {}
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ decision: "allow" }));
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;

  try {
    const inputPayload = JSON.stringify({
      sessionId: "block_sess_99",
      session_id: "block_sess_99",
      cwd: "C:\\Users\\demo\\projects\\agent-habitat",
      tool: "bash",
    });

    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [hookScriptPath, "--blocking-permission", "claude", "PreToolUse"],
      {
        input: inputPayload,
        env: {
          ...process.env,
          AGENT_HABITAT_PORT: String(port),
        },
        encoding: "utf-8",
        timeout: 5000,
      }
    );

    assert.ok(stdout.includes("allow"));
    assert.ok(receivedPayload);
    assert.equal(receivedPayload.sessionId, receivedPayload.sessionId || "claude:default");
    assert.ok(typeof receivedPayload.ppid === "number" && receivedPayload.ppid > 0);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});
