"use strict";

// T35 (P2.4): variantes de clipe, "delegando" com ajudante, pulinho/passeio/olhar por código; nada em 000 nem com movimento reduzido.
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { validateHabitatManifest } = require("../src/habitat/manifest-validator");

const ROOT = path.join(__dirname, "..");
const MP = path.join(ROOT, "assets", "habitat", "cozy-cottage", "habitat-manifest.json");
const manifest = JSON.parse(fs.readFileSync(MP, "utf8"));
const T0 = 1_800_000_000_000;

function harness() {
  const els = [];
  const mk = () => ({ style: {}, dataset: {}, children: [], appendChild(c) { this.children.push(c); return c; }, insertBefore(c) { this.children.push(c); return c; }, getContext: () => ({ clearRect() {}, drawImage() {} }), setAttribute() {}, addEventListener() {} });
  global.document = { createElement: (tag) => { const e = mk(); e.tag = tag; els.push(e); return e; } };
  global.Image = function () { return { complete: false, naturalWidth: 0 }; };
  const src = fs.readFileSync(path.join(ROOT, "src", "habitat", "habitat-renderer.js"), "utf8");
  const { createHabitatRenderer } = new Function(`${src}\nreturn { createHabitatRenderer };`)();
  const r = createHabitatRenderer({ container: mk(), manifest, manifestDirUrl: "file:///x/habitat/cozy-cottage/", atomMetaMap: {} });
  const objs = els.filter((e) => e.tag === "object"); // claude, codex (svg)
  const wrappers = objs.map((o) => els.find((e) => e.children.includes(o)));
  const snap = (over = {}) => ({
    nowMs: T0, reducedMotion: false, cottage: { lights: "amber", door: "closed", smoke: false },
    residents: { claude: { provider: "claude", presence: "outside", x: 74, y: 148, facing: "right", visualClip: "busy" } },
    helpers: { claude: 0, codex: 0, antigravity: 0 }, ...over,
  });
  return { r, claude: objs[0], claudeWrap: wrappers[0], snap };
}
const cleanup = () => { delete global.document; delete global.Image; };
const file = (o) => String(o.data).split("/").pop();

test("T35: o clipe de trabalho alterna entre variantes do Claude e volta à lista", () => {
  const h = harness();
  try {
    const seen = new Set();
    for (let k = 0; k < 4; k++) { h.r.render(h.snap({ nowMs: T0 + k * 20000 })); seen.add(file(h.claude)); }
    assert.ok(seen.size >= 3, `variantes vistas: ${[...seen]}`);
    for (const f of seen) assert.match(f, /^clawd-working-/);
  } finally { cleanup(); }
});

test("T35: com ajudante ativo o morador mostra o clipe de delegar", () => {
  const h = harness();
  try {
    h.r.render(h.snap({ helpers: { claude: 1, codex: 0, antigravity: 0 } }));
    assert.match(file(h.claude), /juggling/);
    h.r.render(h.snap({ nowMs: T0 + 100 }));
    assert.doesNotMatch(file(h.claude), /juggling/, "sem ajudante volta ao trabalho normal");
  } finally { cleanup(); }
});

test("T35: pulinho ao concluir só no começo; passeio e olhar só fora e sem movimento reduzido", () => {
  const h = harness();
  try {
    const done = (ms, over) => h.snap({ nowMs: T0 + ms, residents: { claude: { provider: "claude", presence: "outside", x: 74, y: 148, facing: "right", visualClip: "done" } }, ...over });
    h.r.render(done(0));
    h.r.render(done(200));
    assert.match(h.claudeWrap.style.transform, /translate\(0\.00px, -[1-9]/, "no pulinho o morador sobe");
    h.r.render(done(3000));
    assert.match(h.claudeWrap.style.transform, /translate\(0\.00px, 0\.00px\)/, "depois do pulinho fica parado");
    h.r.render(h.snap({ nowMs: T0 + 2500, reducedMotion: true }));
    assert.match(h.claudeWrap.style.transform, /translate\(0\.00px, 0\.00px\) scaleX\(1\)/, "movimento reduzido zera tudo");
    h.r.render(h.snap({ nowMs: T0 + 2500 }));
    assert.doesNotMatch(h.claudeWrap.style.transform, /translate\(0\.00px, 0\.00px\)/, "passeio desloca o morador no trabalho");
    const xs = new Set();
    for (let k = 0; k < 40; k++) { h.r.render(h.snap({ nowMs: T0 + k * 1000 })); xs.add(/translate\((-?[\d.]+)px/.exec(h.claudeWrap.style.transform)[1]); }
    assert.ok([...xs].every((v) => Math.abs(parseFloat(v)) <= 3), "passeio de no máximo 3 px do canvas");
  } finally { cleanup(); }
});

test("T35: com o morador dentro da cabana (000) nada é desenhado nem deslocado", () => {
  const h = harness();
  try {
    h.r.render(h.snap({ residents: { claude: { provider: "claude", presence: "inside", x: 160, y: 132, facing: "right", visualClip: null } } }));
    assert.strictEqual(h.claudeWrap.style.display, "none");
  } finally { cleanup(); }
});

test("T35: erro e aprovação seguem com um clipe só e o manifesto valida variantes e delegar", () => {
  for (const a of Object.values(manifest.actors)) {
    assert.ok(!Array.isArray(a.clips.error), "erro nunca varia");
    assert.ok(!Array.isArray(a.clips.needs_approval), "aprovação nunca varia");
    assert.ok(a.clips.delegating, "todo morador tem clipe de delegar");
    assert.ok(Array.isArray(a.clips.busy) && a.clips.busy.length >= 3);
  }
  const args = { manifestDir: path.dirname(MP), repoRoot: ROOT, checkFiles: true };
  assert.deepStrictEqual(validateHabitatManifest({ manifest, ...args }).errors || [], []);
  const vazio = JSON.parse(JSON.stringify(manifest)); vazio.actors.clawd.clips.busy = [];
  assert.ok((validateHabitatManifest({ manifest: vazio, ...args }).errors || []).some((e) => /empty list/.test(e)));
  const ausente = JSON.parse(JSON.stringify(manifest)); ausente.actors.atom.clips.done[1].sheet = "nao-existe.webp";
  assert.ok((validateHabitatManifest({ manifest: ausente, ...args }).errors || []).some((e) => /nao-existe/.test(e)));
});
