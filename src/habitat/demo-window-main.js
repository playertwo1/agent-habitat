const path = require('node:path');
const fs = require('node:fs');
const { loadAndValidateHabitatManifest } = require('./manifest-validator');
const { createHabitatSceneMachine } = require('./scene-machine');

function runHabitatDemoMode({ app, BrowserWindow, ipcMain, argv, repoRoot }) {
  const isCapture = argv.some(arg => arg.startsWith('--habitat-capture-previews'));
  let captureDir = null;
  if (isCapture) {
    const arg = argv.find(a => a.startsWith('--habitat-capture-previews'));
    if (arg && arg.includes('=')) {
      captureDir = arg.split('=')[1];
    } else {
      captureDir = 'dist/g1-previews';
    }
  }

  const manifestPath = path.join(repoRoot, 'assets/habitat/cozy-cottage/habitat-manifest.json');
  const validation = loadAndValidateHabitatManifest({ manifestPath, repoRoot, checkFiles: true });
  if (!validation.ok) {
    console.error('Habitat manifest validation failed:', validation.errors);
    app.exit(1);
    return;
  }

  const manifestData = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const manifestDir = path.dirname(manifestPath);
  const manifestDirUrl = `file://${path.resolve(manifestDir).replace(/\\/g, '/')}/`;

  // Read Atom meta maps
  const atomMetaMap = {};
  const atomDir = path.join(manifestDir, '../actors/atom');
  if (fs.existsSync(atomDir)) {
    const files = fs.readdirSync(atomDir);
    for (const f of files) {
      if (f.endsWith('.json')) {
        try {
          const content = fs.readFileSync(path.join(atomDir, f), 'utf8');
          atomMetaMap[f] = JSON.parse(content);
        } catch (e) {}
      }
    }
  }

  const sceneMachine = createHabitatSceneMachine({
    manifest: manifestData,
    mode: 'demo',
    reducedMotion: false
  });

  app.whenReady().then(async () => {
    const winWidth = isCapture ? 640 : 680;
    const winHeight = isCapture ? 384 : 670;

    const win = new BrowserWindow({
      width: winWidth,
      height: winHeight,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      alwaysOnTop: true,
      show: !isCapture,
      webPreferences: {
        preload: path.join(__dirname, 'demo-preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        webSecurity: true,
        backgroundThrottling: false
      }
    });

    let currentScale = 2;
    let reducedMotion = false;
    let idleSent = false;
    let providerStates = {
      claude: 'offline',
      codex: 'offline',
      antigravity: 'offline'
    };

    ipcMain.on('habitat-demo:get-init', (event) => {
      event.returnValue = {
        manifest: manifestData,
        manifestDirUrl,
        atomMetaMap,
        mode: isCapture ? 'capture' : 'demo',
        reducedMotion,
        initialSnapshot: sceneMachine.getSnapshot(Date.now())
      };
    });

    ipcMain.on('habitat-demo:close', () => {
      app.exit(0);
    });

    ipcMain.on('habitat-demo:drag', (event, { dx, dy }) => {
      const [x, y] = win.getPosition();
      win.setPosition(x + dx, y + dy);
    });

    ipcMain.on('habitat-demo:set-scale', (event, scale) => {
      currentScale = scale;
      idleSent = false;
      if (!isCapture && !win.isDestroyed()) {
        win.setSize(Math.max(680, Math.round(320 * scale) + 28), Math.round(192 * scale) + 280);
        win.webContents.send('habitat-demo:snapshot', sceneMachine.getSnapshot(Date.now()));
      }
    });

    ipcMain.on('habitat-demo:set-reduced-motion', (event, enabled) => {
      reducedMotion = enabled;
      idleSent = false;
      sceneMachine.setReducedMotion(enabled, Date.now());
    });

    ipcMain.on('habitat-demo:set-bg', (event, bg) => {
      // background handled in renderer
    });

    ipcMain.on('habitat-demo:set-provider', (event, { provider, state }) => {
      providerStates[provider] = state;
      idleSent = false;
      sceneMachine.setProviderState(provider, state, Date.now());
    });

    ipcMain.on('habitat-demo:set-providers', (event, states) => {
      providerStates = states;
      idleSent = false;
      sceneMachine.setAllProviders(states, Date.now());
    });

    win.loadFile(path.join(__dirname, 'habitat-demo.html'));

    // Ticker loop (only when not capture and when not fully idle/closed)
    const tickerInterval = setInterval(() => {
      if (isCapture || idleSent) return;
      const now = Date.now();
      sceneMachine.tick(now);
      const snapshot = sceneMachine.getSnapshot(now);

      // Check if all inside and door closed -> pause unnecessary frames until next command
      const allInside = Object.values(snapshot.residents).every(r => r.presence === 'inside');
      const doorClosed = snapshot.cottage.door === 'closed';

      if (!win.isDestroyed()) {
        win.webContents.send('habitat-demo:snapshot', snapshot);
      }
      if (allInside && doorClosed) {
        idleSent = true;
      }
    }, 33); // ~30 fps

    win.on('closed', () => {
      clearInterval(tickerInterval);
    });

    if (isCapture) {
      await runCapturePipeline({ win, sceneMachine, captureDir, repoRoot });
    }
  });
}

async function runCapturePipeline({ win, sceneMachine, captureDir, repoRoot }) {
  const resolvedCaptureDir = path.resolve(repoRoot, captureDir);
  if (!fs.existsSync(resolvedCaptureDir)) {
    fs.mkdirSync(resolvedCaptureDir, { recursive: true });
  }

  const brainPreviewsDir = path.join(require('node:os').homedir(), '.gemini', 'antigravity', 'brain', 'ecd8843d-3955-43d9-a5ef-7fe8baa9de01', 'g1-previews');
  if (!fs.existsSync(brainPreviewsDir)) {
    fs.mkdirSync(brainPreviewsDir, { recursive: true });
  }

  // Wait for webContents to finish loading and stage inner element to exist
  if (win.webContents.isLoading()) {
    await new Promise(resolve => win.webContents.once('did-finish-load', resolve));
  }
  await win.webContents.executeJavaScript(`
    new Promise((resolve, reject) => {
      const start = Date.now();
      const check = () => {
        if (document.getElementById('habitat-stage-inner')) return resolve(true);
        if (Date.now() - start > 5000) return reject(new Error('#habitat-stage-inner not found'));
        setTimeout(check, 50);
      };
      check();
    })
  `);

  const combinations = [
    { key: '000', states: { claude: 'offline', codex: 'offline', antigravity: 'offline' } },
    { key: '100', states: { claude: 'busy', codex: 'offline', antigravity: 'offline' } },
    { key: '010', states: { claude: 'offline', codex: 'busy', antigravity: 'offline' } },
    { key: '001', states: { claude: 'offline', codex: 'offline', antigravity: 'busy' } },
    { key: '110', states: { claude: 'busy', codex: 'busy', antigravity: 'offline' } },
    { key: '101', states: { claude: 'busy', codex: 'offline', antigravity: 'busy' } },
    { key: '011', states: { claude: 'offline', codex: 'busy', antigravity: 'busy' } },
    { key: '111', states: { claude: 'busy', codex: 'busy', antigravity: 'busy' } }
  ];

  const captureCombo = async (comboKey, bgName, filename) => {
    await win.webContents.executeJavaScript(`
      (() => {
        const root = document.getElementById('demo-root');
        root.className = 'bg-${bgName}';
        root.style.border = 'none';
        root.style.borderRadius = '0';
        root.style.boxShadow = 'none';
        document.getElementById('demo-controls').style.display = 'none';
        document.getElementById('demo-drag-header').style.display = 'none';
        document.getElementById('habitat-stage-container').style.padding = '0';
        return new Promise((resolve) => {
          const start = Date.now();
          const checkReady = () => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const imgsDone = imgs.every(img => !img.getAttribute('src') || img.complete);
            const objs = Array.from(document.querySelectorAll('object'));
            const objsDone = objs.every(o => o.parentElement.style.display === 'none' || (o.contentDocument && o.contentDocument.rootElement));
            const cvsDone = Array.from(document.querySelectorAll('canvas')).every(c => c.parentElement.style.display === 'none' || c.dataset.atomReady === 'true');
            if ((imgsDone && objsDone && cvsDone) || Date.now() - start > 3000) {
              return resolve(true);
            }
            setTimeout(checkReady, 30);
          };
          checkReady();
        });
      })()
    `);
    await new Promise(r => setTimeout(r, 900)); // allow <object> SVG & <canvas> Atom paint settle
    win.webContents.invalidate();
    await win.webContents.executeJavaScript('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))');

    const image = await win.webContents.capturePage();
    const pngBuffer = image.toPNG();
    const outPath = path.join(resolvedCaptureDir, filename);
    fs.writeFileSync(outPath, pngBuffer);
    console.log(`Captured ${filename} -> ${outPath}`);

    const copyNames = ['combo-000-dark.png', 'combo-100-dark.png', 'combo-010-dark.png', 'combo-001-dark.png', 'combo-111-dark.png', 'combo-111-light.png'];
    if (copyNames.includes(filename)) {
      fs.writeFileSync(path.join(brainPreviewsDir, filename), pngBuffer);
    }
  };

  let simNow = Date.now();
  for (const combo of combinations) {
    const t0 = simNow;
    sceneMachine.setAllProviders(combo.states, t0);
    for (let i = 0; i < 30; i++) {
      sceneMachine.tick(t0 + i * 50);
    }
    const snap = sceneMachine.getSnapshot(t0 + 1500);
    simNow = t0 + 2000;
    win.webContents.send('habitat-demo:snapshot', snap);
    await new Promise(r => setTimeout(r, 150));

    if (combo.key === '000' || combo.key === '111') {
      await captureCombo(combo.key, 'dark', `combo-${combo.key}-dark.png`);
      await captureCombo(combo.key, 'light', `combo-${combo.key}-light.png`);
    } else {
      await captureCombo(combo.key, 'dark', `combo-${combo.key}-dark.png`);
    }
  }

  // Special door-opening-100-dark.png: reset all offline first so Clawd exits through opening door at t=220ms
  sceneMachine.setAllProviders({ claude: 'offline', codex: 'offline', antigravity: 'offline' }, simNow);
  for (let i = 0; i < 30; i++) {
    sceneMachine.tick(simNow + i * 50);
  }
  simNow += 2000;
  const startTime = simNow;
  sceneMachine.setAllProviders({ claude: 'busy', codex: 'offline', antigravity: 'offline' }, startTime);
  sceneMachine.tick(startTime);
  sceneMachine.tick(startTime + 220);
  const snapDoor = sceneMachine.getSnapshot(startTime + 220);
  win.webContents.send('habitat-demo:snapshot', snapDoor);
  await new Promise(r => setTimeout(r, 150));
  await captureCombo('100', 'dark', 'door-opening-100-dark.png');

  console.log('All 11 preview captures successfully completed!');
  await new Promise(r => setTimeout(r, 200));
  require('electron').app.exit(0);
}

module.exports = {
  runHabitatDemoMode
};
