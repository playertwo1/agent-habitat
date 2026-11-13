"use strict";

// "Task finished" desktop card for every agent (Claude, Codex, Antigravity, and
// anything run inside Orca). Driven off the session-snapshot fanout like the
// Telegram companion, and shares its completion predicate and dedupe key, so a
// completion raises exactly one card. Pure decision logic: main.js supplies the
// switch and the card presenter.

const { isCompletion, dedupeKey, redactAssistantOutputText } = require("./telegram-companion");
const { extractTurnEndQuestion, TURN_END_QUESTION_AGENTS } = require("./claude-turn-ask");

const TEXT_MAX = 600;

function fallbackText(entry) {
  const parts = String((entry && entry.cwd) || "").replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || "";
}

function buildCompletionCard(entry) {
  const redacted = redactAssistantOutputText(entry.assistantLastOutput);
  // A closing question already gets its own card from the Stop route.
  if (TURN_END_QUESTION_AGENTS.has(entry.agentId) && extractTurnEndQuestion(redacted)) return null;
  const text = redacted.length > TEXT_MAX ? `${redacted.slice(0, TEXT_MAX - 1)}…` : redacted;
  return {
    agentId: entry.agentId || "unknown",
    sessionId: entry.id,
    text: text || fallbackText(entry),
    interrupted: entry.badge === "interrupted",
    inOrca: !!entry.orcaPaneKey,
    cwd: entry.cwd || "",
    host: entry.host || null,
  };
}

function createCompletionBubbleNotifier({ isEnabled = () => true, show = () => {} } = {}) {
  const lastNotified = new Map();
  let primed = false;

  function onSnapshot(snapshot) {
    const entries = snapshot && Array.isArray(snapshot.sessions) ? snapshot.sessions : [];
    const priming = !primed;
    const enabled = !!isEnabled();
    const seen = new Set();
    for (const entry of entries) {
      if (!entry || !entry.id) continue;
      seen.add(entry.id);
      if (!isCompletion(entry)) continue;
      const key = dedupeKey(entry);
      if (lastNotified.get(entry.id) === key) continue;
      // Record even when priming/disabled so toggling on later does not backfill.
      lastNotified.set(entry.id, key);
      if (priming || !enabled) continue;
      const card = buildCompletionCard(entry);
      if (!card) continue;
      try { show(card); } catch {}
    }
    for (const id of Array.from(lastNotified.keys())) {
      if (!seen.has(id)) lastNotified.delete(id);
    }
    primed = true;
  }

  return { onSnapshot };
}

module.exports = { createCompletionBubbleNotifier, buildCompletionCard };
