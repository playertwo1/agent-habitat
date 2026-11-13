"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { createCompletionBubbleNotifier, buildCompletionCard } = require("../src/completion-bubble");

const done = (over = {}) => ({
  id: "s1", agentId: "codex", badge: "done", cwd: "C:\\work\\proj",
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
    assert.equal(shown[0].agentId, "codex");
    assert.equal(shown[0].text, "Refatorei o parser.");
  });

  it("tags Orca sessions and keeps the agent id for claude and antigravity", () => {
    const { shown, snap } = setup();
    snap();
    snap(done({ id: "a", agentId: "claude-code", orcaPaneKey: "pane1", lastEvent: { rawEvent: "Stop", at: 1 } }));
    snap(done({ id: "b", agentId: "antigravity-cli", lastEvent: { rawEvent: "Stop", at: 1 } }));
    assert.deepEqual(shown.map((c) => [c.agentId, c.inOrca]), [["claude-code", true], ["antigravity-cli", false]]);
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
    assert.equal(buildCompletionCard(done({ assistantLastOutput: "Posso seguir?" })), null);
    assert.ok(buildCompletionCard(done({ agentId: "claude-code", assistantLastOutput: "Posso seguir?" })));
  });

  it("redacts secrets, clips long text and falls back to the folder name", () => {
    const card = buildCompletionCard(done({ assistantLastOutput: "token ghp_" + "a".repeat(30) + " " + "x ".repeat(400) }));
    assert.ok(!card.text.includes("ghp_"));
    assert.ok(card.text.length <= 600);
    assert.equal(buildCompletionCard(done({ assistantLastOutput: "" })).text, "proj");
  });
});
