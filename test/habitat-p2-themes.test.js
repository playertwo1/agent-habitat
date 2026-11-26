"use strict";

// T34 (P2.1): temas de habitat; troca persiste, tema inválido cai na Cozy Cottage, 000 não muda e a arte processada tem alfa real.
const assert = require("node:assert");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const test = require("node:test");
const { loadTheme, listThemes, checkThemeArt, normalizeTheme, geometry } = require("../src/habitat/habitat-themes");
const { loadHabitatPrefs, saveHabitatPrefs } = require("../src/habitat/habitat-prefs");
const { createHabitatRuntime } = require("../src/habitat/habitat-runtime");
const { readPng } = require("../src/habitat/habitat-png");

const ROOT = path.join(__dirname, "..");
const COZY = path.join(ROOT, "assets", "habitat", "cozy-cottage");

function python() {
  for (const bin of ["python", "python3"]) {
    const r = spawnSync(bin, ["-c", "import PIL, numpy"], { encoding: "utf8" });
    if (r.status === 0) return bin;
  }
  return null;
}

test("T34: o tema padrão é a Cozy Cottage e o painel só oferece temas que carregam", () => {
  const t = loadTheme({ repoRoot: ROOT, theme: "cozy-cottage" });
  assert.strictEqual(t.id, "cozy-cottage");
  assert.strictEqual(t.fallbackReason, null);
  assert.ok(listThemes({ repoRoot: ROOT }).some((x) => x.id === "cozy-cottage"));
  assert.deepStrictEqual(checkThemeArt(t.manifest, COZY), [], "a arte atual passa na própria validação de temas");
});

test("T34: tema desconhecido, não instalado ou inválido cai na Cozy Cottage sem derrubar o app", () => {
  assert.strictEqual(normalizeTheme("../../etc"), "cozy-cottage-v2");
  const t = loadTheme({ repoRoot: ROOT, theme: "japanese-garden" });
  if (!fs.existsSync(path.join(ROOT, "assets", "habitat", "japanese-garden"))) {
    assert.strictEqual(t.id, "cozy-cottage");
    assert.match(t.fallbackReason, /não instalado/);
  }
  assert.strictEqual(loadTheme({ repoRoot: ROOT, theme: "xyz" }).id, "cozy-cottage-v2");
});

test("T34: o tema escolhido persiste entre reinícios e valor inválido volta ao padrão", () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "habitat-theme-")), "prefs.json");
  assert.strictEqual(loadHabitatPrefs(file).theme, "cozy-cottage-v2");
  saveHabitatPrefs({ filePath: file, patch: { theme: "fantasy-village" } });
  assert.strictEqual(loadHabitatPrefs(file).theme, "fantasy-village");
  assert.strictEqual(saveHabitatPrefs({ filePath: file, patch: { theme: "../x" } }).theme, "cozy-cottage-v2");
});

test("T34: o repouso 000 não depende do tema (cena fechada, ninguém fora)", () => {
  const snap = createHabitatRuntime({}).getSnapshot(1_800_000_000_000).scene;
  for (const r of Object.values(snap.residents)) assert.strictEqual(r.presence, "inside");
  assert.strictEqual(snap.cottage.door, "closed");
  assert.strictEqual(JSON.stringify(snap).includes("theme"), false);
});

