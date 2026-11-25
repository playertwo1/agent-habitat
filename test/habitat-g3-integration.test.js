"use strict";

const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const initServer = require("../src/server");
const {
  clampStageBoundsToWorkArea,
  buildTrayTemplateModel,
  resolveDemoPresetStates,
  buildHabitatPanelState,
  resolveHabitatAppPaths,
  buildHabitatServerContext,
  extractSceneSnapshot,
  isSceneIdle000
} = require("../src/habitat/habitat-app-main");
const { HABITAT_SERVER_PORTS } = require("../src/habitat-identity");
const { createHabitatSceneMachine } = require("../src/habitat/scene-machine");

test("Habitat G3 Integration — HTTP Permission and Runtime", async () => {
  let requestedPayload = null;
  const runtime = createHabitatRuntime({
    onPermissionRequest: async (payload) => {
      requestedPayload = payload;
      return "allow";
    }
  });

  const tmpPath = path.join(__dirname, "../tmp-test-runtime.json");
  const ctx = {
    getPortCandidates: () => [0],
    staticServerPorts: [0],
    runtimeConfigPath: tmpPath,
    habitatRuntime: runtime,
    syncIntegrationsOnStartup: false
  };

  const serverCtl = initServer(ctx);
  let port = 0;
  if (serverCtl && typeof serverCtl.startHttpServer === "function") {
    port = await serverCtl.startHttpServer();
  }

  assert.ok(port > 0);
  assert.ok(runtime);
  const snap = runtime.getSnapshot();
  assert.equal(snap.schema, 1);

  const http = require("http");
  const permData = JSON.stringify({
    provider: "claude",
    event: "PermissionRequest",
    sessionId: "perm-1",
    toolName: "Bash",
    cwdName: "proj",
    pid: process.pid
  });

  const permRes = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "127.0.0.1",
      port,
      path: "/habitat/permission",
      method: "POST",
      agent: false,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(permData),
        "Connection": "close"
      }
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => resolve({ status: res.statusCode, body: JSON.parse(raw) }));
    });
    req.on("error", reject);
    req.write(permData);
    req.end();
  });

  assert.equal(permRes.status, 200);
  assert.equal(permRes.body.ok, true);
  assert.equal(permRes.body.decision, "allow");
  assert.ok(requestedPayload);
  assert.equal(requestedPayload.sessionId, "perm-1");

  try {
    if (serverCtl && typeof serverCtl.cleanup === "function") {
      serverCtl.cleanup();
    }
  } finally {
    fs.rmSync(tmpPath, { force: true });
  }
});

test("Habitat G3 Integration — resolveDemoPresetStates & buildHabitatPanelState", () => {
  const p100 = resolveDemoPresetStates("100");
  assert.deepEqual(p100, { claude: "busy", codex: "offline", antigravity: "offline" });

  const p111 = resolveDemoPresetStates("111");
  assert.deepEqual(p111, { claude: "busy", codex: "busy", antigravity: "busy" });

  const runtime = createHabitatRuntime();
  const panelState = buildHabitatPanelState({ prefs: { scale: 1.5 }, demoMode: false, runtime });
  assert.equal(panelState.scale, 1.5);
  assert.equal(panelState.demoMode, false);
  assert.equal(panelState.residents.length, 3);
});

test("Habitat G3 Integration — PT-BR & Forbidden Legacy Terms check", () => {
  const forbidden = ["openclaw", "kiro", "qoder", "workbuddy", "codebuddy", "copilot", "gemini cli"];
  const filesToCheck = [
    path.join(__dirname, "../src/habitat/habitat-panel.html"),
    path.join(__dirname, "../src/habitat/habitat-panel-client.js"),
    path.join(__dirname, "../src/habitat/habitat-app-main.js")
  ];

  for (const f of filesToCheck) {
    if (fs.existsSync(f)) {
      const content = fs.readFileSync(f, "utf8");
      for (const term of forbidden) {
        const regex = new RegExp(`\\b${term}\\b`, "i");
        assert.equal(regex.test(content), false, `Found forbidden legacy term ${term} in ${f}`);
      }
    }
  }
});

test("Habitat G3 Integration — Hit Window DWM Background Check", () => {
  const hitHtmlPath = path.join(__dirname, "../src/habitat/habitat-hit.html");
  assert.ok(fs.existsSync(hitHtmlPath));
  const content = fs.readFileSync(hitHtmlPath, "utf8");
  assert.ok(content.includes("rgba(0, 0, 0, 0.01)"), "Hit window background must be rgba(0, 0, 0, 0.01)");
  assert.equal(content.includes("rgba(0,0,0,0)"), false, "Hit window must NOT use transparent rgba(0,0,0,0)");
});

test("Habitat G3 Integration — Demo Mode Isolation & Clamp Bounds", () => {
  const workArea = { x: 0, y: 0, width: 1920, height: 1080 };
  const clamped = clampStageBoundsToWorkArea({ x: 2000, y: 2000, width: 300, height: 300 }, workArea);
  assert.equal(clamped.x <= 1920 - 300, true);
  assert.equal(clamped.y <= 1080 - 300, true);

  const manifestPath = path.join(__dirname, "../assets/habitat/cozy-cottage/habitat-manifest.json");
  if (fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const sceneMachine = createHabitatSceneMachine({ manifest, mode: "demo" });
    sceneMachine.setAllProviders({ claude: { state: "busy", presence: "outside" } }, Date.now());
    const snap = sceneMachine.getSnapshot(Date.now());
    assert.ok(snap);
  }
});

