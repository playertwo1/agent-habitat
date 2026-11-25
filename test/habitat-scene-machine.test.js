const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const { validateHabitatManifest } = require('../src/habitat/manifest-validator');
const { createHabitatSceneMachine } = require('../src/habitat/scene-machine');

const sampleManifest = {
  schema: 1,
  id: "test-habitat",
  name: "Test Habitat",
  canvas: { width: 800, height: 600 },
  doorAnchor: { x: 400, y: 500 },
  cottageHitBox: { x: 300, y: 300, width: 200, height: 200 },
  layers: {
    shadow: "shadow.svg",
    backdrop: "backdrop.svg",
    cottageNight: "cottage-night.svg",
    cottageAmber: "cottage-amber.svg",
    foreground: "foreground.svg",
    door: {
      x: 380, y: 460, width: 40, height: 80,
      frames: { closed: "d-c.svg", opening: "d-op.svg", open: "d-o.svg", closing: "d-cl.svg" }
    },
    smoke: { x: 390, y: 250, width: 20, height: 40, frameMs: 100, frames: ["s1.svg"] }
  },
  stations: {
    claude: { character: "clawd", anchor: { x: 150, y: 500 }, actorSize: { width: 50, height: 80 }, props: { file: "p1.svg", x: 140, y: 480, width: 30, height: 30 } },
    codex: { character: "cloudling", anchor: { x: 400, y: 500 }, actorSize: { width: 50, height: 80 }, props: { file: "p2.svg", x: 390, y: 480, width: 30, height: 30 } },
    antigravity: { character: "atom", anchor: { x: 650, y: 500 }, actorSize: { width: 50, height: 80 }, props: { file: "p3.svg", x: 640, y: 480, width: 30, height: 30 } }
  },
  actors: {
    clawd: { kind: "svg", baseDir: "clawd", clips: { exiting: "e.svg", busy: "b.svg", waiting_input: "w.svg", needs_approval: "n.svg", error: "err.svg", done: "d.svg", entering: "ent.svg" } },
    cloudling: { kind: "svg", baseDir: "cloudling", clips: { exiting: "e.svg", busy: "b.svg", waiting_input: "w.svg", needs_approval: "n.svg", error: "err.svg", done: "d.svg", entering: "ent.svg" } },
    atom: {
      kind: "spritesheet-webp",
      baseDir: "atom",
      clips: {
        exiting: { sheet: "sheet.webp", meta: "meta.json" },
        busy: { sheet: "sheet.webp", meta: "meta.json" },
        waiting_input: { sheet: "sheet.webp", meta: "meta.json" },
        needs_approval: { sheet: "sheet.webp", meta: "meta.json" },
        error: { sheet: "sheet.webp", meta: "meta.json" },
        done: { sheet: "sheet.webp", meta: "meta.json" },
        entering: { sheet: "sheet.webp", meta: "meta.json" }
      }
    }
  }
};

test('T01-T08: 8 combinations of provider states (000 to 111) and station non-overlap', () => {
  const st = sampleManifest.stations;
  const boxes = [
    { x: st.claude.anchor.x - st.claude.actorSize.width/2, w: st.claude.actorSize.width },
    { x: st.codex.anchor.x - st.codex.actorSize.width/2, w: st.codex.actorSize.width },
    { x: st.antigravity.anchor.x - st.antigravity.actorSize.width/2, w: st.antigravity.actorSize.width }
  ];
  assert.ok(boxes[0].x + boxes[0].w <= boxes[1].x);
  assert.ok(boxes[1].x + boxes[1].w <= boxes[2].x);

  const statesCombinations = [
    { claude: 'offline', codex: 'offline', antigravity: 'offline' },
    { claude: 'busy', codex: 'offline', antigravity: 'offline' },
    { claude: 'offline', codex: 'busy', antigravity: 'offline' },
    { claude: 'busy', codex: 'busy', antigravity: 'offline' },
    { claude: 'offline', codex: 'offline', antigravity: 'busy' },
    { claude: 'busy', codex: 'offline', antigravity: 'busy' },
    { claude: 'offline', codex: 'busy', antigravity: 'busy' },
    { claude: 'busy', codex: 'busy', antigravity: 'busy' }
  ];

  for (const combo of statesCombinations) {
    const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
    machine.setAllProviders(combo, 0);
    const snap = machine.getSnapshot(800);
    const anyActive = Object.values(combo).some(s => s === 'busy');
    if (anyActive) {
      assert.strictEqual(snap.cottage.lights, "amber");
      assert.strictEqual(snap.cottage.smoke, true);
    } else {
      assert.strictEqual(snap.cottage.lights, "night");
      assert.strictEqual(snap.cottage.smoke, false);
    }
  }
});

test('T09: idle and offline never take resident out of house', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine.setProviderState('claude', 'idle', 0);
  machine.setProviderState('codex', 'offline', 0);
  const snap = machine.getSnapshot(100);
  assert.strictEqual(snap.residents.claude.presence, "inside");
  assert.strictEqual(snap.residents.codex.presence, "inside");
  assert.strictEqual(snap.cottage.lights, "night");
});

