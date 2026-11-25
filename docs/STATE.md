# STATE — Ponto de Retomada do Agent Habitat

**Atualizado:** 2026-11-25 · **Versão atual:** `0.1.0` (Gate G1 concluído) · **Etapa da vez:** [G2 — Agregador e Adaptadores](roadmap/g2-agregador-e-adaptadores.md)

Este arquivo registra **apenas** onde estamos, o que aguarda validação do dono e qual é a próxima ação imediata. Para detalhes das etapas, consulte o [ROADMAP](ROADMAP.md).

## Onde Estamos

| Etapa | Estado |
|---|---|
| **Kickoff (`D1`–`D8`)** | **Concluído em 2026-11-24** (`8495b4a0`). Repositório criado sobre `playertwo1/clawd-on-desk` (`e216f924`), zero GitHub Actions, referências visuais e documentação fundacional prontas. |
| **G0 (`G0.1`–`G0.3`)** | **Concluído em 2026-11-24.** `Arnav8452/atom` auditado (19 pares `.webp`/`.json` em `assets/originals/atom/` + `NOTICE.md`), 6 superfícies Windows comprovadas em `docs/discovery-g0.md` e identidade isolada (`src/habitat-identity.js`, `com.playertwo1.agent-habitat`, portas `23433–23437`, `~/.agent-habitat/runtime.json`, `AGENT_HABITAT_SYNC_HOOKS=0`). |
| **G1 (`G1.1`–`G1.4`)** | **G1.1–G1.3 concluídas com capturas e testes verdes; `G1.4` aguardando aprovação visual ao vivo do proprietário.** |
| **G2 – G5** | Pendentes na fila do MVP. |
| **P1 / P2** | Parqueados até o fechamento do G5. |

## Próxima Ação Imediata

1. **Implementar Gate G2:** desenvolver `provider-aggregator.js`, adaptadores Windows para as 6 superfícies (Claude Code/Desktop, Codex CLI/Desktop, Antigravity CLI/IDE) e poda de escopo MVP, mantendo os hooks do usuário intactos até o opt-in no G3.

## Pendências do Proprietário

- Nenhuma no G1; próxima validação ao vivo será após integração real do G2/G3.

## Notas Técnicas Atuais

- O app sobe de forma isolada em dev na porta `23433` (`~/.agent-habitat/runtime.json`, `%APPDATA%\agent-habitat`) sem colidir com o `clawd-on-desk` em execução (`23333`) e sem modificar `~/.claude`, `~/.codex` ou `~/.gemini` (`AGENT_HABITAT_SYNC_HOOKS=0` por padrão até o **G2**).
- Validações do fechamento do G0: `npm run audit:assets -- --prospective` com `0 error(s), 0 warning(s)`; smoke test real na porta `23433` aprovado; suíte local executada com Python 3.12 no `PATH` (`15747` aprovados, `151` ignorados, `1` falha pré-existente de ACL do `%TEMP%` do sandbox Windows em `test/recap-private-permissions.test.js:588`).
