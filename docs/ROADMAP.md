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
| **G1** | [`roadmap/g1-cabana-e-demo.md`](roadmap/g1-cabana-e-demo.md) | Camadas PNG RGBA da Cozy Cottage + sprites originais (Clawd, Cloudling, Atom) + máquina visual das 8 combinações (`000`–`111`) + `Demo Mode` | A fazer (próxima) |
| **G2** | [`roadmap/g2-agregador-e-adaptadores.md`](roadmap/g2-agregador-e-adaptadores.md) | Agregador de 3 slots por provedor, adaptador Antigravity IDE/CLI + Codex Desktop/CLI + Claude CLI/Desktop e poda dos 26 agentes extras/canais remotos | Pendente |
| **G3** | [`roadmap/g3-habitat-integrado.md`](roadmap/g3-habitat-integrado.md) | Conectar telemetria real à cabana, `hitWin` dinâmico, painel sob demanda em pt-BR, foco de janela e cards opcionais de permissão/conclusão | Pendente |
| **G4** | [`roadmap/g4-hardening-windows.md`](roadmap/g4-hardening-windows.md) | Validação em DPI `100/125/150/200%`, múltiplos monitores, tela cheia, movimento reduzido, medição de CPU/RAM (1 h) e reversibilidade de hooks | Pendente |
| **G5** | [`roadmap/g5-release-local.md`](roadmap/g5-release-local.md) | Ícone final, build NSIS Windows x64/arm64 local, checksum SHA-256, auditoria de pacote/licenças e release `v0.1.0` em `playertwo1/agent-habitat` | Pendente |
| **P1/P2** | [`roadmap/p1-pos-mvp.md`](roadmap/p1-pos-mvp.md) | Cotas/métricas verificadas, personalização do jardim, subagentes visuais, novos habitats e ponte opcional com Lumen | Parqueado pós-MVP |

## Matriz de Testes Mínimos (T01–T28)

- **Cena e verdade (`T01`–`T11`):** combinações `000` a `111` (`T01`–`T08`); app aberto ocioso = `000` (`T09`); 2 sessões do mesmo provedor (`T10`); encerrar 1 de 2 sessões mantém mascote fora (`T11`).
- **Eventos e resiliência (`T12`–`T19`):** permissão pendente + card local (`T12`); erro terminal vs erro com ação (`T13`); evento duplicado (`T14`); evento fora de ordem (`T15`); crash/restart do agente (`T16`); perda de fonte → `unknown` (`T17`); novo turno durante retorno `entering` (`T18`); fonte sem fase granular usa `busy` padrão (`T19`).
- **Windows e UX (`T20`–`T28`):** múltiplos monitores e DPI `100/125/150/200%` (`T20`); click-through + recuperação via bandeja (`T21`); ocultação em fullscreen (`T22`); orçamento CPU/RAM 5 min e 1 h (`T23`); instalar/remover hooks preservando configs existentes (`T24`); logs sem prompts/segredos (`T25`); validação de manifest/bounds sem path traversal (`T26`); movimento reduzido e navegação por teclado no painel (`T27`); `Demo Mode` isolado de dados reais (`T28`).
