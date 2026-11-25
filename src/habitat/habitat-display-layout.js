"use strict";

/**
 * Habitat Display DPI and Layout Management
 * Handles scale normalization, multi-monitor workArea resolution,
 * safe stage placement, and panel clamping without overlapping taskbars.
 */

function normalizeStageSizeForScale({ manifest, scale = 1.5 }) {
  const canvas = manifest && manifest.canvas ? manifest.canvas : { width: 320, height: 192 };
  const baseW = canvas.width;
  const baseH = canvas.height;
  const s = typeof scale === "number" && scale > 0 ? scale : 1.5;
  return {
    width: Math.round(baseW * s),
    height: Math.round(baseH * s)
  };
}

function resolveTargetDisplayWorkArea({ bounds, displays = [], primaryDisplay, getDisplayMatching }) {
  // If getDisplayMatching is provided and bounds are valid, try matching display
  if (typeof getDisplayMatching === "function" && bounds && typeof bounds === "object" && bounds.width > 0 && bounds.height > 0) {
    try {
      const matched = getDisplayMatching(bounds);
      if (matched && matched.workArea) {
        // Verify if matched display's workArea intersects or if it's in displays
        const wa = matched.workArea;
        // Check if bounds are completely orphaned (outside all displays if displays provided)
        let isOrphaned = false;
        if (Array.isArray(displays) && displays.length > 0) {
          const foundInDisplays = displays.some(d => {
            const dWa = d.workArea || d.bounds;
            if (!dWa) return false;
            // Check intersection
            return !(
              bounds.x + bounds.width <= dWa.x ||
              bounds.x >= dWa.x + dWa.width ||
              bounds.y + bounds.height <= dWa.y ||
              bounds.y >= dWa.y + dWa.height
            );
          });
          if (!foundInDisplays) {
            isOrphaned = true;
          }
        }
        if (!isOrphaned) {
          return wa;
        }
      }
    } catch (err) {
      // ignore getDisplayMatching error and fall through
    }
  }

  // If displays list is provided, check if bounds intersect any display workArea/bounds
  if (Array.isArray(displays) && displays.length > 0 && bounds && typeof bounds === "object" && bounds.width > 0 && bounds.height > 0) {
    const centerX = bounds.x + Math.floor(bounds.width / 2);
    const centerY = bounds.y + Math.floor(bounds.height / 2);

    // 1. Try finding display containing the center point
    for (const d of displays) {
      const wa = d.workArea || d.bounds;
      if (wa && centerX >= wa.x && centerX < wa.x + wa.width && centerY >= wa.y && centerY < wa.y + wa.height) {
        return wa;
      }
    }

    // 2. Try finding display with best intersection
    for (const d of displays) {
      const wa = d.workArea || d.bounds;
      if (wa) {
        const intersects = !(
          bounds.x + bounds.width <= wa.x ||
          bounds.x >= wa.x + wa.width ||
          bounds.y + bounds.height <= wa.y ||
          bounds.y >= wa.y + wa.height
        );
        if (intersects) {
          return wa;
        }
      }
    }
  }

  // Fallback to primaryDisplay or first display
  if (primaryDisplay && (primaryDisplay.workArea || primaryDisplay.bounds)) {
    return primaryDisplay.workArea || primaryDisplay.bounds;
  }
  if (Array.isArray(displays) && displays.length > 0) {
    const first = displays.find(d => d.id === (primaryDisplay && primaryDisplay.id)) || displays[0];
    if (first && (first.workArea || first.bounds)) {
      return first.workArea || first.bounds;
    }
  }

  // Ultimate fallback
  return { x: 0, y: 0, width: 1920, height: 1080 };
}

function computeSafeStageBounds({
  manifest,
  scale = 1.5,
  savedPosition = null,
  displays = [],
  primaryDisplay,
  getDisplayMatching,
  margin = 24
}) {
  const { width, height } = normalizeStageSizeForScale({ manifest, scale });

  let workArea;
  if (savedPosition && typeof savedPosition.x === "number" && typeof savedPosition.y === "number" && Number.isFinite(savedPosition.x) && Number.isFinite(savedPosition.y)) {
    const testBounds = { x: savedPosition.x, y: savedPosition.y, width, height };
    workArea = resolveTargetDisplayWorkArea({
      bounds: testBounds,
      displays,
      primaryDisplay,
      getDisplayMatching
    });

    // Clamp within resolved workArea
    let x = savedPosition.x;
    let y = savedPosition.y;

    // If stage size is larger than workArea, anchor to workArea origin
    if (width > workArea.width) {
      x = workArea.x;
    } else {
      x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width));
    }

    if (height > workArea.height) {
      y = workArea.y;
    } else {
      y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height));
    }

    return { x, y, width, height };
  } else {
    // Default position: bottom-right of primary display workArea with margin
    const prim = primaryDisplay || (displays.length > 0 ? displays[0] : null);
    workArea = prim && (prim.workArea || prim.bounds) ? (prim.workArea || prim.bounds) : { x: 0, y: 0, width: 1920, height: 1080 };

    let x = workArea.x + workArea.width - width - margin;
    let y = workArea.y + workArea.height - height - margin;

    // Ensure within workArea bounds
    x = Math.max(workArea.x, Math.min(x, workArea.x + workArea.width - width));
    y = Math.max(workArea.y, Math.min(y, workArea.y + workArea.height - height));

    return { x, y, width, height };
  }
}

function computeSafePanelBounds({
  stageBounds,
  panelWidth = 480,
  panelHeight = 640,
  workArea,
  gap = 12
}) {
  const wa = workArea || { x: 0, y: 0, width: 1920, height: 1080 };
  const safeW = Math.min(panelWidth, Math.max(280, wa.width - 16));
  const safeH = Math.min(panelHeight, Math.max(320, wa.height - 16));

  // Prefer opening to the left of the stage, or right if no room, or above/below
  let x = stageBounds.x - safeW - gap;
  let y = stageBounds.y;

  // If panel doesn't fit on the left of stage, try right of stage
  if (x < wa.x) {
    x = stageBounds.x + stageBounds.width + gap;
    // If it doesn't fit on the right either, align with wa.x + margin or stage left
    if (x + safeW > wa.x + wa.width) {
      x = Math.max(wa.x, wa.x + wa.width - safeW - 8);
    }
  }

  // Vertical clamp within workArea
  y = Math.max(wa.y, Math.min(y, wa.y + wa.height - safeH));
  // Horizontal clamp within workArea
  x = Math.max(wa.x, Math.min(x, wa.x + wa.width - safeW));

  return {
    x,
    y,
    width: safeW,
    height: safeH
  };
}

module.exports = {
  normalizeStageSizeForScale,
  resolveTargetDisplayWorkArea,
  computeSafeStageBounds,
  computeSafePanelBounds
};
