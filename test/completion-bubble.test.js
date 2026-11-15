"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createCompletionBubbleNotifier, buildCompletionCard } = require("../src/completion-bubble");

const done = (over = {}) => ({
  id: "s1", agentId: "claude-code", badge: "done", cwd: "C:\\work\\proj",
  lastEvent: { rawEvent: "Stop", at: 100 }, assistantLastOutput: "Refatorei o parser.", ...over,
});

function setup(isEnabled = () => true) {
  const shown = [];
  const n = createCompletionBubbleNotifier({ isEnabled, show: (c) => shown.push(c) });
  return { shown, snap: (...sessions) => n.onSnapshot({ sessions }) };
}

describe("completion bubble notifier", () => {
  it("primes on the first snapshot, then shows each new completion once", () => {
    const { shown, snap } = setup();
    snap(done());
    assert.equal(shown.length, 0, "no backlog on start");
    snap(done({ lastEvent: { rawEvent: "Stop", at: 200 } }));
    snap(done({ lastEvent: { rawEvent: "Stop", at: 200 } }));
    assert.equal(shown.length, 1);
    assert.equal(shown[0].agentId, "claude-code");
    assert.equal(shown[0].text, "Refatorei o parser.");
  });

  it("tags Orca sessions; leaves codex and antigravity to the Stop route", () => {
    const { shown, snap } = setup();
    snap();
    snap(done({ id: "a", agentId: "claude-code", orcaPaneKey: "pane1", lastEvent: { rawEvent: "Stop", at: 1 } }));
    snap(done({ id: "b", agentId: "antigravity-cli", lastEvent: { rawEvent: "Stop", at: 1 } }));
    snap(done({ id: "c", agentId: "codex", lastEvent: { rawEvent: "Stop", at: 1 } }));
    assert.deepEqual(shown.map((c) => [c.agentId, c.inOrca]), [["claude-code", true]]);
  });

  it("marks interrupted, skips headless, working sessions and the disabled switch", () => {
    let on = true;
    const { shown, snap } = setup(() => on);
    snap();
    snap(done({ badge: "interrupted", lastEvent: { rawEvent: "StopFailure", at: 5 } }));
    snap(done({ id: "h", headless: true, lastEvent: { rawEvent: "Stop", at: 6 } }));
    snap(done({ id: "w", badge: "working", lastEvent: { rawEvent: "Stop", at: 7 } }));
    on = false;
    snap(done({ id: "off", lastEvent: { rawEvent: "Stop", at: 8 } }));
    assert.equal(shown.length, 1);
    assert.equal(shown[0].interrupted, true);
  });

  it("leaves a closing question to the question card, but not for claude", () => {
    assert.equal(buildCompletionCard(done({ agentId: "codex", assistantLastOutput: "Posso seguir?" })), null);
    assert.ok(buildCompletionCard(done({ agentId: "claude-code", assistantLastOutput: "Posso seguir?" })));
  });

  it("redacts secrets, clips long text and falls back to the folder name", () => {
    const card = buildCompletionCard(done({ assistantLastOutput: "token ghp_" + "a".repeat(30) + " " + "x ".repeat(400) }));
    assert.ok(!card.text.includes("ghp_"));
    assert.ok(card.text.length <= 600);
    assert.equal(buildCompletionCard(done({ assistantLastOutput: "" })).text, "proj");
  });
});

describe("focus start pid", () => {
  const { resolveLiveFocusStartPid } = require("../src/focus").__test;
  const alive = (set) => (pid) => set.has(pid);
  it("keeps a live sourcePid", () => {
    assert.equal(resolveLiveFocusStartPid(10, [10, 20, 30], alive(new Set([10, 20]))), 10);
  });
  it("skips a dead hook process to the first live pid in the chain (Claude Desktop)", () => {
    assert.equal(resolveLiveFocusStartPid(25692, [25692, 7968, 32760], alive(new Set([7968, 32760]))), 7968);
  });
  it("falls back to sourcePid when nothing in the chain lives", () => {
    assert.equal(resolveLiveFocusStartPid(5, [5, 6], alive(new Set())), 5);
    assert.equal(resolveLiveFocusStartPid(5, undefined, alive(new Set())), 5);
  });
  it("starts Claude Desktop focus at the agent, not a launcher terminal above the app", () => {
    const { getTerminalFocusSourcePid } = require("../src/session-focus");
    // second instance opened by a script: sourcePid is that script's conhost
    assert.equal(getTerminalFocusSourcePid({ claudeEntrypoint: "claude-desktop", sourcePid: 28660, agentPid: 12836 }), 12836);
    assert.equal(getTerminalFocusSourcePid({ claudeEntrypoint: "cli", sourcePid: 28660, agentPid: 12836 }), 28660);
    assert.equal(getTerminalFocusSourcePid({ claudeEntrypoint: "claude-desktop", sourcePid: 7 }), 7);
  });
});
