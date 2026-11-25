# STATE — Ponto de Retomada do Agent Habitat

**Atualizado:** 2026-11-25 · **Versão atual:** `0.1.0` (Gate G0 concluído) · **Etapa da vez:** [G1 — Cabana e Demo](roadmap/g1-cabana-e-demo.md)

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

1. **Inspeção visual do proprietário:** abrir a janela Demo (`npm run demo:habitat`) ou inspecionar os previews em `dist/g1-previews/` para confirmar **G1.4** e autorizar o fechamento do G1 e início do **G2**.

## Pendências do Proprietário

- Aprovação visual da Cozy Cottage quando o **G1.4** estiver pronto para captura no desktop real.

## Notas Técnicas Atuais

- O app sobe de forma isolada em dev na porta `23433` (`~/.agent-habitat/runtime.json`, `%APPDATA%\agent-habitat`) sem colidir com o `clawd-on-desk` em execução (`23333`) e sem modificar `~/.claude`, `~/.codex` ou `~/.gemini` (`AGENT_HABITAT_SYNC_HOOKS=0` por padrão até o **G2**).
- Validações do fechamento do G0: `npm run audit:assets -- --prospective` com `0 error(s), 0 warning(s)`; smoke test real na porta `23433` aprovado; suíte local executada com Python 3.12 no `PATH` (`15747` aprovados, `151` ignorados, `1` falha pré-existente de ACL do `%TEMP%` do sandbox Windows em `test/recap-private-permissions.test.js:588`).
