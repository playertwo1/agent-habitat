"use strict";

const { mapAgentIdToProvider, HABITAT_MVP_PROVIDERS } = require("./mvp-scope");

const PROVIDER_CHARACTERS = Object.freeze({
  claude: "clawd",
  codex: "cloudling",
  antigravity: "atom"
});

const STATE_PRECEDENCE = Object.freeze({
  needs_approval: 7,
  waiting_input: 6,
  busy: 5,
  error: 4,
  done: 3,
  idle: 1,
  unknown: 0,
  offline: -1
});

function createHabitatProviderAggregator({
  isPidAlive,
  staleActiveMs = 20 * 60 * 1000,
  doneHoldMs = 1500
} = {}) {
  const sessionsByProvider = new Map();
  for (const p of HABITAT_MVP_PROVIDERS) {
    sessionsByProvider.set(p, new Map());
  }

  const healthByProvider = new Map();
  for (const p of HABITAT_MVP_PROVIDERS) {
    healthByProvider.set(p, "healthy");
  }

  const eventIdCacheByProvider = new Map();
  for (const p of HABITAT_MVP_PROVIDERS) {
    eventIdCacheByProvider.set(p, []);
  }

  function checkEventIdDuplicate(provider, eventId) {
    if (!eventId) return false;
    const cache = eventIdCacheByProvider.get(provider);
    if (cache.includes(eventId)) return true;
    cache.push(eventId);
    if (cache.length > 256) {
      cache.shift();
    }
    return false;
  }

  function ingestEvent(rawEvent, nowMs = Date.now()) {
    if (!rawEvent || typeof rawEvent !== "object") return false;
    const agentCandidate = rawEvent.provider || rawEvent.agentId;
    const provider = mapAgentIdToProvider(agentCandidate);
    if (!provider) return false;

    const eventId = rawEvent.eventId;
    if (eventId && checkEventIdDuplicate(provider, eventId)) {
      return false;
    }

    const sessionId = String(rawEvent.sessionId || "").trim() || `${provider}:default`;
    const providerSessions = sessionsByProvider.get(provider);
    const existingSession = providerSessions.get(sessionId);

    const timestampMs = Number.isFinite(rawEvent.timestampMs) ? rawEvent.timestampMs : null;
    const seq = Number.isFinite(rawEvent.seq) ? rawEvent.seq : null;

    const eventName = String(rawEvent.type || rawEvent.event || rawEvent.name || "");
    const rawState = rawEvent.state || null;

    if (existingSession) {
      if (
        timestampMs !== null &&
        existingSession.lastTimestampMs === timestampMs &&
        existingSession.lastEventName === eventName &&
        existingSession.lastRawState === rawState
      ) {
        return false;
      }
    }

    if (existingSession) {
      if (seq !== null && existingSession.lastSeq !== null && seq < existingSession.lastSeq) {
        return false;
      }
      if (timestampMs !== null && existingSession.lastTimestampMs !== null && timestampMs < existingSession.lastTimestampMs) {
        return false;
      }
    }

    const typeLower = eventName.toLowerCase();
    const stateLower = typeof rawState === "string" ? rawState.toLowerCase() : "";

    const isSessionEnd =
      typeLower.includes("sessionend") ||
      stateLower === "sleeping" ||
      stateLower === "offline";

    if (isSessionEnd) {
      providerSessions.delete(sessionId);
      return true;
    }

    let session = existingSession;
    if (!session) {
      session = {
        sessionId,
        state: "idle",
        errorNeedsAction: false,
        pendingPermission: false,
        terminalUntil: 0,
        lastEventAt: nowMs,
        lastSeq: seq,
        lastTimestampMs: timestampMs,
        lastEventName: eventName,
        lastRawState: rawState,
        pid: Number.isFinite(rawEvent.pid) ? rawEvent.pid : null,
        stateBeforePermission: "busy"
      };
      providerSessions.set(sessionId, session);
    }

    let nextState = session.state;
    let nextErrorNeedsAction = session.errorNeedsAction;
    let nextTerminalUntil = session.terminalUntil;
    let nextPendingPermission = session.pendingPermission;

    if (typeLower === "teammateidle") {
      if (!isActiveState(session.state)) {
        nextState = "idle";
      }
    } else if (
      (typeLower.includes("elicitation") && !typeLower.includes("result")) ||
      stateLower === "waiting_input" ||
      rawEvent.turnAskPending === true
    ) {
      nextState = "waiting_input";
    } else if (typeLower.includes("elicitationresult")) {
      if (session.state === "waiting_input" || session.state === "idle" || session.state === "done") {
        nextState = "busy";
      }
    } else if (
      typeLower.includes("permissionrequest") ||
      stateLower === "needs_approval" ||
      rawEvent.pendingPermission === true ||
      session.pendingPermission
    ) {
      if (!session.pendingPermission) {
        session.stateBeforePermission = isActiveState(session.state) ? session.state : "busy";
      }
      nextState = "needs_approval";
      nextPendingPermission = true;
    } else if (
      stateLower === "busy" ||
      stateLower === "thinking" ||
      stateLower === "working" ||
      stateLower === "executing" ||
      stateLower === "juggling" ||
      stateLower === "sweeping" ||
      stateLower === "carrying" ||
      typeLower === "userpromptsubmit" ||
      typeLower === "pretooluse" ||
      typeLower === "posttooluse" ||
      typeLower === "preinvocation" ||
      typeLower === "subagentstart" ||
      typeLower === "subagentstop"
    ) {
      nextState = "busy";
    } else if (
      stateLower === "error" ||
      typeLower.includes("posttoolusefailure") ||
      typeLower.includes("stopfailure") ||
      typeLower.includes("error")
    ) {
      nextState = "error";
      if (rawEvent.errorNeedsAction === true) {
        nextErrorNeedsAction = true;
        nextTerminalUntil = 0;
      } else {
        nextErrorNeedsAction = false;
        nextTerminalUntil = nowMs + doneHoldMs;
      }
    } else if (
      typeLower.includes("stop") ||
      typeLower.includes("attention") ||
      typeLower.includes("done") ||
      typeLower.includes("codex-turn-end") ||
      (typeLower.includes("postinvocation") && stateLower !== "idle" && stateLower !== "busy")
    ) {
      if (isActiveState(session.state) || session.state === "error") {
        nextState = "done";
        nextTerminalUntil = nowMs + doneHoldMs;
        nextErrorNeedsAction = false;
      } else {
        nextState = "idle";
      }
    } else if (typeLower.includes("postinvocation") && stateLower === "idle") {
      nextState = "idle";
    } else if (typeLower.includes("sessionstart") || stateLower === "idle") {
      nextState = "idle";
    } else if (rawEvent.state) {
      if (["busy", "waiting_input", "needs_approval", "idle", "done", "error"].includes(stateLower)) {
        nextState = stateLower;
        if (stateLower === "error") {
          nextErrorNeedsAction = !!rawEvent.errorNeedsAction;
          if (!nextErrorNeedsAction) nextTerminalUntil = nowMs + doneHoldMs;
        }
      }
    }

    session.state = nextState;
    session.errorNeedsAction = nextErrorNeedsAction;
    session.terminalUntil = nextTerminalUntil;
    session.pendingPermission = nextPendingPermission;
    session.lastEventAt = nowMs;
    if (seq !== null) session.lastSeq = seq;
    if (timestampMs !== null) session.lastTimestampMs = timestampMs;
    session.lastEventName = eventName;
    session.lastRawState = rawState;
    if (Number.isFinite(rawEvent.pid)) {
      session.pid = rawEvent.pid;
    }

    return true;
  }

  function isActiveState(st) {
    return ["busy", "waiting_input", "needs_approval"].includes(st);
  }

  function setPendingPermission({ agentId, provider: provParam, sessionId, pending }, nowMs = Date.now()) {
    const provider = mapAgentIdToProvider(provParam || agentId);
    if (!provider) return false;
    const providerSessions = sessionsByProvider.get(provider);
    const sid = String(sessionId || "").trim() || `${provider}:default`;
    let session = providerSessions.get(sid);

    if (!session && pending) {
      session = {
        sessionId: sid,
        state: "needs_approval",
        errorNeedsAction: false,
        pendingPermission: true,
        terminalUntil: 0,
        lastEventAt: nowMs,
        lastSeq: null,
        lastTimestampMs: null,
        lastEventName: "setPendingPermission",
        lastRawState: null,
        pid: null,
        stateBeforePermission: "busy"
      };
      providerSessions.set(sid, session);
      return true;
    }

    if (!session) return false;

    if (pending && !session.pendingPermission) {
      session.stateBeforePermission = isActiveState(session.state) ? session.state : "busy";
    }

    session.pendingPermission = !!pending;
    if (pending) {
      session.state = "needs_approval";
    } else {
      if (session.state === "needs_approval") {
        session.state = session.stateBeforePermission || "busy";
      }
    }
    session.lastEventAt = nowMs;
    return true;
  }

  function setIntegrationHealth(provider, health, nowMs = Date.now()) {
    if (!HABITAT_MVP_PROVIDERS.includes(provider)) return false;
    if (!["healthy", "degraded", "unknown"].includes(health)) return false;
    healthByProvider.set(provider, health);
    return true;
  }

  function reconcile(nowMs = Date.now()) {
    for (const provider of HABITAT_MVP_PROVIDERS) {
      const providerSessions = sessionsByProvider.get(provider);
      for (const [sid, session] of providerSessions.entries()) {
        if (session.pid != null && typeof isPidAlive === "function") {
          try {
            if (isPidAlive(session.pid) === false) {
              providerSessions.delete(sid);
              continue;
            }
          } catch {}
        }

        if ((session.state === "done" || session.state === "error") && !session.errorNeedsAction) {
          if (session.terminalUntil > 0 && nowMs >= session.terminalUntil) {
            session.state = "idle";
            session.terminalUntil = 0;
          }
        }

        if (isActiveState(session.state) || (session.state === "error" && session.errorNeedsAction)) {
          if (nowMs - session.lastEventAt > staleActiveMs) {
            let pidAlive = false;
            if (session.pid != null && typeof isPidAlive === "function") {
              try {
                pidAlive = isPidAlive(session.pid);
              } catch {}
            }
            if (!pidAlive) {
              session.state = "idle";
              session.errorNeedsAction = false;
              session.pendingPermission = false;
            }
          }
        }
      }
    }
  }

  function getSnapshot(nowMs = Date.now()) {
    reconcile(nowMs);

    const residents = {};

    for (const provider of HABITAT_MVP_PROVIDERS) {
      const providerSessions = sessionsByProvider.get(provider);
      const character = PROVIDER_CHARACTERS[provider];
      const health = healthByProvider.get(provider) || "healthy";

      let activeSessionCount = 0;
      let idleSessionCount = 0;
      const sessionsArr = [];

      for (const session of providerSessions.values()) {
        sessionsArr.push({ ...session });
        if (
          isActiveState(session.state) ||
          (session.state === "error" && session.errorNeedsAction)
        ) {
          activeSessionCount++;
        } else if (session.state === "idle") {
          idleSessionCount++;
        }
      }

      const totalSessionCount = providerSessions.size;

      let providerState = "offline";
      let errorNeedsAction = false;

      if (totalSessionCount === 0) {
        if (health === "unknown") {
          providerState = "unknown";
        } else {
          providerState = "offline";
        }
      } else {
        let bestPrec = -2;
        let bestState = "idle";
        let hasErrorNeedsAction = false;

        for (const s of providerSessions.values()) {
          let st = s.state;
          if (st === "error" && s.errorNeedsAction) {
            hasErrorNeedsAction = true;
          }
          let prec = STATE_PRECEDENCE[st] || 0;
          if (prec > bestPrec) {
            bestPrec = prec;
            bestState = st;
          }
        }

        providerState = bestState;
        errorNeedsAction = hasErrorNeedsAction;

        if (activeSessionCount === 0 && idleSessionCount > 0 && bestState === "idle") {
          providerState = "idle";
        }
      }

      residents[provider] = {
        provider,
        character,
        state: providerState,
        errorNeedsAction,
        activeSessionCount,
        idleSessionCount,
        totalSessionCount,
        integrationHealth: health,
        lastEventAt: sessionsArr.length > 0 ? Math.max(...sessionsArr.map(s => s.lastEventAt)) : 0,
        sessions: sessionsArr
      };
    }

    return {
      schema: 1,
      nowMs,
      residents
    };
  }

  function toSceneProviderStates(nowMs = Date.now()) {
    const snap = getSnapshot(nowMs);
    const result = {};
    for (const p of HABITAT_MVP_PROVIDERS) {
      const res = snap.residents[p];
      result[p] = {
        state: res.state,
        errorNeedsAction: res.errorNeedsAction
      };
    }
    return result;
  }

  return {
    ingestEvent,
    setPendingPermission,
    setIntegrationHealth,
    reconcile,
    getSnapshot,
    toSceneProviderStates
  };
}

module.exports = {
  createHabitatProviderAggregator
};
