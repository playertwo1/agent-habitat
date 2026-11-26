# Roadmap — Agent Habitat (Cozy Cottage Edition)

Índice mestre de execução por **gates de evidência** (sem datas artificiais).
Antes de trabalhar numa etapa, leia [`STATE.md`](STATE.md) e abra **somente** o arquivo do gate atual em [`docs/roadmap/`](roadmap/).

## Regras de Execução

1. **Uma subetapa por vez**, na ordem dos gates. Checkpoint só fecha (`[x]`) com o comando rodado e, quando houver visual/integração, relato do dono no uso real.
2. **Isolamento em relação ao `clawd-on-desk`:** o Agent Habitat usa `appId`, porta local, pasta `%APPDATA%` e marcador de hook próprios para nunca atropelar uma instalação existente do `clawd-on-desk` durante a transição (ou coexistir/migrar de forma explícita).
3. **Zero GitHub Actions:** testes, auditorias e builds NSIS rodam 100% na máquina local via CLI.
4. **Ao concluir um gate:** atualizar esta tabela, atualizar [`STATE.md`](STATE.md) e mover etapas encerradas para `docs/arquivadas/etapas/` se desejado.

## Índice de Gates

| Gate | Arquivo | Objetivo curto | Estado |
|---|---|---|---|
| **G0** | [`arquivadas/etapas/g0-descoberta-e-base.md`](arquivadas/etapas/g0-descoberta-e-base.md) | Auditar `Arnav8452/atom` (sprites + Antigravity IDE), provar superfícies reais no Windows e isolar identidade do app (`appId`/porta/hooks) | Concluído (2026-11-24) |
| **G1** | [`arquivadas/etapas/g1-cabana-e-demo.md`](arquivadas/etapas/g1-cabana-e-demo.md) | Camadas PNG RGBA da Cozy Cottage + sprites originais (Clawd, Cloudling, Atom) + máquina visual das 8 combinações (`000`–`111`) + `Demo Mode` | Concluído (2026-11-25) |
| **G2** | [`arquivadas/etapas/g2-agregador-e-adaptadores.md`](arquivadas/etapas/g2-agregador-e-adaptadores.md) | Agregador de 3 slots por provedor, adaptador Antigravity IDE/CLI + Codex Desktop/CLI + Claude CLI/Desktop e poda dos 26 agentes extras/canais remotos | Concluído (2026-11-25) |
| **G3** | [`arquivadas/etapas/g3-habitat-integrado.md`](arquivadas/etapas/g3-habitat-integrado.md) | Conectar telemetria real à cabana, `hitWin` dinâmico, painel sob demanda em pt-BR, foco de janela e cards opcionais de permissão/conclusão | Concluído (2026-11-25) |
| **G4** | [`arquivadas/etapas/g4-hardening-windows.md`](arquivadas/etapas/g4-hardening-windows.md) | Validação em DPI `100/125/150/200%`, múltiplos monitores, tela cheia, movimento reduzido, medição de CPU/RAM (1 h) e reversibilidade de hooks | Concluído (2026-11-25) |
| **G5** | [`arquivadas/etapas/g5-release-local.md`](arquivadas/etapas/g5-release-local.md) | Ícone final, build NSIS Windows x64/arm64 local, checksum SHA-256, auditoria de pacote/licenças e release `v0.1.0` em `playertwo1/agent-habitat` | Concluído em 2026-11-25 (release `v0.1.0` publicada) |
| **P1** | [`roadmap/p1-pos-mvp.md`](roadmap/p1-pos-mvp.md) | Métricas verificadas, histórico com retomada, subagentes visuais e jardim personalizável; uma release `v0.2.0` no fim | Roadmap aprovado em 25/11/2026; P1.1 a P1.4 implementadas e `v0.2.0` publicada (25/11); pendentes: retomada real de Claude e Codex e aprovação visual do jardim pelo dono |
| **P2** | [`roadmap/p2-novos-temas.md`](roadmap/p2-novos-temas.md) | Temas Japanese Garden e Fantasy Village (arte do Gemini), ajudantes por tema e mais animações dos moradores; release `v0.3.0` no fim | Roadmap aprovado em 25/11/2026; P2.1 e P2.4 implementadas; P2.2/P2.3 esperam a arte do Gemini. Space Habitat, 4º morador e Lumen seguem parqueados |
| **P3** | [`roadmap/p3-proximo-ciclo.md`](roadmap/p3-proximo-ciclo.md) | Tema Space Habitat (arte do Gemini), confiabilidade (testes, desinstalador, NSIS), leitura local opcional para o Lumen e aviso opcional de versão; release `v0.4.0` no fim | Roadmap montado em 26/11/2026; P3.1 com prompts prontos, espera a arte; P3.2 a P3.5 não iniciadas |

## Matriz de Testes Mínimos (T01–T28; P1 acrescenta T29–T33)

- **Cena e verdade (`T01`–`T11`):** combinações `000` a `111` (`T01`–`T08`); app aberto ocioso = `000` (`T09`); 2 sessões do mesmo provedor (`T10`); encerrar 1 de 2 sessões mantém mascote fora (`T11`).
- **Eventos e resiliência (`T12`–`T19`):** permissão pendente + card local (`T12`); erro terminal vs erro com ação (`T13`); evento duplicado (`T14`); evento fora de ordem (`T15`); crash/restart do agente (`T16`); perda de fonte → `unknown` (`T17`); novo turno durante retorno `entering` (`T18`); fonte sem fase granular usa `busy` padrão (`T19`).
- **Windows e UX (`T20`–`T28`):** múltiplos monitores e DPI `100/125/150/200%` (`T20`); click-through + recuperação via bandeja (`T21`); ocultação em fullscreen (`T22`); orçamento CPU/RAM 5 min e 1 h (`T23`); instalar/remover hooks preservando configs existentes (`T24`); logs sem prompts/segredos (`T25`); validação de manifest/bounds sem path traversal (`T26`); movimento reduzido e navegação por teclado no painel (`T27`); `Demo Mode` isolado de dados reais (`T28`).
