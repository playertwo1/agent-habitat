"use strict";

// P3.7.5: aviso de tarefa concluída dentro da ilha (substitui o card em janela própria).
// Uma plaquinha de madeira surge ao lado da estação do morador, com o ícone e o nome dele; clicar foca a
// sessão (D3) e ela some sozinha. Só o provedor chega ao palco: nada de pasta, resumo ou prompt.

const DONE_SIGN_ART = Object.freeze({
  sheet: "comum/done-sign.png", // relativo a assets/habitat/
  icons: "comum/done-icons.png",
  frame: Object.freeze({ width: 64, height: 58 }),
  frames: 4, // 0 estaca, 1 metade, 2 placa inteira, 3 placa com a bandeirinha balançando e brilhos
  stakeX: 20, // x da estaca dentro do quadro: é ela que fica ao lado do morador
  plaque: Object.freeze({ x: 5, y: 21, width: 31, height: 20 }), // área lisa do pergaminho
  iconSize: 10,
  iconOrder: Object.freeze(["claude", "codex", "antigravity"]),
});

const DONE_SIGN_LABELS = Object.freeze({ claude: "Clawd", codex: "Cloudling", antigravity: "Atom" });
const DONE_SIGN_MS = 8000; // some sozinho
const RISE_FRAME_MS = 120; // cada quadro do "surgir do chão"
const WAVE_MS = 450; // bandeirinha: alterna os quadros 2 e 3

// Posição (canvas, sem escala) da plaquinha: ao lado da estação, virada para o centro da ilha.
function layoutDoneSign(manifest, provider) {
  const station = manifest && manifest.stations && manifest.stations[provider];
  if (!station || !station.anchor) return null;
  const cw = (manifest.canvas && manifest.canvas.width) || 320;
  const { width: fw, height: fh } = DONE_SIGN_ART.frame;
  const half = ((station.actorSize && station.actorSize.width) || 44) / 2;
  const dir = station.anchor.x > cw * 0.6 ? -1 : 1; // estação da direita: placa à esquerda do morador
  const stakeX = Math.round(station.anchor.x + dir * (half + 6));
  const x = Math.max(0, Math.min(cw - fw, stakeX - DONE_SIGN_ART.stakeX));
  const y = Math.round(station.anchor.y - fh);
  return { x, y, width: fw, height: fh };
}

// Quadro a mostrar: sobe do chão (0, 1, 2) e depois balança a bandeirinha (2/3). Movimento reduzido: placa parada.
function doneSignFrame(elapsedMs, reducedMotion = false) {
  if (reducedMotion) return 2;
  const e = Math.max(0, elapsedMs);
  if (e < RISE_FRAME_MS * 2) return Math.floor(e / RISE_FRAME_MS);
  return Math.floor((e - RISE_FRAME_MS * 2) / WAVE_MS) % 2 === 0 ? 2 : 3;
}

function createDoneSignTracker({ durationMs = DONE_SIGN_MS } = {}) {
  const active = new Map(); // provider -> startMs

  function prune(now) {
    for (const [p, start] of active) if (now - start >= durationMs) active.delete(p);
  }

  return {
    show(provider, now = Date.now()) {
      if (!Object.prototype.hasOwnProperty.call(DONE_SIGN_LABELS, provider)) return false;
      active.set(provider, now);
      return true;
    },
    dismiss(provider) {
      return active.delete(provider);
    },
    clear() {
      active.clear();
    },
    hasActive(now = Date.now()) {
      prune(now);
      return active.size > 0;
    },
    // O que vai ao palco: só provedor, rótulo fixo, posição e início; nunca dados da sessão.
    list(manifest, now = Date.now()) {
      prune(now);
      const out = [];
      for (const [provider, startMs] of active) {
        const rect = layoutDoneSign(manifest, provider);
        if (rect) out.push({ provider, label: DONE_SIGN_LABELS[provider], startMs, ...rect });
      }
      return out;
    },
  };
}

// Retângulos de clique (pixels da janela, com escala) das plaquinhas visíveis.
function doneSignHitRects(signs, scale = 1) {
  const s = typeof scale === "number" && scale > 0 ? scale : 1;
  return (signs || []).map((g) => ({
    x: Math.round(g.x * s),
    y: Math.round(g.y * s),
    width: Math.round(g.width * s),
    height: Math.round(g.height * s),
    provider: g.provider,
    target: "done-sign",
  }));
}

function hitDoneSign(signs, x, y, scale = 1) {
  for (const r of doneSignHitRects(signs, scale)) {
    if (x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height) return r.provider;
  }
  return null;
}

module.exports = {
  DONE_SIGN_ART,
  DONE_SIGN_LABELS,
  DONE_SIGN_MS,
  layoutDoneSign,
  doneSignFrame,
  createDoneSignTracker,
  doneSignHitRects,
  hitDoneSign,
};
