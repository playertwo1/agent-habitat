#!/usr/bin/env node
"use strict";

const http = require("http");
const https = require("https");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { stdoutForAntigravityEvent } = require("./antigravity-stdout");

const AGENT_HABITAT_HOOK_MARKER = "agent-habitat-hook.js";

function defaultHabitatRuntimeConfigPath() {
  return path.join(os.homedir(), ".agent-habitat", "runtime.json");
}

function resolveHabitatPort() {
  const envPort = parseInt(process.env.AGENT_HABITAT_PORT, 10);
  if (Number.isInteger(envPort) && envPort >= 1 && envPort <= 65535) {
    return envPort;
  }
  const configPath = process.env.AGENT_HABITAT_RUNTIME_CONFIG || defaultHabitatRuntimeConfigPath();
  try {
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, "utf-8");
      const data = JSON.parse(content);
      const filePort = parseInt(data.port, 10);
      if (Number.isInteger(filePort) && filePort >= 1 && filePort <= 65535) {
        return filePort;
      }
    }
  } catch {}
  return 23433;
}

function readStdinWithTimeout(timeoutMs = 1500) {
  return new Promise((resolve) => {
    let raw = "";
    let resolved = false;

    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        tryParseAndResolve(raw);
      }
    }, timeoutMs);

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      raw += chunk;
    });
    process.stdin.on("end", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        tryParseAndResolve(raw);
      }
    });
    process.stdin.on("error", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({});
      }
    });

    // If stdin is already ended or closed (e.g. TTY without input)
    if (process.stdin.destroyed) {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        resolve({});
      }
    }

    function tryParseAndResolve(str) {
      if (!str || !str.trim()) {
        return resolve({});
      }
      try {
        const parsed = JSON.parse(str.trim());
        resolve(parsed && typeof parsed === "object" ? parsed : {});
      } catch {
        resolve({});
      }
    }
  });
}

function postEventToHabitat(port, payload, timeoutMs = 150) {
  return new Promise((resolve) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: "/habitat/event",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        res.resume();
        resolve();
      }
    );

    req.on("error", () => {
      resolve();
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy();
      resolve();
    });

    req.write(data);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const provider = (args[0] || "").toLowerCase();
  const eventName = args[1] || "UnknownEvent";

  const stdinData = await readStdinWithTimeout(1500);

  const sessionId =
    stdinData.session_id ||
    stdinData.sessionId ||
    stdinData.conversation_id ||
    stdinData.conversationId ||
    stdinData.thread_id ||
    stdinData.threadId ||
    `${provider || "generic"}:default`;

  let cwdName = "";
  if (stdinData.cwd && typeof stdinData.cwd === "string") {
    cwdName = path.basename(stdinData.cwd);
  }

  const payload = {
    schema: 1,
    provider: provider || "generic",
    agentId: stdinData.agentId || stdinData.agent_id || process.env.AGENT_HABITAT_AGENT_ID || "default",
    event: eventName,
    sessionId,
    pid: process.pid,
    cwdName,
    entrypoint: stdinData.entrypoint || process.env.CLAUDE_CODE_ENTRYPOINT || "",
    originator: stdinData.originator || process.env.AGENT_HABITAT_ORIGINATOR || "",
    timestampMs: Date.now(),
  };

  const port = resolveHabitatPort();
  await postEventToHabitat(port, payload, 150);

  if (provider === "antigravity") {
    const out = stdoutForAntigravityEvent(eventName);
    process.stdout.write(out + "\n");
  }

  process.exit(0);
}

if (require.main === module) {
  main().catch(() => process.exit(0));
}

module.exports = {
  AGENT_HABITAT_HOOK_MARKER,
  resolveHabitatPort,
  readStdinWithTimeout,
  postEventToHabitat,
};
