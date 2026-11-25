"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { writeJsonAtomic } = require("../../hooks/json-utils");

const AGENT_HABITAT_HOOK_MARKER = "agent-habitat-hook.js";
const ANTIGRAVITY_GROUP_ID = "agent-habitat";

const CLAUDE_EVENTS = [
  "SessionStart",
  "SessionEnd",
  "UserPromptSubmit",
  "PreToolUse",
  "PostToolUse",
  "PostToolUseFailure",
  "Stop",
  "StopFailure",
  "SubagentStart",
  "SubagentStop",
  "TeammateIdle",
  "Elicitation",
  "ElicitationResult",
];

const CODEX_EVENTS = [
  "SessionStart",
  "UserPromptSubmit",
  "PreToolUse",
  "PermissionRequest",
  "PostToolUse",
  "SubagentStart",
  "SubagentStop",
  "Stop",
  "SessionEnd",
];

const ANTIGRAVITY_EVENTS = [
  "PreInvocation",
  "PostToolUse",
  "PostInvocation",
  "Stop",
];

function defaultClaudeSettingsPath() {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function defaultCodexHooksPath() {
  return path.join(os.homedir(), ".codex", "hooks.json");
}

function defaultAntigravityHooksPath() {
  return path.join(os.homedir(), ".gemini", "config", "hooks.json");
}

function buildHabitatHookCommand({ nodeBin = "node", hookScriptPath, provider, eventName }) {
  const script = hookScriptPath || path.resolve(__dirname, "../../hooks/agent-habitat-hook.js");
  const escapedScript = script.replace(/\\/g, "/");
  return `${nodeBin} "${escapedScript}" ${provider} ${eventName}`;
}

function hasAgentHabitatMarker(entry) {
  if (!entry) return false;
  if (typeof entry === "string" && entry.includes(AGENT_HABITAT_HOOK_MARKER)) return true;
  if (Array.isArray(entry)) {
    return entry.some((item) => hasAgentHabitatMarker(item));
  }
  if (typeof entry === "object" && entry !== null) {
    if (typeof entry.command === "string" && entry.command.includes(AGENT_HABITAT_HOOK_MARKER)) {
      return true;
    }
    if (Array.isArray(entry.hooks)) {
      return entry.hooks.some((h) => hasAgentHabitatMarker(h));
    }
    for (const val of Object.values(entry)) {
      if (hasAgentHabitatMarker(val)) return true;
    }
  }
  return false;
}

function planHabitatHookSync(options = {}) {
  const nodeBin = options.nodeBin || "node";
  const hookScriptPath = options.hookScriptPath || path.resolve(__dirname, "../../hooks/agent-habitat-hook.js");

  const claudePath = options.claudeSettingsPath || defaultClaudeSettingsPath();
  const codexPath = options.codexHooksPath || defaultCodexHooksPath();
  const antigravityPath = options.antigravityHooksPath || defaultAntigravityHooksPath();

  function planForFile(filePath, events, providerName) {
    let existingData = {};
    let fileExists = false;
    try {
      if (fs.existsSync(filePath)) {
        fileExists = true;
        existingData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      }
    } catch {}

    const missingEvents = [];
    let hasMarkerAnywhere = false;
    let foreignHooksPreserved = 0;

    if (providerName === "antigravity") {
      const agyObj = existingData[ANTIGRAVITY_GROUP_ID] && typeof existingData[ANTIGRAVITY_GROUP_ID] === "object" ? existingData[ANTIGRAVITY_GROUP_ID] : {};
      if (hasAgentHabitatMarker(agyObj)) {
        hasMarkerAnywhere = true;
      }
      for (const ev of events) {
        if (!agyObj[ev] || !hasAgentHabitatMarker(agyObj[ev])) {
          missingEvents.push(ev);
        }
      }
      for (const [k, v] of Object.entries(existingData)) {
        if (k !== ANTIGRAVITY_GROUP_ID) {
          foreignHooksPreserved++;
        }
      }
      if (existingData[ANTIGRAVITY_GROUP_ID]) {
        for (const [k, v] of Object.entries(existingData[ANTIGRAVITY_GROUP_ID])) {
          if (!hasAgentHabitatMarker(v)) foreignHooksPreserved++;
        }
      }
    } else {
      const hooksObj = existingData.hooks && typeof existingData.hooks === "object" ? existingData.hooks : {};
      for (const ev of events) {
        const currentEntry = hooksObj[ev];
        if (hasAgentHabitatMarker(currentEntry)) {
          hasMarkerAnywhere = true;
        } else {
          missingEvents.push(ev);
        }
        if (currentEntry) {
          if (Array.isArray(currentEntry)) {
            if (currentEntry.some((item) => !hasAgentHabitatMarker(item))) foreignHooksPreserved++;
          } else if (typeof currentEntry === "object") {
            if (!hasAgentHabitatMarker(currentEntry)) foreignHooksPreserved++;
          } else if (typeof currentEntry === "string" && !currentEntry.includes(AGENT_HABITAT_HOOK_MARKER)) {
            foreignHooksPreserved++;
          }
        }
      }
    }

    return {
      path: filePath,
      exists: fileExists,
      missingEvents,
      hasMarker: hasMarkerAnywhere,
      foreignHooksPreserved,
    };
  }

  const claudePlan = planForFile(claudePath, CLAUDE_EVENTS, "claude");
  const codexPlan = planForFile(codexPath, CODEX_EVENTS, "codex");
  const antigravityPlan = planForFile(antigravityPath, ANTIGRAVITY_EVENTS, "antigravity");

  const totalAdditions =
    (claudePlan.missingEvents.length > 0 && !claudePlan.hasMarker ? claudePlan.missingEvents.length : 0) +
    (codexPlan.missingEvents.length > 0 && !codexPlan.hasMarker ? codexPlan.missingEvents.length : 0) +
    (antigravityPlan.missingEvents.length > 0 && !antigravityPlan.hasMarker ? antigravityPlan.missingEvents.length : 0);

  return {
    targets: {
      claude: claudePlan,
      codex: codexPlan,
      antigravity: antigravityPlan,
    },
    totalAdditions,
  };
}

function mutateHooksData(existingData, events, provider, options) {
  const nodeBin = options.nodeBin || "node";
  const hookScriptPath = options.hookScriptPath || path.resolve(__dirname, "../../hooks/agent-habitat-hook.js");

  if (provider === "antigravity") {
    if (!existingData[ANTIGRAVITY_GROUP_ID] || typeof existingData[ANTIGRAVITY_GROUP_ID] !== "object") {
      existingData[ANTIGRAVITY_GROUP_ID] = {};
    }
    const group = existingData[ANTIGRAVITY_GROUP_ID];
    for (const ev of events) {
      const command = buildHabitatHookCommand({ nodeBin, hookScriptPath, provider, eventName: ev });
      const hookEntry = { type: "command", command, timeout: 10 };
      if (ev === "PostToolUse") {
        group[ev] = [{ matcher: "*", hooks: [hookEntry] }];
      } else {
        group[ev] = [hookEntry];
      }
    }
    return existingData;
  }

  if (!existingData.hooks || typeof existingData.hooks !== "object") {
    existingData.hooks = {};
  }

  for (const ev of events) {
    const command = buildHabitatHookCommand({ nodeBin, hookScriptPath, provider, eventName: ev });
    const current = existingData.hooks[ev];

    const innerHook = {
      type: "command",
      command,
      timeout: 10,
    };
    const ourGroup = {
      hooks: [innerHook],
    };

    if (!current) {
      existingData.hooks[ev] = [ourGroup];
    } else if (Array.isArray(current)) {
      const filtered = current.filter((item) => !hasAgentHabitatMarker(item));
      filtered.push(ourGroup);
      existingData.hooks[ev] = filtered;
    } else {
      // If current is object or string, convert/preserve
      const filtered = !hasAgentHabitatMarker(current) ? [current] : [];
      filtered.push(ourGroup);
      existingData.hooks[ev] = filtered;
    }
  }

  return existingData;
}

function installHabitatHooks(options = {}) {
  if (options.confirm !== true) {
    return { ok: false, reason: "confirmation-required" };
  }

  const nodeBin = options.nodeBin || "node";
  const hookScriptPath = options.hookScriptPath || path.resolve(__dirname, "../../hooks/agent-habitat-hook.js");

  const paths = [
    { provider: "claude", filePath: options.claudeSettingsPath || defaultClaudeSettingsPath(), events: CLAUDE_EVENTS },
    { provider: "codex", filePath: options.codexHooksPath || defaultCodexHooksPath(), events: CODEX_EVENTS },
    { provider: "antigravity", filePath: options.antigravityHooksPath || defaultAntigravityHooksPath(), events: ANTIGRAVITY_EVENTS },
  ];

  let installedCount = 0;

  for (const target of paths) {
    const dir = path.dirname(target.filePath);
    const fileExists = fs.existsSync(target.filePath);

    if (!fileExists && options.createMissing !== true && !fs.existsSync(dir)) {
      continue;
    }

    let existingData = {};
    if (fileExists) {
      try {
        existingData = JSON.parse(fs.readFileSync(target.filePath, "utf-8"));
        const now = new Date();
        const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17);
        const backupPath = `${target.filePath}.agent-habitat-${stamp}.bak`;
        fs.writeFileSync(backupPath, fs.readFileSync(target.filePath));
      } catch {}
    }

    const mutated = mutateHooksData(existingData, target.events, target.provider, { nodeBin, hookScriptPath });
    writeJsonAtomic(target.filePath, mutated);
    installedCount++;
  }

  return { ok: true, installedCount };
}