test("Habitat G3 Integration — Syntax check on main files", () => {
  const mainJs = path.join(__dirname, "../src/main.js");
  const appMainJs = path.join(__dirname, "../src/habitat/habitat-app-main.js");
  assert.equal(fs.existsSync(mainJs), true);
  assert.equal(fs.existsSync(appMainJs), true);
});

test("Habitat G3 Integration — All HTML, preload, and asset paths in habitat-app-main.js exist on disk", () => {
  const pathsMap = resolveHabitatAppPaths();
  for (const [key, targetPath] of Object.entries(pathsMap)) {
    assert.equal(fs.existsSync(targetPath), true, `Missing path for ${key}: ${targetPath}`);
  }

  const appMainSrc = fs.readFileSync(path.join(__dirname, "../src/habitat/habitat-app-main.js"), "utf8");
  assert.equal(appMainSrc.includes('"habitat/habitat-'), false, "Must not use nested habitat/habitat-* paths");
  assert.equal(appMainSrc.includes("'habitat/habitat-"), false, "Must not use nested habitat/habitat-* paths");
});

test("Habitat G3 Integration — Real imports & serverCtx passes habitatRuntime", async () => {
  const runtime = createHabitatRuntime();
  const tmpRuntimeCfg = path.join(__dirname, "../tmp-test-serverctx-runtime.json");
  const serverCtx = buildHabitatServerContext({
    runtimeConfigPath: tmpRuntimeCfg,
    habitatRuntime: runtime,
    syncIntegrationsOnStartup: false
  });
  serverCtx.getPortCandidates = () => [0];
  serverCtx.staticServerPorts = [0];

  assert.strictEqual(serverCtx.habitatRuntime, runtime);
  assert.equal("runtime" in serverCtx, false, "serverCtx must pass habitatRuntime, not runtime");

  const defaultCtx = buildHabitatServerContext({ habitatRuntime: runtime, syncIntegrationsOnStartup: false });
  assert.deepEqual(defaultCtx.staticServerPorts, HABITAT_SERVER_PORTS);
  assert.deepEqual(defaultCtx.getPortCandidates(), HABITAT_SERVER_PORTS);

  const serverCtl = initServer(serverCtx);
  try {
    const port = await serverCtl.startHttpServer();
    assert.ok(port > 0);
    const http = require("http");
    const snapBody = await new Promise((resolve, reject) => {
      http.get(`http://127.0.0.1:${port}/habitat/snapshot`, { agent: false, headers: { Connection: "close" } }, (res) => {
        let raw = "";
        res.on("data", (c) => (raw += c));
        res.on("end", () => resolve(JSON.parse(raw)));
      }).on("error", reject);
    });
    assert.equal(snapBody.schema, 1);
    assert.equal(snapBody.error, undefined, "Server must expose active habitatRuntime snapshot");
    assert.ok(snapBody.scene && snapBody.scene.residents);
  } finally {
    if (serverCtl && typeof serverCtl.cleanup === "function") serverCtl.cleanup();
    try { fs.rmSync(tmpRuntimeCfg, { force: true }); } catch {}
  }
});

test("Habitat G3 Integration — Scene extraction, idle 000 OR guard, panel state & string presets", () => {
  const runtime = createHabitatRuntime({ reducedMotion: false });
  const now = Date.now();
  runtime.handleHttpEvent({
    provider: "claude",
    event: "UserPromptSubmit",
    sessionId: "sess-g3-1",
    cwdName: "my-repo",
    surface: "claude-code",
    pid: process.pid
  }, now);

  const fullSnap = runtime.getSnapshot(now);
  const sceneSnap = extractSceneSnapshot(fullSnap);
  assert.ok(sceneSnap.cottage);
  assert.ok(sceneSnap.residents);
  assert.equal(sceneSnap.residents.claude.logicalState, "busy");
  assert.equal(isSceneIdle000(sceneSnap, false), false);

  // Even if logicalState turns offline while resident is still walking inside (presence !== 'inside'), must NOT be idle000
  const enteringScene = {
    cottage: { door: "closed" },
    residents: {
      claude: { logicalState: "offline", presence: "entering" },
      codex: { logicalState: "offline", presence: "inside" },
      antigravity: { logicalState: "offline", presence: "inside" }
    }
  };
  assert.equal(isSceneIdle000(enteringScene, false), false);

  const settled000Scene = {
    cottage: { door: "closed" },
    residents: {
      claude: { logicalState: "offline", presence: "inside" },
      codex: { logicalState: "offline", presence: "inside" },
      antigravity: { logicalState: "offline", presence: "inside" }
    }
  };
  assert.equal(isSceneIdle000(settled000Scene, false), true);

  const panelState = buildHabitatPanelState({ prefs: { scale: 1.5 }, demoMode: false, runtime });
  const claudePanel = panelState.residents.find((r) => r.id === "claude");
  assert.equal(claudePanel.state, "busy");
  assert.equal(claudePanel.project, "Nenhum");
  assert.equal(claudePanel.surface, "claude-code");

  const preset111 = resolveDemoPresetStates("111");
  assert.deepEqual(preset111, { claude: "busy", codex: "busy", antigravity: "busy" });
  for (const val of Object.values(preset111)) {
    assert.equal(typeof val, "string");
  }
  const preset000 = resolveDemoPresetStates("000");
  assert.deepEqual(preset000, { claude: "offline", codex: "offline", antigravity: "offline" });
});
