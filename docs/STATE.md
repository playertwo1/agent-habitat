# STATE — Ponto de Retomada do Agent Habitat

**Atualizado:** 2026-11-25 · **Versão atual:** `0.2.0` (Gates G0 a G5 e P1 concluídos; releases `v0.1.0` e `v0.2.0` publicadas) · **Etapa da vez:** [P1 — Refinamentos de uso diário](roadmap/p1-pos-mvp.md) (P1.1 a P1.4 publicadas na `v0.2.0`; restam duas conferências suas)

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
| **P1** | Roadmap aprovado em 2026-11-25 ([questionário](questionario/2026-11-25-p1-refinamentos-de-uso-diario.md)): P1.1 métricas, P1.2 histórico, P1.2b retomada do Codex, P1.3 subagentes, P1.4 jardim; release `v0.2.0` publicada em 2026-11-25 (tag `882d22aa`, instalador x64). |
| **P2** | Roadmap montado em 2026-11-25 ([questionário](questionario/2026-11-25-p2-novos-temas.md), [índice](roadmap/p2-novos-temas.md)): P2.1 infra de temas, P2.2 Japanese Garden, P2.3 Fantasy Village, P2.4 animações; release `v0.3.0` só no fim. Arte pelo Gemini com [prompts prontos](arte-p2/prompts-gemini.md). |

## Próxima Ação Imediata

1. Conferir a retomada real do histórico (Claude e Codex) e se o id de sessão do hook do Codex é o UUID aceito por `codex resume`.
2. Aprovar visualmente o jardim (`docs/prototipos/p1.4/`).
3. **P2:** P2.1 a P2.4 concluídas e conferidas no app instalado `0.3.0` em 26/11 (temas de dia e de noite, moradores, luz, consumo em `000`). Build `dist/Agent-Habitat-Setup-0.3.0-x64.exe` gerado; falta só publicar a release `v0.3.0`, que depende da confirmação do dono. Opcional: refazer a Cozy Cottage com os [prompts v2](arte-p2/prompts-gemini-cozy-v2.md). Space Habitat, 4º morador e Lumen seguem parqueados.

## Pendências do Proprietário

- Retomada real e aprovação do jardim (acima).


## Notas Técnicas Atuais

- O app sobe de forma isolada em dev na porta `23433` (`~/.agent-habitat/runtime.json`, `%APPDATA%\agent-habitat`) sem colidir com o `clawd-on-desk` em execução (`23333`).
- Validações: `npm run audit:assets -- --prospective` com `0 error(s), 0 warning(s)`; suíte local executada com sucesso e snapshot ao vivo na porta `23433` respondendo `200` (`mode: "observed"`).
