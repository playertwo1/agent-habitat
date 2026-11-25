"use strict";

// Externo ao HTML: a CSP do hit (script-src 'self') bloqueia script inline.
window.addEventListener('DOMContentLoaded', () => {
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let totalDeltaX = 0;
  let totalDeltaY = 0;

  const overlay = document.getElementById('hit-overlay');

  overlay.addEventListener('mousedown', (e) => {
    if (e.button === 2) {
      window.habitatHit.sendContextMenu();
      return;
    }
    if (e.button !== 0) return;
    isDragging = false;
    startX = e.screenX;
    startY = e.screenY;
    totalDeltaX = 0;
    totalDeltaY = 0;
  });

  window.addEventListener('mousemove', (e) => {
    if (e.buttons === 0) return;
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    startX = e.screenX;
    startY = e.screenY;

    totalDeltaX += dx;
    totalDeltaY += dy;

    if (!isDragging && (Math.abs(totalDeltaX) >= 5 || Math.abs(totalDeltaY) >= 5)) {
      isDragging = true;
    }

    if (isDragging) {
      window.habitatHit.sendDragDelta({ dx, dy });
    }
  });

  window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    if (isDragging) {
      window.habitatHit.sendDragEnd();
      isDragging = false;
    } else {
      const rect = overlay.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      window.habitatHit.sendClick({ x, y });
    }
  });

  overlay.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    window.habitatHit.sendContextMenu();
  });
});
