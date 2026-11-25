"use strict";

const path = require("path");
const fs = require("fs");
const { createHabitatProviderAggregator } = require("./provider-aggregator");
const { createHabitatSceneMachine } = require("./scene-machine");
const { mapAgentIdToProvider } = require("./mvp-scope");
const {
  detectWindowsMvpSurfaces,
  parseCodexRolloutLine,
  normalizeHookPayloadToAggregatorEvent
} = require("./habitat-adapters");

function createHabitatRuntime(options = {}) {
  const repoRoot = options.repoRoot || path.join(__dirname, "../..");
  const manifestPath = options.manifestPath || path.join(repoRoot, "assets/habitat/cozy-cottage/habitat-manifest.json");

  let manifest = {
    doorAnchor: { x: 160, y: 120 },
    stations: {
      claude: { character: "clawd", anchor: { x: 70, y: 130 } },
      codex: { character: "cloudling", anchor: { x: 160, y: 145 } },
      antigravity: { character: "atom", anchor: { x: 250, y: 130 } }
    }
  };

  try {
    if (fs.existsSync(manifestPath)) {
      const raw = fs.readFileSync(manifestPath, "utf-8");
      const parsed = JSON.parse(raw);
      if (parsed && parsed.doorAnchor && parsed.stations) {
        manifest = parsed;
      }
    }
  } catch {}

  const aggregator = createHabitatProviderAggregator({ isPidAlive: options.isPidAlive });
  const sceneMachine = createHabitatSceneMachine({
    manifest,
    mode: "observed",
    reducedMotion: !!options.reducedMotion
  });

  function handleHttpEvent(rawPayload, nowMs = Date.now()) {
    if (!rawPayload || typeof rawPayload !== "object") {
      return { accepted: false, snapshot: getSnapshot(nowMs) };
    }

    const normalized = normalizeHookPayloadToAggregatorEvent(rawPayload, nowMs);
    const agentOrProvider = normalized.provider || normalized.agentId || rawPayload.provider || rawPayload.agentId;
    const provider = mapAgentIdToProvider(agentOrProvider);
    if (!provider) {
      return { accepted: false, snapshot: getSnapshot(nowMs) };
    }

    normalized.provider = provider;

    const eventNameLower = String(normalized.event || "").toLowerCase();
    const stateLower = String(normalized.state || "").toLowerCase();

    if (stateLower === "needs_approval" || eventNameLower.includes("permissionrequest")) {
      const accepted = aggregator.ingestEvent(normalized, nowMs);
      if (typeof aggregator.setPendingPermission === "function") {
        aggregator.setPendingPermission({ provider, sessionId: normalized.sessionId, pending: true }, nowMs);
      }
      sceneMachine.setAllProviders(aggregator.toSceneProviderStates(nowMs), nowMs);
      sceneMachine.tick(nowMs);
      return { accepted, snapshot: getSnapshot(nowMs) };
    }

    if (
      eventNameLower.includes("elicitationresult") ||
      eventNameLower.includes("posttooluse") ||
      eventNameLower === "task_started" ||
      eventNameLower === "userpromptsubmit" ||
      eventNameLower === "stop"
    ) {
      if (typeof aggregator.setPendingPermission === "function") {
        aggregator.setPendingPermission({ provider, sessionId: normalized.sessionId, pending: false }, nowMs);
      }
    }

    const accepted = aggregator.ingestEvent(normalized, nowMs);

    sceneMachine.setAllProviders(aggregator.toSceneProviderStates(nowMs), nowMs);
    sceneMachine.tick(nowMs);

    const snapshot = getSnapshot(nowMs);
    return { accepted, snapshot };
  }

  function ingestRolloutLine(line, nowMs = Date.now()) {
    const ev = parseCodexRolloutLine(line);
    if (!ev) return { accepted: false, snapshot: getSnapshot(nowMs) };
    return handleHttpEvent(ev, nowMs);
  }

  function inspectSurfaces(inspectOpts = {}) {
    return detectWindowsMvpSurfaces(inspectOpts);
  }

  function getSnapshot(nowMs = Date.now()) {
    sceneMachine.setAllProviders(aggregator.toSceneProviderStates(nowMs), nowMs);
    sceneMachine.tick(nowMs);
    return {
      schema: 1,
      mode: "observed",
      aggregator: aggregator.getSnapshot(nowMs),
      scene: sceneMachine.getSnapshot(nowMs)
    };
  }

  function dispose() {
    // Idempotent teardown
  }

  return {
    handleHttpEvent,
    ingestRolloutLine,
    inspectSurfaces,
    getSnapshot,
    dispose
  };
}

module.exports = {
  createHabitatRuntime,
  parseCodexRolloutLine
};
