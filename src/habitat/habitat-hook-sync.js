"use strict";

const fs = require("fs");
const path = require("path");
const os = require("os");
const { writeJsonAtomic } = require("../../hooks/json-utils");

const AGENT_HABITAT_HOOK_MARKER = "agent-habitat-hook.js";
const ANTIGRAVITY_GROUP_ID = "agent-habitat";
// No app empacotado o node externo não lê dentro do app.asar; hooks/** vai para app.asar.unpacked (asarUnpack).
function resolveDefaultHookScriptPath(baseDir = __dirname) {
  return path.resolve(baseDir, "../../hooks/agent-habitat-hook.js").replace(/([\\/])app\.asar(?=[\\/])/, "$1app.asar.unpacked");
}
const DEFAULT_HOOK_SCRIPT_PATH = resolveDefaultHookScriptPath();

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
  const script = hookScriptPath || DEFAULT_HOOK_SCRIPT_PATH;
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


// Remove só as entradas do Habitat. Um grupo misto (com hooks do Habitat e de
// terceiros na mesma lista `hooks`) mantém os de terceiros; só some o grupo
// que ficar sem nenhum hook.
function stripHabitatEntries(list) {
  const out = [];
  for (const item of list) {
    if (!hasAgentHabitatMarker(item)) { out.push(item); continue; }
    if (item && typeof item === "object" && !Array.isArray(item) && Array.isArray(item.hooks)) {
      const inner = item.hooks.filter((h) => !hasAgentHabitatMarker(h));
      if (inner.length > 0) out.push({ ...item, hooks: inner });
    }
  }
  return out;
}
function planHabitatHookSync(options = {}) {
  const nodeBin = options.nodeBin || "node";
  const hookScriptPath = options.hookScriptPath || DEFAULT_HOOK_SCRIPT_PATH;

  const claudePath = options.claudeSettingsPath || defaultClaudeSettingsPath();
  const codexPath = options.codexHooksPath || defaultCodexHooksPath();
  const antigravityPath = options.antigravityHooksPath || defaultAntigravityHooksPath();

  function planForFile(filePath, events, providerName) {
    let existingData = {};
    let fileExists = false;
    let invalidJson = false;
    try {
      if (fs.existsSync(filePath)) {
        fileExists = true;
        const content = fs.readFileSync(filePath, "utf-8");
        try {
          existingData = JSON.parse(content);
        } catch {
          invalidJson = true;
        }
      }
    } catch {}

    const missingEvents = [];
    let hasMarkerAnywhere = false;
    let foreignHooksPreserved = 0;

    if (!invalidJson) {
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
    } else {
      for (const ev of events) {
        missingEvents.push(ev);
      }
    }

    return {
      path: filePath,
      exists: fileExists,
      invalidJson,
      missingEvents,
      hasMarker: hasMarkerAnywhere,
      foreignHooksPreserved,
    };
  }

  const claudePlan = planForFile(claudePath, CLAUDE_EVENTS, "claude");
  const codexPlan = planForFile(codexPath, CODEX_EVENTS, "codex");
  const antigravityPlan = planForFile(antigravityPath, ANTIGRAVITY_EVENTS, "antigravity");

  const totalAdditions =
    (claudePlan.invalidJson ? claudePlan.missingEvents.length : (claudePlan.missingEvents.length > 0 ? claudePlan.missingEvents.length : 0)) +
    (codexPlan.invalidJson ? codexPlan.missingEvents.length : (codexPlan.missingEvents.length > 0 ? codexPlan.missingEvents.length : 0)) +
    (antigravityPlan.invalidJson ? antigravityPlan.missingEvents.length : (antigravityPlan.missingEvents.length > 0 ? antigravityPlan.missingEvents.length : 0));

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
  const hookScriptPath = options.hookScriptPath || DEFAULT_HOOK_SCRIPT_PATH;

  if (provider === "antigravity") {
    if (!existingData[ANTIGRAVITY_GROUP_ID] || typeof existingData[ANTIGRAVITY_GROUP_ID] !== "object") {
      existingData[ANTIGRAVITY_GROUP_ID] = {};
    }
    const group = existingData[ANTIGRAVITY_GROUP_ID];
    for (const ev of events) {
      const command = buildHabitatHookCommand({ nodeBin, hookScriptPath, provider, eventName: ev });
      const hookEntry = { type: "command", command, timeout: 10 };
      if (ev === "PostToolUse") {
        // preserve foreign hooks inside PostToolUse array if any
        const currentList = Array.isArray(group[ev]) ? stripHabitatEntries(group[ev]) : [];
        currentList.push({ matcher: "*", hooks: [hookEntry] });
        group[ev] = currentList;
      } else {
        const currentList = Array.isArray(group[ev]) ? stripHabitatEntries(group[ev]) : (group[ev] && !hasAgentHabitatMarker(group[ev]) ? [group[ev]] : []);
        currentList.push(hookEntry);
        group[ev] = currentList;
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
      const filtered = stripHabitatEntries(current);
      filtered.push(ourGroup);
      existingData.hooks[ev] = filtered;
    } else {
      const filtered = !hasAgentHabitatMarker(current) ? [current] : [];
      filtered.push(ourGroup);
      existingData.hooks[ev] = filtered;
    }
  }

  return existingData;
}

function installHabitatHooks(options = {}) {
  if (options.confirm !== true) {
    return { ok: false, reason: "confirmation-required", installedCount: 0, skippedInvalid: 0, backupsCreated: 0, errors: [] };
  }

  const nodeBin = options.nodeBin || "node";
  const hookScriptPath = options.hookScriptPath || DEFAULT_HOOK_SCRIPT_PATH;

  const paths = [
    { provider: "claude", filePath: options.claudeSettingsPath || defaultClaudeSettingsPath(), events: CLAUDE_EVENTS },
    { provider: "codex", filePath: options.codexHooksPath || defaultCodexHooksPath(), events: CODEX_EVENTS },
    { provider: "antigravity", filePath: options.antigravityHooksPath || defaultAntigravityHooksPath(), events: ANTIGRAVITY_EVENTS },
  ];

  let installedCount = 0;
  let skippedInvalid = 0;
  let backupsCreated = 0;
  const errors = [];

  for (const target of paths) {
    const dir = path.dirname(target.filePath);
    const fileExists = fs.existsSync(target.filePath);

    if (!fileExists && options.createMissing !== true && !fs.existsSync(dir)) {
      continue;
    }

    let existingData = {};
    let rawContent = "";
    if (fileExists) {
      try {
        rawContent = fs.readFileSync(target.filePath, "utf-8");
        existingData = JSON.parse(rawContent);
      } catch (err) {
        skippedInvalid++;
        errors.push({ provider: target.provider, error: "invalid-json", message: err.message });
        continue;
      }
    }

    const mutated = mutateHooksData(JSON.parse(JSON.stringify(existingData)), target.events, target.provider, { nodeBin, hookScriptPath });
    const currentSerialized = JSON.stringify(existingData, null, 2);
    const newSerialized = JSON.stringify(mutated, null, 2);

    if (fileExists && currentSerialized === newSerialized) {
      // Idempotent: no real change, do not rewrite or create .bak
      continue;
    }

    if (fileExists) {
      try {
        const now = new Date();
        const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17);
        const backupPath = `${target.filePath}.agent-habitat-${stamp}.bak`;
        fs.writeFileSync(backupPath, rawContent);
        backupsCreated++;
      } catch {}
    }

    writeJsonAtomic(target.filePath, mutated);
    installedCount++;
  }

  return { ok: errors.length === 0, installedCount, skippedInvalid, backupsCreated, errors };
}

