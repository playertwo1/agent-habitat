# Agent Habitat (Cozy Cottage Edition) — Guia para Agentes de Código

Porta de entrada operacional para **Claude Code**, **Codex** e **Antigravity** neste repositório. Mantenha este arquivo enxuto.

## O que é este projeto

- **Agent Habitat** é um desktop habitat 2D acolhedor em pixel art para Windows 10/11: uma cabana (**Cozy Cottage**) sempre visível onde moram **Clawd** (Claude), **Cloudling** (Codex) e **Atom** (Antigravity).
- Construído sobre a base Electron comprovada do fork `playertwo1/clawd-on-desk` (`v1.6.4`, commit `e216f924`, licença **AGPL-3.0-only**), evoluindo de 1 pet único para uma **cena multi-personagem de 3 estações + cabana** ([decisões do kickoff](docs/questionario/2026-11-24-kickoff-agent-habitat.md)).

## Antes de alterar qualquer código, leia nesta ordem

1. [`docs/STATE.md`](docs/STATE.md) — estado atual, pendências do dono e próxima ação imediata.
2. [`docs/ROADMAP.md`](docs/ROADMAP.md) — índice dos gates (`G0`–`G5`) e matriz de testes `T01`–`T28`. Depois abra **apenas** o arquivo do gate ativo em `docs/roadmap/`.
3. [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/DESIGN.md`](docs/DESIGN.md) e [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — regras de verdade, visual e contratos.
4. Para detalhes internos herdados do motor Electron (janelas, hooks, settings store): consulte [`docs/herdado-clawd/AGENTS-CLAWD.md`](docs/herdado-clawd/AGENTS-CLAWD.md) e `docs/project/`.

## Regras Não Negociáveis

- **Cabana sempre presente; `000` = ninguém fora:** quando nenhum dos 3 provedores tem trabalho confirmado ou intervenção pendente, a cabana fica fechada, luz em repouso e **nenhum mascote fica fora** (nunca deixar mascotes cochilando no jardim em `idle`).
- **Verdade dos estados:** processo aberto ou sessão `idle` **não** tira mascote da cabana. Desconhecido (`unknown`) nunca é exibido como trabalhando nem como concluído.
- **Uma presença por provedor:** múltiplas sessões de Claude mostram 1 **Clawd** fora (contagem vai no painel) e encerrar 1 sessão não recolhe o mascote enquanto outra sessão do mesmo provedor estiver ativa.
- **Identidade original dos moradores:** usar os sprites originais autorizados de **Clawd**, **Cloudling** e **Atom** sem recolori-los; transparência da cabana e objetos é **PNG RGBA com canal alfa real** (jamais xadrez desenhado).
- **Interatividade segura (`D3`):** clique na cabana abre o painel; clique no mascote/sessão foca a janela; cards locais opcionais de permissão/conclusão exigem clique explícito. Nunca aprovar permissões sozinho, nunca ler segredos/prompts desnecessários, zero telemetria e zero canais remotos.
- **Hooks reversíveis:** sempre criar backup antes de tocar em `~/.claude/`, `~/.codex/` ou `~/.gemini/config/hooks.json`, preservando hooks e skills preexistentes do usuário.
- **Zero GitHub Actions:** proibido criar ou usar `.github/workflows/`. Testes, auditorias, builds NSIS e `gh release` rodam **100% localmente via CLI**.
- **Idioma e escopo:** UI, commits e docs **100% em pt-BR**. Trabalhe **uma subetapa por vez** e só marque `[x]` com evidência real executada.

## Comandos Locais Principais

```powershell
npm install          # instala dependências e verifica Electron
npm test             # roda toda a suíte automatizada (test/run-tests.js)
npm start            # inicia o aplicativo localmente (após G0.3 isolar porta/appId)
npm run build:win:x64 # empacota instalador NSIS Windows x64 localmente
```
