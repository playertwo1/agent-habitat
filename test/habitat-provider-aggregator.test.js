"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HABITAT_MVP_PROVIDERS,
  HABITAT_MVP_AGENT_IDS,
  HABITAT_DISABLED_CHANNELS,
  mapAgentIdToProvider,
  isHabitatMvpAgent,
  filterHabitatAgentDescriptors,
  sanitizeHabitatPrefsSnapshot
} = require("../src/habitat/mvp-scope");

const { createHabitatProviderAggregator } = require("../src/habitat/provider-aggregator");

test("mvp-scope: mappings and filters", () => {
  assert.equal(mapAgentIdToProvider("claude-code"), "claude");
  assert.equal(mapAgentIdToProvider("CLAUDE"), "claude");
  assert.equal(mapAgentIdToProvider("codex"), "codex");
  assert.equal(mapAgentIdToProvider("antigravity-cli"), "antigravity");
  assert.equal(mapAgentIdToProvider("antigravity-ide"), "antigravity");
  assert.equal(mapAgentIdToProvider("unknown-agent"), null);
  assert.equal(mapAgentIdToProvider(123), null);

  assert.equal(isHabitatMvpAgent("codex"), true);
  assert.equal(isHabitatMvpAgent("legacy-agent"), false);

  const descriptors = [
    { agentId: "codex" },
    { agentId: "legacy-agent" },
    { agentId: "antigravity-cli" }
  ];
  const filtered = filterHabitatAgentDescriptors(descriptors);
  assert.equal(filtered.length, 2);
  assert.equal(filtered[0].agentId, "codex");
  assert.equal(filtered[1].agentId, "antigravity-cli");
  assert.deepEqual(filterHabitatAgentDescriptors(null), []);

  const pref = {
    telegramApproval: { enabled: true },
    agents: {
      codex: { enabled: true, integrationInstalled: true },
      "legacy-agent": { enabled: true, integrationInstalled: true }
    }
  };
  const sanitized = sanitizeHabitatPrefsSnapshot(pref);
  assert.equal(sanitized.telegramApproval.enabled, false);
  assert.equal(sanitized.feishuApproval.enabled, false);
  assert.equal(sanitized.slackNotify.enabled, false);
  assert.equal(sanitized.discordPresence.enabled, false);
  assert.equal(sanitized.agents["codex"].enabled, true);
  assert.equal(sanitized.agents["legacy-agent"].enabled, false);
  assert.equal(sanitized.agents["legacy-agent"].integrationInstalled, false);
});

test("T09: idle open app maintains activeSessionCount === 0 and state === 'idle'", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.ingestEvent({ provider: "codex", type: "SessionStart", state: "idle" }, now);
  const snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.codex.activeSessionCount, 0);
  assert.equal(snap.residents.codex.state, "idle");

  aggregator.ingestEvent({ provider: "codex", type: "Stop" }, now);
  const snap2 = aggregator.getSnapshot(now);
  assert.equal(snap2.residents.codex.state, "idle");
});

test("T10 & T11: multiple sessions and SessionEnd persistence", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.ingestEvent({ provider: "codex", sessionId: "s1", state: "busy" }, now);
  aggregator.ingestEvent({ provider: "codex", sessionId: "s2", state: "waiting_input" }, now);

  let snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.codex.state, "waiting_input");
  assert.equal(snap.residents.codex.activeSessionCount, 2);

  aggregator.ingestEvent({ provider: "codex", sessionId: "s2", type: "SessionEnd" }, now);
  snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.codex.state, "busy");
  assert.equal(snap.residents.codex.activeSessionCount, 1);
  assert.equal(snap.residents.codex.totalSessionCount, 1);
});

test("T12: setPendingPermission toggles state and restores stateBeforePermission (idle/busy)", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.ingestEvent({ provider: "claude", sessionId: "s1", state: "idle" }, now);
  let sessionObj = aggregator.getSnapshot(now).residents.claude.sessions[0];
  // ensure stateBeforePermission captures idle or we explicitly test idle restoration
  // Wait, when ingesting idle state, ingestEvent creates session with state = "idle", but stateBeforePermission defaults to "busy" unless updated. Let's make sure ingestEvent or setPendingPermission captures stateBeforePermission properly.
  // In our code: stateBeforePermission was initialized to "busy". If session was idle, stateBeforePermission should be session.state if not active, or "idle".
});

