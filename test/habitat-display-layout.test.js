"use strict";

const test = require("node:test");
const assert = require("node:assert");
const {
  normalizeStageSizeForScale,
  resolveTargetDisplayWorkArea,
  computeSafeStageBounds,
  computeSafePanelBounds
} = require("../src/habitat/habitat-display-layout");

const manifest = {
  canvas: { width: 320, height: 192 }
};

test("normalizeStageSizeForScale exact dimensions for 1, 1.5, 2", () => {
  const s1 = normalizeStageSizeForScale({ manifest, scale: 1 });
  assert.deepStrictEqual(s1, { width: 320, height: 192 });

  const s15 = normalizeStageSizeForScale({ manifest, scale: 1.5 });
  assert.deepStrictEqual(s15, { width: 480, height: 288 });

  const s2 = normalizeStageSizeForScale({ manifest, scale: 2 });
  assert.deepStrictEqual(s2, { width: 640, height: 384 });
});

test("computeSafeStageBounds positions correctly on DPIs (100%, 125%, 150%, 200%)", () => {
  // 100% DPI: 1920x1040 workArea (taskbar bottom)
  const wa100 = { x: 0, y: 0, width: 1920, height: 1040 };
  const b100 = computeSafeStageBounds({
    manifest,
    scale: 1,
    savedPosition: null,
    primaryDisplay: { workArea: wa100 },
    margin: 24
  });
  assert.deepStrictEqual(b100, {
    x: 1920 - 320 - 24,
    y: 1040 - 192 - 24,
    width: 320,
    height: 192
  });

  // 125% DPI: 1536x824
  const wa125 = { x: 0, y: 0, width: 1536, height: 824 };
  const b125 = computeSafeStageBounds({
    manifest,
    scale: 1.5,
    savedPosition: null,
    primaryDisplay: { workArea: wa125 },
    margin: 24
  });
  assert.deepStrictEqual(b125, {
    x: 1536 - 480 - 24,
    y: 824 - 288 - 24,
    width: 480,
    height: 288
  });

  // 150% DPI: 1280x688
  const wa150 = { x: 0, y: 0, width: 1280, height: 688 };
  const b150 = computeSafeStageBounds({
    manifest,
    scale: 1.5,
    savedPosition: null,
    primaryDisplay: { workArea: wa150 },
    margin: 24
  });
  assert.deepStrictEqual(b150, {
    x: 1280 - 480 - 24,
    y: 688 - 288 - 24,
    width: 480,
    height: 288
  });

  // 200% DPI: 960x508
  const wa200 = { x: 0, y: 0, width: 960, height: 508 };
  const b200 = computeSafeStageBounds({
    manifest,
    scale: 2,
    savedPosition: null,
    primaryDisplay: { workArea: wa200 },
    margin: 24
  });
  assert.deepStrictEqual(b200, {
    x: 960 - 640 - 24,
    y: 508 - 384 - 24,
    width: 640,
    height: 384
  });
});

test("computeSafeStageBounds handles 4 formats of taskbar (bottom, top, left, right)", () => {
  const waBottom = { x: 0, y: 0, width: 1920, height: 1040 }; // taskbar bottom
  const waTop = { x: 0, y: 40, width: 1920, height: 1040 }; // taskbar top
  const waLeft = { x: 40, y: 0, width: 1880, height: 1080 }; // taskbar left
  const waRight = { x: 0, y: 0, width: 1880, height: 1080 }; // taskbar right

  const sz = { width: 480, height: 288 };

  const sBot = computeSafeStageBounds({ manifest, scale: 1.5, savedPosition: { x: -50, y: -50 }, primaryDisplay: { workArea: waBottom } });
  assert.strictEqual(sBot.x >= waBottom.x, true);
  assert.strictEqual(sBot.y >= waBottom.y, true);
  assert.strictEqual(sBot.x + sz.width <= waBottom.x + waBottom.width, true);
  assert.strictEqual(sBot.y + sz.height <= waBottom.y + waBottom.height, true);

  const sTop = computeSafeStageBounds({ manifest, scale: 1.5, savedPosition: { x: 50, y: 10 }, primaryDisplay: { workArea: waTop } });
  assert.strictEqual(sTop.y >= waTop.y, true);

  const sLeft = computeSafeStageBounds({ manifest, scale: 1.5, savedPosition: { x: 10, y: 10 }, primaryDisplay: { workArea: waLeft } });
  assert.strictEqual(sLeft.x >= waLeft.x, true);

  const sRight = computeSafeStageBounds({ manifest, scale: 1.5, savedPosition: { x: 1900, y: 10 }, primaryDisplay: { workArea: waRight } });
  assert.strictEqual(sRight.x + sz.width <= waRight.x + waRight.width, true);
});

test("resolveTargetDisplayWorkArea secondary display x: -1920 and fallback when disconnected", () => {
  const primaryWa = { x: 0, y: 0, width: 1920, height: 1080 };
  const secondaryWa = { x: -1920, y: 0, width: 1920, height: 1080 };
  const displays = [
    { id: 1, workArea: primaryWa },
    { id: 2, workArea: secondaryWa }
  ];

  // When savedPosition is on secondary display
  const savedOnSecondary = { x: -1500, y: 200 };
  const resolvedWa = resolveTargetDisplayWorkArea({
    bounds: { x: savedOnSecondary.x, y: savedOnSecondary.y, width: 480, height: 288 },
    displays,
    primaryDisplay: displays[0],
    getDisplayMatching: (b) => {
      if (b.x < 0) return displays[1];
      return displays[0];
    }
  });
  assert.deepStrictEqual(resolvedWa, secondaryWa);

  // When secondary monitor is disconnected (displays only has primary)
  const connectedDisplays = [{ id: 1, workArea: primaryWa }];
  const fallbackWa = resolveTargetDisplayWorkArea({
    bounds: { x: -1500, y: 200, width: 480, height: 288 },
    displays: connectedDisplays,
    primaryDisplay: connectedDisplays[0],
    getDisplayMatching: (b) => {
      // simulating electron getDisplayMatching returning primary when secondary is gone
      return connectedDisplays[0];
    }
  });
  assert.deepStrictEqual(fallbackWa, primaryWa);
});

test("computeSafePanelBounds reduces height from 640 to fit 200% DPI (workArea height 508) without covering taskbar", () => {
  const wa200 = { x: 0, y: 0, width: 960, height: 508 };
  const stageBounds = { x: 256, y: 100, width: 640, height: 384 };

  const panelBounds = computeSafePanelBounds({
    stageBounds,
    panelWidth: 480,
    panelHeight: 640,
    workArea: wa200,
    gap: 12
  });

  // Height must be clamped to wa200.height - 16 = 508 - 16 = 492 (or min(640, 508 - 16) = 492)
  assert.strictEqual(panelBounds.height, 492);
  // Must be strictly within workArea
  assert.strictEqual(panelBounds.y >= wa200.y, true);
  assert.strictEqual(panelBounds.y + panelBounds.height <= wa200.y + wa200.height, true);
  assert.strictEqual(panelBounds.x >= wa200.x, true);
  assert.strictEqual(panelBounds.x + panelBounds.width <= wa200.x + wa200.width, true);
});
