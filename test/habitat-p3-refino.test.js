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

test("T40c: Fantasy Village tem castelo com portão na área de clique, alinhado à saída dos moradores e sem fumaça", () => {
  const { manifest, png } = tema("fantasy-village");
  const hit = manifest.cottageHitBox;
  const porta = manifest.layers.door;
  assert.ok(hit.width >= 70 && hit.height >= 80, "castelo pequeno demais");
  assert.ok(porta.x >= hit.x && porta.x + porta.width <= hit.x + hit.width, "portão fora da largura do castelo");
  assert.ok(porta.y >= hit.y && porta.y + porta.height <= hit.y + hit.height + 2, "portão fora da altura do castelo");
  assert.ok(Math.abs(porta.x + porta.width / 2 - manifest.doorAnchor.x) <= 3, "portão longe da saída dos moradores");
  assert.deepStrictEqual(manifest.layers.smoke.frames, [], "castelo não tem chaminé");
  for (const f of Object.values(porta.frames)) {
    const q = png(f);
    assert.deepStrictEqual([q.width, q.height], [porta.width, porta.height], `${f} com tamanho diferente`);
  }
  // Janelas acesas: a camada âmbar existe e fica só sobre o castelo.
  const luz = png(manifest.layers.cottageAmber);
  let acesos = 0;
  let fora = 0;
  for (let y = 0; y < luz.height; y += 1) {
    for (let x = 0; x < luz.width; x += 1) {
      if (alfa(luz, x, y) === 0) continue;
      acesos += 1;
      if (x < hit.x || x >= hit.x + hit.width || y < hit.y || y >= hit.y + hit.height) fora += 1;
    }
  }
  assert.ok(acesos >= 20, "sem janelas acesas");
  assert.strictEqual(fora, 0, "luz âmbar fora do castelo");
});

test("T40d: par de árvores muda a cada dia, nunca repete os lados e cobre os 30 pares em 30 dias", () => {
  const { treesForDate, resolveGardenState } = require("../src/habitat/habitat-garden");
  const vistos = new Set();
  let anterior = null;
  for (let d = 0; d < 30; d += 1) {
    const t = treesForDate(new Date(2026, 10, 27 + d, 12));
    assert.notStrictEqual(t.left, t.right, "esquerda igual à direita");
    assert.ok(t.left >= 0 && t.left < 6 && t.right >= 0 && t.right < 6);
    const k = `${t.left}-${t.right}`;
    assert.notStrictEqual(k, anterior, "repetiu o par do dia anterior");
    vistos.add(k);
    anterior = k;
  }
  assert.strictEqual(vistos.size, 30);
  // Mesmo dia, horas diferentes: mesmo par (não muda ao longo do dia).
  assert.deepStrictEqual(treesForDate(new Date(2026, 10, 27, 0, 1)), treesForDate(new Date(2026, 10, 27, 23, 59)));
  assert.deepStrictEqual(resolveGardenState({}, new Date(2026, 10, 27, 12)).trees, treesForDate(new Date(2026, 10, 27, 12)));
});

