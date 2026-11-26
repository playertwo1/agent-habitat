"use strict";

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const pkg = require("../package.json");
const { WINDOWS_APP_USER_MODEL_ID } = require("../src/settings-window-icon");
const {
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
} = require("../src/habitat-identity");

describe("agent-habitat identity isolation (G0.3)", () => {
  it("declares isolated package metadata and build contract", () => {
    assert.equal(pkg.name, HABITAT_APP_NAME);
    assert.equal(pkg.name, "agent-habitat");
    assert.equal(pkg.version, "0.3.0");
    assert.equal(pkg.build.appId, HABITAT_APP_ID);
    assert.equal(pkg.build.appId, "com.playertwo1.agent-habitat");
    assert.equal(pkg.build.productName, HABITAT_PRODUCT_NAME);
    assert.equal(pkg.build.productName, "Agent Habitat");
    assert.deepEqual(pkg.build.protocols, [
      {
        name: "Agent Habitat Protocol",
        schemes: [HABITAT_PROTOCOL_SCHEME],
      },
    ]);
    assert.equal(pkg.build.win.artifactName, "Agent-Habitat-Setup-${version}-${arch}.${ext}");
    assert.equal(pkg.build.mac.artifactName, "Agent-Habitat-${version}-${arch}.${ext}");
    assert.equal(pkg.build.linux.artifactName, "Agent-Habitat-${version}-${arch}.${ext}");
    assert.deepEqual(pkg.build.publish, [
      {
        provider: "github",
        owner: "playertwo1",
        repo: "agent-habitat",
      },
    ]);
  });

  it("matches the Windows AppUserModelId with build.appId", () => {
    assert.equal(WINDOWS_APP_USER_MODEL_ID, "com.playertwo1.agent-habitat");
    assert.equal(WINDOWS_APP_USER_MODEL_ID, HABITAT_APP_ID);
  });

  it("reserves isolated loopback ports 23433..23437 without touching legacy defaults", () => {
    assert.equal(HABITAT_DEFAULT_PORT, 23433);
    assert.equal(HABITAT_PORT_COUNT, 5);
    assert.deepEqual(HABITAT_SERVER_PORTS, [23433, 23434, 23435, 23436, 23437]);
  });

  it("resolves the isolated runtime config path under ~/.agent-habitat/runtime.json", () => {
    const fakeHome = path.join("D:", "fake-home");
    assert.equal(
      defaultHabitatRuntimeConfigPath({ homeDir: fakeHome }),
      path.join(fakeHome, HABITAT_RUNTIME_DIR_NAME, "runtime.json"),
    );
    assert.match(defaultHabitatRuntimeConfigPath(), /\.agent-habitat[\\/]runtime\.json$/);
  });

  it("disables automatic hook sync on startup unless AGENT_HABITAT_SYNC_HOOKS=1", () => {
    assert.equal(shouldSyncHooksOnStartup({}), false);
    assert.equal(shouldSyncHooksOnStartup({ AGENT_HABITAT_SYNC_HOOKS: "0" }), false);
    assert.equal(shouldSyncHooksOnStartup({ AGENT_HABITAT_SYNC_HOOKS: "true" }), false);
    assert.equal(shouldSyncHooksOnStartup({ AGENT_HABITAT_SYNC_HOOKS: "1" }), true);
  });
});
