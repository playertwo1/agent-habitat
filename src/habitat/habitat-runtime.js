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
  const onPermissionRequest = typeof options.onPermissionRequest === "function" ? options.onPermissionRequest : null;
  const onStateTransition = typeof options.onStateTransition === "function" ? options.onStateTransition : null;

  let lastStatesMap = new Map();

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
      notifyStateTransitions(nowMs);
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
    notifyStateTransitions(nowMs);

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

  function getSessionForFocus(provider) {
    const provLower = mapAgentIdToProvider(provider);
    if (!provLower || typeof aggregator.getSnapshot !== "function") return null;
    const snap = aggregator.getSnapshot(Date.now());
    const sessions =
      (snap && snap.sessions && snap.sessions[provLower]) ||
      (snap && snap.residents && snap.residents[provLower] && snap.residents[provLower].sessions) ||
      null;
    if (!sessions) return null;
    let list = Array.isArray(sessions) ? sessions : Object.values(sessions);
    if (list.length === 0) return null;
    list.sort((a, b) => (b.lastEventAt || 0) - (a.lastEventAt || 0));
    return list[0] || null;
  }

  function getResidentsSummary() {
    const snap = getSnapshot(Date.now());
    const residents = snap && snap.scene && snap.scene.residents ? snap.scene.residents : {};
    const summary = {};
    for (const p of ["claude", "codex", "antigravity"]) {
      const res = residents[p] || {};
      summary[p] = {
        state: res.logicalState || res.state || "off",
        presence: res.presence || "inside"
      };
    }
    return summary;
  }

  async function handlePermissionRequest(payload) {
    if (!payload || typeof payload !== "object") {
      return { decision: "ask" };
    }
    const agentOrProvider = payload.provider || payload.agentId;
    const provider = mapAgentIdToProvider(agentOrProvider);
    if (!provider) {
      return { decision: "ask" };
    }
    payload.provider = provider;
    
    if (!payload.cwdName && payload.cwd) {
      try {
        payload.cwdName = path.basename(payload.cwd);
      } catch {
        payload.cwdName = "agent-habitat";
      }
    }
    if (!payload.cwdName) {
      payload.cwdName = "agent-habitat";
    }
    if (!payload.toolName) {
      payload.toolName = payload.action || payload.tool || "permission";
    }

    handleHttpEvent(payload);

    if (!onPermissionRequest) {
      return { decision: "ask" };
    }

    try {
      const res = await onPermissionRequest(payload);
      if (res === "allow" || res === "deny") {
        return { decision: res };
      }
      return { decision: "ask" };
    } catch {
      return { decision: "ask" };
    }
  }

  function notifyStateTransitions(nowMs) {
    if (!onStateTransition) return;
    const snap = getSnapshot(nowMs);
    const residents = snap && snap.scene && snap.scene.residents ? snap.scene.residents : {};
    for (const [provider, res] of Object.entries(residents)) {
      const currentState = res.logicalState || res.state || "off";
      const prevState = lastStatesMap.get(provider);
      if (prevState !== currentState) {
        lastStatesMap.set(provider, currentState);
        try {
          onStateTransition({ provider, state: currentState, resident: res });
        } catch {}
      }
    }
  }

  function dispose() {
    // Idempotent teardown
  }

  return {
    handleHttpEvent,
    ingestRolloutLine,
    inspectSurfaces,
    getSnapshot,
    getSessionForFocus,
    getResidentsSummary,
    handlePermissionRequest,
    dispose
  };
}

module.exports = {
  createHabitatRuntime,
  parseCodexRolloutLine
};
