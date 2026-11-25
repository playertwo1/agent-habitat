"use strict";

function computeHabitatCardBounds({ stageBounds, workArea, cardWidth = 312, cardHeight = 148, gap = 10 }) {
  if (!stageBounds || !workArea) {
    return { x: 0, y: 0, width: cardWidth, height: cardHeight };
  }

  const stageCenterX = stageBounds.x + stageBounds.width / 2;
  let x = Math.round(stageCenterX - cardWidth / 2);
  let y = Math.round(stageBounds.y - cardHeight - gap);

  if (y < workArea.y) {
    y = Math.round(stageBounds.y + stageBounds.height + gap);
  }

  const maxX = workArea.x + workArea.width - cardWidth;
  const maxY = workArea.y + workArea.height - cardHeight;

  x = Math.max(workArea.x, Math.min(x, maxX));
  y = Math.max(workArea.y, Math.min(y, maxY));

  return { x, y, width: cardWidth, height: cardHeight };
}

function createHabitatCardManager({
  BrowserWindow,
  cardHtmlPath,
  preloadPath,
  onFocusProvider,
  cardsEnabled = true,
  permissionTimeoutMs = 45000,
  doneAutoCloseMs = 4000,
} = {}) {
  const activeCards = new Map();

  function getActiveCards() {
    return Array.from(activeCards.keys());
  }

  function setCardsEnabled(bool) {
    cardsEnabled = !!bool;
  }

  function dismissCard(id) {
    const card = activeCards.get(id);
    if (!card) return;
    if (card.timer) clearTimeout(card.timer);
    if (card.win && !card.win.isDestroyed()) {
      try { card.win.close(); } catch {}
    }
    activeCards.delete(id);
    if (card.type === "permission") {
      card.resolve({ decision: "ask" });
    }
  }

  function resolveCardDecision(id, decision) {
    const card = activeCards.get(id);
    if (!card) return;
    if (card.timer) clearTimeout(card.timer);
    if (card.win && !card.win.isDestroyed()) {
      try { card.win.close(); } catch {}
    }
    activeCards.delete(id);
    if (card.type === "permission") {
      if (decision === "allow" || decision === "deny") {
        card.resolve({ decision });
      } else {
        card.resolve({ decision: "ask" });
      }
    }
  }

  function requestPermission({ id, provider, cwdName, summary, stageBounds, workArea }) {
    if (!cardsEnabled) {
      return Promise.resolve({ decision: "ask" });
    }

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        dismissCard(id);
      }, permissionTimeoutMs);

      const cardRecord = {
        type: "permission",
        resolve,
        timer,
        win: null,
      };

      activeCards.set(id, cardRecord);

      if (BrowserWindow && cardHtmlPath) {
        try {
          const bounds = computeHabitatCardBounds({ stageBounds, workArea });
          const win = new BrowserWindow({
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            show: false,
            focusable: false,
            alwaysOnTop: true,
            frame: false,
            skipTaskbar: true,
            transparent: true,
            webPreferences: {
              preload: preloadPath || undefined,
              contextIsolation: true,
              nodeIntegration: false,
            },
          });
          win.loadFile(cardHtmlPath, { query: { id, provider, cwdName, summary, type: "permission" } });
          win.showInactive();
          win.on("closed", () => dismissCard(id));
          cardRecord.win = win;
        } catch {}
      }
    });
  }

  function showQuestionCard({ id, provider, cwdName, summary, stageBounds, workArea }) {
    if (!cardsEnabled) return;
    const cardRecord = { type: "question", resolve: () => {}, win: null };
    activeCards.set(id, cardRecord);

    if (BrowserWindow && cardHtmlPath) {
      try {
        const bounds = computeHabitatCardBounds({ stageBounds, workArea });
        const win = new BrowserWindow({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          show: false,
          focusable: false,
          alwaysOnTop: true,
          frame: false,
          skipTaskbar: true,
          transparent: true,
          webPreferences: {
            preload: preloadPath || undefined,
            contextIsolation: true,
            nodeIntegration: false,
          },
        });
        win.loadFile(cardHtmlPath, { query: { id, provider, cwdName, summary, type: "question" } });
        win.showInactive();
        win.on("closed", () => dismissCard(id));
        cardRecord.win = win;
      } catch {}
    }
  }

  function showCompletionCard({ id, provider, cwdName, summary, stageBounds, workArea }) {
    if (!cardsEnabled) return;
    const timer = setTimeout(() => {
      dismissCard(id);
    }, doneAutoCloseMs);

    const cardRecord = { type: "completion", resolve: () => {}, timer, win: null };
    activeCards.set(id, cardRecord);

    if (BrowserWindow && cardHtmlPath) {
      try {
        const bounds = computeHabitatCardBounds({ stageBounds, workArea });
        const win = new BrowserWindow({
          x: bounds.x,
          y: bounds.y,
          width: bounds.width,
          height: bounds.height,
          show: false,
          focusable: false,
          alwaysOnTop: true,
          frame: false,
          skipTaskbar: true,
          transparent: true,
          webPreferences: {
            preload: preloadPath || undefined,
            contextIsolation: true,
            nodeIntegration: false,
          },
        });
        win.loadFile(cardHtmlPath, { query: { id, provider, cwdName, summary, type: "completion" } });
        win.showInactive();
        win.on("closed", () => dismissCard(id));
        cardRecord.win = win;
      } catch {}
    }
  }

  function handleFocusAction(provider) {
    if (typeof onFocusProvider === "function") {
      onFocusProvider(provider);
    }
  }

  function dispose() {
    for (const [id] of activeCards) {
      dismissCard(id);
    }
    activeCards.clear();
  }

  function attachIpc(ipcMain) {
    if (!ipcMain) return;
    ipcMain.removeAllListeners("habitat-card:decide");
    ipcMain.removeAllListeners("habitat-card:focus");
    ipcMain.removeAllListeners("habitat-card:dismiss");

    ipcMain.on("habitat-card:decide", (event, { id, decision } = {}) => {
      resolveCardDecision(id, decision);
    });
    ipcMain.on("habitat-card:focus", (event, { provider } = {}) => {
      handleFocusAction(provider);
    });
    ipcMain.on("habitat-card:dismiss", (event, { id } = {}) => {
      dismissCard(id);
    });
  }

  return {
    requestPermission,
    showQuestionCard,
    showCompletionCard,
    resolveCardDecision,
    dismissCard,
    getActiveCards,
    setCardsEnabled,
    handleFocusAction,
    attachIpc,
    dispose,
  };
}

module.exports = {
  computeHabitatCardBounds,
  createHabitatCardManager,
};
