"use strict";

const path = require("path");
const fs = require("fs");
const os = require("os");
const { execFileSync } = require("child_process");

function detectWindowsMvpSurfaces(options = {}) {
  const fileSystem = options.fs || fs;
  const env = options.env || process.env;
  const home = options.homeDir || (typeof os !== "undefined" && os.homedir ? os.homedir() : process.env.USERPROFILE || "C:\\Users\\default");
  const localAppData = env.LOCALAPPDATA || path.join(home, "AppData", "Local");
  const appData = env.APPDATA || path.join(home, "AppData", "Roaming");

  let runningProcesses = [];
  if (Array.isArray(options.runningProcesses)) {
    runningProcesses = options.runningProcesses;
  } else if (options.inspectLiveProcesses === true && process.platform === "win32") {
    try {
      const output = execFileSync("tasklist", ["/FO", "CSV", "/NH"], {
        encoding: "utf-8",
        timeout: 1500,
        windowsHide: true,
      });
      runningProcesses = output.split(/\r?\n/);
    } catch {
      runningProcesses = [];
    }
  }

  function checkPath(p) {
    try {
      return fileSystem.existsSync(p);
    } catch {
      return false;
    }
  }

  function checkAnyPath(paths) {
    for (const p of paths) {
      if (checkPath(p)) return true;
    }
    return false;
  }

  function isProcRunning(names) {
    return runningProcesses.some((proc) => {
      const lower = String(proc).toLowerCase();
      return names.some((n) => lower.includes(n.toLowerCase()));
    });
  }

  // 1. claudeCli
  const claudeCliPaths = [
    path.join(home, ".local", "bin", "claude.exe"),
    path.join(appData, "npm", "claude.cmd"),
    path.join(home, ".claude"),
  ];
  const claudeCli = checkAnyPath(claudeCliPaths);

  // 2. claudeDesktop
  const claudeDesktopPaths = [
    path.join(localAppData, "AnthropicClaude"),
  ];
  let hasClaudeAppx = false;
  const packagesDir = path.join(localAppData, "Packages");
  if (checkPath(packagesDir)) {
    try {
      const subdirs = fileSystem.readdirSync(packagesDir);
      hasClaudeAppx = subdirs.some((d) => d.toLowerCase().includes("claude"));
    } catch {}
  }
  const claudeProc = isProcRunning(["claude.exe", "claude-desktop"]);
  const claudeDesktop = checkAnyPath(claudeDesktopPaths) || hasClaudeAppx || claudeProc;

  // 3. codexCli
  const codexCliPaths = [
    path.join(localAppData, "Programs", "OpenAI", "Codex", "bin", "codex.exe"),
    path.join(home, ".local", "bin", "codex.cmd"),
    path.join(home, ".codex"),
  ];
  const codexCli = checkAnyPath(codexCliPaths);

  // 4. codexDesktop
  let hasCodexAppx = false;
  if (checkPath(packagesDir)) {
    try {
      const subdirs = fileSystem.readdirSync(packagesDir);
      hasCodexAppx = subdirs.some((d) => d.toLowerCase().includes("openai.codex"));
    } catch {}
  }
  const chatgptProc = isProcRunning(["chatgpt.exe", "codex"]);
  const codexSessionsDir = path.join(home, ".codex", "sessions");
  const codexDesktop = hasCodexAppx || chatgptProc || checkPath(codexSessionsDir);

  // 5. antigravityCli
  const antigravityCliPaths = [
    path.join(home, ".gemini", "bin", "agy.exe"),
    path.join(home, ".gemini", "antigravity-cli"),
  ];
  const agyProc = isProcRunning(["agy_acp_server.exe", "agy.exe"]);
  const antigravityCli = checkAnyPath(antigravityCliPaths) || agyProc;

  // 6. antigravityIde
  const antigravityIdePaths = [
    path.join(localAppData, "Programs", "antigravity", "Antigravity.exe"),
    path.join(localAppData, "Programs", "Antigravity IDE", "Antigravity IDE.exe"),
  ];
  const ideProc = isProcRunning(["language_server.exe", "antigravity.exe", "antigravity ide.exe"]);
  const antigravityIde = checkAnyPath(antigravityIdePaths) || ideProc;

  // idleOnlyRunning
  const anyProcRunning = claudeProc || chatgptProc || agyProc || ideProc;
  const idleOnlyRunning = anyProcRunning && !options.hasActiveTurn;

  const summary = {
    claudeCli,
    claudeDesktop,
    codexCli,
    codexDesktop,
    antigravityCli,
    antigravityIde,
    idleOnlyRunning,
  };

  return {
    claudeCli,
    claudeDesktop,
    codexCli,
    codexDesktop,
    antigravityCli,
    antigravityIde,
    summary,
  };
}

