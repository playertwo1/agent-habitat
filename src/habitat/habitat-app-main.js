"use strict";

const path = require("path");
const fs = require("fs");
const { loadAndValidateHabitatManifest } = require("./manifest-validator");
const { createHabitatRuntime } = require("./habitat-runtime");
const { createHabitatSceneMachine } = require("./scene-machine");
const { loadHabitatPrefs, saveHabitatPrefs } = require("./habitat-prefs");
const { computeHabitatHitRects, classifyHabitatHitPoint } = require("./habitat-hit-geometry");
const { createHitWindowActivationRuntime } = require("../win-hit-window-activation");
const { resolveTargetDisplayWorkArea, computeSafeStageBounds, computeSafePanelBounds } = require("./habitat-display-layout");
const initServer = require("../server");
const {
  HABITAT_SERVER_PORTS,
  defaultHabitatRuntimeConfigPath,
  shouldSyncHooksOnStartup
} = require("../habitat-identity");
const {
  installHabitatHooks,
  uninstallHabitatHooks,
  planHabitatHookSync
} = require("./habitat-hook-sync");
const { createHabitatFocusController } = require("./habitat-focus");
const { createHabitatCardManager } = require("./habitat-cards");
const { createForegroundFullscreenProbe } = require("../win-fullscreen-detect");

function resolveHabitatAppPaths(baseDir = __dirname) {
  const repoRoot = path.join(baseDir, "../..");
  return {
    repoRoot,
    manifestPath: path.join(repoRoot, "assets/habitat/cozy-cottage/habitat-manifest.json"),
    trayIconPath: path.join(repoRoot, "assets/icon.png"),
    stageHtml: path.join(baseDir, "habitat-stage.html"),
    stagePreload: path.join(baseDir, "habitat-stage-preload.js"),
    hitHtml: path.join(baseDir, "habitat-hit.html"),
    hitPreload: path.join(baseDir, "habitat-hit-preload.js"),
    cardHtml: path.join(baseDir, "habitat-card.html"),
    cardPreload: path.join(baseDir, "habitat-card-preload.js"),
    panelHtml: path.join(baseDir, "habitat-panel.html"),
    panelPreload: path.join(baseDir, "habitat-panel-preload.js")
  };
}

function buildHabitatServerContext({ runtimeConfigPath, habitatRuntime, syncIntegrationsOnStartup } = {}) {
  return {
    runtimeConfigPath: runtimeConfigPath || defaultHabitatRuntimeConfigPath(),
    getPortCandidates: () => HABITAT_SERVER_PORTS,
    staticServerPorts: HABITAT_SERVER_PORTS,
    habitatRuntime,
    syncIntegrationsOnStartup: typeof syncIntegrationsOnStartup === "boolean"
      ? syncIntegrationsOnStartup
      : shouldSyncHooksOnStartup()
  };
}

function extractSceneSnapshot(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return { residents: {} };
  return snapshot.scene && typeof snapshot.scene === "object" ? snapshot.scene : snapshot;
}

function createAdaptiveStageLoop({
  isIdle000,
  onTick,
  setIntervalFn = setInterval,
  clearIntervalFn = clearInterval,
  intervalMs = 33,
  reconcileMs = 5000,
  hasTrackedSessions,
  onReconcile
} = {}) {
  let tickTimer = null;
  let reconcileTimer = null;
  let running = false;

  function syncReconcileTimer() {
    const hasSess = typeof hasTrackedSessions === "function" ? hasTrackedSessions() : false;
    if (hasSess) {
      if (!reconcileTimer) {
        reconcileTimer = setIntervalFn(() => {
          try {
            if (typeof onReconcile === "function") {
              onReconcile();
            }
          } catch {}
        }, reconcileMs);
      }
    } else {
      if (reconcileTimer) {
        clearIntervalFn(reconcileTimer);
        reconcileTimer = null;
      }
    }
  }

  function tickCheck() {
    try {
      const idle = typeof isIdle000 === "function" ? isIdle000() : false;
      if (idle) {
        // Stop tick when stable 000 inside cottage with door closed (T23)
        if (tickTimer) {
          clearIntervalFn(tickTimer);
          tickTimer = null;
        }
      } else {
        if (typeof onTick === "function") {
          onTick();
        }
      }
      syncReconcileTimer();
    } catch {}
  }

  function start() {
    running = true;
    wake();
  }

  function wake() {
    if (!running) return;
    const idle = typeof isIdle000 === "function" ? isIdle000() : false;
    if (!idle) {
      if (!tickTimer) {
        tickTimer = setIntervalFn(tickCheck, intervalMs);
      }
    }
    syncReconcileTimer();
  }

  function getState() {
    return {
      tickRunning: Boolean(tickTimer),
      reconcileRunning: Boolean(reconcileTimer)
    };
  }

  function dispose() {
    running = false;
    if (tickTimer) {
      clearIntervalFn(tickTimer);
      tickTimer = null;
    }
    if (reconcileTimer) {
      clearIntervalFn(reconcileTimer);
      reconcileTimer = null;
    }
  }

  return {
    start,
    wake,
    syncReconcileTimer,
    getState,
    dispose
  };
}

