# Referências GitHub, Commits e Licenças

Registro consolidado das fontes técnicas e visuais do **Agent Habitat**, atualizado no kickoff de `2026-11-24`.

## 1. Fontes Primárias (P0 — Diretamente Utilizadas)

| Projeto | Repositório | Commit de referência | Código | Arte / Personagem | Papel no Agent Habitat |
|---|---|---|---|---|---|
| **Clawd on Desk (fork base)** | `https://github.com/playertwo1/clawd-on-desk` | `e216f924` (`v1.6.4`) | `AGPL-3.0-only` | Direitos reservados por autor; uso autorizado declarado pelo dono | Base Electron do projeto: janela dupla transparente, hooks de Claude/Codex/Antigravity, foco de janela, cards de permissão/conclusão e temas `clawd` / `cloudling` |
| **Clawd on Desk (upstream)** | `https://github.com/rullerzhou-afk/clawd-on-desk` | ancestral de `e216f924` | `AGPL-3.0-only` | **Clawd** (Anthropic / fan art) e **Cloudling** (鹿鹿 `@rullerzhou-afk`) | Origem da arquitetura base e dos assets originais de Clawd e Cloudling |
| **Atom** | `https://github.com/Arnav8452/atom` | `aae0dfe8603a82a699b210dd8c8ca717ebea31f1` | `MIT License` | **Atom** (autorização declarada pelo dono; auditar arquivos em G0.1) | Fonte dos sprites originais do **Atom** e referência de integração com **Antigravity IDE** |

## 2. Referências Complementares de Engenharia e Inspiração (Consulta Apenas)

Não copiar código sem verificar compatibilidade com `AGPL-3.0-only` e real necessidade (regra YAGNI):

| Repositório | URL | Ponto de consulta eventual |
|---|---|---|
| Agent Pet | `https://github.com/xiangking/agent-pet` | Ideias de máquina de cena e overlay |
| CodePet | `https://github.com/nokryong/CodePet` | Descoberta de sessões desktop/IDE |
| AgentPaw | `https://github.com/vista-zhangg/agentpaw` | Apresentação de cotas no Windows (P1) |
| OpenPets | `https://github.com/openpetstech/openpets` | Formato de empacotamento de sprites (P1/P2) |
| Pixel Agents | `https://github.com/pablodelucca/pixel-agents` | Movimentação 2D entre estações e porta |
| Agent Office | `https://github.com/arxdsilva/agent-office` | Disposição espacial de múltiplos agentes |

## 3. Documentação Oficial das Superfícies Alvo

- **Claude Code Hooks:** `https://code.claude.com/docs/`
- **OpenAI Codex:** `https://developers.openai.com/codex/`
- **Google Antigravity:** `https://antigravity.google/docs/`

## 4. Diretrizes de Licenciamento e Atribuição

1. **Código (`AGPL-3.0-only`):** por derivar diretamente de `clawd-on-desk`, todo o código do `agent-habitat` mantém a licença `AGPL-3.0-only` ([`LICENSE`](../LICENSE)) e os avisos de terceiros ([`NOTICE.md`](../NOTICE.md)). Código `MIT` de `Arnav8452/atom`, se aproveitado, é compatível desde que preservado o aviso de copyright MIT em `NOTICE.md`.
2. **Artes e Sprites:** licenças de código (`AGPL-3.0` / `MIT`) **não** cobrem automaticamente sprites de personagens. No Gate **G0.1**, registrar formalmente o escopo da autorização obtida pelo proprietário para **Clawd**, **Cloudling** e **Atom**, mantendo o repositório **privado** (`D7`) enquanto consolidamos o inventário completo.
3. **Arte própria do cenário:** as camadas PNG RGBA da cabana **Cozy Cottage** e objetos produzidos para o projeto terão autoria e licença documentadas separadamente em `assets/habitat/LICENSE-HABITAT.md`.
