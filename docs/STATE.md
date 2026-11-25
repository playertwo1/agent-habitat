# STATE — Ponto de Retomada do Agent Habitat

**Atualizado:** 2026-11-25 · **Versão atual:** `0.1.0` (Gate G3 implementado, aguardando validação ao vivo `G3.4`) · **Etapa da vez:** [G3 — Habitat Integrado](roadmap/g3-habitat-integrado.md) (`G3.4` na tela)

Este arquivo registra **apenas** onde estamos, o que aguarda validação do dono e qual é a próxima ação imediata. Para detalhes das etapas, consulte o [ROADMAP](ROADMAP.md).

## Onde Estamos

| Etapa | Estado |
|---|---|
| **Kickoff (`D1`–`D8`)** | **Concluído em 2026-11-24** (`8495b4a0`). Repositório criado sobre `playertwo1/clawd-on-desk` (`e216f924`), zero GitHub Actions, referências visuais e documentação fundacional prontas. |
| **G0 (`G0.1`–`G0.3`)** | **Concluído em 2026-11-24.** `Arnav8452/atom` auditado (19 pares `.webp`/`.json` em `assets/originals/atom/` + `NOTICE.md`), 6 superfícies Windows comprovadas em `docs/discovery-g0.md` e identidade isolada (`src/habitat-identity.js`, `com.playertwo1.agent-habitat`, portas `23433–23437`, `~/.agent-habitat/runtime.json`, `AGENT_HABITAT_SYNC_HOOKS=0`). |
| **G1 (`G1.1`–`G1.4`)** | **Concluído em 2026-11-25** (`850ef39d`). Camadas RGBA da Cozy Cottage, 3 mascotes originais, scene-machine.js, Demo Mode [DEMO] e G1.4 aprovado visualmente ao vivo pelo proprietário. |
| **G2 (`G2.1`–`G2.3`)** | **Implementação e E2E concluídos em 2026-11-25.** `provider-aggregator.js` (`T09`–`T19`), adaptadores das 6 superfícies Windows, `agent-habitat-hook.js`, `habitat-hook-sync.js` (schemas reais Claude/Codex/Antigravity sem tocar em `$HOME`), `habitat-runtime.js` + rotas `/habitat/event` e `/habitat/snapshot`, e poda MVP (`mvp-scope.js` + bloqueio de canais remotos no `main.js`). Resta apenas o teste ao vivo pós opt-in de hooks na UI do G3. |
| **G3 (`G3.1`–`G3.3`)** | **Implementado em 2026-11-25** (`b2c12b89`). Cabana dual-window integrada (`renderWin` + `hitWin` dinâmico), agregador ligado aos 3 adaptadores reais, painel pt-BR, cards locais (`D3`) e suíte verde (exceto ACL de sandbox local). Aguardando validação ao vivo de `G3.4` (`000 -> 111 -> 000`) pelo proprietário. |
| **P1 / P2** | Parqueados até o fechamento do G5. |

## Próxima Ação Imediata

1. **Preparar e executar Gate G3 (`docs/roadmap/g3-habitat-integrado.md`):** conectar a cabana em tempo real ao `habitatRuntime`, `hitWin` dinâmico, painel pt-BR com opt-in de hooks e validação ao vivo nos 3 apps reais.

## Pendências do Proprietário

- Decidir/autorizar no **G3** o opt-in de hooks `agent-habitat-hook.js` e validar ao vivo Claude + Codex + Antigravity juntos na cabana (e confirmar se deseja manter ou reverter apontamento do grupo legado `"clawd"` em Codex/Gemini atualizado durante o incidente do `task-93` antes da blindagem).

## Notas Técnicas Atuais

- O app sobe de forma isolada em dev na porta `23433` (`~/.agent-habitat/runtime.json`, `%APPDATA%\agent-habitat`) sem colidir com o `clawd-on-desk` em execução (`23333`) e sem modificar `~/.claude`, `~/.codex` ou `~/.gemini` (`AGENT_HABITAT_SYNC_HOOKS=0` por padrão até o **G2**).
- Validações do fechamento do G0: `npm run audit:assets -- --prospective` com `0 error(s), 0 warning(s)`; smoke test real na porta `23433` aprovado; suíte local executada com Python 3.12 no `PATH` (`15747` aprovados, `151` ignorados, `1` falha pré-existente de ACL do `%TEMP%` do sandbox Windows em `test/recap-private-permissions.test.js:588`).
