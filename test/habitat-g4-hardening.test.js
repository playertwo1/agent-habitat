"use strict";

const test = require("node:test");
const assert = require("node:assert");
const { createAdaptiveStageLoop } = require("../src/habitat/habitat-app-main");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const { createHitWindowActivationRuntime } = require("../src/win-hit-window-activation");

test("createAdaptiveStageLoop stops tick when idle 000 and wakes on activity", () => {
  let isIdle = true;
  let ticks = 0;
  let activeTimers = new Set();
  let nextTimerId = 1;

  const setIntervalFn = (fn, ms) => {
    const id = nextTimerId++;
    activeTimers.add({ id, fn, ms });
    return id;
  };

  const clearIntervalFn = (id) => {
    for (const t of activeTimers) {
      if (t.id === id) {
        activeTimers.delete(t);
      }
    }
  };

  let hasSessions = false;
  let reconcileCalls = 0;

  const loop = createAdaptiveStageLoop({
    isIdle000: () => isIdle,
    onTick: () => {
      ticks++;
    },
    setIntervalFn,
    clearIntervalFn,
    intervalMs: 33,
    reconcileMs: 100,
    hasTrackedSessions: () => hasSessions,
    onReconcile: () => {
      reconcileCalls++;
    }
  });

  loop.start();
  const state1 = loop.getState();
  assert.strictEqual(state1.tickRunning, false, "Should stop immediately if starting in 000 idle");

  isIdle = false;
  loop.wake();
  const state2 = loop.getState();
  assert.strictEqual(state2.tickRunning, true, "Should start tick when woken and not idle");

  for (const t of [...activeTimers]) {
    if (t.ms === 33) {
      t.fn();
    }
  }

  isIdle = true;
  for (const t of [...activeTimers]) {
    if (t.ms === 33) {
      t.fn();
    }
  }

  const state3 = loop.getState();
  assert.strictEqual(state3.tickRunning, false, "Should stop tick when idle 000 reached after tick");

  hasSessions = true;
  loop.wake();
  const state4 = loop.getState();
  assert.strictEqual(state4.reconcileRunning, true, "Reconcile timer should run when sessions are tracked");

  hasSessions = false;
  loop.syncReconcileTimer();
  const state5 = loop.getState();
  assert.strictEqual(state5.reconcileRunning, false, "Reconcile timer should stop when no tracked sessions");

  loop.dispose();
});

test("habitat-runtime methods: onActivity, setReducedMotion, hasTrackedSessions", () => {
  let activityCalls = [];
  const rt = createHabitatRuntime({
    onActivity: (info) => activityCalls.push(info)
  });

  assert.strictEqual(rt.hasTrackedSessions(), false, "Initially no tracked sessions");

  rt.handleHttpEvent({
    provider: "claude",
    event: "task_started",
    sessionId: "s-1"
  });

  assert.strictEqual(rt.hasTrackedSessions(), true, "Should track session after event");
  assert.ok(activityCalls.length > 0, "onActivity should be called on valid event");

  rt.setReducedMotion(true);
  const snap = rt.getSnapshot();
  assert.ok(snap, "getSnapshot works");
});

test("habitat-app-main source hardening assertions", () => {
  const fs = require("fs");
  const path = require("path");
  const sourcePath = path.join(__dirname, "../src/habitat/habitat-app-main.js");
  const sourceCode = fs.readFileSync(sourcePath, "utf8");

  assert.strictEqual(sourceCode.includes("setInterval(() => { pushStageFrame(); }, 100);"), false, "NÃO deve existir setInterval fixo de 100ms em pushStageFrame");
  assert.ok(sourceCode.includes("createAdaptiveStageLoop("), "Deve conter createAdaptiveStageLoop");
  assert.ok(sourceCode.includes("createHitWindowActivationRuntime") || sourceCode.includes("createHitWindowActivationRuntime("), "Deve conter createHitWindowActivationRuntime");
  assert.ok(sourceCode.includes("setHitWinFocusable(false)"), "Deve conter setHitWinFocusable(false)");
  assert.ok(sourceCode.includes("computeSafeStageBounds("), "Deve conter computeSafeStageBounds");
  assert.ok(sourceCode.includes("computeSafePanelBounds("), "Deve conter computeSafePanelBounds");
  assert.ok(sourceCode.includes("display-removed"), "Deve conter listener para display-removed");
  assert.ok(sourceCode.includes("runtime.setReducedMotion("), "Deve conter chamada a runtime.setReducedMotion");
});