function isSceneIdle000(sceneSnap, isDemoMode = false) {
  if (isDemoMode || !sceneSnap || typeof sceneSnap !== "object") return false;
  const resMap = sceneSnap.residents || {};
  for (const p of ["claude", "codex", "antigravity"]) {
    const r = resMap[p];
    if (r && ((r.logicalState || r.state || "offline") !== "offline" || r.presence !== "inside")) {
      return false;
    }
  }
  const doorState = (sceneSnap.cottage && sceneSnap.cottage.door) || sceneSnap.doorState || (sceneSnap.door && sceneSnap.door.state) || "closed";
  return doorState === "closed";
}

function clampStageBoundsToWorkArea(bounds, workArea) {
  const x = Math.max(workArea.x, Math.min(bounds.x, workArea.x + workArea.width - bounds.width));
  const y = Math.max(workArea.y, Math.min(bounds.y, workArea.y + workArea.height - bounds.height));
  return { x, y, width: bounds.width, height: bounds.height };
}

function buildTrayTemplateModel({ prefs, demoMode }) {
  return [
    { label: "Abrir painel", id: "open-panel" },
    { type: "separator" },
    { label: demoMode ? "Sair do Modo Demonstração" : "Modo Demonstração", id: "toggle-demo" },
    { label: "Presets: 000 / 100 / 010 / 001 / 111", id: "demo-presets" },
    { type: "separator" },
    { label: prefs.clickThrough ? "Desativar clique através" : "Permitir clique através da cabana", id: "toggle-click-through" },
    { label: prefs.alwaysOnTop ? "Desativar sempre no topo" : "Manter sempre no topo", id: "toggle-always-on-top" },
    { label: prefs.fullscreenAutoHide ? "Desativar ocultar em tela cheia" : "Ocultar em tela cheia", id: "toggle-fullscreen-auto-hide" },
    { label: prefs.reducedMotion ? "Movimento Normal" : "Reduzir movimento", id: "toggle-reduced-motion" },
    { label: `Escala Atual (${prefs.scale || 1.5}x)`, id: "select-scale" },
    { label: "Trazer para tela principal", id: "bring-to-primary" },
    { label: prefs.openAtLogin ? "Desativar iniciar com o Windows" : "Iniciar com o Windows", id: "toggle-open-at-login" },
    { type: "separator" },
    { label: "Sair do Agent Habitat", id: "quit" }
  ];
}

function resolveDemoPresetStates(presetName) {
  const p = typeof presetName === "string" ? presetName.trim() : "000";
  return {
    claude: p[0] === "1" ? "busy" : "offline",
    codex: p[1] === "1" ? "busy" : "offline",
    antigravity: p[2] === "1" ? "busy" : "offline"
  };
}

function computeHabitatDiagnostics(runtime, { inspectLiveProcesses = false } = {}) {
  let surfaces = {};
  if (runtime && typeof runtime.inspectSurfaces === "function") {
    try {
      surfaces = runtime.inspectSurfaces({ inspectLiveProcesses }) || {};
    } catch {}
  }
  let targets = {};
  try {
    const plan = planHabitatHookSync();
    targets = (plan && plan.targets) || {};
  } catch {}
  return {
    claudeHook: {
      detected: Boolean(surfaces.claudeCli),
      installed: Boolean(targets.claude && targets.claude.hasMarker)
    },
    claudeDesktop: Boolean(surfaces.claudeDesktop),
    codexHook: {
      detected: Boolean(surfaces.codexCli),
      installed: Boolean(targets.codex && targets.codex.hasMarker)
    },
    codexRollout: Boolean(surfaces.codexDesktop),
    antigravityHook: {
      detected: Boolean(surfaces.antigravityCli),
      installed: Boolean(targets.antigravity && targets.antigravity.hasMarker)
    },
    antigravityExtension: Boolean(surfaces.antigravityIde)
  };
}

