const fs = require('node:fs');
const path = require('node:path');

function validateHabitatManifest({ manifest, manifestDir, repoRoot, checkFiles = false }) {
  const errors = [];

  if (!manifest || typeof manifest !== 'object') {
    return { ok: false, errors: ['Manifest must be a non-null object'], resolved: null };
  }

  if (manifest.schema !== 1) {
    errors.push('manifest.schema must be 1');
  }

  if (typeof manifest.id !== 'string' || !manifest.id.trim()) {
    errors.push('manifest.id must be a non-empty string');
  }

  if (typeof manifest.name !== 'string' || !manifest.name.trim()) {
    errors.push('manifest.name must be a non-empty string');
  }

  const canvas = manifest.canvas;
  if (!canvas || typeof canvas !== 'object' || typeof canvas.width !== 'number' || typeof canvas.height !== 'number' || canvas.width <= 0 || canvas.height <= 0 || !Number.isInteger(canvas.width) || !Number.isInteger(canvas.height)) {
    errors.push('canvas must have positive integer width and height');
  }

  const doorAnchor = manifest.doorAnchor;
  if (!doorAnchor || typeof doorAnchor !== 'object' || typeof doorAnchor.x !== 'number' || typeof doorAnchor.y !== 'number' || canvas && (doorAnchor.x < 0 || doorAnchor.x > canvas.width || doorAnchor.y < 0 || doorAnchor.y > canvas.height)) {
    errors.push('doorAnchor must be within canvas bounds');
  }

  const cottageHitBox = manifest.cottageHitBox;
  if (!cottageHitBox || typeof cottageHitBox !== 'object' || typeof cottageHitBox.width !== 'number' || typeof cottageHitBox.height !== 'number' || cottageHitBox.width <= 0 || cottageHitBox.height <= 0 || canvas && (cottageHitBox.x < 0 || cottageHitBox.y < 0 || cottageHitBox.x + cottageHitBox.width > canvas.width || cottageHitBox.y + cottageHitBox.height > canvas.height)) {
    errors.push('cottageHitBox must have positive dimensions and be within canvas');
  }

  const layers = manifest.layers;
  const requiredLayers = ['shadow', 'backdrop', 'cottageNight', 'cottageAmber', 'foreground'];
  if (!layers || typeof layers !== 'object') {
    errors.push('layers object is required');
  } else {
    for (const l of requiredLayers) {
      if (typeof layers[l] !== 'string') {
        errors.push(`layers.${l} must be a string path`);
      }
    }
    if (!layers.door || typeof layers.door !== 'object') {
      errors.push('layers.door object is required');
    } else {
      if (typeof layers.door.x !== 'number' || typeof layers.door.y !== 'number' || typeof layers.door.width !== 'number' || typeof layers.door.height !== 'number' || layers.door.width <= 0 || layers.door.height <= 0 || canvas && (layers.door.x < 0 || layers.door.y < 0 || layers.door.x + layers.door.width > canvas.width || layers.door.y + layers.door.height > canvas.height)) {
        errors.push('layers.door must have valid dimensions and be within canvas');
      }
      const frames = layers.door.frames;
      if (!frames || typeof frames !== 'object' || typeof frames.closed !== 'string' || typeof frames.opening !== 'string' || typeof frames.open !== 'string' || typeof frames.closing !== 'string') {
        errors.push('layers.door.frames must include closed, opening, open, closing string paths');
      }
    }

    if (!layers.smoke || typeof layers.smoke !== 'object') {
      errors.push('layers.smoke object is required');
    } else {
      if (typeof layers.smoke.x !== 'number' || typeof layers.smoke.y !== 'number' || typeof layers.smoke.width !== 'number' || typeof layers.smoke.height !== 'number' || layers.smoke.width <= 0 || layers.smoke.height <= 0 || typeof layers.smoke.frameMs !== 'number' || layers.smoke.frameMs <= 0 || !Array.isArray(layers.smoke.frames) || canvas && (layers.smoke.x < 0 || layers.smoke.y < 0 || layers.smoke.x + layers.smoke.width > canvas.width || layers.smoke.y + layers.smoke.height > canvas.height)) {
        errors.push('layers.smoke must have valid dimensions within canvas, frameMs > 0, and frames array');
      }
    }
  }

  const stations = manifest.stations;
  const expectedProviders = ['claude', 'codex', 'antigravity'];
  if (!stations || typeof stations !== 'object') {
    errors.push('stations object is required');
  } else {
    for (const p of expectedProviders) {
      const st = stations[p];
      if (!st || typeof st !== 'object') {
        errors.push(`stations.${p} is required`);
        continue;
      }
      if (typeof st.character !== 'string' || !st.character.trim()) {
        errors.push(`stations.${p}.character must be a string`);
      }
      const anchor = st.anchor;
      if (!anchor || typeof anchor.x !== 'number' || typeof anchor.y !== 'number' || canvas && (anchor.x < 0 || anchor.x > canvas.width || anchor.y < 0 || anchor.y > canvas.height)) {
        errors.push(`stations.${p}.anchor must be within canvas`);
      }
      const actorSize = st.actorSize;
      if (!actorSize || typeof actorSize.width !== 'number' || typeof actorSize.height !== 'number' || actorSize.width <= 0 || actorSize.height <= 0) {
        errors.push(`stations.${p}.actorSize must have positive dimensions`);
      }
      const props = st.props;
      if (!props || typeof props.file !== 'string' || typeof props.x !== 'number' || typeof props.y !== 'number' || typeof props.width !== 'number' || typeof props.height !== 'number' || props.width <= 0 || props.height <= 0 || canvas && (props.x < 0 || props.y < 0 || props.x + props.width > canvas.width || props.y + props.height > canvas.height)) {
        errors.push(`stations.${p}.props must have valid file and bounds within canvas`);
      }
    }
  }

  const actors = manifest.actors;
  const expectedActors = ['clawd', 'cloudling', 'atom'];
  const requiredClips = ['exiting', 'busy', 'waiting_input', 'needs_approval', 'error', 'done', 'entering'];
  if (!actors || typeof actors !== 'object') {
    errors.push('actors object is required');
  } else {
    for (const a of expectedActors) {
      const act = actors[a];
      if (!act || typeof act !== 'object') {
        errors.push(`actors.${a} is required`);
        continue;
      }
      if (act.kind !== 'svg' && act.kind !== 'spritesheet-webp') {
        errors.push(`actors.${a}.kind must be 'svg' or 'spritesheet-webp'`);
      }
      if (typeof act.baseDir !== 'string' || !act.baseDir.trim()) {
        errors.push(`actors.${a}.baseDir must be a string`);
      }
      const clips = act.clips;
      if (!clips || typeof clips !== 'object') {
        errors.push(`actors.${a}.clips object is required`);
      } else {
        for (const c of requiredClips) {
          const clipVal = clips[c];
          if (act.kind === 'svg') {
            if (typeof clipVal !== 'string') {
              errors.push(`actors.${a}.clips.${c} must be a string path for svg kind`);
            }
          } else if (act.kind === 'spritesheet-webp') {
            if (!clipVal || typeof clipVal !== 'object' || typeof clipVal.sheet !== 'string' || typeof clipVal.meta !== 'string') {
              errors.push(`actors.${a}.clips.${c} must be { sheet: string, meta: string } for spritesheet-webp kind`);
            }
          }
        }
      }
    }
  }

  // Security checks (T26)
  const resolvedRepoRoot = path.resolve(repoRoot);
  const resolvedManifestDir = path.resolve(manifestDir);

  const checkPathSafety = (relPath, baseSubDir = '') => {
    if (typeof relPath !== 'string') {
      errors.push(`Path must be a string: ${relPath}`);
      return;
    }
    if (relPath.includes('\0')) {
      errors.push(`Path contains null byte: ${relPath}`);
      return;
    }
    if (path.isAbsolute(relPath) || path.win32.isAbsolute(relPath) || /^[a-zA-Z]:[/\\]/.test(relPath) || relPath.startsWith('/') || relPath.startsWith('\\')) {
      errors.push(`Path must not be absolute: ${relPath}`);
      return;
    }
    const full = path.resolve(resolvedManifestDir, baseSubDir, relPath);
    const relToRepo = path.relative(resolvedRepoRoot, full);
    if (relToRepo.startsWith('..') || path.isAbsolute(relToRepo)) {
      errors.push(`Path traversal outside repoRoot: ${relPath}`);
      return;
    }
    if (checkFiles) {
      if (!fs.existsSync(full)) {
        errors.push(`File does not exist: ${full}`);
      }
    }
  };

  const validateClipPathOrObject = (val, baseDir = '') => {
    if (typeof val === 'string') {
      if (path.isAbsolute(val) || path.win32.isAbsolute(val) || /^[a-zA-Z]:[/\\]/.test(val) || val.startsWith('/') || val.startsWith('\\')) {
        errors.push(`Path must not be absolute: ${val}`);
        return;
      }
      checkPathSafety(val, baseDir);
    } else if (val && typeof val === 'object') {
      if (typeof val.sheet === 'string') {
        if (path.isAbsolute(val.sheet) || path.win32.isAbsolute(val.sheet) || /^[a-zA-Z]:[/\\]/.test(val.sheet) || val.sheet.startsWith('/') || val.sheet.startsWith('\\')) {
          errors.push(`Path must not be absolute: ${val.sheet}`);
        } else {
          checkPathSafety(val.sheet, baseDir);
        }
      }
      if (typeof val.meta === 'string') {
        if (path.isAbsolute(val.meta) || path.win32.isAbsolute(val.meta) || /^[a-zA-Z]:[/\\]/.test(val.meta) || val.meta.startsWith('/') || val.meta.startsWith('\\')) {
          errors.push(`Path must not be absolute: ${val.meta}`);
        } else {
          checkPathSafety(val.meta, baseDir);
        }
      }
    }
  };

  if (layers && resolvedManifestDir && resolvedRepoRoot) {
    validateClipPathOrObject(layers.shadow);
    validateClipPathOrObject(layers.backdrop);
    validateClipPathOrObject(layers.cottageNight);
    validateClipPathOrObject(layers.cottageAmber);
    validateClipPathOrObject(layers.foreground);
    if (layers.door && layers.door.frames) {
      validateClipPathOrObject(layers.door.frames.closed);
      validateClipPathOrObject(layers.door.frames.opening);
      validateClipPathOrObject(layers.door.frames.open);
      validateClipPathOrObject(layers.door.frames.closing);
    }
    if (layers.smoke && Array.isArray(layers.smoke.frames)) {
      for (const f of layers.smoke.frames) {
        validateClipPathOrObject(f);
      }
    }
  }

  // P1.3: ajudantes de subagente (opcional); se existir, precisa estar íntegro.
  const helpers = manifest.helpers;
  if (helpers !== undefined) {
    const f = helpers && helpers.frame;
    const ok = helpers && typeof helpers.file === 'string' && f && f.width > 0 && f.height > 0
      && helpers.frameMs > 0 && Number.isInteger(helpers.max) && helpers.max > 0 && helpers.rows
      && expectedProviders.every((p) => Number.isInteger(helpers.rows[p]) && helpers.rows[p] >= 0);
    if (!ok || (helpers.frames !== undefined && !(Number.isInteger(helpers.frames) && helpers.frames >= 2))) errors.push('helpers must have file, frame, frameMs, max, rows for every provider and frames >= 2 when set');
    else if (resolvedManifestDir && resolvedRepoRoot) validateClipPathOrObject(helpers.file);
  }

  // P1.4: objetos do jardim e filtro noturno (opcional); se existir, precisa estar íntegro.
  const garden = manifest.garden;
  if (garden !== undefined) {
    const f = garden && garden.frame;
    const items = garden && garden.items;
    const ok = garden && typeof garden.file === 'string' && typeof garden.nightFilter === 'string'
      && f && f.width > 0 && f.height > 0 && items && ['bench', 'campfire', 'kitten', 'mailbox'].every((k) => items[k]
        && Number.isInteger(items[k].col) && items[k].col >= 0 && Number.isFinite(items[k].x) && Number.isFinite(items[k].y));
    if (!ok) errors.push('garden must have file, frame, nightFilter and bench/campfire/kitten/mailbox items with col, x, y');
    else if (resolvedManifestDir && resolvedRepoRoot) validateClipPathOrObject(garden.file);
  }

  if (stations && resolvedManifestDir && resolvedRepoRoot) {
    for (const p of expectedProviders) {
      if (stations[p] && stations[p].props) {
        validateClipPathOrObject(stations[p].props.file);
      }
    }
  }

  if (actors && resolvedManifestDir && resolvedRepoRoot) {
    for (const a of expectedActors) {
      const act = actors[a];
      if (act && act.clips && act.baseDir) {
        for (const c of requiredClips) {
          const clipVal = act.clips[c];
          validateClipPathOrObject(clipVal, act.baseDir);
        }
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    resolved: errors.length === 0 ? { manifestDir: resolvedManifestDir, repoRoot: resolvedRepoRoot } : null
  };
}

function loadAndValidateHabitatManifest({ manifestPath, repoRoot, checkFiles = true }) {
  const resolvedManifestPath = path.resolve(manifestPath);
  const manifestDir = path.dirname(resolvedManifestPath);
  try {
    const raw = fs.readFileSync(resolvedManifestPath, 'utf8');
    const manifest = JSON.parse(raw);
    return validateHabitatManifest({ manifest, manifestDir, repoRoot, checkFiles });
  } catch (err) {
    return { ok: false, errors: [err.message], resolved: null };
  }
}

module.exports = {
  validateHabitatManifest,
  loadAndValidateHabitatManifest
};
