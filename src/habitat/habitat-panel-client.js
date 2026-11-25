"use strict";

(function () {
  const bridge = window.habitatPanel;
  if (!bridge) {
    console.error("window.habitatPanel bridge not found!");
    return;
  }

  let currentState = {
    activeTab: "residents",
    scale: 1,
    prefs: {
      alwaysOnTop: false,
      fullscreenAutoHide: false,
      reducedMotion: false,
      clickThrough: false,
      cardsEnabled: true,
      openAtLogin: false
    },
    residents: [
      { id: "claude", name: "Claude Code", state: "idle", project: "Nenhum", surface: "Claude Hook Local" },
      { id: "codex", name: "Codex", state: "idle", project: "Nenhum", surface: "Codex Rollout Engine" },
      { id: "antigravity", name: "Antigravity", state: "idle", project: "Nenhum", surface: "Antigravity Extension" }
    ],
    diagnostics: {
      claudeHook: false,
      claudeDesktop: false,
      codexHook: false,
      codexRollout: false,
      antigravityHook: false,
      antigravityExtension: false
    },
    demoMode: false
  };

  const stateLabelsPTBR = {
    idle: "Ocioso",
    busy: "Em execução",
    waiting_input: "Aguardando entrada",
    needs_approval: "Aguardando aprovação",
    error: "Erro / Atenção",
    done: "Concluído",
    offline: "Offline"
  };

  const surfaceNamesPTBR = {
    claudeHook: "Conector local do Claude",
    claudeDesktop: "Claude Desktop",
    codexHook: "Conector local do Codex",
    codexRollout: "Sessões locais do Codex",
    antigravityHook: "Conector local do Antigravity",
    antigravityExtension: "Extensão do Antigravity"
  };

  // DOM Elements
  const bodyEl = document.body;
  const tabResidentsBtn = document.getElementById("tab-residents");
  const tabSettingsBtn = document.getElementById("tab-settings");
  const panelResidents = document.getElementById("panel-residents");
  const panelSettings = document.getElementById("panel-settings");
  const residentsGrid = document.getElementById("residents-grid");
  const diagnosticsGrid = document.getElementById("diagnostics-grid");
  const globalStatusPill = document.getElementById("habitat-status-pill");

  const btnStopDemo = document.getElementById("btn-stop-demo");
  const btnRefreshDiag = document.getElementById("btn-refresh-diag");
  const btnRequestSync = document.getElementById("btn-request-sync");
  const btnUninstallHooks = document.getElementById("btn-uninstall-hooks");

  const modalOverlay = document.getElementById("hook-confirm-modal");
  const modalYes = document.getElementById("modal-confirm-yes");
  const modalCancel = document.getElementById("modal-confirm-cancel");

  // Pref inputs
  const scaleRadios = document.querySelectorAll('input[name="ui-scale"]');
  const prefAlwaysOnTop = document.getElementById("pref-alwaysOnTop");
  const prefFullscreenAutoHide = document.getElementById("pref-fullscreenAutoHide");
  const prefReducedMotion = document.getElementById("pref-reducedMotion");
  const prefClickThrough = document.getElementById("pref-clickThrough");
  const prefCardsEnabled = document.getElementById("pref-cardsEnabled");
  const prefOpenAtLogin = document.getElementById("pref-openAtLogin");

  // Keyboard navigation for tabs
  const tabButtons = [tabResidentsBtn, tabSettingsBtn];
  let currentTabIdx = 0;

  function switchTab(tabName) {
    currentState.activeTab = tabName;
    if (tabName === "residents") {
      tabResidentsBtn.setAttribute("aria-selected", "true");
      tabResidentsBtn.setAttribute("tabindex", "0");
      tabResidentsBtn.classList.add("active");
      tabSettingsBtn.setAttribute("aria-selected", "false");
      tabSettingsBtn.setAttribute("tabindex", "-1");
      tabSettingsBtn.classList.remove("active");
      panelResidents.hidden = false;
      panelSettings.hidden = true;
      currentTabIdx = 0;
    } else {
      tabSettingsBtn.setAttribute("aria-selected", "true");
      tabSettingsBtn.setAttribute("tabindex", "0");
      tabSettingsBtn.classList.add("active");
      tabResidentsBtn.setAttribute("aria-selected", "false");
      tabResidentsBtn.setAttribute("tabindex", "-1");
      tabResidentsBtn.classList.remove("active");
      panelSettings.hidden = false;
      panelResidents.hidden = true;
      currentTabIdx = 1;
    }
  }

  tabResidentsBtn.addEventListener("click", () => switchTab("residents"));
  tabSettingsBtn.addEventListener("click", () => switchTab("settings"));

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (!modalOverlay.hidden) {
        modalOverlay.hidden = true;
        if (btnRequestSync) btnRequestSync.focus();
        return;
      }
      bridge.close();
      return;
    }

    if (e.target.getAttribute("role") === "tab") {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        currentTabIdx = (currentTabIdx + 1) % tabButtons.length;
        tabButtons[currentTabIdx].focus();
        switchTab(currentTabIdx === 0 ? "residents" : "settings");
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        currentTabIdx = (currentTabIdx - 1 + tabButtons.length) % tabButtons.length;
        tabButtons[currentTabIdx].focus();
        switchTab(currentTabIdx === 0 ? "residents" : "settings");
        e.preventDefault();
      }
    }
  });

  // Render state
  function render(state) {
    if (!state) return;
    currentState = state;

    // Scale
    bodyEl.setAttribute("data-scale", String(state.scale || 1));
    scaleRadios.forEach(r => {
      r.checked = Math.abs(parseFloat(r.value) - (state.scale || 1)) < 0.01;
    });

    // Prefs
    // Set reduced motion preference
  const prefs = state.prefs || {};
  if (bodyEl) {
    bodyEl.setAttribute("data-reduced-motion", String(Boolean(prefs.reducedMotion)));
  }
    if (prefAlwaysOnTop) prefAlwaysOnTop.checked = Boolean(prefs.alwaysOnTop);
    if (prefFullscreenAutoHide) prefFullscreenAutoHide.checked = Boolean(prefs.fullscreenAutoHide);
    if (prefReducedMotion) prefReducedMotion.checked = Boolean(prefs.reducedMotion);
    if (prefClickThrough) prefClickThrough.checked = Boolean(prefs.clickThrough);
    if (prefCardsEnabled) prefCardsEnabled.checked = prefs.cardsEnabled !== false;
    if (prefOpenAtLogin) prefOpenAtLogin.checked = Boolean(prefs.openAtLogin);

    // Global pill status
    const residents = Array.isArray(state.residents) ? state.residents : [];
    let anyBusy = residents.some(r => r.state === "busy" || r.state === "needs_approval");
    let globalStateKey = anyBusy ? "busy" : "idle";
    globalStatusPill.className = `pill ${globalStateKey}`;
    globalStatusPill.textContent = stateLabelsPTBR[globalStateKey] || "Ocioso";

    // Residents list
    if (residentsGrid) {
      residentsGrid.innerHTML = "";
      residents.forEach(r => {
        const card = document.createElement("div");
        card.className = "resident-card";
        const stKey = r.state || "idle";
        const stLabel = stateLabelsPTBR[stKey] || stKey;

        card.innerHTML = `
          <div class="resident-header">
            <h3>${escapeHtml(r.name)}</h3>
            <span class="pill ${escapeHtml(stKey)}">${escapeHtml(stLabel)}</span>
          </div>
          <div class="resident-details">
            <span><strong>Projeto:</strong> ${escapeHtml(r.project || "Nenhum")}</span>
            <span><strong>Superfície:</strong> ${escapeHtml(r.surface || "Padrão")}</span>
          </div>
          <div class="resident-actions">
            <button class="action-btn" data-focus-provider="${escapeHtml(r.id)}">Focar janela</button>
          </div>
        `;
        residentsGrid.appendChild(card);
      });

      // Bind focus buttons
      residentsGrid.querySelectorAll("button[data-focus-provider]").forEach(btn => {
        btn.addEventListener("click", () => {
          const provId = btn.getAttribute("data-focus-provider");
          bridge.focusProvider(provId);
        });
      });
    }

    // Diagnostics (6 keys from habitat-adapters.js)
    if (diagnosticsGrid) {
      diagnosticsGrid.innerHTML = "";
      const diag = state.diagnostics || {};
      const diagKeys = ["claudeHook", "claudeDesktop", "codexHook", "codexRollout", "antigravityHook", "antigravityExtension"];
      
      diagKeys.forEach(key => {
        const val = diag[key];
        const label = surfaceNamesPTBR[key] || key;
        let isDetected = false;
        let badgeText = "Não encontrado";
        if (typeof val === "boolean") {
          isDetected = val;
          badgeText = val ? "Detectado" : "Não encontrado";
        } else if (val && typeof val === "object") {
          isDetected = Boolean(val.detected || val.installed);
          badgeText = isDetected ? (val.installed ? "Hooks instalados" : "Detectado") : "Não encontrado";
        }

        const item = document.createElement("div");
        item.className = "diagnostic-item";
        item.innerHTML = `
          <span class="diagnostic-name">${escapeHtml(label)}</span>
          <span class="diagnostic-status ${isDetected ? "detected" : ""}">${escapeHtml(badgeText)}</span>
        `;
        diagnosticsGrid.appendChild(item);
      });
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Demo presets
  document.querySelectorAll(".demo-btn[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const presetId = btn.getAttribute("data-preset");
      bridge.triggerDemoPreset(presetId).then(newState => {
        if (newState) render(newState);
      });
    });
  });

  if (btnStopDemo) {
    btnStopDemo.addEventListener("click", () => {
      bridge.stopDemo().then(newState => {
        if (newState) render(newState);
      });
    });
  }

  // Prefs changes
  scaleRadios.forEach(r => {
    r.addEventListener("change", () => {
      if (r.checked) {
        const val = parseFloat(r.value);
        bridge.updatePref("scale", val).then(newState => {
          if (newState) render(newState);
        });
      }
    });
  });

  const prefMap = [
    [prefAlwaysOnTop, "alwaysOnTop"],
    [prefFullscreenAutoHide, "fullscreenAutoHide"],
    [prefReducedMotion, "reducedMotion"],
    [prefClickThrough, "clickThrough"],
    [prefCardsEnabled, "cardsEnabled"],
    [prefOpenAtLogin, "openAtLogin"]
  ];

  prefMap.forEach(([el, key]) => {
    if (el) {
      el.addEventListener("change", () => {
        bridge.updatePref(key, el.checked).then(newState => {
          if (newState) render(newState);
        });
      });
    }
  });

  // Diagnostics & Hooks buttons
  if (btnRefreshDiag) {
    btnRefreshDiag.addEventListener("click", () => {
      bridge.refreshDiagnostics().then(newState => {
        if (newState) render(newState);
      });
    });
  }

  if (btnRequestSync) {
    btnRequestSync.addEventListener("click", () => {
      modalOverlay.hidden = false;
      const yesBtn = document.getElementById("modal-confirm-yes") || modalYes;
      if (yesBtn) yesBtn.focus();
    });
  }

  if (modalCancel) {
    modalCancel.addEventListener("click", () => {
      modalOverlay.hidden = true;
      if (btnRequestSync) btnRequestSync.focus();
    });
  }

  if (modalYes) {
    modalYes.addEventListener("click", () => {
      modalOverlay.hidden = true;
      bridge.requestHookSync({ confirm: true }).then(res => {
        if (res && res.state) render(res.state);
        alert(res && res.message ? res.message : "Sincronização de ganchos concluída com sucesso.");
      }).catch(err => {
        alert("Erro ao sincronizar ganchos: " + (err.message || err));
      });
    });
  }

  if (btnUninstallHooks) {
    btnUninstallHooks.addEventListener("click", () => {
      if (confirm("Deseja realmente remover os ganchos de integração do Habitat? (os demais hooks são preservados e um backup .bak é criado)")) {
        bridge.uninstallHooks().then(res => {
          if (res && res.state) render(res.state);
          alert(res && res.message ? res.message : "Ganchos removidos com sucesso.");
        }).catch(err => {
          alert("Erro ao remover ganchos: " + (err.message || err));
        });
      }
    });
  }

  // Initial state load
  bridge.getState().then(st => {
    render(st);
  }).catch(err => {
    console.error("Failed to get initial state:", err);
  });

  // Listen to state updates from main process
  if (typeof bridge.onState === "function") {
    bridge.onState(newState => {
      render(newState);
    });
  }
})();
