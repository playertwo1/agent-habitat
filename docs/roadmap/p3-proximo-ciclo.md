# Etapa: P3 — Space Habitat, confiabilidade, ponte com o Lumen e aviso de versão

**Estado:** P3.3, P3.4 e P3.6 no `main`; P3.2 falta fechar o aceite; P3.7 integrada no branch `p3.7-refino`, espera a aprovação visual do dono; P3.1/P3.5 esperam a arte do Space Habitat. Atualizado em 27/11/2026.

**Objetivo:** o dono ganha um terceiro tema (**Space Habitat**, domo em asteroide flutuante), um app mais confiável (testes estáveis, desinstalador e NSIS corretos), uma **leitura local opcional** do estado para o **Lumen** e um **aviso opcional de nova versão**. Publicados juntos em **uma release `v0.4.0`** no fim.

**Decisões:** [questionário do P3](../questionario/2026-11-26-p3-proximo-ciclo.md). **Prompts da arte:** [pacote do Space Habitat](../arte-p3/prompts-gemini-space.md). **Princípio:** as regras do `AGENTS.md` valem em todas as fases (`000` = ninguém fora, `unknown` nunca vira trabalhando, moradores sem recolorir, zero telemetria, nunca aprovar permissão sozinho). As **únicas** exceções de rede são opt-in e mínimas: a leitura local para o Lumen (D2–D5) e a consulta diária de versão (D7).

Este arquivo é só um índice. Para trabalhar numa fase, leia apenas o documento dela.

| Fase | Resultado | Checkpoint | Estado | Documento |
|---|---|---|---|---|
| P3.1 | Prompts do Space Habitat prontos e arte entregue pelo dono | CP-P3.1 | Prompts prontos; espera a arte | [P3.1 — Arte do Space Habitat](p3/P3.1-arte-space-habitat.md) |
| P3.2 | Confiabilidade: testes estáveis, desinstalador e NSIS corretos | CP-P3.2 | Em andamento: código e `T36` no `main`; falta suíte verde 3 vezes seguidas (1/3 em 27/11) e a prova do NSIS no build final | [P3.2 — Confiabilidade](p3/P3.2-confiabilidade.md) |
| P3.3 | Leitura local opcional do estado para o Lumen | CP-P3.3 | Concluída 27/11 | [P3.3 — Ponte com o Lumen](p3/P3.3-ponte-lumen.md) |
| P3.4 | Aviso opcional de nova versão | CP-P3.4 | Concluída 27/11 | [P3.4 — Aviso de versão](p3/P3.4-aviso-de-versao.md) |
| P3.5 | Tema Space Habitat completo, de dia e de noite | CP-P3.5 | Condicional a CP-P3.1 | [P3.5 — Space Habitat](p3/P3.5-space-habitat.md) |
| P3.6 | Modo de visualização em escala 0,5x (pedido do dono em 27/11) | CP-P3.6 | Implementada e no `main`; falta conferir DPI 100/125/200% e 2 monitores | [P3.6 — Escala 0,5x](p3/P3.6-escala-meio.md) |
| P3.7 | Árvores variadas, castelo no Fantasy Village, aviso de conclusão na ilha e bug do jardim (pedido do dono em 27/11) | CP-P3.7 | Arte do Codex integrada no branch `p3.7-refino`; espera a aprovação visual do dono | [P3.7 — Refino visual](p3/P3.7-refino-visual.md) |
| Release | `v0.4.0` publicada com tudo | CP-P3 | Condicional a todos os CPs | (regra abaixo) |

## Regras da etapa
- **Uma fase por vez**, na ordem da tabela; P3.1 (arte) corre em paralelo com o código porque depende só do dono e do Gemini. Só marque `[x]` com evidência executada agora.
- **A arte vem do dono:** P3.5 só avança com as 8 peças em `assets-novos/space-habitat/`. Sem arte, a fase fica parada, não improvisada.
- **Build só no fim:** nenhuma fase gera instalador; a conferência no app instalado fica para o CP-P3, com um só `release-local.ps1`.
- **Release (CP-P3):** suíte completa verde, `release-local.ps1`, instalado conferido pelo CDP, tag `v0.4.0` no commit certo (conferir tags herdadas do `clawd-on-desk` e apagar só a local), `gh release create` local e **confirmação do dono antes de publicar**.

## Fora desta etapa (parqueado)
**4º morador / provedor extra**, **instalador arm64**, **assinatura de código** e **alterações dentro do Lumen** (o P3 entrega só o endpoint e o contrato). Só reabrem por decisão explícita do proprietário.