test('T13: terminal error retracts after 1500ms; errorNeedsAction: true stays outside', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine.setProviderState('claude', 'busy', 0);
  machine.getSnapshot(800);

  machine.setProviderState('claude', { state: 'error', errorNeedsAction: false }, 1000);
  let snap = machine.getSnapshot(2000);
  assert.strictEqual(snap.residents.claude.presence, "outside");

  snap = machine.getSnapshot(2600);
  assert.strictEqual(snap.residents.claude.presence, "entering");

  const machine2 = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine2.setProviderState('claude', 'busy', 0);
  machine2.getSnapshot(800);
  machine2.setProviderState('claude', { state: 'error', errorNeedsAction: true }, 1000);
  snap = machine2.getSnapshot(5000);
  assert.strictEqual(snap.residents.claude.presence, "outside");
});

test('T17: unknown retracts resident and never becomes busy or done directly', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine.setProviderState('claude', 'busy', 0);
  machine.getSnapshot(800);
  
  machine.setProviderState('claude', 'unknown', 1000);
  const snap = machine.getSnapshot(1100);
  assert.strictEqual(snap.residents.claude.presence, "entering");
  assert.strictEqual(snap.residents.claude.visualClip, null);
});

test('T18: interruption during entering resumes to exiting from current position', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine.setProviderState('claude', 'busy', 0);
  machine.getSnapshot(800);

  machine.setProviderState('claude', 'idle', 1000);
  machine.getSnapshot(1200);

  machine.setProviderState('claude', 'busy', 1300);
  const snap = machine.getSnapshot(1350);
  assert.strictEqual(snap.residents.claude.presence, "exiting");
  assert.ok(typeof snap.residents.claude.x === 'number');
});

test('Terminal done interrupted by busy before retracting', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine.setProviderState('claude', 'busy', 0);
  machine.getSnapshot(800);

  machine.setProviderState('claude', 'done', 1000);
  machine.getSnapshot(2000);

  machine.setProviderState('claude', 'busy', 2200);
  const snap = machine.getSnapshot(2300);
  assert.strictEqual(snap.residents.claude.presence, "outside");
  assert.strictEqual(snap.residents.claude.visualClip, "busy");
});

test('Shared door queue: multiple residents do not cause door flicker', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  machine.setProviderState('claude', 'busy', 0);
  machine.setProviderState('codex', 'busy', 100);

  let snap = machine.getSnapshot(200);
  assert.ok(['opening', 'open', 'closing'].includes(snap.cottage.door));
  snap = machine.getSnapshot(600);
  assert.ok(['open', 'closing'].includes(snap.cottage.door));
});

test('T26: manifest-validator rejects invalid paths, absolute paths, null bytes, and out-of-bounds', () => {
  const okRes = validateHabitatManifest({ manifest: sampleManifest, manifestDir: __dirname, repoRoot: path.resolve(__dirname, '..'), checkFiles: false });
  assert.strictEqual(okRes.ok, true);

  const badManifest = JSON.parse(JSON.stringify(sampleManifest));
  badManifest.canvas.width = -100;
  const res = validateHabitatManifest({ manifest: badManifest, manifestDir: __dirname, repoRoot: path.resolve(__dirname, '..'), checkFiles: false });
  assert.strictEqual(res.ok, false);

  const traversalManifest = JSON.parse(JSON.stringify(sampleManifest));
  traversalManifest.layers.shadow = "../../outside.svg";
  const res2 = validateHabitatManifest({ manifest: traversalManifest, manifestDir: __dirname, repoRoot: path.resolve(__dirname, '..'), checkFiles: false });
  assert.strictEqual(res2.ok, false);

  const absManifest = JSON.parse(JSON.stringify(sampleManifest));
  absManifest.layers.shadow = process.platform === 'win32' ? 'C:\\absolute.svg' : '/absolute.svg';
  const res3 = validateHabitatManifest({ manifest: absManifest, manifestDir: __dirname, repoRoot: path.resolve(__dirname, '..'), checkFiles: false });
  assert.strictEqual(res3.ok, false);

  const nullManifest = JSON.parse(JSON.stringify(sampleManifest));
  nullManifest.layers.shadow = "shadow\0.svg";
  const res4 = validateHabitatManifest({ manifest: nullManifest, manifestDir: __dirname, repoRoot: path.resolve(__dirname, '..'), checkFiles: false });
  assert.strictEqual(res4.ok, false);
});

test('T27: reducedMotion: true is instantaneous and smoke: false', () => {
  const machine = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed", reducedMotion: true });
  machine.setProviderState('claude', 'busy', 0);
  const snap = machine.getSnapshot(0);
  assert.strictEqual(snap.reducedMotion, true);
  assert.strictEqual(snap.residents.claude.presence, "outside");
  assert.strictEqual(snap.cottage.smoke, false);
  assert.strictEqual(snap.cottage.door, "closed");
});

test('T28: demo and observed are isolated instances', () => {
  const m1 = createHabitatSceneMachine({ manifest: sampleManifest, mode: "observed" });
  const m2 = createHabitatSceneMachine({ manifest: sampleManifest, mode: "demo" });

  m1.setProviderState('claude', 'busy', 0);
  assert.strictEqual(m1.getSnapshot(100).mode, "observed");
  assert.strictEqual(m1.getSnapshot(100).residents.claude.presence, "exiting");

  assert.strictEqual(m2.getSnapshot(100).mode, "demo");
  assert.strictEqual(m2.getSnapshot(100).residents.claude.presence, "inside");
});