const repairHabitatHooks = installHabitatHooks;

function uninstallHabitatHooks(options = {}) {
  const paths = [
    { provider: "claude", filePath: options.claudeSettingsPath || defaultClaudeSettingsPath(), events: CLAUDE_EVENTS },
    { provider: "codex", filePath: options.codexHooksPath || defaultCodexHooksPath(), events: CODEX_EVENTS },
    { provider: "antigravity", filePath: options.antigravityHooksPath || defaultAntigravityHooksPath(), events: ANTIGRAVITY_EVENTS },
  ];

  let uninstalledCount = 0;
  let skippedInvalid = 0;
  let backupsCreated = 0;
  const errors = [];

  for (const target of paths) {
    if (!fs.existsSync(target.filePath)) continue;

    let content = "";
    let data = {};
    try {
      content = fs.readFileSync(target.filePath, "utf-8");
      data = JSON.parse(content);
    } catch (err) {
      skippedInvalid++;
      errors.push({ provider: target.provider, error: "invalid-json", message: err.message });
      continue;
    }

    let changed = false;
    let backedUp = false;
    const now = new Date();
    const stamp = now.toISOString().replace(/[-:TZ.]/g, "").slice(0, 17);

    function createBackupOnce() {
      if (!backedUp) {
        try {
          fs.writeFileSync(`${target.filePath}.agent-habitat-${stamp}.bak`, content);
          backupsCreated++;
          backedUp = true;
        } catch {}
      }
    }

    if (target.provider === "antigravity") {
      if (data[ANTIGRAVITY_GROUP_ID] && typeof data[ANTIGRAVITY_GROUP_ID] === "object") {
        const agyObj = data[ANTIGRAVITY_GROUP_ID];
        for (const ev of Object.keys(agyObj)) {
          const entry = agyObj[ev];
          if (hasAgentHabitatMarker(entry)) {
            createBackupOnce();
            if (Array.isArray(entry)) {
              const filtered = stripHabitatEntries(entry);
              if (filtered.length > 0) {
                agyObj[ev] = filtered;
              } else {
                delete agyObj[ev];
              }
            } else {
              delete agyObj[ev];
            }
            changed = true;
          }
        }
        if (Object.keys(agyObj).length === 0) {
          delete data[ANTIGRAVITY_GROUP_ID];
        }
      }
    } else {
      if (data.hooks && typeof data.hooks === "object") {
        for (const ev of Object.keys(data.hooks)) {
          const current = data.hooks[ev];
          if (hasAgentHabitatMarker(current)) {
            createBackupOnce();
            if (Array.isArray(current)) {
              const filtered = stripHabitatEntries(current);
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
  }

  return { ok: errors.length === 0, uninstalledCount, skippedInvalid, backupsCreated, errors };
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
  resolveDefaultHookScriptPath,
  hasAgentHabitatMarker,
  planHabitatHookSync,
  installHabitatHooks,
  repairHabitatHooks,
  uninstallHabitatHooks,
};
