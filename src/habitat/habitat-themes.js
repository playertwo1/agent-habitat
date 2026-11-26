"use strict";

// P2.1: temas de habitat. A geometria (canvas, saída da porta, estações) é a da Cozy Cottage; porta, fumaça e área de clique da casa são do tema (a casa muda de tamanho e de lugar) em todos os temas;
// cada tema troca só a arte. Tema inválido nunca derruba o app: cai na Cozy Cottage.
const fs = require("fs");
const path = require("path");
const { loadAndValidateHabitatManifest } = require("./manifest-validator");
const { readPng } = require("./habitat-png");

const THEMES = Object.freeze({
  "cozy-cottage": "Cozy Cottage",
  "japanese-garden": "Japanese Garden",
  "fantasy-village": "Fantasy Village",
});
const DEFAULT_THEME = "cozy-cottage";
const themeManifestPath = (repoRoot, id) => path.join(repoRoot, "assets", "habitat", id, "habitat-manifest.json");

function normalizeTheme(v) {
  return Object.prototype.hasOwnProperty.call(THEMES, v) ? v : DEFAULT_THEME;
}

const pick = (o, keys) => keys.map((k) => o && o[k]);
function geometry(m) {
  return JSON.stringify({
    canvas: m.canvas, doorAnchor: m.doorAnchor,
    stations: Object.fromEntries(Object.entries(m.stations).map(([k, s]) => [k, { anchor: s.anchor, props: pick(s.props, ["x", "y", "width", "height"]) }])),
  });
}

// [arquivo, largura, altura, exige transparência real]
function expectedImages(m) {
  const { width: cw, height: ch } = m.canvas;
  const L = m.layers;
  const out = [[L.shadow, cw, ch, true], [L.backdrop, cw, ch, true], [L.cottageNight, cw, ch, true], [L.cottageAmber, cw, ch, true], [L.foreground, cw, ch, true]];
  for (const f of Object.values(L.door.frames)) out.push([f, L.door.width, L.door.height, false]);
  for (const f of L.smoke.frames) out.push([f, L.smoke.width, L.smoke.height, true]);
  for (const s of Object.values(m.stations)) out.push([s.props.file, s.props.width, s.props.height, true]);
  if (m.helpers) out.push([m.helpers.file, m.helpers.frame.width * (m.helpers.frames || 2), m.helpers.frame.height * Object.keys(m.helpers.rows).length, true]);
  if (m.garden) out.push([m.garden.file, m.garden.frame.width * Object.keys(m.garden.items).length, m.garden.frame.height, true]);
  return out;
}

// Erros de arte de um tema: PNG ausente, sem alfa real, tamanho errado ou magenta de fundo sobrando.
function checkThemeArt(manifest, dir) {
  const errors = [];
  for (const [file, w, h, needAlpha] of expectedImages(manifest)) {
    let png;
    try { png = readPng(fs.readFileSync(path.join(dir, file))); } catch (e) { errors.push(`${file}: ${e.message}`); continue; }
    if (png.w !== w || png.h !== h) errors.push(`${file}: tamanho ${png.w}x${png.h}, esperado ${w}x${h}`);
    if (png.color !== 6 || !png.rgba) { errors.push(`${file}: precisa ser PNG RGBA de 8 bits`); continue; }
    let transparent = 0;
    for (let i = 0; i < png.rgba.length; i += 4) {
      const a = png.rgba[i + 3];
      if (a === 0) transparent++;
      else if (a > 200 && png.rgba[i] === 255 && png.rgba[i + 1] === 0 && png.rgba[i + 2] === 255) { errors.push(`${file}: sobrou pixel magenta de fundo`); break; }
    }
    if (needAlpha && transparent === 0) errors.push(`${file}: sem transparência real`);
  }
  return errors;
}

const cache = new Map();

// Carrega o tema pedido; se faltar ou for inválido, devolve a Cozy Cottage (com o motivo em `fallbackReason`).
function loadTheme({ repoRoot, theme }) {
  const id = normalizeTheme(theme);
  const key = `${repoRoot}|${id}`;
  if (cache.has(key)) return cache.get(key);
  const out = loadThemeUncached(repoRoot, id);
  cache.set(key, out);
  return out;
}

function loadThemeUncached(repoRoot, id) {
  const basePath = themeManifestPath(repoRoot, DEFAULT_THEME);
  const baseManifest = JSON.parse(fs.readFileSync(basePath, "utf8"));
  const make = (manifestId, manifest, manifestPath, fallbackReason) => ({
    id: manifestId, manifest, fallbackReason: fallbackReason || null,
    dirUrl: `file://${path.resolve(path.dirname(manifestPath)).replace(/\\/g, "/")}/`,
  });
  if (id === DEFAULT_THEME) return make(DEFAULT_THEME, baseManifest, basePath);
  const mp = themeManifestPath(repoRoot, id);
  const fallback = (reason) => make(DEFAULT_THEME, baseManifest, basePath, reason);
  if (!fs.existsSync(mp)) return fallback("tema não instalado");
  const v = loadAndValidateHabitatManifest({ manifestPath: mp, repoRoot, checkFiles: true });
  if (!v.ok) return fallback(`manifesto inválido: ${v.errors[0]}`);
  const manifest = JSON.parse(fs.readFileSync(mp, "utf8"));
  if (manifest.id !== id) return fallback("id do manifesto difere da pasta do tema");
  if (geometry(manifest) !== geometry(baseManifest)) return fallback("geometria difere da Cozy Cottage");
  const art = checkThemeArt(manifest, path.dirname(mp));
  if (art.length) return fallback(`arte inválida: ${art[0]}`);
  return make(id, manifest, mp);
}

// Temas que o painel pode oferecer: só os que carregam sem cair na Cozy Cottage.
function listThemes({ repoRoot }) {
  return Object.keys(THEMES).filter((id) => loadTheme({ repoRoot, theme: id }).id === id).map((id) => ({ id, name: THEMES[id] }));
}

function clearThemeCache() { cache.clear(); }

module.exports = { THEMES, DEFAULT_THEME, normalizeTheme, loadTheme, listThemes, checkThemeArt, geometry, clearThemeCache };
