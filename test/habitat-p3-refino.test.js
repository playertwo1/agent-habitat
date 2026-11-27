"use strict";
// P3.7 — refino visual (T40): jardim visível, árvores por tema, castelo no FV, aviso de conclusão na ilha.
const { test } = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { decodeRgbaPng } = require("./helpers/png-rgba");

const RAIZ = path.join(__dirname, "..");
const TEMAS = ["cozy-cottage", "cozy-cottage-v2", "japanese-garden", "fantasy-village"];

function tema(id) {
  const dir = path.join(RAIZ, "assets", "habitat", id);
  const manifest = JSON.parse(fs.readFileSync(path.join(dir, "habitat-manifest.json"), "utf8"));
  return { dir, manifest, png: (f) => decodeRgbaPng(path.join(dir, f)) };
}

const alfa = (img, x, y) => img.pixels[(y * img.width + x) * 4 + 3];

test("T40a: objetos do jardim ficam no gramado, visíveis e fora do primeiro plano nos 4 temas", () => {
  for (const id of TEMAS) {
    const { manifest, png } = tema(id);
    const g = manifest.garden;
    assert.ok(g, `${id}: sem jardim`);
    const folha = png(g.file);
    const frente = png(manifest.layers.foreground);
    const fundo = png(manifest.layers.backdrop);
    const casa = png(manifest.layers.cottageNight);
    const { width: w, height: h } = g.frame;
    for (const [nome, it] of Object.entries(g.items)) {
      const x0 = it.x - w / 2;
      const y0 = it.y - h;
      let visiveis = 0;
      let cobertos = 0;
      for (let y = 0; y < h; y += 1) {
        for (let x = 0; x < w; x += 1) {
          if (alfa(folha, it.col * w + x, y) === 0) continue;
          visiveis += 1;
          if (alfa(frente, x0 + x, y0 + y) > 128) cobertos += 1;
        }
      }
      assert.ok(visiveis >= 150, `${id}/${nome}: só ${visiveis} px visíveis`);
      assert.ok(cobertos / visiveis <= 0.05, `${id}/${nome}: ${cobertos}/${visiveis} px cobertos pelo primeiro plano`);
      let chao = 0;
      for (let dy = -2; dy <= 2; dy += 1) {
        for (let dx = -3; dx <= 3; dx += 1) {
          if (Math.max(alfa(fundo, it.x + dx, it.y + dy), alfa(casa, it.x + dx, it.y + dy), alfa(frente, it.x + dx, it.y + dy)) > 128) chao += 1;
        }
      }
      assert.ok(chao >= 18, `${id}/${nome}: base fora da ilha (${chao}/35 px de chão)`);
    }
  }
});

test("T40b: o jardim é desenhado depois do fundo e da casa, e os moradores nunca recebem o filtro noturno", () => {
  const src = fs.readFileSync(path.join(RAIZ, "src", "habitat", "habitat-renderer.js"), "utf8");
  const iJardim = src.indexOf("el.dataset.garden = name");
  assert.ok(iJardim > src.indexOf("doorEl.src = doorFrames.closed"), "jardim antes da porta");
  assert.match(src, /const nightLayers = \[backdropEl, nightEl, doorEl, \.\.\.Object\.values\(gardenEls\)\]/);
});
