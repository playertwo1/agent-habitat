"use strict";

// T39 — escala 0,5x (P3.6): preferência, tamanho do palco, áreas de clique e painel.

const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { normalizeHabitatPrefs, HABITAT_ALLOWED_SCALES } = require("../src/habitat/habitat-prefs");
const { normalizeStageSizeForScale, computeSafeStageBounds } = require("../src/habitat/habitat-display-layout");
const { computeHabitatHitRects, classifyHabitatHitPoint } = require("../src/habitat/habitat-hit-geometry");

const raiz = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(raiz, "assets/habitat/cozy-cottage-v2/habitat-manifest.json"), "utf8"));
const fora = { residents: {
  claude: { presence: "outside", x: manifest.stations.claude.anchor.x, y: manifest.stations.claude.anchor.y },
  codex: { presence: "inside" }, antigravity: { presence: "inside" } } };

test("T39a: 0,5 é aceita; valores fora da lista voltam ao padrão", () => {
  assert.ok(HABITAT_ALLOWED_SCALES.includes(0.5));
  assert.equal(normalizeHabitatPrefs({ scale: 0.5 }).scale, 0.5);
  assert.equal(normalizeHabitatPrefs({ scale: "0.5" }).scale, 0.5);
  for (const v of [0, 0.25, 0.75, 3, -1, "x"]) assert.equal(normalizeHabitatPrefs({ scale: v }).scale, 1.5, String(v));
});

test("T39b: o palco em 0,5x mede 160x96 e cabe na área de trabalho", () => {
  assert.deepEqual(normalizeStageSizeForScale({ manifest, scale: 0.5 }), { width: 160, height: 96 });
  const primaryDisplay = { workArea: { x: 0, y: 0, width: 1920, height: 1040 }, bounds: { x: 0, y: 0, width: 1920, height: 1080 } };
  const b = computeSafeStageBounds({ manifest, scale: 0.5, savedPosition: { x: 1900, y: 1030 }, displays: [primaryDisplay], primaryDisplay });
  assert.equal(b.width, 160);
  assert.equal(b.height, 96);
  assert.ok(b.x + b.width <= 1920 && b.y + b.height <= 1040, JSON.stringify(b));
});

test("T39c: em 0,5x os retângulos de clique são a metade dos de 1x e o clique ainda acerta cabana e morador", () => {
  const um = computeHabitatHitRects({ manifest, snapshot: fora, scale: 1 }).rects;
  const meio = computeHabitatHitRects({ manifest, snapshot: fora, scale: 0.5 }).rects;
  assert.equal(meio.length, um.length);
  for (let i = 0; i < um.length; i++) {
    for (const k of ["x", "y", "width", "height"]) assert.ok(Math.abs(meio[i][k] - um[i][k] / 2) <= 1, `${k}: ${meio[i][k]} vs ${um[i][k]}`);
    assert.ok(meio[i].width >= 1 && meio[i].height >= 1);
  }
  const cab = manifest.cottageHitBox;
  const alvoCabana = classifyHabitatHitPoint({ x: (cab.x + cab.width / 2) * 0.5, y: (cab.y + cab.height / 2) * 0.5, manifest, snapshot: fora, scale: 0.5 });
  assert.ok(alvoCabana, "clique no centro da cabana em 0,5x");
});

test("T39d: painel, bandeja e demonstração oferecem 0,5x", () => {
  const html = fs.readFileSync(path.join(raiz, "src/habitat/habitat-panel.html"), "utf8");
  assert.match(html, /name="ui-scale" value="0\.5"/);
  const demo = fs.readFileSync(path.join(raiz, "src/habitat/habitat-demo.html"), "utf8");
  assert.match(demo, /<option value="0\.5">/);
  const app = fs.readFileSync(path.join(raiz, "src/habitat/habitat-app-main.js"), "utf8");
  assert.match(app, /const ciclo = \[0\.5, 1, 1\.5, 2\];/);
});
