# Etapa: P2 — Novos temas, animações e ajudantes por tema

**Estado:** Roadmap aprovado em 25/11/2026; nenhuma fase iniciada. Atualizado em 25/11/2026.

**Objetivo:** o dono escolhe em Ajustes entre a Cozy Cottage e dois temas novos (**Japanese Garden** e **Fantasy Village**), cada um com cenário, ajudantes de subagente e objetos de jardim próprios; os moradores ganham mais animações (clipes originais ainda sem uso e movimento por código). Publicados juntos em **uma release `v0.3.0` no fim**. Se a arte do Gemini não alcançar a qualidade da Cozy Cottage depois de duas rodadas de ajuste, o tema é **abandonado** e a Cozy Cottage segue como padrão.

**Decisões:** [questionário do P2](../questionario/2026-11-25-p2-novos-temas.md). **Prompts da arte:** [pacote de prompts do Gemini](../arte-p2/prompts-gemini.md). **Princípio:** as regras do `AGENTS.md` valem em todas as fases (`000` = ninguém fora, identidade dos moradores sem recolorir, PNG RGBA com alfa real, zero telemetria, zero GitHub Actions).

Este arquivo é só um índice. Para trabalhar numa fase, leia apenas o documento dela.

| Fase | Resultado | Checkpoint | Estado | Documento |
|---|---|---|---|---|
| P2.1 | Infra de temas: seletor em Ajustes, manifesto por tema, ajudantes com N quadros e script que transforma a arte do Gemini em camadas RGBA | CP-P2.1 | Não iniciada | [P2.1 — Infra de temas](p2/P2.1-infra-de-temas.md) |
| P2.2 | Tema Japanese Garden completo, de dia e de noite | CP-P2.2 | Condicional a CP-P2.1 e à arte do dono | [P2.2 — Japanese Garden](p2/P2.2-japanese-garden.md) |
| P2.3 | Tema Fantasy Village completo, de dia e de noite | CP-P2.3 | Condicional a CP-P2.1 e à arte do dono | [P2.3 — Fantasy Village](p2/P2.3-fantasy-village.md) |
| P2.4 | Mais animações dos moradores (clipes originais e movimento por código) | CP-P2.4 | Condicional a CP-P2.1 | [P2.4 — Animações](p2/P2.4-animacoes.md) |
| Release | `v0.3.0` publicada com tudo | CP-P2 | Condicional a todos os CPs | (regra abaixo) |

## Regras da etapa
- **Uma fase por vez**, na ordem da tabela; P2.4 não depende da arte e pode ser feita enquanto o dono pede as imagens. Só marque `[x]` com evidência executada agora.
- **A arte vem do dono:** cada tema só avança depois que o dono entregar as 8 peças em `assets-novos/<tema>/` (ver prompts). Sem arte, a fase fica parada, não improvisada.
- **Build só no fim** (como no P1): nenhuma fase gera instalador; a conferência no app instalado fica para o CP-P2, com um só `release-local.ps1`.
- **Release (CP-P2):** suíte verde, `release-local.ps1`, instalado conferido pelo CDP (os 3 temas, de dia e de noite), tag `v0.3.0` no commit certo (conferir tags herdadas: já houve `v0.2.0` herdada), `gh release create` local e confirmação do dono antes de publicar.

## Fora desta etapa (parqueado)
**Space Habitat**, **4º morador opcional** e **ponte opcional com o Lumen**. Só reabrem por decisão explícita do proprietário.
