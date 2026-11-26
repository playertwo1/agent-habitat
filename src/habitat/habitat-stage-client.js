"use strict";

// Externo ao HTML: a CSP do stage (script-src 'self') bloqueia script inline.
window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('stage-root');
  let renderer = null;
  let rendererThemeId = null;

  window.habitatStage.onRenderData((payload) => {
    if (!payload || !payload.manifest) return;
    const { manifest, manifestDirUrl, atomMetaMap, scale, reducedMotion, snapshot } = payload;

    if (renderer && rendererThemeId !== manifest.id) renderer = null; // tema trocado: recria o cenário
    if (!renderer) {
      rendererThemeId = manifest.id;
      renderer = window.createHabitatRenderer({
        container,
        manifest,
        manifestDirUrl,
        atomMetaMap: atomMetaMap || {},
        scale: scale || 2,
        reducedMotion: !!reducedMotion,
        disableTransitions: false
      });
    } else {
      if (scale !== undefined) {
        renderer.setScale(scale);
      }
    }

    if (snapshot) {
      renderer.render(snapshot);
    }
  });

  window.habitatStage.notifyReady();
});
