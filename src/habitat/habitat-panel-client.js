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
  const tabHistoryBtn = document.getElementById("tab-history");
  const panelHistory = document.getElementById("panel-history");
  const historyList = document.getElementById("history-list");
  const TAB_NAMES = ["residents", "history", "settings"];
  const tabButtons = [tabResidentsBtn, tabHistoryBtn, tabSettingsBtn];
  const tabPanels = [panelResidents, panelHistory, panelSettings];
  let currentTabIdx = 0;

  function switchTab(tabName) {
    currentState.activeTab = tabName;
    currentTabIdx = Math.max(0, TAB_NAMES.indexOf(tabName));
    tabButtons.forEach((btn, i) => {
      const on = i === currentTabIdx;
      btn.setAttribute("aria-selected", String(on));
      btn.setAttribute("tabindex", on ? "0" : "-1");
      btn.classList.toggle("active", on);
      tabPanels[i].hidden = !on;
    });
  }

  tabButtons.forEach((btn, i) => btn.addEventListener("click", () => switchTab(TAB_NAMES[i])));

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
        switchTab(TAB_NAMES[currentTabIdx]);
        e.preventDefault();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        currentTabIdx = (currentTabIdx - 1 + tabButtons.length) % tabButtons.length;
        tabButtons[currentTabIdx].focus();
        switchTab(TAB_NAMES[currentTabIdx]);
        e.preventDefault();
      }
    }
  });

  // P1.1: métricas por morador. Cota vem só do arquivo de cotas do clawd-on-desk (somente leitura); sem dado, o painel diz "sem dados".
  let metricsPeriod = "today";
  const btnPeriodToday = document.getElementById("metrics-period-today");
  const btnPeriodWeek = document.getElementById("metrics-period-week");
  function setMetricsPeriod(period) {
    metricsPeriod = period;
    btnPeriodToday.classList.toggle("active", period === "today");
    btnPeriodToday.setAttribute("aria-pressed", String(period === "today"));
    btnPeriodWeek.classList.toggle("active", period === "week");
    btnPeriodWeek.setAttribute("aria-pressed", String(period === "week"));
    render(currentState);
  }
  if (btnPeriodToday) btnPeriodToday.addEventListener("click", () => setMetricsPeriod("today"));
  if (btnPeriodWeek) btnPeriodWeek.addEventListener("click", () => setMetricsPeriod("week"));

  function metricsHtml(providerId, state) {
    const metrics = state.metrics || {};
    const quota = metrics.quota;
    const q = quota && quota.providers ? quota.providers[providerId] : null;
    let quotaPart;
    if (q && q.status === "ok") {
      const rings = q.buckets.map((b) => {
        const pct = Math.round(b.usedPercent);
        const label = `${escapeHtml(b.label)}: ${pct}% usado${b.expired ? " (janela reiniciada)" : ""}`;
        return `<div class="quota-ring${b.expired ? " expired" : ""}" role="img" aria-label="${label}" title="${label}" style="--used:${pct}"><span>${pct}%</span><em>${escapeHtml(b.label)}</em></div>`;
      }).join("");
      const mins = q.lastSeenAt ? Math.max(0, Math.round((Date.now() - q.lastSeenAt) / 60000)) : null;
      quotaPart = `<div class="quota-rings">${rings}</div>` + (mins !== null ? `<span class="metrics-note">Cota vista há ${mins} min</span>` : "");
    } else if (quota && quota.file !== "ok") {
      quotaPart = `<span class="metrics-note">Sem dados de cota: o arquivo de cotas do clawd-on-desk não está disponível.</span>`;
    } else {
      quotaPart = `<span class="metrics-note">Sem dados de cota para este morador.</span>`;
    }
    const usage = metrics.usage ? (metricsPeriod === "week" ? metrics.usage.week : metrics.usage.today) : null;
    const u = usage ? usage[providerId] : null;
    const usagePart = u
      ? `<span class="metrics-usage"><strong>${metricsPeriod === "week" ? "7 dias" : "Hoje"}:</strong> ${u.sessions} sessões · ${u.interactions} interações</span>`
      : "";
    return `<div class="resident-metrics">${quotaPart}${usagePart}</div>`;
  }

  // Render state
  function render(state) {
    if (!state) return;
    currentState = state;
    renderHistory(state.history);

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

    // Jardim e luz (P1.4)
    const garden = prefs.garden || {};
    document.querySelectorAll("[data-garden]").forEach((el) => { el.checked = garden[el.dataset.garden] === true; });
    document.querySelectorAll('input[name="light-mode"]').forEach((el) => { el.checked = el.value === (prefs.lightMode || "auto"); });

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
          ${metricsHtml(r.id, state)}
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

const HISTORY_PROVIDER_NAMES = { claude: "Claude Code", codex: "Codex" };
  const HISTORY_REASONS = {
    "sessao-invalida": "Esta sessão do Codex não tem um id válido para retomar.",
    "pasta-desconhecida": "A pasta da sessão é desconhecida.",
    "pasta-ausente": "A pasta do projeto não existe mais.",
    "transcricao-ausente": "O Claude não guardou a transcrição desta sessão.",
    "em-andamento": "A sessão ainda está em andamento.",
    "falha-ao-abrir": "Não foi possível abrir o terminal.",
    "desconhecida": "Sessão não encontrada no histórico."
  };

  function renderHistory(rows) {
    if (!historyList) return;
    if (!rows || !rows.length) {
      historyList.innerHTML = '<p class="metrics-note">Nenhuma sessão registrada ainda. Elas aparecem aqui conforme você usa o Claude e o Codex com os conectores ligados.</p>';
      return;
    }
    historyList.innerHTML = rows.map((r, i) => {
      const when = new Date(r.lastEventAt).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
      const action = r.canResume
        ? `<button class="action-btn" data-resume="${i}">Retomar</button>`
        : `<span class="metrics-note">${escapeHtml(HISTORY_REASONS[r.reason] || "Indisponível.")}</span>`;
      return `<div class="history-row"><div><strong>${escapeHtml(r.project)}</strong><span class="metrics-note"> · ${escapeHtml(HISTORY_PROVIDER_NAMES[r.provider] || r.provider)} · ${escapeHtml(when)}</span></div>${action}</div>`;
    }).join("");
    historyList.querySelectorAll("button[data-resume]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const row = rows[Number(btn.getAttribute("data-resume"))];
        btn.disabled = true;
        const res = await bridge.resumeSession({ provider: row.provider, sessionId: row.sessionId });
        if (!res || !res.ok) {
          btn.disabled = false;
          btn.insertAdjacentHTML("afterend", `<span class="metrics-note">${escapeHtml(HISTORY_REASONS[res && res.reason] || "Não foi possível retomar.")}</span>`);
        }
      });
    });
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

  document.querySelectorAll("[data-garden]").forEach((el) => {
    el.addEventListener("change", () => {
      const garden = { ...(currentState.prefs.garden || {}) };
      document.querySelectorAll("[data-garden]").forEach((o) => { garden[o.dataset.garden] = o.checked; });
      bridge.updatePref("garden", garden).then((s) => { if (s) render(s); });
    });
  });
  document.querySelectorAll('input[name="light-mode"]').forEach((el) => {
    el.addEventListener("change", () => bridge.updatePref("lightMode", el.value).then((s) => { if (s) render(s); }));
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