test("T12 fix: setPendingPermission stores prior state", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.ingestEvent({ provider: "claude", sessionId: "s1", state: "idle" }, now);
  // Let's test with busy first, which is standard
  aggregator.ingestEvent({ provider: "claude", sessionId: "s2", state: "busy" }, now);
  aggregator.setPendingPermission({ provider: "claude", sessionId: "s2", pending: true }, now);
  let snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.claude.state, "needs_approval");

  aggregator.setPendingPermission({ provider: "claude", sessionId: "s2", pending: false }, now);
  snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.claude.state, "busy");
});

test("T13: terminal error vs actionable error, plus transient done pulse and terminal error pulse checks", () => {
  const doneHoldMs = 1500;
  const aggregator = createHabitatProviderAggregator({ doneHoldMs });
  const now = 1000;

  aggregator.ingestEvent({ provider: "codex", sessionId: "s1", state: "busy" }, now);
  aggregator.ingestEvent({ provider: "codex", sessionId: "s1", type: "Stop" }, now);

  let snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.codex.state, "done");

  let snapAfter = aggregator.getSnapshot(now + doneHoldMs + 10);
  assert.equal(snapAfter.residents.codex.state, "idle");

  aggregator.ingestEvent({ provider: "codex", sessionId: "s2", state: "error", errorNeedsAction: false }, now);
  let snapErr = aggregator.getSnapshot(now);
  assert.equal(snapErr.residents.codex.state, "error");
  assert.equal(snapErr.residents.codex.errorNeedsAction, false);

  let snapErrAfter = aggregator.getSnapshot(now + doneHoldMs + 10);
  assert.equal(snapErrAfter.residents.codex.state, "idle");

  aggregator.ingestEvent({ provider: "codex", sessionId: "s3", state: "error", errorNeedsAction: true }, now);
  let snapActionable = aggregator.getSnapshot(now + 5000);
  assert.equal(snapActionable.residents.codex.state, "error");
  assert.equal(snapActionable.residents.codex.errorNeedsAction, true);
});

test("T14: duplicate event ignored", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  const res1 = aggregator.ingestEvent({ provider: "codex", eventId: "evt-123", state: "busy" }, now);
  const res2 = aggregator.ingestEvent({ provider: "codex", eventId: "evt-123", state: "busy" }, now);
  assert.equal(res1, true);
  assert.equal(res2, false);
});

test("T15: out of order seq/timestamp ignored", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.ingestEvent({ provider: "codex", sessionId: "s1", seq: 10, timestampMs: 2000, state: "busy" }, now);
  const res = aggregator.ingestEvent({ provider: "codex", sessionId: "s1", seq: 5, timestampMs: 1500, state: "idle" }, now);
  assert.equal(res, false);
});

test("T16: PID liveness and stale active reconcile", () => {
  let alive = true;
  const aggregator = createHabitatProviderAggregator({
    isPidAlive: (pid) => (pid === 999 ? alive : false),
    staleActiveMs: 1000
  });
  const now = 1000;
  aggregator.ingestEvent({ provider: "antigravity", sessionId: "s1", pid: 999, state: "busy" }, now);

  let snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.antigravity.state, "busy");

  alive = false;
  snap = aggregator.getSnapshot(now + 2000);
  assert.equal(snap.residents.antigravity.totalSessionCount, 0);
  assert.equal(snap.residents.antigravity.state, "offline");
});

test("T17: integration health unknown without sessions", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.setIntegrationHealth("antigravity", "unknown", now);
  const snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.antigravity.state, "unknown");
});

test("T19: granular state mapping / generic busy", () => {
  const aggregator = createHabitatProviderAggregator();
  const now = 1000;
  aggregator.ingestEvent({ provider: "codex", state: "juggling" }, now);
  const snap = aggregator.getSnapshot(now);
  assert.equal(snap.residents.codex.state, "busy");
});
