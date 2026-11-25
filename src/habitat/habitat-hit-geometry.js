"use strict";

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function computeHabitatHitRects({ manifest, snapshot, scale = 1 } = {}) {
  const canvasW = manifest && manifest.canvas && typeof manifest.canvas.width === "number" ? manifest.canvas.width : 320;
  const canvasH = manifest && manifest.canvas && typeof manifest.canvas.height === "number" ? manifest.canvas.height : 192;
  const s = typeof scale === "number" && scale > 0 ? scale : 1;

  const maxW = Math.round(canvasW * s);
  const maxH = Math.round(canvasH * s);

  // 1. Cottage rect
  const cHit = manifest && manifest.cottageHitBox ? manifest.cottageHitBox : { x: 104, y: 24, width: 112, height: 116 };
  const cx = Math.round(cHit.x * s);
  const cy = Math.round(cHit.y * s);
  const cw = Math.round(cHit.width * s);
  const ch = Math.round(cHit.height * s);

  const cottageRect = {
    x: clamp(cx, 0, maxW),
    y: clamp(cy, 0, maxH),
    width: clamp(cw, 0, maxW - clamp(cx, 0, maxW)),
    height: clamp(ch, 0, maxH - clamp(cy, 0, maxH)),
    provider: null,
    target: "cottage"
  };

  const rects = [cottageRect];
  const residentRects = {};

  const stations = manifest && manifest.stations ? manifest.stations : {};
  const residentsSnap = snapshot && snapshot.residents ? snapshot.residents : {};
  const providersSnap = snapshot && snapshot.providers ? snapshot.providers : {};

  for (const [provider, station] of Object.entries(stations)) {
    // Check visibility / active state
    // "SOMENTE inclui a hitbox do morador quando o morador estiver visível/ativo (ex: state !== "off" && resident.mode !== "off" && resident.visible !== false)"
    const resSnap = residentsSnap[provider] || {};
    const provSnap = providersSnap[provider] || {};

    const stateVal = resSnap.logicalState || resSnap.state || provSnap.state || "off";
    const modeVal = resSnap.mode || provSnap.mode;
    const visibleVal = resSnap.visible !== false && provSnap.visible !== false;

    if (stateVal === "off" || modeVal === "off" || !visibleVal) {
      continue;
    }

    if (resSnap.presence === "inside" && !resSnap.visualClip) {
      continue;
    }

    // Determine bounding box around station / actor anchor
    // Use station anchor or actorSize
    const actorSize = station.actorSize || { width: 44, height: 44 };
    const anchor = station.anchor || { x: 0, y: 0 };

    // If resident is outside or moving, we can also check resSnap.x, resSnap.y if present,
    // but station anchor is the standard resident hit box reference. Let's support both station anchor or resident current position if active outside.
    let rx = anchor.x - (actorSize.width / 2);
    let ry = anchor.y - actorSize.height;

    if (typeof resSnap.x === "number" && typeof resSnap.y === "number" && resSnap.presence && resSnap.presence !== "inside") {
      rx = resSnap.x - (actorSize.width / 2);
      ry = resSnap.y - actorSize.height;
    }

    const scaledX = Math.round(rx * s);
    const scaledY = Math.round(ry * s);
    const scaledW = Math.round(actorSize.width * s);
    const scaledH = Math.round(actorSize.height * s);

    const hitRect = {
      x: clamp(scaledX, 0, maxW),
      y: clamp(scaledY, 0, maxH),
      width: clamp(scaledW, 1, maxW - clamp(scaledX, 0, maxW)),
      height: clamp(scaledH, 1, maxH - clamp(scaledY, 0, maxH)),
      provider,
      target: "resident"
    };

    residentRects[provider] = hitRect;
    rects.push(hitRect);
  }

  return {
    stageWidth: maxW,
    stageHeight: maxH,
    cottageRect,
    residentRects,
    rects
  };
}

function classifyHabitatHitPoint({ x, y, manifest, snapshot, scale = 1 } = {}) {
  if (typeof x !== "number" || typeof y !== "number") return null;

  const hitData = computeHabitatHitRects({ manifest, snapshot, scale });

  // Check residentRects first (clamped/hit test)
  for (const [provider, rect] of Object.entries(hitData.residentRects)) {
    if (
      x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height
    ) {
      return { target: "resident", provider };
    }
  }

  // Then check cottageRect
  const cr = hitData.cottageRect;
  if (
    cr &&
    x >= cr.x &&
    x <= cr.x + cr.width &&
    y >= cr.y &&
    y <= cr.y + cr.height
  ) {
    return { target: "cottage", provider: null };
  }

  return null;
}

function getResidentHitBox({ manifest, provider, scale = 1 } = {}) {
  if (!manifest || !manifest.stations || !manifest.stations[provider]) return null;
  const station = manifest.stations[provider];
  const actorSize = station.actorSize || { width: 44, height: 44 };
  const anchor = station.anchor || { x: 0, y: 0 };
  const s = typeof scale === "number" && scale > 0 ? scale : 1;

  const rx = Math.round((anchor.x - (actorSize.width / 2)) * s);
  const ry = Math.round((anchor.y - actorSize.height) * s);
  const rw = Math.round(actorSize.width * s);
  const rh = Math.round(actorSize.height * s);

  return {
    x: rx,
    y: ry,
    width: Math.max(1, rw),
    height: Math.max(1, rh)
  };
}

module.exports = {
  computeHabitatHitRects,
  classifyHabitatHitPoint,
  getResidentHitBox
};