test("T34: o processador gera camadas RGBA com alfa real que passam na validação do tema", (t) => {
  const py = python();
  if (!py) return t.skip("python com Pillow e numpy indisponível");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "habitat-p2-"));
  const entrada = path.join(dir, "in");
  const saida = path.join(dir, "out");
  let r = spawnSync(py, [path.join(ROOT, "tools", "p2-entrada-sintetica.py"), entrada], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
  r = spawnSync(py, [path.join(ROOT, "tools", "processar-arte-gemini.py"), "japanese-garden", "--entrada", entrada, "--saida", saida], { encoding: "utf8" });
  assert.strictEqual(r.status, 0, r.stderr);
  const manifest = JSON.parse(fs.readFileSync(path.join(saida, "habitat-manifest.json"), "utf8"));
  assert.strictEqual(manifest.id, "japanese-garden");
  assert.strictEqual(manifest.helpers.frames, 4);
  assert.strictEqual(geometry(manifest), geometry(JSON.parse(fs.readFileSync(path.join(COZY, "habitat-manifest.json"), "utf8"))), "mesma geometria da Cozy Cottage");
  assert.deepStrictEqual(checkThemeArt(manifest, saida), []);
  const helpers = readPng(fs.readFileSync(path.join(saida, "helpers.png")));
  assert.deepStrictEqual([helpers.w, helpers.h], [64, 48]);

  // arte quebrada é recusada: magenta de fundo sobrando e PNG sem alfa
  const bd = path.join(saida, manifest.layers.backdrop);
  const png = readPng(fs.readFileSync(bd));
  assert.ok(png.rgba.some((v, i) => i % 4 === 3 && v === 0), "o fundo magenta virou transparência");
  fs.writeFileSync(bd, "não é um png");
  assert.ok(checkThemeArt(manifest, saida).some((e) => /layer-1-backdrop/.test(e)));
  fs.rmSync(path.join(saida, manifest.layers.foreground));
  assert.ok(checkThemeArt(manifest, saida).some((e) => /layer-6-foreground/.test(e)));
});

test("T34: o painel tem o seletor de tema e o Stage recria o cenário quando o tema muda", () => {
  const html = fs.readFileSync(path.join(ROOT, "src", "habitat", "habitat-panel.html"), "utf8");
  assert.match(html, /id="theme-card"/);
  const client = fs.readFileSync(path.join(ROOT, "src", "habitat", "habitat-stage-client.js"), "utf8");
  assert.match(client, /rendererThemeId !== manifest\.id/);
});

test("T34: o renderizador usa helpers.frames (4 quadros) em vez de 2 fixos", () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(COZY, "habitat-manifest.json"), "utf8"));
  manifest.helpers.frames = 4;
  const els = [];
  const mk = () => ({ style: {}, dataset: {}, children: [], appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.push(c); return c; }, getContext: () => ({}), setAttribute() {}, addEventListener() {} });
  global.document = { createElement: () => { const e = mk(); els.push(e); return e; } };
  try {
    const src = fs.readFileSync(path.join(ROOT, "src", "habitat", "habitat-renderer.js"), "utf8");
    const { createHabitatRenderer } = new Function(`${src}\nreturn { createHabitatRenderer };`)();
    const r = createHabitatRenderer({ container: mk(), manifest, manifestDirUrl: "file:///x/", atomMetaMap: {} });
    const cols = new Set();
    for (let k = 0; k < 4; k++) {
      r.render({ nowMs: (k + 1) * manifest.helpers.frameMs, cottage: { lights: "off", door: "closed", smoke: false },
        residents: { claude: { provider: "claude", presence: "outside", x: 74, y: 148, facing: "right", visualClip: "busy" } },
        helpers: { claude: 1, codex: 0, antigravity: 0 } });
      cols.add(els.find((e) => e.dataset.helper === "claude").style.backgroundPosition.split(" ")[0]);
    }
    assert.strictEqual(cols.size, 4);
  } finally {
    delete global.document;
  }
});

test("T34: Cozy Cottage v2, Japanese Garden e Fantasy Village instalados carregam sem fallback, com arte válida e casa própria", () => {
  const ids = listThemes({ repoRoot: ROOT }).map((t) => t.id);
  assert.deepStrictEqual(ids, ["cozy-cottage-v2", "cozy-cottage", "japanese-garden", "fantasy-village"]);
  for (const id of ["cozy-cottage-v2", "japanese-garden", "fantasy-village"]) {
    const t = loadTheme({ repoRoot: ROOT, theme: id });
    assert.strictEqual(t.id, id);
    assert.strictEqual(t.fallbackReason, null);
    assert.deepStrictEqual(checkThemeArt(t.manifest, path.join(ROOT, "assets", "habitat", id)), []);
    const hit = t.manifest.cottageHitBox, door = t.manifest.layers.door;
    assert.ok(door.x >= hit.x && door.x + door.width <= hit.x + hit.width, "a porta fica dentro da casa");
    assert.ok(hit.width < 112 + 20, "a casa do tema é menor que a da Cozy");
  }
});
