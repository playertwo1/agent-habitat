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

        const scaleX = res.facing === 'left' ? -1 : 1;
        actElInfo.wrapper.style.transform = `scaleX(${scaleX})`;

        const clipKey = (res.presence === 'exiting' || res.presence === 'entering')
          ? res.presence
          : (res.visualClip || 'busy');
        const actorDef = actElInfo.actorDef;
        const clipDef = actorDef.clips[clipKey] || actorDef.clips['busy'] || actorDef.clips['done'];

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
