# Etapa: P1 — Refinamentos de uso diário

**Estado:** P1.1 a P1.4 implementadas, conferidas no instalado 0.2.0 e publicadas na `v0.2.0` em 25/11/2026; retomada real de Claude e Codex conferida em 26/11/2026 (corrigido o `wt.exe`); pendente só a aprovação visual do jardim pelo dono. Atualizado em 26/11/2026.

**Objetivo:** métricas verificadas, histórico com retomada, subagentes visuais e personalização do jardim no Habitat, publicados juntos em **uma release v0.2.0 no fim**. Nada de estimativa inventada: sem dado real, o painel diz que não há dado.

**Decisões:** [questionário do P1](../questionario/2026-11-25-p1-refinamentos-de-uso-diario.md). **Princípio:** as regras do `AGENTS.md` (`000` = ninguém fora, verdade dos estados, identidade dos moradores, zero telemetria, zero GitHub Actions) valem em todas as fases.

Este arquivo é só um índice. Para trabalhar numa fase, leia apenas o documento dela.

| Fase | Resultado | Checkpoint | Estado | Documento |
|---|---|---|---|---|
| P1.1 | Painel com cotas reais de Claude e Codex, "uso observado" do Atom, hoje e 7 dias | CP-P1.1 | Concluída 25/11 | [P1.1 — Métricas](p1/P1.1-metricas.md) |
| P1.2 | Histórico de sessões recentes no painel, retomando as do Claude | CP-P1.2 | Implementada 25/11 (conferência instalada no fim) | [P1.2 — Histórico](p1/P1.2-historico.md) |
| P1.2b | Retomada de sessões do Codex | CP-P1.2b | Implementada 25/11 (conferência instalada no fim) | [P1.2b — Retomada do Codex](p1/P1.2b-retomada-codex.md) |
| P1.3 | Mini-ajudantes desenhados por subagente ativo | CP-P1.3 | Implementada 25/11 (conferência instalada no fim) | [P1.3 — Subagentes](p1/P1.3-subagentes.md) |
| P1.4 | Objetos do jardim escolhidos no painel e luz dia/noite pelo relógio | CP-P1.4 | Implementada 25/11 (conferência instalada no fim) | [P1.4 — Jardim](p1/P1.4-jardim.md) |
| Release | `v0.2.0` publicada com tudo | CP-P1 | Publicada 25/11 (`v0.2.0`, tag `882d22aa`) | (regra abaixo) |

## Regras da etapa
- **Uma fase por vez, na ordem da tabela.** Só marque `[x]` com evidência executada agora.
- **Build só no fim (decisão de 25/11/2026):** nenhuma fase gera instalador. Cada fase fecha com a suíte verde (e, no que for visual, conferência em `npm start`); as conferências no app instalado marcadas "(no fim)" nas fases ficam para a verificação única do CP-P1, com um só `release-local.ps1` e conferência pelo CDP de tudo (cotas, histórico e retomada, ajudantes, jardim).
- As fases P1.3 e P1.4 começam por **protótipo visual** aprovado pelo dono antes de qualquer ligação a eventos.
- **Release (CP-P1):** só depois de P1.1 a P1.4 fechadas: suíte verde, `release-local.ps1` completo, remoção de conectores e desinstalação conferidas, tag `v0.2.0` no commit certo (conferir tags herdadas antes), `gh release create` local e confirmação do dono antes de publicar.

## P2
Roadmap em [P2 — Novos temas](p2-novos-temas.md) (*Japanese Garden*, *Fantasy Village*, ajudantes por tema e mais animações). Parqueados: *Space Habitat*, ponte opcional com o **Lumen** e 4º morador opcional.
