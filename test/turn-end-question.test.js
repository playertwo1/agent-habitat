"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  extractTurnEndQuestion,
  decideTurnEndQuestionAction,
  TURN_END_QUESTION_AGENTS,
} = require("../src/claude-turn-ask");
const { __test: agy } = require("../hooks/antigravity-hook");

describe("extractTurnEndQuestion", () => {
  it("finds a question on the last line", () => {
    assert.equal(extractTurnEndQuestion("Done.\n\nQuer que eu commite?"), "Quer que eu commite?");
  });
  it("ignores markdown emphasis and closing quotes", () => {
    assert.equal(extractTurnEndQuestion("**Posso seguir?**"), "Posso seguir?");
    assert.equal(extractTurnEndQuestion('Quer "isso"?"'), 'Quer "isso"?');
  });
  it("ignores a question that is not last", () => {
    assert.equal(extractTurnEndQuestion("Posso seguir?\nFeito, tudo pronto."), null);
  });
  it("ignores empty, non-string and code-fence endings", () => {
    assert.equal(extractTurnEndQuestion(""), null);
    assert.equal(extractTurnEndQuestion(null), null);
    assert.equal(extractTurnEndQuestion("x\n```"), null);
  });
});

describe("decideTurnEndQuestionAction", () => {
  it("shows on Stop with a question, clears on Stop without one", () => {
    assert.equal(decideTurnEndQuestionAction({ event: "Stop", assistantLastOutput: "ok?" }), "show");
    assert.equal(decideTurnEndQuestionAction({ event: "Stop", assistantLastOutput: "ok." }), "clear");
  });
  it("clears when the turn moves on and ignores other events", () => {
    for (const event of ["UserPromptSubmit", "PreToolUse", "SessionEnd"]) {
      assert.equal(decideTurnEndQuestionAction({ event }), "clear");
    }
    assert.equal(decideTurnEndQuestionAction({ event: "PostToolUse" }), "ignore");
  });
  it("covers codex and antigravity", () => {
    assert.ok(TURN_END_QUESTION_AGENTS.has("codex") && TURN_END_QUESTION_AGENTS.has("antigravity-cli"));
  });
});

describe("antigravity hook Stop body", () => {
  it("sends the last planner response from the transcript", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "agy-"));
    const file = path.join(dir, "transcript.jsonl");
    fs.writeFileSync(file, [
      JSON.stringify({ type: "PLANNER_RESPONSE", content: "primeiro" }),
      JSON.stringify({ type: "GENERIC", content: "saida" }),
      JSON.stringify({ type: "PLANNER_RESPONSE", content: "Quer continuar?" }),
    ].join("\n"));
    const body = agy.buildStateBody("Stop", { conversationId: "c1", transcriptPath: file }, {});
    assert.equal(body.assistant_last_output, "Quer continuar?");
    assert.equal(agy.buildStateBody("PreToolUse", { conversationId: "c1", transcriptPath: file }, {}).assistant_last_output, undefined);
    fs.rmSync(dir, { recursive: true, force: true });
  });
  it("tolerates a missing transcript", () => {
    const body = agy.buildStateBody("Stop", { conversationId: "c1", transcriptPath: "/nope/x.jsonl" }, {});
    assert.equal(body.assistant_last_output, undefined);
  });
});

describe("/state route raises the card for Codex and Antigravity", () => {
  const { EventEmitter } = require("node:events");
  const { handleStatePost } = require("../src/server-route-state");

  function harness() {
    const calls = { shown: [], cleared: [], tracked: [] };
    const ctx = {
      STATE_SVGS: { idle: "x.svg", thinking: "x.svg", working: "x.svg", attention: "x.svg", error: "x.svg", notification: "x.svg", sleeping: "x.svg" },
      pendingPermissions: [], sessions: new Map(),
      isAgentEnabled: () => true, setState() {}, updateSession: () => true, updateAccountQuota() {},
      resolvePermissionEntry() {}, permLog() {}, handleTestResult() {},
      showClaudeTurnAskBubble: (p) => { calls.shown.push(p); return true; },
      clearClaudeTurnAskBubbles: (...a) => calls.cleared.push(a),
      trackClaudeTurnAskReminder: (p) => calls.tracked.push(p),
      resolveClaudeTurnAskReminder() {},
    };
    const recorder = { acceptedUnlessDnd() {}, droppedByDisabled() {}, droppedByDnd() {}, droppedInvalidAgent() {}, droppedUnsupported() {} };
    const post = (body) => new Promise((resolve) => {
      const req = new EventEmitter(); req.headers = {};
      setImmediate(() => { req.emit("data", Buffer.from(JSON.stringify(body))); req.emit("end"); });
      const res = { writeHead(c) { this.statusCode = c; }, end() { resolve(this); } };
      handleStatePost(req, res, { ctx, createRequestHookRecorder: () => recorder, shouldDropForDnd: () => false, codexOfficialTurns: new Map() });
    });
    return { calls, post };
  }

  it("antigravity: Stop ending in a question shows the card with its agent; next prompt clears it", async () => {
    const { calls, post } = harness();
    await post({ state: "attention", event: "Stop", session_id: "antigravity:c1", agent_id: "antigravity-cli",
      assistant_last_output: "Pronto.\nQuer que eu rode os testes?" });
    assert.equal(calls.shown.length, 1);
    assert.equal(calls.shown[0].agentId, "antigravity-cli");
    assert.equal(calls.shown[0].ask, "Quer que eu rode os testes?");
    assert.equal(calls.tracked.length, 1);
    const before = calls.cleared.length;
    await post({ state: "thinking", event: "UserPromptSubmit", session_id: "antigravity:c1", agent_id: "antigravity-cli" });
    assert.equal(calls.cleared.length, before + 1);
  });

  it("codex: a plain final answer shows nothing", async () => {
    const { calls, post } = harness();
    await post({ state: "attention", event: "Stop", session_id: "codex:t1", agent_id: "codex", hook_source: "codex-official",
      assistant_last_output: "Tudo pronto." });
    assert.equal(calls.shown.length, 0);
  });

  it("codex: Stop ending in a question shows the card", async () => {
    const { calls, post } = harness();
    await post({ state: "attention", event: "Stop", session_id: "codex:t2", agent_id: "codex", hook_source: "codex-official",
      assistant_last_output: "Quer que eu continue?" });
    assert.equal(calls.shown.length, 1);
    assert.equal(calls.shown[0].agentId, "codex");
  });
});
