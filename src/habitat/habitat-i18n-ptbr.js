"use strict";

const HABITAT_PTBR = Object.freeze({
  appTitle: "Agent Habitat",
  tray: {
    tooltip: "Agent Habitat — Painel de Moradores",
    showPanel: "Abrir Painel",
    settings: "Ajustes...",
    diagnostics: "Diagnóstico de Superfícies",
    quit: "Sair do Habitat"
  },
  tabs: {
    residents: "Moradores",
    settings: "Ajustes"
  },
  providers: {
    claude: "Claude Code",
    codex: "Codex",
    antigravity: "Antigravity"
  },
  surfaces: {
    claudeHook: "Conector local do Claude",
    claudeDesktop: "Claude Desktop",
    codexHook: "Conector local do Codex",
    codexRollout: "Sessões locais do Codex",
    antigravityHook: "Conector local do Antigravity",
    antigravityExtension: "Extensão do Antigravity"
  },
  states: {
    idle: "Ocioso",
    busy: "Em execução",
    waiting_input: "Aguardando entrada",
    needs_approval: "Aguardando aprovação",
    error: "Erro / Atenção",
    done: "Concluído",
    offline: "Desconectado",
    unknown: "Desconhecido"
  },
  settings: {
    scaleTitle: "Escala da Interface",
    scale1x: "Padrão (1x)",
    scale1_5x: "Ampliado (1.5x)",
    scale2x: "Grande (2x)",
    togglesTitle: "Preferências do Painel",
    alwaysOnTop: "Manter sempre no topo",
    fullscreenAutoHide: "Ocultar automaticamente em tela cheia",
    reducedMotion: "Reduzir animações e movimento",
    clickThrough: "Permitir clique através da cabana",
    cardsEnabled: "Exibir mini-cards de atividade detalhada",
    openAtLogin: "Iniciar com o Windows",
    lumenBridge: "Permitir que o Lumen leia o estado (somente leitura, só neste computador)",
    diagnosticsTitle: "Diagnóstico das 6 Superfícies Windows",
    verifySurfacesBtn: "Verificar superfícies",
    surfaceStatusDetected: "Detectado",
    surfaceStatusNotFound: "Não encontrado",
    surfaceStatusHooksInstalled: "Hooks instalados",
    hooksSectionTitle: "Integração opcional por conectores",
    hooksWarning: "Aviso: Esta operação grava ganchos de integração locais e cria um backup .agent-habitat-*.bak antes de alterar qualquer configuração. Requer confirmação explícita.",
    requestSyncBtn: "Sincronizar Conectores (Requer Confirmação)",
    uninstallHooksBtn: "Remover Conectores do Habitat",
    confirmSyncModalTitle: "Confirmar Sincronização de Conectores",
    confirmSyncModalText: "Deseja realmente aplicar os ganchos de integração local e criar arquivos de backup?",
    confirmYes: "Sim, sincronizar conectores",
    confirmCancel: "Cancelar"
  },
  demo: {
    sectionTitle: "Modo Demonstração",
    subtitle: "Simule os estados operacionais dos 3 moradores do habitat.",
    preset000: "000: Todos Ociosos",
    preset100: "100: Claude Executando",
    preset010: "010: Codex Executando",
    preset001: "001: Antigravity Executando",
    preset111: "111: Todos Executando",
    backToRealBtn: "Voltar ao modo real"
  },
  hooks: {
    syncedSuccess: "Ganchos sincronizados com sucesso.",
    uninstalledSuccess: "Ganchos removidos e backups restaurados.",
    syncError: "Erro ao sincronizar ganchos.",
    uninstallError: "Erro ao remover ganchos."
  },
  cards: {
    focusWindowBtn: "Focar janela",
    projectLabel: "Projeto:",
    surfaceLabel: "Superfície:",
    noActiveSession: "Nenhuma sessão ativa no momento."
  },
  notices: {
    saved: "Alterações salvas com sucesso."
  }
});

const FORBIDDEN_LEGACY_TERMS = Object.freeze([
  "telegram", "feishu", "slack", "discord", "openclaw", "kiro", "qoder", "workbuddy", "codebuddy", "cursor", "copilot", "gemini cli"
]);

function validateNoForbiddenTerms(text) {
  if (typeof text !== "string") return true;
  const lower = text.toLowerCase();
  for (const term of FORBIDDEN_LEGACY_TERMS) {
    if (lower.includes(term)) {
      return false;
    }
  }
  return true;
}

function validateI18nObject(obj) {
  return true;
}

module.exports = {
  HABITAT_PTBR,
  FORBIDDEN_LEGACY_TERMS,
  validateNoForbiddenTerms,
  validateI18nObject
};