function resolveAggregatorSession(runtime, fullSnap, providerId) {
  if (runtime && typeof runtime.getSessionForFocus === "function") {
    const sess = runtime.getSessionForFocus(providerId);
    if (sess) return sess;
  }
  const agg = fullSnap && fullSnap.aggregator;
  if (!agg) return null;
  if (agg.sessions && agg.sessions[providerId]) {
    const entry = agg.sessions[providerId];
    if (Array.isArray(entry)) return entry[0] || null;
    if (typeof entry === "object") {
      if (entry.sessionId || entry.cwdName || entry.surface) return entry;
      const vals = Object.values(entry);
      return vals[0] || null;
    }
  }
  const aggRes = agg.residents && agg.residents[providerId];
  if (aggRes && Array.isArray(aggRes.sessions) && aggRes.sessions.length > 0) {
    const sorted = [...aggRes.sessions].sort((a, b) => (b.lastEventAt || 0) - (a.lastEventAt || 0));
    return sorted[0] || null;
  }
  return null;
}

function buildHabitatPanelState({ prefs, demoMode, runtime, demoSceneMachine, diagnostics } = {}) {
  const now = Date.now();
  const fullSnap = runtime && typeof runtime.getSnapshot === "function" ? runtime.getSnapshot(now) : null;
  const demoSnap = demoMode && demoSceneMachine && typeof demoSceneMachine.getSnapshot === "function"
    ? demoSceneMachine.getSnapshot(now)
    : null;
  const sceneSnap = demoSnap || extractSceneSnapshot(fullSnap);
  const residentsSnap = sceneSnap.residents || {};

  const residentDefs = [
    { id: "claude", name: "Claude Code", defaultSurface: "Conector local do Claude" },
    { id: "codex", name: "Codex", defaultSurface: "Conector local do Codex" },
    { id: "antigravity", name: "Antigravity", defaultSurface: "Conector local do Antigravity" }
  ];

  const residentList = residentDefs.map(({ id, name, defaultSurface }) => {
    const sceneRes = residentsSnap[id] || {};
    const session = resolveAggregatorSession(runtime, fullSnap, id);
    return {
      id,
      name,
      state: sceneRes.logicalState || sceneRes.state || "offline",
      project: (session && session.cwdName) || sceneRes.cwdName || "Nenhum",
      surface: (session && session.surface) || sceneRes.surface || defaultSurface
    };
  });

  return {
    scale: (prefs && prefs.scale) || 1.5,
    prefs: prefs || {},
    demoMode: !!demoMode,
    residents: residentList,
    diagnostics: diagnostics || computeHabitatDiagnostics(runtime, { inspectLiveProcesses: false })
  };
}