test("T40e: os 4 temas têm 6 árvores em sprite, o fundo não tem mais as árvores antigas e o renderizador escurece as árvores à noite", () => {
  for (const id of TEMAS) {
    const { manifest, png } = tema(id);
    const t = manifest.trees;
    assert.ok(t, `${id}: sem árvores`);
    assert.strictEqual(t.count, 6);
    const folha = png(t.file);
    assert.deepStrictEqual([folha.width, folha.height], [t.frame.width * t.count, t.frame.height], `${id}: folha com tamanho errado`);
    for (let i = 0; i < t.count; i += 1) {
      let px = 0;
      for (let y = 0; y < t.frame.height; y += 1) for (let x = 0; x < t.frame.width; x += 1) if (alfa(folha, i * t.frame.width + x, y) > 0) px += 1;
      assert.ok(px > 2000, `${id}: árvore ${i} quase vazia (${px} px)`);
    }
    // No céu acima de cada árvore o fundo ficou transparente (a copa antiga saiu).
    const fundo = png(manifest.layers.backdrop);
    for (const lado of ["left", "right"]) {
      let opacos = 0;
      for (let y = 8; y < 40; y += 1) for (let x = t[lado].x - 20; x < t[lado].x + 20; x += 1) if (alfa(fundo, x, y) > 0) opacos += 1;
      assert.ok(opacos < 40, `${id}/${lado}: sobrou copa antiga no fundo (${opacos} px)`);
    }
  }
  const src = fs.readFileSync(path.join(RAIZ, "src", "habitat", "habitat-renderer.js"), "utf8");
  assert.match(src, /const nightLayers = \[backdropEl, \.\.\.Object\.values\(treeEls\)/);
});

test("T40f: aviso de conclusão na ilha: só provedor e rótulo fixo, some sozinho, clicável e ao lado da estação nos 4 temas", () => {
  const sign = require("../src/habitat/habitat-done-signs");
  const t = sign.createDoneSignTracker({ durationMs: 8000 });
  assert.strictEqual(t.show("desconhecido", 0), false, "provedor fora da lista não gera placa");
  assert.strictEqual(t.show("claude", 1000), true);
  for (const id of TEMAS) {
    const { manifest } = tema(id);
    const lista = t.list(manifest, 2000);
    assert.strictEqual(lista.length, 1);
    const g = lista[0];
    assert.deepStrictEqual(Object.keys(g).sort(), ["height", "label", "provider", "startMs", "width", "x", "y"], "campo extra chegaria ao palco");
    assert.strictEqual(g.label, "Clawd");
    for (const p of ["claude", "codex", "antigravity"]) {
      const r = sign.layoutDoneSign(manifest, p);
      assert.ok(r.x >= 0 && r.x + r.width <= manifest.canvas.width && r.y >= 0 && r.y + r.height <= manifest.canvas.height, `${id}/${p}: placa fora do palco`);
      const st = manifest.stations[p].anchor;
      assert.ok(Math.abs(r.x + sign.DONE_SIGN_ART.stakeX - st.x) <= 40, `${id}/${p}: placa longe da estação`);
      assert.strictEqual(r.y + r.height, st.y, `${id}/${p}: placa fora do chão da estação`);
    }
    // Clique: dentro da placa devolve o provedor (com escala), fora não.
    assert.strictEqual(sign.hitDoneSign(lista, (g.x + 10) * 2, (g.y + 30) * 2, 2), "claude");
    assert.strictEqual(sign.hitDoneSign(lista, 1, 1, 2), null);
  }
  assert.strictEqual(t.hasActive(8999), true);
  assert.strictEqual(t.hasActive(9000), false, "não sumiu sozinho");
  t.show("codex", 0);
  assert.strictEqual(t.dismiss("codex"), true);
  assert.strictEqual(t.hasActive(1), false);
  // Animação: surge do chão (0, 1, 2) e balança (2/3); movimento reduzido fica parado na placa inteira.
  assert.deepStrictEqual([0, 130, 250, 700, 1200].map((ms) => sign.doneSignFrame(ms)), [0, 1, 2, 3, 2]);
  assert.strictEqual(sign.doneSignFrame(50, true), 2);
});

test("T40g: conclusão não abre mais janela de card e o palco recebe só a plaquinha", () => {
  const main = fs.readFileSync(path.join(RAIZ, "src", "habitat", "habitat-app-main.js"), "utf8");
  assert.ok(!main.includes("cardManager.showCompletionCard("), "ainda abre o card de conclusão em janela");
  assert.match(main, /doneSigns\.show\(provider, Date\.now\(\)\)/);
  assert.match(main, /snapshot: \{ \.\.\.sceneSnap, garden, doneSigns: signs, doneSignArt \}/);
  const r = fs.readFileSync(path.join(RAIZ, "src", "habitat", "habitat-renderer.js"), "utf8");
  assert.ok(!/innerHTML\s*=\s*[^'"]*g\./.test(r), "rótulo não pode ir por innerHTML");
  assert.match(r, /label\.textContent = String\(g\.label \|\| ''\)/);
});

test("T40b: o jardim é desenhado depois do fundo e da casa, e os moradores nunca recebem o filtro noturno", () => {
  const src = fs.readFileSync(path.join(RAIZ, "src", "habitat", "habitat-renderer.js"), "utf8");
  const iJardim = src.indexOf("el.dataset.garden = name");
  assert.ok(iJardim > src.indexOf("doorEl.src = doorFrames.closed"), "jardim antes da porta");
  assert.match(src, /nightEl, doorEl, \.\.\.Object\.values\(gardenEls\)\]/);
});