function uninstallHabitatHooks(options = {}) {
  const paths = [
    { provider: "claude", filePath: options.claudeSettingsPath || defaultClaudeSettingsPath(), events: CLAUDE_EVENTS },
    { provider: "codex", filePath: options.codexHooksPath || defaultCodexHooksPath(), events: CODEX_EVENTS },
    { provider: "antigravity", filePath: options.antigravityHooksPath || defaultAntigravityHooksPath(), events: ANTIGRAVITY_EVENTS },
  ];

  let uninstalledCount = 0;

  for (const target of paths) {
    if (!fs.existsSync(target.filePath)) continue;

    try {
      const content = fs.readFileSync(target.filePath, "utf-8");
      const data = JSON.parse(content);
      let changed = false;
      const now = new Date();
      const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17);
      let backedUp = false;

      if (target.provider === "antigravity") {
        if (data[ANTIGRAVITY_GROUP_ID]) {
          if (!backedUp) {
            fs.writeFileSync(`${target.filePath}.agent-habitat-${stamp}.bak`, content);
            backedUp = true;
          }
          delete data[ANTIGRAVITY_GROUP_ID];
          changed = true;
        }
      } else {
        if (data.hooks && typeof data.hooks === "object") {
          for (const ev of Object.keys(data.hooks)) {
            const current = data.hooks[ev];
            if (hasAgentHabitatMarker(current)) {
              if (!backedUp) {
                fs.writeFileSync(`${target.filePath}.agent-habitat-${stamp}.bak`, content);
                backedUp = true;
              }
              if (Array.isArray(current)) {
                const filtered = current.filter((item) => !hasAgentHabitatMarker(item));
                if (filtered.length > 0) {
                  data.hooks[ev] = filtered;
                } else {
                  delete data.hooks[ev];
                }
              } else {
                delete data.hooks[ev];
              }
              changed = true;
            }
          }
          if (Object.keys(data.hooks).length === 0) {
            delete data.hooks;
          }
        }
      }

      if (changed) {
        writeJsonAtomic(target.filePath, data);
        uninstalledCount++;
      }
    } catch {}
  }

  return { ok: true, uninstalledCount };
}

module.exports = {
  AGENT_HABITAT_HOOK_MARKER,
  ANTIGRAVITY_GROUP_ID,
  CLAUDE_EVENTS,
  CODEX_EVENTS,
  ANTIGRAVITY_EVENTS,
  defaultClaudeSettingsPath,
  defaultCodexHooksPath,
  defaultAntigravityHooksPath,
  buildHabitatHookCommand,
  hasAgentHabitatMarker,
  planHabitatHookSync,
  installHabitatHooks,
  uninstallHabitatHooks,
};
