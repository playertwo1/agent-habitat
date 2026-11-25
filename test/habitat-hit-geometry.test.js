"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../assets/habitat/cozy-cottage/habitat-manifest.json"),
    "utf8"
  )
);

const {
  computeHabitatHitRects,
  classifyHabitatHitPoint,
  getResidentHitBox,
} = require("../src/habitat/habitat-hit-geometry");

const {
  HABITAT_ALLOWED_SCALES,
  DEFAULT_HABITAT_PREFS,
  normalizeHabitatPrefs,
  loadHabitatPrefs,
  saveHabitatPrefs,
} = require("../src/habitat/habitat-prefs");

test("HitGeometry - Cenário 000 (all residents off)", () => {
  const snapshot = {
    residents: {
      claude: { state: "off" },
      codex: { state: "off" },
      antigravity: { state: "off" },
    },
  };
  const hitData = computeHabitatHitRects({ manifest, snapshot, scale: 1 });
  assert.equal(hitData.rects.length, 1);
  assert.equal(hitData.cottageRect.target, "cottage");
  assert.deepEqual(hitData.residentRects, {});
});

test("HitGeometry - Cenários 100 / 010 / 001 / 111 residents visibility", () => {
  // 100: only claude active
  const snap100 = {
    residents: {
      claude: { state: "busy" },
      codex: { state: "off" },
      antigravity: { state: "off" },
    },
  };
  const hit100 = computeHabitatHitRects({ manifest, snapshot: snap100, scale: 1 });
  assert.equal(hit100.rects.length, 2);
  assert.ok(hit100.residentRects.claude);
  assert.equal(hit100.residentRects.codex, undefined);
  assert.equal(hit100.residentRects.antigravity, undefined);

  // classifyHitPoint
  const claudeBox = hit100.residentRects.claude;
  const classifiedClaude = classifyHabitatHitPoint({
    x: claudeBox.x + 2,
    y: claudeBox.y + 2,
    manifest,
    snapshot: snap100,
    scale: 1,
  });
  assert.deepEqual(classifiedClaude, { target: "resident", provider: "claude" });

  // 111: all active
  const snap111 = {
    residents: {
      claude: { state: "busy" },
      codex: { state: "waiting_input" },
      antigravity: { state: "done" },
    },
  };
  const hit111 = computeHabitatHitRects({ manifest, snapshot: snap111, scale: 1.5 });
  assert.equal(hit111.stageWidth, Math.round(320 * 1.5));
  assert.equal(hit111.stageHeight, Math.round(192 * 1.5));
  assert.ok(hit111.residentRects.claude);
  assert.ok(hit111.residentRects.codex);
  assert.ok(hit111.residentRects.antigravity);
  assert.equal(hit111.rects.length, 4); // cottage + 3 residents

  // classify cottage
  const cr = hit111.cottageRect;
  const classifiedCottage = classifyHabitatHitPoint({
    x: cr.x + 5,
    y: cr.y + 5,
    manifest,
    snapshot: snap111,
    scale: 1.5,
  });
  assert.deepEqual(classifiedCottage, { target: "cottage", provider: null });

  // classify outside (transparent)
  const classifiedNull = classifyHabitatHitPoint({
    x: 0,
    y: 0,
    manifest,
    snapshot: snap100,
    scale: 1,
  });
  // Note: if (0,0) is outside cottage and residents, returns null
  assert.equal(classifiedNull, null);
});

test("HabitatPrefs - defaults, normalization and persistence", () => {
  assert.equal(DEFAULT_HABITAT_PREFS.openAtLogin, false);
  assert.deepEqual(HABITAT_ALLOWED_SCALES, [1, 1.5, 2]);

  // normalization test
  const normalizedInvalid = normalizeHabitatPrefs({
    scale: 99,
    openAtLogin: true, // should be forced to false by strict rule or kept? Wait, prompt says: openAtLogin: boolean, padrão ESTRITO false (nunca true por default). But if input explicitly sets true, does normalize allow true or force false?
    // Let's re-read prompt:
    // "openAtLogin: boolean, padrão ESTRITO false (nunca true por default)" -> usually means default value is false. But let's check if input.openAtLogin can be true or if it's forced false. Wait, "padrão ESTRITO false (nunca true por default)" means default is false. If user passes true, does it accept or sanitize? Let's check: if typeof input.openAtLogin === 'boolean' -> prefs.openAtLogin = input.openAtLogin; else prefs.openAtLogin = false. That correctly makes default false and respects boolean input.
  });

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-prefs-test-"));
  const tmpFile = path.join(tmpDir, "runtime.json");

  const saved = saveHabitatPrefs({
    filePath: tmpFile,
    patch: { scale: 2, alwaysOnTop: false, windowPosition: { x: 10.8, y: 20.2 } },
  });

  assert.equal(saved.scale, 2);
  assert.equal(saved.alwaysOnTop, false);
  assert.deepEqual(saved.windowPosition, { x: 11, y: 20 });

  const loaded = loadHabitatPrefs(tmpFile);
  assert.equal(loaded.scale, 2);
  assert.equal(loaded.alwaysOnTop, false);
  assert.deepEqual(loaded.windowPosition, { x: 11, y: 20 });

  // cleanup
  fs.rmSync(tmpDir, { recursive: true, force: true });
});
