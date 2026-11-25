document.addEventListener('DOMContentLoaded', () => {
  const init = window.habitatDemoAPI.getInitialPayload();
  const { manifest, manifestDirUrl, atomMetaMap, mode, reducedMotion, initialSnapshot } = init;

  const container = document.getElementById('habitat-stage');
  let currentScale = 2;
  let lastSnapshot = initialSnapshot || null;

  const renderer = window.createHabitatRenderer({
    container,
    manifest,
    manifestDirUrl,
    atomMetaMap,
    scale: currentScale,
    reducedMotion,
    disableTransitions: mode === 'capture'
  });

  if (initialSnapshot) {
    renderer.render(initialSnapshot);
  }

  window.habitatDemoAPI.onSnapshot((snapshot) => {
    lastSnapshot = snapshot;
    renderer.render(snapshot);
  });

  document.getElementById('btn-close').addEventListener('click', () => {
    window.habitatDemoAPI.closeDemo();
  });

  // Window drag
  const header = document.getElementById('demo-drag-header');
  let isDragging = false;
  let startX = 0;
  let startY = 0;

  header.addEventListener('mousedown', (e) => {
    if (e.target && e.target.closest('#btn-close')) return;
    isDragging = true;
    startX = e.screenX;
    startY = e.screenY;
  });

  window.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    const dx = e.screenX - startX;
    const dy = e.screenY - startY;
    startX = e.screenX;
    startY = e.screenY;
    window.habitatDemoAPI.dragWindow(dx, dy);
  });

  window.addEventListener('mouseup', () => {
    isDragging = false;
  });

  // Scale select
  const selectScale = document.getElementById('select-scale');
  selectScale.addEventListener('change', (e) => {
    currentScale = parseFloat(e.target.value) || 2;
    renderer.setScale(currentScale);
    window.habitatDemoAPI.setScale(currentScale);
  });

  // Reduced motion
  const chkMotion = document.getElementById('chk-reduced-motion');
  chkMotion.checked = !!reducedMotion;
  chkMotion.addEventListener('change', (e) => {
    window.habitatDemoAPI.setReducedMotion(e.target.checked);
  });

  // Background select
  const selectBg = document.getElementById('select-bg');
  const demoRoot = document.getElementById('demo-root');
  selectBg.addEventListener('change', (e) => {
    const val = e.target.value;
    demoRoot.className = `bg-${val}`;
    window.habitatDemoAPI.setPreviewBg(val);
  });

  // Preset buttons
  document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = btn.getAttribute('data-preset');
      const states = {
        claude: p[0] === '1' ? 'busy' : 'offline',
        codex: p[1] === '1' ? 'busy' : 'offline',
        antigravity: p[2] === '1' ? 'busy' : 'offline'
      };
      window.habitatDemoAPI.setProviders(states);
    });
  });

  // Provider state buttons
  document.querySelectorAll('.state-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.provider-card');
      const provider = card.getAttribute('data-provider');
      const action = btn.getAttribute('data-action');

      if (action === 'done') {
        const currentPresence = lastSnapshot?.residents?.[provider]?.presence;
        if (!currentPresence || currentPresence === 'inside') {
          window.habitatDemoAPI.setProvider(provider, { state: 'busy' });
          setTimeout(() => {
            window.habitatDemoAPI.setProvider(provider, { state: 'done' });
          }, 50);
        } else {
          window.habitatDemoAPI.setProvider(provider, { state: 'done' });
        }
        return;
      }

      window.habitatDemoAPI.setProvider(provider, {
        state: action,
        errorNeedsAction: action === 'error'
      });
    });
  });
});
