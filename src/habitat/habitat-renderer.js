function createHabitatRenderer({ container, manifest, manifestDirUrl, atomMetaMap, scale = 1, reducedMotion = false, disableTransitions = false }) {
  const canvasWidth = manifest.canvas.width;
  const canvasHeight = manifest.canvas.height;

  container.innerHTML = '';
  container.style.position = 'relative';
  container.style.width = `${canvasWidth * scale}px`;
  container.style.height = `${canvasHeight * scale}px`;
  container.style.overflow = 'hidden';
  container.style.imageRendering = 'pixelated';

  const stage = document.createElement('div');
  stage.id = 'habitat-stage-inner';
  stage.style.position = 'absolute';
  stage.style.left = '0';
  stage.style.top = '0';
  stage.style.width = `${canvasWidth}px`;
  stage.style.height = `${canvasHeight}px`;
  stage.style.transform = `scale(${scale})`;
  stage.style.transformOrigin = 'top left';
  stage.style.imageRendering = 'pixelated';
  container.appendChild(stage);

  // Layer 0: Shadow
  const shadowEl = document.createElement('img');
  shadowEl.src = new URL(manifest.layers.shadow, manifestDirUrl).href;
  styleLayer(shadowEl);
  stage.appendChild(shadowEl);

  // Layer 1: Backdrop
  const backdropEl = document.createElement('img');
  backdropEl.src = new URL(manifest.layers.backdrop, manifestDirUrl).href;
  styleLayer(backdropEl);
  stage.appendChild(backdropEl);

  // Smoke layer
  const smokeEl = document.createElement('img');
  smokeEl.style.position = 'absolute';
  smokeEl.style.left = `${manifest.layers.smoke.x}px`;
  smokeEl.style.top = `${manifest.layers.smoke.y}px`;
  smokeEl.style.width = `${manifest.layers.smoke.width}px`;
  smokeEl.style.height = `${manifest.layers.smoke.height}px`;
  smokeEl.style.imageRendering = 'pixelated';
  smokeEl.style.display = 'none';
  stage.appendChild(smokeEl);

  // Layer 2: Cottage Night
  const nightEl = document.createElement('img');
  nightEl.src = new URL(manifest.layers.cottageNight, manifestDirUrl).href;
  styleLayer(nightEl);
  stage.appendChild(nightEl);

  // Layer 3: Cottage Amber
  const amberEl = document.createElement('img');
  amberEl.src = new URL(manifest.layers.cottageAmber, manifestDirUrl).href;
  styleLayer(amberEl);
  amberEl.style.opacity = '0';
  if (!disableTransitions) amberEl.style.transition = 'opacity 0.2s ease';
  stage.appendChild(amberEl);

  // Layer 4: Door
  const doorEl = document.createElement('img');
  doorEl.style.position = 'absolute';
  doorEl.style.left = `${manifest.layers.door.x}px`;
  doorEl.style.top = `${manifest.layers.door.y}px`;
  doorEl.style.width = `${manifest.layers.door.width}px`;
  doorEl.style.height = `${manifest.layers.door.height}px`;
  doorEl.style.imageRendering = 'pixelated';
  stage.appendChild(doorEl);

  const doorFrames = {
    closed: new URL(manifest.layers.door.frames.closed, manifestDirUrl).href,
    opening: new URL(manifest.layers.door.frames.opening, manifestDirUrl).href,
    open: new URL(manifest.layers.door.frames.open, manifestDirUrl).href,
    closing: new URL(manifest.layers.door.frames.closing, manifestDirUrl).href
  };
  doorEl.src = doorFrames.closed;

  // P1.4: objetos do jardim (só os ligados) e luz noturna nos fundos; moradores nunca são filtrados.
  const gardenCfg = manifest.garden || null;
  const gardenEls = {};
  if (gardenCfg) {
    const sheetUrl = new URL(gardenCfg.file, manifestDirUrl).href;
    for (const [name, it] of Object.entries(gardenCfg.items)) {
      const el = document.createElement('div');
      el.style.position = 'absolute';
      el.style.display = 'none';
      el.style.width = `${gardenCfg.frame.width}px`;
      el.style.height = `${gardenCfg.frame.height}px`;
      el.style.left = `${it.x - gardenCfg.frame.width / 2}px`;
      el.style.top = `${it.y - gardenCfg.frame.height}px`;
      el.style.backgroundImage = `url("${sheetUrl}")`;
      el.style.backgroundPosition = `-${it.col * gardenCfg.frame.width}px 0`;
      el.style.imageRendering = 'pixelated';
      el.dataset.garden = name;
      stage.appendChild(el);
      gardenEls[name] = el;
    }
  }
  const nightLayers = [backdropEl, nightEl, doorEl, ...Object.values(gardenEls)];

  // Station Props & Actors container
  const entitiesContainer = document.createElement('div');
  entitiesContainer.style.position = 'absolute';
  entitiesContainer.style.left = '0';
  entitiesContainer.style.top = '0';
  entitiesContainer.style.width = `${canvasWidth}px`;
  entitiesContainer.style.height = `${canvasHeight}px`;
  entitiesContainer.style.pointerEvents = 'none';
  stage.appendChild(entitiesContainer);

  const propElements = {};
  for (const [provider, station] of Object.entries(manifest.stations)) {
    const propImg = document.createElement('img');
    propImg.src = new URL(station.props.file, manifestDirUrl).href;
    propImg.style.position = 'absolute';
    propImg.style.left = `${station.props.x}px`;
    propImg.style.top = `${station.props.y}px`;
    propImg.style.width = `${station.props.width}px`;
    propImg.style.height = `${station.props.height}px`;
    propImg.style.imageRendering = 'pixelated';
    propImg.style.opacity = '0'; // hidden when inside
    if (!disableTransitions) propImg.style.transition = 'opacity 0.2s ease';
    stage.appendChild(propImg);
    propElements[provider] = propImg;
  }

  // Layer 6: Foreground
  const fgEl = document.createElement('img');
  fgEl.src = new URL(manifest.layers.foreground, manifestDirUrl).href;
  styleLayer(fgEl);
  stage.appendChild(fgEl);

  // P1.3: ajudantes de subagente (cogumelinhos), desenhados só com o morador fora da cabana.
  const helperCfg = manifest.helpers || null;
  const helperEls = {};
  if (helperCfg) {
    const helpersContainer = document.createElement('div');
    helpersContainer.style.position = 'absolute';
    helpersContainer.style.left = '0';
    helpersContainer.style.top = '0';
    helpersContainer.style.width = `${canvasWidth}px`;
    helpersContainer.style.height = `${canvasHeight}px`;
    helpersContainer.style.pointerEvents = 'none';
    stage.appendChild(helpersContainer);
    const sheetUrl = new URL(helperCfg.file, manifestDirUrl).href;
    for (const provider of Object.keys(manifest.stations)) {
      helperEls[provider] = [];
      for (let k = 0; k < helperCfg.max; k++) {
        const el = document.createElement('div');
        el.style.position = 'absolute';
        el.style.display = 'none';
        el.style.width = `${helperCfg.frame.width}px`;
        el.style.height = `${helperCfg.frame.height}px`;
        el.style.backgroundImage = `url("${sheetUrl}")`;
        el.style.imageRendering = 'pixelated';
        el.dataset.helper = provider;
        helpersContainer.appendChild(el);
        helperEls[provider].push(el);
      }
    }
  }

  const actorElements = {};

  for (const [provider, station] of Object.entries(manifest.stations)) {
    const actorName = station.character;
    const actorDef = manifest.actors[actorName];
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.pointerEvents = 'none';
    wrapper.style.display = 'none';
    entitiesContainer.appendChild(wrapper);

    if (actorDef.kind === 'svg') {
      const obj = document.createElement('object');
      obj.type = 'image/svg+xml';
      obj.style.width = '100%';
      obj.style.height = '100%';
      obj.style.pointerEvents = 'none';
      wrapper.appendChild(obj);
      actorElements[provider] = { type: 'svg', wrapper, obj, actorDef, currentUrl: '' };
    } else if (actorDef.kind === 'spritesheet-webp') {
      const cvs = document.createElement('canvas');
      cvs.style.width = '100%';
      cvs.style.height = '100%';
      cvs.style.imageRendering = 'pixelated';
      wrapper.appendChild(cvs);
      const ctx = cvs.getContext('2d');
      ctx.imageSmoothingEnabled = false;
      actorElements[provider] = { type: 'spritesheet', wrapper, canvas: cvs, ctx, actorDef };
    }
  }

  const smokeFrameUrls = manifest.layers.smoke.frames.map(f => new URL(f, manifestDirUrl).href);

  function styleLayer(el) {
    el.style.position = 'absolute';
    el.style.left = '0';
    el.style.top = '0';
    el.style.width = `${canvasWidth}px`;
    el.style.height = `${canvasHeight}px`;
    el.style.imageRendering = 'pixelated';
  }

  // P2.4: variantes de clipe por estado, clipe de "delegando" com ajudante ativo e movimento por código.
  // Nada aqui desenha personagem novo: só escolhe entre clipes originais e desloca o conjunto em poucos pixels.
  const VARIANT_PERIOD_MS = { busy: 20000, delegating: 20000, waiting_input: 12000 };
  const clipState = {};
  function chooseClip(provider, key, actorDef, snapshot, helperCount) {
    const now = snapshot.nowMs || Date.now();
    const clipKey = key === 'busy' && helperCount > 0 && actorDef.clips.delegating ? 'delegating' : key;
    const defs = actorDef.clips[clipKey] || actorDef.clips['busy'] || actorDef.clips['done'];
    const list = Array.isArray(defs) ? defs : [defs];
    const st = clipState[provider] || (clipState[provider] = { key: null, start: now, count: 0 });
    if (st.key !== clipKey) { st.key = clipKey; st.start = now; st.count++; }
    const period = VARIANT_PERIOD_MS[clipKey];
    const rot = period && !snapshot.reducedMotion ? Math.floor((now - st.start) / period) : 0;
    return { clipKey, def: list[(st.count + rot) % list.length], elapsed: now - st.start };
  }
  // dx/dy em px do canvas; look = vira o morador por um instante. Tudo zerado com movimento reduzido.
  function codeMotion(clipKey, elapsed, now, reduced) {
    const m = { dx: 0, dy: 0, look: false };
    if (reduced) return m;
    if (clipKey === 'busy' || clipKey === 'delegating') m.dx = Math.sin((now / 10000) * 2 * Math.PI) * 3;
    if (clipKey === 'done' && elapsed < 1600) m.dy = -Math.abs(Math.sin((elapsed / 800) * Math.PI)) * 5;
    if (clipKey === 'busy' || clipKey === 'delegating' || clipKey === 'waiting_input') m.look = Math.floor(now / 6000) % 5 === 4;
    return m;
  }

  let assetCache = {};
  function getCachedImage(url) {
    if (assetCache[url]) return assetCache[url];
    const img = new Image();
    img.src = url;
    assetCache[url] = img;
    return img;
  }

  function render(snapshot) {
    if (snapshot.cottage.lights === 'amber') {
      amberEl.style.opacity = '1';
    } else {
      amberEl.style.opacity = '0';
    }

    const doorStateKey = snapshot.cottage.door;
    if (doorFrames[doorStateKey]) {
      doorEl.src = doorFrames[doorStateKey];
    }

    if (snapshot.cottage.smoke && smokeFrameUrls.length > 0) {
      smokeEl.style.display = 'block';
      const now = snapshot.nowMs || Date.now();
      const frameMs = manifest.layers.smoke.frameMs || 450;
      const idx = Math.floor(now / frameMs) % smokeFrameUrls.length;
      smokeEl.src = smokeFrameUrls[idx];
    } else {
      smokeEl.style.display = 'none';
    }

    if (gardenCfg) {
      const g = snapshot.garden || { items: [], night: false };
      for (const [name, el] of Object.entries(gardenEls)) el.style.display = g.items.includes(name) ? 'block' : 'none';
      const f = g.night ? gardenCfg.nightFilter : '';
      for (const el of nightLayers) el.style.filter = f;
      fgEl.style.filter = f;
    }

    if (helperCfg) {
      const t = snapshot.nowMs || Date.now();
      const col = snapshot.reducedMotion ? 0 : Math.floor(t / helperCfg.frameMs) % (helperCfg.frames || 2);
      for (const provider of Object.keys(helperEls)) {
        const res = snapshot.residents[provider];
        const n = res && res.presence === 'outside' && snapshot.helpers ? (snapshot.helpers[provider] || 0) : 0;
        helperEls[provider].forEach((el, k) => {
          if (k >= n) { el.style.display = 'none'; return; }
          el.style.display = 'block';
          el.style.left = `${res.x + helperCfg.offset.x + k * helperCfg.spacing - helperCfg.frame.width / 2}px`;
          el.style.top = `${res.y + helperCfg.offset.y - helperCfg.frame.height}px`;
          el.style.backgroundPosition = `-${col * helperCfg.frame.width}px -${helperCfg.rows[provider] * helperCfg.frame.height}px`;
        });
      }
    }

    const residentsArr = Object.values(snapshot.residents);
    residentsArr.sort((a, b) => a.y - b.y);

    let zIndex = 0;
    for (const res of residentsArr) {
      const provider = res.provider;
      const actElInfo = actorElements[provider];
      const propEl = propElements[provider];

      if (!actElInfo) continue;

      if (res.presence === 'inside') {
        actElInfo.wrapper.style.display = 'none';
        if (propEl) propEl.style.opacity = '0';
      } else {
        actElInfo.wrapper.style.display = 'block';
        if (propEl) propEl.style.opacity = '1';

        let w = 44, h = 44, left = 0, top = 0;
        if (provider === 'claude') {
          w = 96; h = 96;
          left = res.x - 48;
          top = res.y - 87;
        } else if (provider === 'codex') {
          w = 128; h = 104;
          left = res.x - 64;
          top = res.y - 67;
        } else if (provider === 'antigravity') {
          w = 64; h = 52;
          left = res.x - 32;
          top = res.y - 46;
        }

        actElInfo.wrapper.style.width = `${w}px`;
        actElInfo.wrapper.style.height = `${h}px`;
        actElInfo.wrapper.style.left = `${left}px`;
        actElInfo.wrapper.style.top = `${top}px`;

        const actorDef = actElInfo.actorDef;
        const baseKey = (res.presence === 'exiting' || res.presence === 'entering')
          ? res.presence
          : (res.visualClip || 'busy');
        const helperCount = snapshot.helpers ? (snapshot.helpers[provider] || 0) : 0;
        const picked = chooseClip(provider, baseKey, actorDef, snapshot, helperCount);
        const clipDef = picked.def;
        const mo = res.presence === 'outside' ? codeMotion(picked.clipKey, picked.elapsed, snapshot.nowMs || Date.now(), snapshot.reducedMotion) : { dx: 0, dy: 0, look: false };
        const scaleX = (res.facing === 'left' ? -1 : 1) * (mo.look ? -1 : 1);
        actElInfo.wrapper.style.transform = `translate(${mo.dx.toFixed(2)}px, ${mo.dy.toFixed(2)}px) scaleX(${scaleX})`;

        if (actElInfo.type === 'svg' && typeof clipDef === 'string') {
          const svgUrl = new URL(`${actorDef.baseDir}/${clipDef}`, manifestDirUrl).href;
          if (actElInfo.currentUrl !== svgUrl) {
            actElInfo.currentUrl = svgUrl;
            actElInfo.obj.data = svgUrl;
          }
        } else if (actElInfo.type === 'spritesheet' && clipDef && typeof clipDef === 'object') {
          const sheetUrl = new URL(`${actorDef.baseDir}/${clipDef.sheet}`, manifestDirUrl).href;
          const sheetImg = getCachedImage(sheetUrl);
          actElInfo.pendingDraw = { sheetUrl, sheetImg, clipDef, snapshot };

          const drawAtomFrame = () => {
            if (!actElInfo.pendingDraw || actElInfo.pendingDraw.sheetUrl !== sheetUrl) return;
            const curSnap = actElInfo.pendingDraw.snapshot;
            const curClip = actElInfo.pendingDraw.clipDef;
            const meta = (atomMetaMap && atomMetaMap[curClip.meta]) || { w: 150, h: 120, cols: 10, durations: [100] };
            const frameW = meta.w || 150;
            const frameH = meta.h || 120;
            const cols = meta.cols || 10;
            const durations = meta.durations || [100];
            const totalFrames = durations.length;

            if (actElInfo.canvas.width !== frameW) actElInfo.canvas.width = frameW;
            if (actElInfo.canvas.height !== frameH) actElInfo.canvas.height = frameH;
            actElInfo.ctx.imageSmoothingEnabled = false;

            const now = curSnap.nowMs || Date.now();
            const totalDuration = durations.reduce((a, b) => a + b, 0) || (totalFrames * 100);
            let timeInLoop = now % totalDuration;
            let frameIdx = 0;
            for (let i = 0; i < durations.length; i++) {
              if (timeInLoop < durations[i]) {
                frameIdx = i;
                break;
              }
              timeInLoop -= durations[i];
            }
            if (curSnap.reducedMotion) frameIdx = 0;

            const col = frameIdx % cols;
            const row = Math.floor(frameIdx / cols);

            actElInfo.ctx.clearRect(0, 0, frameW, frameH);
            actElInfo.ctx.drawImage(
              sheetImg,
              col * frameW, row * frameH, frameW, frameH,
              0, 0, frameW, frameH
            );
            actElInfo.canvas.dataset.atomReady = 'true';
          };

          if (sheetImg.complete && sheetImg.naturalWidth > 0) {
            drawAtomFrame();
          } else {
            actElInfo.canvas.dataset.atomReady = 'false';
            sheetImg.onload = () => {
              drawAtomFrame();
            };
          }
        }
      }

      if (entitiesContainer.children[zIndex] !== actElInfo.wrapper) {
        entitiesContainer.insertBefore(actElInfo.wrapper, entitiesContainer.children[zIndex] || null);
      }
      zIndex++;
    }
  }

  function setScale(newScale) {
    scale = newScale;
    container.style.width = `${canvasWidth * scale}px`;
    container.style.height = `${canvasHeight * scale}px`;
    stage.style.transform = `scale(${scale})`;
  }

  return {
    render,
    setScale
  };
}

if (typeof window !== 'undefined') {
  window.createHabitatRenderer = createHabitatRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { createHabitatRenderer };
}