function parseCodexRolloutLine(line, options = {}) {
  if (!line || typeof line !== "string") return null;
  let data;
  try {
    data = JSON.parse(line.trim());
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;

  const type = data.type || data.event || data.kind;
  const subType = data.subType || data.sub_type || data.name;

  const timestampMs = data.timestampMs || data.timestamp || Date.now();
  const sessionId = data.sessionId || data.session_id || "default";
  const originator = data.originator || data.source || "";
  const normOriginator = String(originator).toLowerCase();
  const isCodexDesktop = ["codex desktop", "codex_work_desktop", "orca_desktop"].includes(normOriginator);

  if (type === "session_meta" || type === "SessionStart" || data.event === "SessionStart") {
    return {
      provider: "codex",
      sessionId,
      originator,
      event: "SessionStart",
      state: "idle",
      isCodexDesktop,
      timestampMs,
    };
  }

  if (type === "event_msg") {
    if (subType === "task_started" || subType === "user_message" || subType === "guardian_assessment" || subType === "exec_command_end" || subType === "patch_apply_end" || subType === "custom_tool_call_output") {
      return {
        provider: "codex",
        sessionId,
        originator,
        event: subType,
        state: "busy",
        isCodexDesktop,
        timestampMs,
      };
    }
    if (subType === "task_complete") {
      return {
        provider: "codex",
        sessionId,
        originator,
        event: "Stop",
        state: "done",
        isCodexDesktop,
        timestampMs,
      };
    }
    if (subType === "turn_aborted") {
      return {
        provider: "codex",
        sessionId,
        originator,
        event: "TurnAborted",
        state: "idle",
        isCodexDesktop,
        timestampMs,
      };
    }
  }

  if (type === "response_item") {
    if (["function_call", "custom_tool_call", "web_search_call"].includes(subType || data.name)) {
      return {
        provider: "codex",
        sessionId,
        originator,
        event: subType || data.name,
        state: "busy",
        isCodexDesktop,
        timestampMs,
      };
    }
  }

  return null;
}

function normalizeHookPayloadToAggregatorEvent(rawPayload, nowMs = Date.now()) {
  const payload = rawPayload && typeof rawPayload === "object" ? rawPayload : {};

  const providerRaw = String(payload.provider || "").toLowerCase();
  let provider = providerRaw;
  if (providerRaw === "agy" || providerRaw === "antigravity") {
    provider = "antigravity";
  } else if (providerRaw === "claude") {
    provider = "claude";
  } else if (providerRaw === "codex") {
    provider = "codex";
  } else {
    provider = providerRaw || "generic";
  }

  const agentId = payload.agentId || payload.agent_id || "default";
  const sessionId = payload.sessionId || payload.session_id || payload.conversationId || payload.conversation_id || `${provider}:default`;
  const event = payload.event || payload.eventName || "UnknownEvent";
  const entrypoint = payload.entrypoint || "";
  const originator = payload.originator || "";
  const normOriginator = originator.toLowerCase();

  let surface = payload.surface || "";
  if (!surface) {
    if (entrypoint === "claude-desktop" || entrypoint.includes("desktop")) {
      surface = "claude-desktop";
    } else if (["codex desktop", "codex_work_desktop", "orca_desktop"].includes(normOriginator)) {
      surface = "codex-desktop";
    } else if (provider === "antigravity") {
      surface = "antigravity-ide";
    } else {
      surface = `${provider}-cli`;
    }
  }

  let state = "idle";
  let errorNeedsAction = false;

  const busyEvents = [
    "UserPromptSubmit",
    "PreToolUse",
    "PostToolUse",
    "SubagentStart",
    "SubagentStop",
    "ElicitationResult",
    "PermissionRequest",
    "PreInvocation",
  ];

  const waitingEvents = ["Elicitation"];
  const errorEvents = ["PostToolUseFailure", "StopFailure"];
  const doneEvents = ["Stop"];
  const offlineEvents = ["SessionEnd"];

  if (busyEvents.includes(event)) {
    state = "busy";
  } else if (waitingEvents.includes(event)) {
    state = "waiting_input";
  } else if (errorEvents.includes(event)) {
    state = "error";
    errorNeedsAction = true;
  } else if (doneEvents.includes(event)) {
    state = "done";
  } else if (offlineEvents.includes(event)) {
    state = "offline";
  } else if (event === "TeammateIdle") {
    state = "idle";
  } else if (event === "PostInvocation") {
    state = payload.state || "idle";
  } else {
    state = payload.state || "idle";
  }

  if (event === "PermissionRequest") {
    state = "needs_approval";
  }

  const pid = payload.pid || process.pid;
  const eventId = payload.eventId || `ev_${Math.random().toString(36).slice(2, 9)}`;
  const seq = typeof payload.seq === "number" ? payload.seq : 1;
  const timestampMs = payload.timestampMs || nowMs;

  return {
    provider,
    agentId,
    sessionId,
    event,
    state,
    errorNeedsAction,
    entrypoint,
    originator,
    surface,
    pid,
    eventId,
    seq,
    timestampMs,
  };
}

module.exports = {
  detectWindowsMvpSurfaces,
  parseCodexRolloutLine,
  normalizeHookPayloadToAggregatorEvent,
};