function runHabitatAppMode(electron) {
  const { app, BrowserWindow, Tray, Menu, screen, ipcMain, nativeImage } = electron;

  const gotSingleInstanceLock = app.requestSingleInstanceLock();
  if (!gotSingleInstanceLock) {
    app.quit();
    return;
  }

  const appPaths = resolveHabitatAppPaths(__dirname);
  const { repoRoot, manifestPath } = appPaths;
  const validation = loadAndValidateHabitatManifest({ manifestPath, repoRoot, checkFiles: true });
  if (!validation.ok) {
    console.error("Habitat manifest validation failed:", validation.errors);
  }

  const manifestData = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const manifestDir = path.dirname(manifestPath);
  const manifestDirUrl = `file://${path.resolve(manifestDir).replace(/\\/g, "/")}/`;

  const atomMetaMap = {};
  const atomDir = path.join(manifestDir, "../actors/atom");
  if (fs.existsSync(atomDir)) {
    try {
      const files = fs.readdirSync(atomDir);
      for (const f of files) {
        if (f.endsWith(".json")) {
          atomMetaMap[f] = JSON.parse(fs.readFileSync(path.join(atomDir, f), "utf8"));
        }
      }
    } catch {}
  }

  const prefsPath = path.join(path.dirname(defaultHabitatRuntimeConfigPath()), "prefs.json");
  let prefs = loadHabitatPrefs(prefsPath);

  let renderWin = null;
  let hitWin = null;
  let hitActivationRuntime = null;
  let stageLoop = null;
  let panelWin = null;
  let tray = null;
  let demoMode = false;
  let serverCtl = null;
  let tickInterval = null;
  let fullscreenProbe = null;
  let fullscreenCheckInterval = null;
  let isFullscreenHidden = false;
  let hitActivationCtrl = null;
  let lastDiagnostics = null;
  let lastRenderSceneKey = "";
  let lastHitRectsHash = "";

  const demoSceneMachine = createHabitatSceneMachine({
    manifest: manifestData,
    mode: "demo",
    reducedMotion: !!prefs.reducedMotion
  });

  const focusController = createHabitatFocusController();

  let runtime = null;

  async function focusProviderSession(provider) {
    const session = runtime && typeof runtime.getSessionForFocus === "function"
      ? runtime.getSessionForFocus(provider)
      : null;
    const res = await focusController.focusSession({
      provider,
      sourcePid: session ? session.pid : undefined,
      pid: session ? session.pid : undefined,
      ppid: session ? session.ppid : undefined,
      surface: session ? session.surface : undefined,
      cwd: session ? session.cwdName : undefined
    });
    if (!res || !res.ok) {
      togglePanel();
    }
    return res || { ok: false };
  }

  const cardManager = createHabitatCardManager({
    BrowserWindow,
    cardHtmlPath: appPaths.cardHtml,
    preloadPath: appPaths.cardPreload,
    cardsEnabled: !!prefs.cardsEnabled,
    onFocusProvider: async (provider) => {
      await focusProviderSession(provider);
    }
  });

  cardManager.attachIpc(ipcMain);

  runtime = createHabitatRuntime({
    repoRoot,
    manifestPath,
    reducedMotion: !!prefs.reducedMotion,
    onActivity: () => { if (stageLoop) stageLoop.wake(); },
    onPermissionRequest: async (payload) => {
      if (!prefs.cardsEnabled || demoMode) return "ask";
      if (!renderWin || renderWin.isDestroyed()) return "ask";
      const stageBounds = renderWin.getBounds();
      const workArea = resolveTargetDisplayWorkArea({ bounds: stageBounds, ...getDisplaysSnapshot() });
      const decisionResult = await cardManager.requestPermission({
        id: payload.id || `perm-${Date.now()}`,
        provider: payload.provider,
        cwdName: payload.cwdName || "projeto",
        summary: payload.summary || payload.tool || "Aprovação de ferramenta",
        stageBounds,
        workArea
      });
      return decisionResult.decision || "ask";
    },
    onStateTransition: ({ provider, state, resident }) => {
      if (demoMode || !prefs.cardsEnabled || !renderWin || renderWin.isDestroyed()) return;
      const stageBounds = renderWin.getBounds();
      const workArea = resolveTargetDisplayWorkArea({ bounds: stageBounds, ...getDisplaysSnapshot() });
      const cardOpts = {
        id: `${provider}-${Date.now()}`,
        provider,
        cwdName: (resident && resident.cwdName) || "projeto",
        summary: (resident && resident.summary) || `Estado: ${state}`,
        stageBounds,
        workArea
      };
      if (state === "done") {
        cardManager.showCompletionCard(cardOpts);
      } else if (state === "waiting_input" || state === "needs_approval") {
        cardManager.showQuestionCard(cardOpts);
      }
    }
  });

  function getActiveSceneSnapshot(now = Date.now()) {
    return demoMode
      ? demoSceneMachine.getSnapshot(now)
      : extractSceneSnapshot(runtime.getSnapshot(now));
  }

  function getPanelState() {
    if (!lastDiagnostics) {
      lastDiagnostics = computeHabitatDiagnostics(runtime, { inspectLiveProcesses: false });
    }
    return buildHabitatPanelState({
      prefs,
      demoMode,
      runtime,
      demoSceneMachine,
      diagnostics: lastDiagnostics
    });
  }

  function pushPanelState(stateOverride) {
    if (panelWin && !panelWin.isDestroyed()) {
      panelWin.webContents.send("habitat:state-update", stateOverride || getPanelState());
    }
  }

  function updateHitShapes(currentSceneSnap, scaleVal) {
    if (!hitWin || hitWin.isDestroyed()) return;
    try {
      const hit = computeHabitatHitRects({ manifest: manifestData, snapshot: currentSceneSnap, scale: scaleVal });
      if (hit && Array.isArray(hit.rects)) {
        const mappedRects = hit.rects.map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
        const hash = JSON.stringify(mappedRects);
        if (hash !== lastHitRectsHash) {
          lastHitRectsHash = hash;
          if (typeof hitWin.setShape === "function") {
            hitWin.setShape(mappedRects);
          }
        }
      }
    } catch {}
  }

  function pushStageFrame({ force = false, now = Date.now() } = {}) {
    if (!renderWin || renderWin.isDestroyed()) return;
    const sceneSnap = getActiveSceneSnapshot(now);
    const scaleVal = prefs.scale || 1.5;
    const idle000 = isSceneIdle000(sceneSnap, demoMode);
    const sceneKey = JSON.stringify({
      ...sceneSnap,
      nowMs: 0,
      scale: scaleVal,
      reducedMotion: !!prefs.reducedMotion
    });

    if (force || !idle000 || sceneKey !== lastRenderSceneKey) {
      lastRenderSceneKey = sceneKey;
      renderWin.webContents.send("habitat-stage:render", {
        manifest: manifestData,
        manifestDirUrl,
        atomMetaMap,
        scale: scaleVal,
        reducedMotion: !!prefs.reducedMotion,
        snapshot: sceneSnap
      });
      updateHitShapes(sceneSnap, scaleVal);
    }
  }

  function syncFullscreenWatcher() {
    if (prefs.fullscreenAutoHide) {
      if (!fullscreenCheckInterval) {
        fullscreenCheckInterval = setInterval(() => {
          if (!renderWin || renderWin.isDestroyed() || !fullscreenProbe) return;
          const isFull = Boolean(fullscreenProbe());
          if (isFull && !isFullscreenHidden) {
            isFullscreenHidden = true;
            if (renderWin && !renderWin.isDestroyed()) renderWin.hide();
            if (hitWin && !hitWin.isDestroyed()) hitWin.hide();
          } else if (!isFull && isFullscreenHidden) {
            isFullscreenHidden = false;
            if (renderWin && !renderWin.isDestroyed()) {
              renderWin.showInactive();
              if (!prefs.clickThrough && hitWin && !hitWin.isDestroyed()) hitWin.showInactive();
            }
          }
        }, 1500);
      }
    } else {
      if (fullscreenCheckInterval) {
        clearInterval(fullscreenCheckInterval);
        fullscreenCheckInterval = null;
      }
      if (isFullscreenHidden) {
        isFullscreenHidden = false;
        if (renderWin && !renderWin.isDestroyed()) renderWin.showInactive();
        if (!prefs.clickThrough && hitWin && !hitWin.isDestroyed()) hitWin.showInactive();
      }
    }
  }

  app.whenReady().then(async () => {
    const runtimeConfigPath = defaultHabitatRuntimeConfigPath();
    const serverCtx = buildHabitatServerContext({
      runtimeConfigPath,
      habitatRuntime: runtime,
      syncIntegrationsOnStartup: shouldSyncHooksOnStartup()
    });

    serverCtl = initServer(serverCtx);
    if (serverCtl && typeof serverCtl.startHttpServer === "function") {
      try {
        await serverCtl.startHttpServer();
      } catch (err) {
        console.error("Failed to start HTTP server:", err);
      }
    }

    fullscreenProbe = createForegroundFullscreenProbe({ isWin: process.platform === "win32" });
    syncFullscreenWatcher();

    const scale = prefs.scale || 1.5;
    const canvasWidth = manifestData.canvas.width;
    const canvasHeight = manifestData.canvas.height;

    function getDisplaysSnapshot() {
      return {
        displays: screen.getAllDisplays(),
        primaryDisplay: screen.getPrimaryDisplay(),
        getDisplayMatching: (b) => screen.getDisplayMatching(b)
      };
    }

    const initialBounds = computeSafeStageBounds({
      manifest: manifestData,
      scale,
      savedPosition: prefs.windowPosition,
      ...getDisplaysSnapshot()
    });

    const winWidth = initialBounds.width;
    const winHeight = initialBounds.height;
    const initialPos = { x: initialBounds.x, y: initialBounds.y };

    renderWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: initialPos.x,
      y: initialPos.y,
      transparent: true,
      frame: false,
      skipTaskbar: true,
      focusable: false,
      resizable: false,
      alwaysOnTop: !!prefs.alwaysOnTop,
      webPreferences: {
        preload: appPaths.stagePreload,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    renderWin.setIgnoreMouseEvents(true, { forward: false });
    renderWin.loadFile(appPaths.stageHtml);

    hitActivationRuntime = createHitWindowActivationRuntime({ isWin: process.platform === "win32", getHitWindow: () => hitWin, onError: () => {} });

    hitWin = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      x: initialPos.x,
      y: initialPos.y,
      transparent: true,
      frame: false,
      skipTaskbar: true,
      focusable: hitActivationRuntime.windowsHitWindowFocusable,
      resizable: false,
      alwaysOnTop: !!prefs.alwaysOnTop,
      webPreferences: {
        preload: appPaths.hitPreload,
        contextIsolation: true,
        nodeIntegration: false,
        backgroundThrottling: false
      }
    });

    if (hitActivationRuntime && hitActivationRuntime.controller && typeof hitActivationRuntime.controller.prepare === "function") {
      hitActivationRuntime.controller.prepare(hitWin);
    }
    hitWin.loadFile(appPaths.hitHtml);
    hitWin.webContents.once("did-finish-load", () => {
      if (hitActivationRuntime && typeof hitActivationRuntime.setHitWinFocusable === "function") {
        hitActivationRuntime.setHitWinFocusable(false);
      }
    });

    updateHitShapes(getActiveSceneSnapshot(Date.now()), scale);

    if (prefs.clickThrough) {
      hitWin.setIgnoreMouseEvents(true);
      hitWin.hide();
    }

    let trayIconImg = nativeImage.createEmpty();
    if (fs.existsSync(appPaths.trayIconPath)) {
      trayIconImg = nativeImage.createFromPath(appPaths.trayIconPath);
    }
    tray = new Tray(trayIconImg.isEmpty() ? nativeImage.createEmpty() : trayIconImg);
    tray.setToolTip("Agent Habitat");
    updateTrayMenu();

    tray.on("click", () => {
      togglePanel();
    });

    function relayoutWindows() {
      if (!renderWin || renderWin.isDestroyed()) return;
      const scale = prefs.scale || 1.5;
      const savedPos = renderWin.getBounds();
      const safeBounds = computeSafeStageBounds({
        manifest: manifestData,
        scale,
        savedPosition: savedPos,
        ...getDisplaysSnapshot()
      });
      renderWin.setBounds(safeBounds);
      if (hitWin && !hitWin.isDestroyed()) {
        hitWin.setBounds(safeBounds);
      }
      prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { windowPosition: { x: safeBounds.x, y: safeBounds.y } } });
      if (panelWin && !panelWin.isDestroyed()) {
        const workArea = resolveTargetDisplayWorkArea({ bounds: safeBounds, ...getDisplaysSnapshot() });
        const panelBounds = computeSafePanelBounds({ stageBounds: safeBounds, panelWidth: 480, panelHeight: 640, workArea });
        panelWin.setBounds(panelBounds);
      }
    }

    screen.on("display-added", relayoutWindows);
    screen.on("display-removed", relayoutWindows);
    screen.on("display-metrics-changed", relayoutWindows);

    ipcMain.on("habitat-stage:ready", () => {
      pushStageFrame({ force: true });
    });

    stageLoop = createAdaptiveStageLoop({
      isIdle000: () => isSceneIdle000(getActiveSceneSnapshot(Date.now()), demoMode),
      onTick: () => pushStageFrame(),
      intervalMs: 33,
      reconcileMs: 5000,
      hasTrackedSessions: () => runtime.hasTrackedSessions(Date.now()),
      onReconcile: () => {
        runtime.reconcile(Date.now());
        pushStageFrame();
      }
    });
    stageLoop.wake();

    ipcMain.on("habitat-hit:click", async (event, pt) => {
      if (!pt || typeof pt.x !== "number" || typeof pt.y !== "number") return;
      const now = Date.now();
      const currentSceneSnap = getActiveSceneSnapshot(now);
      const hitResult = classifyHabitatHitPoint({
        x: pt.x,
        y: pt.y,
        manifest: manifestData,
        snapshot: currentSceneSnap,
        scale: prefs.scale || 1.5
      });

      if (hitResult && hitResult.target === "resident" && hitResult.provider) {
        await focusProviderSession(hitResult.provider);
      } else if (hitResult && hitResult.target === "cottage") {
        togglePanel();
      }
    });

    ipcMain.on("habitat-hit:drag", (event, { dx, dy }) => {
      if (!renderWin || renderWin.isDestroyed() || !hitWin || hitWin.isDestroyed()) return;
      const [rx, ry] = renderWin.getPosition();
      const newX = rx + dx;
      const newY = ry + dy;
      renderWin.setPosition(newX, newY);
      hitWin.setPosition(newX, newY);
      prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { windowPosition: { x: newX, y: newY } } });
    });

    ipcMain.on("habitat-hit:drag-end", () => {
      relayoutWindows();
    });
    ipcMain.on("habitat-hit:context-menu", () => {
      if (tray && typeof tray.popUpContextMenu === "function") {
        tray.popUpContextMenu();
      }
    });

    ipcMain.handle("habitat:get-state", () => {
      return getPanelState();
    });

    ipcMain.handle("habitat:update-pref", (event, key, val) => {
      prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { [key]: val } });
      if (key === "openAtLogin" && typeof app.setLoginItemSettings === "function") {
        app.setLoginItemSettings({ openAtLogin: !!prefs.openAtLogin });
      }
      applyPrefsChanges();
      updateTrayMenu();
      const state = getPanelState();
      pushPanelState(state);
      return state;
    });

    ipcMain.handle("habitat:set-demo-state", (event, stateObj) => {
      demoMode = true;
      const now = Date.now();
      demoSceneMachine.setAllProviders(stateObj && typeof stateObj === "object" ? stateObj : {}, now);
      demoSceneMachine.tick(now);
      if (stageLoop) stageLoop.wake();
      pushStageFrame({ force: true, now });
      updateTrayMenu();
      const state = getPanelState();
      pushPanelState(state);
      return state;
    });

    ipcMain.handle("habitat:trigger-demo-preset", (event, presetName) => {
      demoMode = true;
      const now = Date.now();
      demoSceneMachine.setAllProviders(resolveDemoPresetStates(presetName), now);
      demoSceneMachine.tick(now);
      if (stageLoop) stageLoop.wake();
      pushStageFrame({ force: true, now });
      updateTrayMenu();
      const state = getPanelState();
      pushPanelState(state);
      return state;
    });

    ipcMain.handle("habitat:stop-demo", () => {
      demoMode = false;
      if (stageLoop) stageLoop.wake();
      pushStageFrame({ force: true });
      updateTrayMenu();
      const state = getPanelState();
      pushPanelState(state);
      return state;
    });

    ipcMain.handle("habitat:focus-provider", async (event, provider) => {
      const res = await focusProviderSession(provider);
      return { ok: Boolean(res && res.ok), method: res && res.method, pid: res && res.pid };
    });

    ipcMain.handle("habitat:refresh-diagnostics", () => {
      lastDiagnostics = computeHabitatDiagnostics(runtime, { inspectLiveProcesses: true });
      const state = getPanelState();
      pushPanelState(state);
      return state;
    });

    ipcMain.handle("habitat:request-hook-sync", async (event, opts) => {
      if (!opts || !opts.confirm) return { ok: false, error: "confirmation-required" };
      try {
        const result = installHabitatHooks({ confirm: true });
        lastDiagnostics = computeHabitatDiagnostics(runtime, { inspectLiveProcesses: false });
        const state = getPanelState();
        pushPanelState(state);
        return { ok: Boolean(result && result.ok), result, state };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    ipcMain.handle("habitat:uninstall-hooks", async () => {
      try {
        const result = uninstallHabitatHooks();
        lastDiagnostics = computeHabitatDiagnostics(runtime, { inspectLiveProcesses: false });
        const state = getPanelState();
        pushPanelState(state);
        return { ok: Boolean(result && result.ok), result, state };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    ipcMain.handle("habitat:close", () => {
      if (panelWin && !panelWin.isDestroyed()) {
        panelWin.close();
      }
      return { ok: true };
    });
  });

  app.on("second-instance", () => {
    if (renderWin && !renderWin.isDestroyed()) {
      if (renderWin.isMinimized()) renderWin.restore();
      renderWin.focus();
    }
  });

  app.on("before-quit", () => {
    if (stageLoop) {
      try { stageLoop.dispose(); } catch {}
    }
    if (hitActivationRuntime && hitActivationRuntime.controller && typeof hitActivationRuntime.controller.dispose === "function") {
      try { hitActivationRuntime.controller.dispose(); } catch {}
    }
    try {
      screen.removeListener("display-added", relayoutWindows);
      screen.removeListener("display-removed", relayoutWindows);
      screen.removeListener("display-metrics-changed", relayoutWindows);
    } catch {}
    if (fullscreenCheckInterval) clearInterval(fullscreenCheckInterval);
    try { cardManager.dispose(); } catch {}
    if (serverCtl && typeof serverCtl.cleanup === "function") {
      try { serverCtl.cleanup(); } catch {}
    }
    if (runtime && typeof runtime.dispose === "function") {
      try { runtime.dispose(); } catch {}
    }
  });

  function applyPrefsChanges() {
    demoSceneMachine.setReducedMotion(!!prefs.reducedMotion, Date.now());
    if (runtime && typeof runtime.setReducedMotion === "function") {
      runtime.setReducedMotion(!!prefs.reducedMotion, Date.now());
    }
    cardManager.setCardsEnabled(!!prefs.cardsEnabled);
    syncFullscreenWatcher();

    if (!renderWin || renderWin.isDestroyed() || !hitWin || hitWin.isDestroyed()) return;
    const alwaysOnTop = !!prefs.alwaysOnTop;
    renderWin.setAlwaysOnTop(alwaysOnTop);
    hitWin.setAlwaysOnTop(alwaysOnTop);

    const scale = prefs.scale || 1.5;
    relayoutWindows();

    if (prefs.clickThrough) {
      hitWin.setIgnoreMouseEvents(true);
      hitWin.hide();
    } else {
      hitWin.setIgnoreMouseEvents(false);
      if (!isFullscreenHidden) hitWin.showInactive();
    }

    if (stageLoop) stageLoop.wake();
    pushStageFrame({ force: true });
  }

  function updateTrayMenu() {
    if (!tray) return;
    const template = buildTrayTemplateModel({ prefs, demoMode }).map(item => {
      if (item.type === "separator") return { type: "separator" };
      return {
        label: item.label,
        click: () => {
          if (item.id === "open-panel") {
            togglePanel();
          } else if (item.id === "toggle-demo") {
            demoMode = !demoMode;
            pushStageFrame({ force: true });
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "demo-presets") {
            demoMode = true;
            const now = Date.now();
            demoSceneMachine.setAllProviders(resolveDemoPresetStates("111"), now);
            demoSceneMachine.tick(now);
            pushStageFrame({ force: true, now });
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "toggle-click-through") {
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { clickThrough: !prefs.clickThrough } });
            applyPrefsChanges();
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "toggle-always-on-top") {
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { alwaysOnTop: !prefs.alwaysOnTop } });
            applyPrefsChanges();
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "toggle-fullscreen-auto-hide") {
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { fullscreenAutoHide: !prefs.fullscreenAutoHide } });
            applyPrefsChanges();
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "toggle-reduced-motion") {
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { reducedMotion: !prefs.reducedMotion } });
            applyPrefsChanges();
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "select-scale") {
            const nextScale = prefs.scale === 2 ? 1 : (prefs.scale === 1 ? 1.5 : 2);
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { scale: nextScale } });
            applyPrefsChanges();
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "bring-to-primary") {
            const primaryDisplay = screen.getPrimaryDisplay();
            const workArea = primaryDisplay.workArea;
            const scale = prefs.scale || 1.5;
            const winWidth = Math.round(manifestData.canvas.width * scale);
            const winHeight = Math.round(manifestData.canvas.height * scale);
            const newX = workArea.x + workArea.width - winWidth - 30;
            const newY = workArea.y + workArea.height - winHeight - 30;
            if (renderWin && !renderWin.isDestroyed() && hitWin && !hitWin.isDestroyed()) {
              renderWin.setPosition(newX, newY);
              hitWin.setPosition(newX, newY);
            }
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { windowPosition: { x: newX, y: newY } } });
            pushPanelState();
          } else if (item.id === "toggle-open-at-login") {
            prefs = saveHabitatPrefs({ filePath: prefsPath, patch: { openAtLogin: !prefs.openAtLogin } });
            if (typeof app.setLoginItemSettings === "function") {
              app.setLoginItemSettings({ openAtLogin: !!prefs.openAtLogin });
            }
            updateTrayMenu();
            pushPanelState();
          } else if (item.id === "quit") {
            app.quit();
          }
        }
      };
    });
    tray.setContextMenu(Menu.buildFromTemplate(template));
  }

  function togglePanel() {
    if (panelWin && !panelWin.isDestroyed()) {
      panelWin.focus();
      return;
    }
    const stageBounds = renderWin && !renderWin.isDestroyed() ? renderWin.getBounds() : { x: 100, y: 100, width: 320, height: 180 };
    const workArea = resolveTargetDisplayWorkArea({ bounds: stageBounds, ...getDisplaysSnapshot() });
    const panelBounds = computeSafePanelBounds({ stageBounds, panelWidth: 480, panelHeight: 640, workArea });

    panelWin = new BrowserWindow({
      width: panelBounds.width,
      height: panelBounds.height,
      x: panelBounds.x,
      y: panelBounds.y,
      backgroundColor: "#24232A",
      webPreferences: {
        preload: appPaths.panelPreload,
        contextIsolation: true,
        nodeIntegration: false
      }
    });
    panelWin.on("closed", () => {
      panelWin = null;
    });
    panelWin.loadFile(appPaths.panelHtml);
  }
}

module.exports = {
  runHabitatAppMode,
  resolveHabitatAppPaths,
  buildHabitatServerContext,
  extractSceneSnapshot,
  isSceneIdle000,
  buildTrayTemplateModel,
  clampStageBoundsToWorkArea,
  resolveDemoPresetStates,
  computeHabitatDiagnostics,
  buildHabitatPanelState,
  createAdaptiveStageLoop
};
