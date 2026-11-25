"use strict";

const os = require("os");
const path = require("path");

const HABITAT_APP_NAME = "agent-habitat";
const HABITAT_PRODUCT_NAME = "Agent Habitat";
const HABITAT_APP_ID = "com.playertwo1.agent-habitat";
const HABITAT_PROTOCOL_SCHEME = "agent-habitat";
const HABITAT_RUNTIME_DIR_NAME = ".agent-habitat";
const HABITAT_DEFAULT_PORT = 23433;
const HABITAT_PORT_COUNT = 5;
const HABITAT_SERVER_PORTS = Object.freeze(
  Array.from({ length: HABITAT_PORT_COUNT }, (_, i) => HABITAT_DEFAULT_PORT + i)
);

function defaultHabitatRuntimeConfigPath(options = {}) {
  const homeDir = typeof options.homeDir === "string" ? options.homeDir : os.homedir();
  return path.join(homeDir, HABITAT_RUNTIME_DIR_NAME, "runtime.json");
}

function shouldSyncHooksOnStartup(env = process.env) {
  return !!(env && env.AGENT_HABITAT_SYNC_HOOKS === "1");
}

module.exports = {
  HABITAT_APP_NAME,
  HABITAT_PRODUCT_NAME,
  HABITAT_APP_ID,
  HABITAT_PROTOCOL_SCHEME,
  HABITAT_RUNTIME_DIR_NAME,
  HABITAT_DEFAULT_PORT,
  HABITAT_PORT_COUNT,
  HABITAT_SERVER_PORTS,
  defaultHabitatRuntimeConfigPath,
  shouldSyncHooksOnStartup,
};
