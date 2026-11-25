# Evidências do Gate G4 — Hardening Windows e Estabilidade

- **Data:** 2026-11-25
- **Escopo:** G4 (Hardening de janelas, DPI/multi-monitor, estabilidade contínua, ganchos reversíveis e segurança rigorosa).
- **Ambiente:** Windows (`win32` `10.0.26300`), `16` CPUs lógicas, `32128 MiB` RAM, Electron `41.10.4`.

---

## 1. Estabilidade Contínua Pré-Restart (~61 min ao vivo, `PID 13680`)
- **main** (`PID 13680`): `22.71 MiB` WorkingSet / `80.89 MiB` Private / `16.41s` CPU
- **gpu-process** (`PID 37500`): `15.76 MiB` WorkingSet / `71.85 MiB` Private / `0.36s` CPU
- **utility** (`PID 40176`): `5.41 MiB` WorkingSet / `11.26 MiB` Private / `0.20s` CPU
- **renderer 1** (`PID 33216`): `2.23 MiB` WorkingSet / `21.90 MiB` Private / `0.05s` CPU
- **renderer 2** (`PID 56776`): `3.25 MiB` WorkingSet / `23.63 MiB` Private / `0.03s` CPU
- **Árvore Total:** `49.36 MiB` WorkingSet / `209.53 MiB` Private.

---

## 2. Benchmark Pós-Hardening (`PID 47136` com `createAdaptiveStageLoop`)
- **Fase 1 (`000` repouso, 30s a cada 5s):** `gpu-process`, `utility` e `renderer` registraram `0.000s` de delta de CPU; `main` estabilizou em `103.02 MiB` WorkingSet / `81.47 MiB` Private.
- **Fase 2 (`111` ativo, 30s com 3 provedores `busy` fora):** `claude` (`{74,148}`), `codex` (`{164,166}`), `antigravity` (`{252,144}`), luzes `amber`, chaminé ativa; delta de CPU `+0.031s`, árvore total `~318 MiB` WorkingSet / `176.65 MiB` Private, retorno automático a `000`.
- **Fase 3 (Soak acelerado equivalente a 1h = `3600` ciclos):** `heapUsedMbBefore: 6.61 MiB` → `heapUsedMbAfter: 7.41 MiB` (`heapDeltaMb: +0.80 MiB`), `rssMbBefore: 53.86 MiB` → `rssMbAfter: 54.96 MiB` (sem vazamento de memória).

---

## 3. DPI / Multi-Monitor / Fullscreen / Foco (`G4.1`)
- Validados `100%`, `125%`, `150%`, `200%` DPI via `habitat-display-layout.js` e `habitat-display-layout.test.js`.
- Coordenadas negativas (`x: -1920`), queda segura para monitor primário e clamping do painel em `200%` DPI.
- `WS_EX_NOACTIVATE` + `WM_MOUSEACTIVATE` via `createHitWindowActivationRuntime` (`windowsHitWindowFocusable: false`) e sonda de tela cheia.

---

## 4. Segurança, Privacidade e Hooks Reversíveis (`G4.3`)
- **T24:** Validação com preservação de terceiros (`impeccable`, `lumen`, `tokeneconomizer`, `clawd`), backup `.agent-habitat-*.bak`, idempotência e reparo (`repairHabitatHooks`).
- **T25:** `violationsFound: 0` em `<USER_HOME>\.agent-habitat` e `%APPDATA%\agent-habitat`.
- **T26:** `manifest-validator.js` rejeita traversal/null-byte/out-of-bounds.
- **T27:** `prefers-reduced-motion`, `data-reduced-motion`, `:focus-visible`, foco/Escape no modal e cards.

---

## 5. Matriz de Validação T01–T28

| Item | Descrição | Status | Evidência / Teste |
|---|---|---|---|
| T01 | Agregador Multi-Provedor | OK | `test/habitat-aggregator.test.js` |
| T02 | Adaptador Claude Code | OK | `test/habitat-adapters.test.js` |
| T03 | Adaptador Codex CLI | OK | `test/habitat-adapters.test.js` |
| T04 | Adaptador Antigravity | OK | `test/habitat-adapters.test.js` |
| T05 | Health Checks & Sinks | OK | `test/habitat-health.test.js` |
| T06 | Servidor HTTP Base (`23433`) | OK | `test/server-start-http.test.js` |
| T07 | Snapshot JSON em tempo real | OK | `test/habitat-snapshot.test.js` |
| T08 | UI Cabana (ASCII / Canvas) | OK | `test/habitat-ui.test.js` |
| T09 | Painel Interativo | OK | `test/habitat-panel.test.js` |
| T10 | Notificações & Alertas | OK | `test/habitat-notifications.test.js` |
| T11 | Sincronização NexusVault | OK | `test/habitat-sync.test.js` |
| T12 | CLI local / Orquestração | OK | `test/habitat-cli.test.js` |
| T13 | Tratamento de Erros e Timeouts | OK | `test/habitat-errors.test.js` |
| T14 | Persistência de Estado Local | OK | `test/habitat-state.test.js` |
| T15 | Logs e Auditoria Local | OK | `test/habitat-audit.test.js` |
| T16 | Testes Unitários Automatizados | OK | 101/101 testes passando |
| T17 | Validação de Assets e Ícones | OK | `npm run audit:assets` |
| T18 | Conectividade de Rede Local | OK | `test/server-start-http.test.js` |
| T19 | Consumo de Memória Base | OK | `tools/measure-habitat-g4.js` |
| T20 | Tratamento de Concorrência | OK | `test/habitat-concurrency.test.js` |
| T21 | Janelas de Hit / Transparência | OK | `test/habitat-g4-hardening.test.js` |
| T22 | Suporte Multi-Monitor & DPI | OK | `test/habitat-display-layout.test.js` |
| T23 | Pausa Idle Otimizada (`000`) | OK | `test/habitat-g4-hardening.test.js` |
| T24 | Ganchos Reversíveis (`.agent-habitat`) | OK | `test/habitat-g4-security-hooks.test.js` |
| T25 | Auditoria de Privacidade Absoluta | OK | `git grep` rigoroso (`<USER_HOME>`, `%APPDATA%`) |
| T26 | Validação de Manifesto & Sanitização | OK | `test/habitat-g4-security-hooks.test.js` |
| T27 | Acessibilidade & Movimento Reduzido | OK | `test/habitat-g4-security-hooks.test.js` |
| T28 | Soak Test (3600 ciclos / sem leaks) | OK | `tools/measure-habitat-g4.js` |
