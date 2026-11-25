const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const { loadAndValidateHabitatManifest } = require('../src/habitat/manifest-validator');
const { createHabitatSceneMachine } = require('../src/habitat/scene-machine');

test('Habitat Integration: Manifest validation', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const manifestPath = path.join(repoRoot, 'assets/habitat/cozy-cottage/habitat-manifest.json');
  const res = loadAndValidateHabitatManifest({ manifestPath, repoRoot, checkFiles: true });
  assert.strictEqual(res.ok, true, `Manifest validation should be ok: ${res.errors.join(', ')}`);
});

test('Habitat Integration: Scene Machine state transitions (000 -> 100 -> 111 -> 000)', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const manifestPath = path.join(repoRoot, 'assets/habitat/cozy-cottage/habitat-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  const machine = createHabitatSceneMachine({ manifest, mode: 'demo', reducedMotion: false });

  // Initial state 000
  let snap = machine.getSnapshot(0);
  assert.strictEqual(snap.cottage.lights, 'night');
  assert.strictEqual(snap.cottage.door, 'closed');
  assert.strictEqual(snap.cottage.smoke, false);
  assert.strictEqual(snap.residents.claude.presence, 'inside');

  // Transition to 100 (Claude busy)
  machine.setProviderState('claude', 'busy', 100);
  snap = machine.getSnapshot(150);
  assert.strictEqual(snap.cottage.lights, 'amber');
  assert.strictEqual(snap.cottage.smoke, true);

  // Transition to 111 (All busy)
  machine.setAllProviders({ claude: 'busy', codex: 'busy', antigravity: 'busy' }, 500);
  for (let i = 0; i < 20; i++) {
    machine.getSnapshot(500 + i * 50);
  }
  snap = machine.getSnapshot(1500);
  assert.strictEqual(snap.residents.claude.presence, 'outside');
  assert.strictEqual(snap.residents.codex.presence, 'outside');
  assert.strictEqual(snap.residents.antigravity.presence, 'outside');

  // Transition back to 000 (All offline)
  machine.setAllProviders({ claude: 'offline', codex: 'offline', antigravity: 'offline' }, 2000);
  snap = machine.getSnapshot(3000);
  assert.strictEqual(snap.residents.claude.presence, 'inside');
  assert.strictEqual(snap.residents.codex.presence, 'inside');
  assert.strictEqual(snap.residents.antigravity.presence, 'inside');
});

test('Habitat Integration: Package.json build and scripts configuration', () => {
  const repoRoot = path.resolve(__dirname, '..');
  const pkgPath = path.join(repoRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

  assert.ok(pkg.scripts['demo:habitat'], 'package.json must have demo:habitat script');
  assert.ok(pkg.build.files.includes('assets/habitat/**/*'), 'package.json build.files must include assets/habitat/**/*');
  assert.ok(pkg.build.asarUnpack.includes('assets/habitat/**/*'), 'package.json build.asarUnpack must include assets/habitat/**/*');
});
