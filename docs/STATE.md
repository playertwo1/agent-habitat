# STATE — Ponto de Retomada do Agent Habitat

**Atualizado:** 2026-11-25 · **Versão atual:** `0.1.0` (Gates G0 a G5 concluídos; release `v0.1.0` publicada) · **Etapa da vez:** P1/P2 (parqueados, a decidir com o proprietário)

Este arquivo registra **apenas** onde estamos, o que aguarda validação do dono e qual é a próxima ação imediata. Para detalhes das etapas, consulte o [ROADMAP](ROADMAP.md).

## Onde Estamos

| Etapa | Estado |
|---|---|
| **Kickoff (`D1`–`D8`)** | **Concluído em 2026-11-24** (`8495b4a0`). Repositório criado sobre `playertwo1/clawd-on-desk` (`e216f924`), zero GitHub Actions, referências visuais e documentação fundacional prontas. |
| **G0 (`G0.1`–`G0.3`)** | **Concluído em 2026-11-24.** `Arnav8452/atom` auditado (19 pares `.webp`/`.json` em `assets/originals/atom/` + `NOTICE.md`), 6 superfícies Windows comprovadas em `docs/discovery-g0.md` e identidade isolada (`src/habitat-identity.js`, `com.playertwo1.agent-habitat`, portas `23433–23437`, `~/.agent-habitat/runtime.json`, `AGENT_HABITAT_SYNC_HOOKS=0`). |
| **G1 (`G1.1`–`G1.4`)** | **Concluído em 2026-11-25** (`850ef39d`). Camadas RGBA da Cozy Cottage, 3 mascotes originais, scene-machine.js, Demo Mode [DEMO] e G1.4 aprovado visualmente ao vivo pelo proprietário. |
| **G2 (`G2.1`–`G2.3`)** | **Concluído em 2026-11-25.** `provider-aggregator.js` (`T09`–`T19`), adaptadores das 6 superfícies Windows, `agent-habitat-hook.js`, `habitat-hook-sync.js` (schemas reais Claude/Codex/Antigravity sem tocar em `$HOME`), `habitat-runtime.js` + rotas `/habitat/event` e `/habitat/snapshot`, e poda MVP (`mvp-scope.js` + bloqueio de canais remotos no `main.js`). |
| **G3 (`G3.1`–`G3.4`)** | **Concluído em 2026-11-25.** Cabana dual-window integrada (`renderWin` + `hitWin` dinâmico), agregador ligado aos 3 adaptadores reais, painel pt-BR, cards locais (`D3`), validação ao vivo `000 -> 111 -> 000` e suíte verde. |
| **G4 (`G4.1`–`G4.3`)** | **Concluído em 2026-11-25.** Hardening Windows concluído: DPI `100–200%`, multi-monitor, tela cheia (`WS_EX_NOACTIVATE`), soak test de 1 h e medição de CPU/RAM (`docs/evidencias-g4.md`), hooks reversíveis com backup e auditoria de segurança/privacidade (`T24`–`T28`). |
| **G5 (`G5.1`–`G5.2`)** | **Concluído em 2026-11-25.** Ícone, metadados, `scripts/release-local.ps1`, instalação real, ativação dos 3 moradores, remoção de conectores e desinstalação reais validadas pelo proprietário; release `v0.1.0` em `playertwo1/agent-habitat` (tag `820f0c42`, 6 anexos). 5 defeitos do app instalado corrigidos (ver `CHANGELOG.md`). |
| **P1 / P2** | Parqueados até o fechamento do G5. |

## Próxima Ação Imediata

1. Decidir com o proprietário o escopo de P1/P2 (ex.: assinatura do instalador, ajustar as notas da release, limpar `.bak`).

## Pendências do Proprietário


## Notas Técnicas Atuais

- O app sobe de forma isolada em dev na porta `23433` (`~/.agent-habitat/runtime.json`, `%APPDATA%\agent-habitat`) sem colidir com o `clawd-on-desk` em execução (`23333`).
- Validações: `npm run audit:assets -- --prospective` com `0 error(s), 0 warning(s)`; suíte local executada com sucesso e snapshot ao vivo na porta `23433` respondendo `200` (`mode: "observed"`).
