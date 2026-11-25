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
- **T25:** `violationsFound: 0` em diretório de usuário e `%APPDATA%\agent-habitat`.
- **T26:** `manifest-validator.js` rejeita traversal/null-byte/out-of-bounds.
- **T27:** `prefers-reduced-motion`, `data-reduced-motion`, `:focus-visible`, foco/Escape no modal e cards.

---

## 5. Matriz de Validação T01–T28 (Oficial e Fiel ao Repositório)

| Item | Descrição (ROADMAP) | Status / Evidência Baseada em Código e Medição Real | Arquivos / Ferramentas Reais |
|---|---|---|---|
| **T01** | Combinação `000` (repouso total) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `tools/measure-habitat-g4.js` |
| **T02** | Combinação `001` (Atom ativo) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `test/habitat-adapters.test.js` |
| **T03** | Combinação `010` (Cloudling ativo) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `test/habitat-adapters.test.js` |
| **T04** | Combinação `011` (Cloudling + Atom) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `test/habitat-adapters.test.js` |
| **T05** | Combinação `100` (Clawd ativo) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `test/habitat-adapters.test.js` |
| **T06** | Combinação `101` (Clawd + Atom) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `test/habitat-adapters.test.js` |
| **T07** | Combinação `110` (Clawd + Cloudling) | OK (Automatizado + Medido) | `test/habitat-scene-machine.test.js`, `test/habitat-adapters.test.js` |
| **T08** | Combinação `111` (todos ativos) | OK (Automatizado + Medido ao vivo) | `test/habitat-scene-machine.test.js`, `tools/measure-habitat-g4.js` |
| **T09** | App aberto ocioso = `000` | OK (Automatizado) | `test/habitat-scene-machine.test.js`, `test/habitat-provider-aggregator.test.js` |
| **T10** | 2 sessões do mesmo provedor | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T11** | Encerrar 1 de 2 sessões mantém mascote fora | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T12** | Permissão pendente + card local | OK (Automatizado) | `test/habitat-cards-focus.test.js`, `test/habitat-g3-integration.test.js` |
| **T13** | Erro terminal vs erro com ação | OK (Automatizado) | `test/habitat-g3-integration.test.js` |
| **T14** | Evento duplicado | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T15** | Evento fora de ordem | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T16** | Crash/restart do agente / PID | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T17** | Perda de fonte → `unknown` | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T18** | Novo turno durante retorno `entering` | OK (Automatizado) | `test/habitat-scene-machine.test.js` |
| **T19** | Fonte sem fase granular usa `busy` | OK (Automatizado) | `test/habitat-provider-aggregator.test.js` |
| **T20** | Múltiplos monitores e DPI `100/125/150/200%` | OK (Automatizado + Simulado em suíte) | `test/habitat-display-layout.test.js` |
| **T21** | Click-through + recuperação via bandeja | OK (Automatizado + Validado) | `test/habitat-g4-hardening.test.js`, `test/habitat-hit-geometry.test.js` |
| **T22** | Ocultação em fullscreen | OK (Automatizado + Simulado em suíte) | `test/habitat-g4-hardening.test.js` |
| **T23** | Orçamento CPU/RAM (5 min e 1 h) | OK (Medição ao vivo) | `tools/measure-habitat-g4.js` (PID 47136 / PID 13680) |
| **T24** | Instalar/remover hooks (preserva configs) | OK (Automatizado) | `test/habitat-g4-security-hooks.test.js` |
| **T25** | Logs sem prompts/segredos | OK (Auditoria de código) | `npm run audit:assets -- --prospective`, git grep |
| **T26** | Validação de manifest/bounds sem traversal | OK (Automatizado) | `test/habitat-g4-security-hooks.test.js` |
| **T27** | Movimento reduzido & teclado no painel | OK (Automatizado) | `test/habitat-g4-security-hooks.test.js` |
| **T28** | `Demo Mode` isolado de dados reais | OK (Automatizado + Isolado) | `test/habitat-scene-machine.test.js`, modo demo nativo |
