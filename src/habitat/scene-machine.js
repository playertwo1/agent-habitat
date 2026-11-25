const DOOR_OPEN_MS = 350;
const DOOR_CLOSE_MS = 350;
const WALK_EXIT_MS = 700;
const WALK_ENTER_MS = 700;
const CELEBRATE_DONE_MS = 1500;
const TERMINAL_ERROR_MS = 1500;
const PROVIDERS = ["claude", "codex", "antigravity"];

function createHabitatSceneMachine({ manifest, mode = "observed", reducedMotion = false }) {
  const doorAnchor = manifest.doorAnchor;
  const stations = manifest.stations;

  const residents = {};
  for (const p of PROVIDERS) {
    residents[p] = {
      provider: p,
      character: stations[p].character,
      presence: "inside",
      logicalState: "offline",
      visualClip: null,
      x: doorAnchor.x,
      y: doorAnchor.y,
      facing: "right",
      progress01: 1,
      anim: {
        type: "idle",
        startTime: 0,
        duration: 0,
        startX: doorAnchor.x,
        startY: doorAnchor.y,
        targetX: doorAnchor.x,
        targetY: doorAnchor.y,
        terminalTimer: 0
      }
    };
  }

  let currentReducedMotion = !!reducedMotion;
  let doorState = "closed";
  let doorAnim = { type: "closed", startTime: 0, duration: 0 };
  let lastNow = 0;

  if (currentReducedMotion) {
    for (const p of PROVIDERS) {
      residents[p].presence = "inside";
      residents[p].progress01 = 1;
      residents[p].anim.type = "idle";
      residents[p].anim.terminalTimer = 0;
    }
  }

  function setReducedMotion(enabled, nowMs = 0) {
    currentReducedMotion = !!enabled;
    if (currentReducedMotion) {
      doorState = "closed";
      doorAnim = { type: "closed", startTime: nowMs, duration: 0 };
      for (const p of PROVIDERS) {
        residents[p].presence = "inside";
        residents[p].progress01 = 1;
        residents[p].anim.type = "idle";
        residents[p].anim.terminalTimer = 0;
      }
    }
  }

  function setProviderState(provider, payloadOrState, nowMs = 0) {
    const res = residents[provider];
    if (!res) return;

    let lState = "offline";
    let errorNeedsAction = false;

    if (typeof payloadOrState === "string") {
      lState = payloadOrState;
    } else if (payloadOrState && typeof payloadOrState === "object") {
      lState = payloadOrState.state || "offline";
      errorNeedsAction = !!payloadOrState.errorNeedsAction;
    }

    res.logicalState = lState;

    let wantsOutside = false;
    if (lState === "busy" || lState === "waiting_input" || lState === "needs_approval") {
      wantsOutside = true;
    } else if (lState === "error" && errorNeedsAction) {
      wantsOutside = true;
    }

    const station = stations[provider];
    const targetAnchor = station.anchor;

    if (currentReducedMotion) {
      if (wantsOutside) {
        res.presence = "outside";
        res.x = targetAnchor.x;
        res.y = targetAnchor.y;
        res.progress01 = 1;
        res.anim.type = "idle";
        res.anim.terminalTimer = 0;
        res.facing = targetAnchor.x < doorAnchor.x ? "left" : "right";
        if (lState === "busy") res.visualClip = "busy";
        else if (lState === "waiting_input") res.visualClip = "waiting_input";
        else if (lState === "needs_approval") res.visualClip = "needs_approval";
        else if (lState === "error") res.visualClip = "error";
      } else {
        res.presence = "inside";
        res.x = doorAnchor.x;
        res.y = doorAnchor.y;
        res.progress01 = 1;
        res.anim.type = "idle";
        res.anim.terminalTimer = 0;
        res.visualClip = null;
      }
      return;
    }

    // Reset terminal timer if incoming wantsOutside interrupts a terminal state (terminal_done or terminal_error)
    if (wantsOutside && (res.anim.type === "terminal_done" || res.anim.type === "terminal_error")) {
      res.anim.type = "idle";
      res.anim.terminalTimer = 0;
    }

    if (wantsOutside) {
      res.visualClip = lState === "busy" ? "busy" : lState === "waiting_input" ? "waiting_input" : lState === "needs_approval" ? "needs_approval" : "error";
      
      if (res.presence === "inside") {
        res.presence = "exiting";
        res.anim = {
          type: "exiting",
          startTime: nowMs,
          duration: WALK_EXIT_MS,
          startX: doorAnchor.x,
          startY: doorAnchor.y,
          targetX: targetAnchor.x,
          targetY: targetAnchor.y,
          terminalTimer: 0
        };
        res.x = doorAnchor.x;
        res.y = doorAnchor.y;
        res.progress01 = 0;
        res.facing = targetAnchor.x < doorAnchor.x ? "left" : "right";
      } else if (res.presence === "entering") {
        // T18: interruption during entering -> reverse to exiting from current interpolated position
        const elapsed = nowMs - res.anim.startTime;
        const prog = Math.min(1, Math.max(0, elapsed / res.anim.duration));
        const curX = res.anim.startX + (res.anim.targetX - res.anim.startX) * prog;
        const curY = res.anim.startY + (res.anim.targetY - res.anim.startY) * prog;
        const remainingDist = Math.hypot(targetAnchor.x - curX, targetAnchor.y - curY);
        const fullDist = Math.hypot(targetAnchor.x - doorAnchor.x, targetAnchor.y - doorAnchor.y);
        const dur = Math.max(1, (remainingDist / (fullDist || 1)) * WALK_EXIT_MS);

        res.presence = "exiting";
        res.anim = {
          type: "exiting",
          startTime: nowMs,
          duration: dur,
          startX: curX,
          startY: curY,
          targetX: targetAnchor.x,
          targetY: targetAnchor.y,
          terminalTimer: 0
        };
        res.x = curX;
        res.y = curY;
        res.progress01 = 1 - (remainingDist / (fullDist || 1));
        res.facing = targetAnchor.x < curX ? "left" : "right";
      } else if (res.presence === "outside") {
        res.facing = targetAnchor.x < res.x ? "left" : "right";
      }
    } else if (lState === "done" || (lState === "error" && !errorNeedsAction)) {
      res.visualClip = lState === "done" ? "done" : "error";
      if (res.presence === "inside") {
        res.visualClip = null;
      } else if (res.presence === "outside") {
        res.anim.terminalTimer = nowMs;
        res.anim.type = lState === "done" ? "terminal_done" : "terminal_error";
      } else if (res.presence === "exiting") {
        // will trigger terminal timer upon reaching outside in tick
      }
    } else {
      // offline, idle, unknown
      res.visualClip = null;
      if (res.presence === "outside") {
        const fullDist = Math.hypot(targetAnchor.x - doorAnchor.x, targetAnchor.y - doorAnchor.y);
        const dur = WALK_ENTER_MS;
        res.presence = "entering";
        res.anim = {
          type: "entering",
          startTime: nowMs,
          duration: dur,
          startX: targetAnchor.x,
          startY: targetAnchor.y,
          targetX: doorAnchor.x,
          targetY: doorAnchor.y,
          terminalTimer: 0
        };
        res.facing = doorAnchor.x < targetAnchor.x ? "left" : "right";
      } else if (res.presence === "exiting") {
        // interpolate current position before starting entering
        const elapsed = nowMs - res.anim.startTime;
        const prog = Math.min(1, Math.max(0, elapsed / res.anim.duration));
        const curX = res.anim.startX + (res.anim.targetX - res.anim.startX) * prog;
        const curY = res.anim.startY + (res.anim.targetY - res.anim.startY) * prog;
        const remDist = Math.hypot(doorAnchor.x - curX, doorAnchor.y - curY);
        const fullDist = Math.hypot(targetAnchor.x - doorAnchor.x, targetAnchor.y - doorAnchor.y);
        const dur = Math.max(1, (remDist / (fullDist || 1)) * WALK_ENTER_MS);

        res.presence = "entering";
        res.anim = {
          type: "entering",
          startTime: nowMs,
          duration: dur,
          startX: curX,
          startY: curY,
          targetX: doorAnchor.x,
          targetY: doorAnchor.y,
          terminalTimer: 0
        };
        res.facing = doorAnchor.x < curX ? "left" : "right";
      }
    }
  }

  function setAllProviders(statesByProvider, nowMs = 0) {
    for (const p of PROVIDERS) {
      if (statesByProvider[p] !== undefined) {
        setProviderState(p, statesByProvider[p], nowMs);
      }
    }
  }

  function tick(nowMs = 0) {
    lastNow = nowMs;

    if (!currentReducedMotion) {
      for (const p of PROVIDERS) {
        const res = residents[p];
        const station = stations[p];
        const targetAnchor = station.anchor;

        if (res.presence === "exiting") {
          const elapsed = nowMs - res.anim.startTime;
          const prog = res.anim.duration > 0 ? elapsed / res.anim.duration : 1;
          if (prog >= 1) {
            res.presence = "outside";
            res.x = targetAnchor.x;
            res.y = targetAnchor.y;
            res.progress01 = 1;
            res.facing = targetAnchor.x < doorAnchor.x ? "left" : "right";
            if (res.logicalState === "done" || (res.logicalState === "error" && res.visualClip === "error")) {
              res.anim.terminalTimer = nowMs;
              res.anim.type = res.logicalState === "done" ? "terminal_done" : "terminal_error";
            }
          } else {
            res.progress01 = prog;
            res.x = res.anim.startX + (res.anim.targetX - res.anim.startX) * prog;
            res.y = res.anim.startY + (res.anim.targetY - res.anim.startY) * prog;
          }
        } else if (res.presence === "entering") {
          const elapsed = nowMs - res.anim.startTime;
          const prog = res.anim.duration > 0 ? elapsed / res.anim.duration : 1;
          if (prog >= 1) {
            res.presence = "inside";
            res.x = doorAnchor.x;
            res.y = doorAnchor.y;
            res.progress01 = 1;
            res.visualClip = null;
            res.anim.type = "idle";
          } else {
            res.progress01 = 1 - prog;
            res.x = res.anim.startX + (res.anim.targetX - res.anim.startX) * prog;
            res.y = res.anim.startY + (res.anim.targetY - res.anim.startY) * prog;
          }
        } else if (res.presence === "outside") {
          if (res.anim.type === "terminal_done" || res.anim.type === "terminal_error") {
            const elapsed = nowMs - res.anim.terminalTimer;
            if (elapsed >= TERMINAL_ERROR_MS) {
              const dur = WALK_ENTER_MS;
              res.presence = "entering";
              res.anim = {
                type: "entering",
                startTime: nowMs,
                duration: dur,
                startX: targetAnchor.x,
                startY: targetAnchor.y,
                targetX: doorAnchor.x,
                targetY: doorAnchor.y,
                terminalTimer: 0
              };
              res.facing = doorAnchor.x < targetAnchor.x ? "left" : "right";
            }
          }
        }
      }
    }

    if (!currentReducedMotion) {
      let needsDoorOpen = false;
      for (const p of PROVIDERS) {
        const res = residents[p];
        if (res.presence === "exiting" && res.progress01 < 0.65) {
          needsDoorOpen = true;
          break;
        }
        if (res.presence === "entering" && res.progress01 > 0.35) {
          needsDoorOpen = true;
          break;
        }
      }

      const doorElapsed = nowMs - doorAnim.startTime;
      if (needsDoorOpen) {
        if (doorState === "closed") {
          doorState = "opening";
          doorAnim = { type: "opening", startTime: nowMs, duration: DOOR_OPEN_MS };
        } else if (doorState === "closing") {
          const prog = Math.min(1, Math.max(0, doorElapsed / DOOR_CLOSE_MS));
          const remainingTime = DOOR_OPEN_MS * (1 - prog);
          doorState = "opening";
          doorAnim = { type: "opening", startTime: nowMs - remainingTime, duration: DOOR_OPEN_MS };
        } else if (doorState === "opening" && doorElapsed >= DOOR_OPEN_MS) {
          doorState = "open";
        }
      } else {
        if (doorState === "open") {
          doorState = "closing";
          doorAnim = { type: "closing", startTime: nowMs, duration: DOOR_CLOSE_MS };
        } else if (doorState === "opening") {
          const prog = Math.min(1, Math.max(0, doorElapsed / DOOR_OPEN_MS));
          const remainingTime = DOOR_CLOSE_MS * (1 - prog);
          doorState = "closing";
          doorAnim = { type: "closing", startTime: nowMs - remainingTime, duration: DOOR_CLOSE_MS };
        } else if (doorState === "closing" && doorElapsed >= DOOR_CLOSE_MS) {
          doorState = "closed";
        }
      }
    }
  }

  function getSnapshot(nowMs = 0) {
    tick(nowMs);

    let anyOutside = false;
    const resSlots = {};
    for (const p of PROVIDERS) {
      const r = residents[p];
      if (r.presence !== "inside") {
        anyOutside = true;
      }
      resSlots[p] = {
        provider: r.provider,
        character: r.character,
        presence: r.presence,
        logicalState: r.logicalState,
        visualClip: r.visualClip,
        x: r.x,
        y: r.y,
        facing: r.facing,
        progress01: r.progress01
      };
    }

    const lights = anyOutside ? "amber" : "night";
    const smoke = lights === "amber" && !currentReducedMotion;

    return {
      schema: 1,
      mode,
      reducedMotion: currentReducedMotion,
      nowMs,
      cottage: {
        lights,
        door: doorState,
        smoke
      },
      residents: resSlots
    };
  }

  return {
    setProviderState,
    setAllProviders,
    setReducedMotion,
    getSnapshot,
    tick
  };
}

module.exports = {
  DOOR_OPEN_MS,
  DOOR_CLOSE_MS,
  WALK_EXIT_MS,
  WALK_ENTER_MS,
  CELEBRATE_DONE_MS,
  TERMINAL_ERROR_MS,
  PROVIDERS,
  createHabitatSceneMachine
};
