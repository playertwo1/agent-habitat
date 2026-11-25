"use strict";

const HABITAT_MVP_PROVIDERS = Object.freeze(["claude", "codex", "antigravity"]);

const HABITAT_MVP_AGENT_IDS = Object.freeze([
  "claude-code",
  "codex",
  "antigravity-cli",
  "antigravity-ide"
]);

const HABITAT_DISABLED_CHANNELS = Object.freeze([
  "telegram",
  "feishu",
  "slack",
  "discord",
  "remote-ssh",
  "pwa-mobile",
  "wsl-remote"
]);

function mapAgentIdToProvider(agentId) {
  if (typeof agentId !== "string") return null;
  const lower = agentId.trim().toLowerCase();
  if (lower === "claude-code" || lower === "claude") {
    return "claude";
  }
  if (lower === "codex") {
    return "codex";
  }
  if (lower === "antigravity-cli" || lower === "antigravity-ide" || lower === "antigravity") {
    return "antigravity";
  }
  return null;
}

function isHabitatMvpAgent(agentId) {
  return Boolean(mapAgentIdToProvider(agentId));
}

function filterHabitatAgentDescriptors(descriptors) {
  if (!Array.isArray(descriptors)) return [];
  return descriptors.filter(d => d && isHabitatMvpAgent(d.agentId));
}

function sanitizeHabitatPrefsSnapshot(snapshot) {
  const base = snapshot && typeof snapshot === "object" ? snapshot : {};
  const newSnapshot = { ...base };

  newSnapshot.telegramApproval = {
    ...(base.telegramApproval && typeof base.telegramApproval === "object" ? base.telegramApproval : {}),
    enabled: false
  };
  newSnapshot.feishuApproval = {
    ...(base.feishuApproval && typeof base.feishuApproval === "object" ? base.feishuApproval : {}),
    enabled: false
  };
  newSnapshot.slackNotify = {
    ...(base.slackNotify && typeof base.slackNotify === "object" ? base.slackNotify : {}),
    enabled: false
  };
  newSnapshot.discordPresence = {
    ...(base.discordPresence && typeof base.discordPresence === "object" ? base.discordPresence : {}),
    enabled: false
  };

  const existingAgents = base.agents && typeof base.agents === "object" ? base.agents : {};
  const newAgents = { ...existingAgents };

  // For any agent ID not MVP, force enabled: false, integrationInstalled: false
  // Also ensure MVP agents keep their or have defaults if missing, but let's iterate or ensure non-MVP are locked down.
  // Actually, standard behavior: for every agent id that is !isHabitatMvpAgent(id), force disabled & integrationInstalled false.
  for (const id of Object.keys(newAgents)) {
    if (!isHabitatMvpAgent(id)) {
      const entry = newAgents[id] && typeof newAgents[id] === "object" ? newAgents[id] : {};
      newAgents[id] = {
        ...entry,
        enabled: false,
        integrationInstalled: false
      };
    }
  }

  // Also ensure MVP agents are present or preserved as is
  for (const mvpId of HABITAT_MVP_AGENT_IDS) {
    if (!newAgents[mvpId]) {
      newAgents[mvpId] = { enabled: true, integrationInstalled: true };
    }
  }

  newSnapshot.agents = newAgents;
  return newSnapshot;
}

module.exports = {
  HABITAT_MVP_PROVIDERS,
  HABITAT_MVP_AGENT_IDS,
  HABITAT_DISABLED_CHANNELS,
  mapAgentIdToProvider,
  isHabitatMvpAgent,
  filterHabitatAgentDescriptors,
  sanitizeHabitatPrefsSnapshot
};
