# Kickoff do Agent Habitat — Cozy Cottage

Status: concluído, confirmado pelo proprietário em 2026-11-24 · Início: 2026-11-24
Objetivo: alinhar decisões fundacionais entre o pacote de concepção `Agent_Habitat_Cozy_Cottage_v0.1.zip` e a base real `playertwo1/clawd-on-desk` (`v1.6.4`, commit `e216f924`).

## Contexto levantado (fatos, não decisões)

- O pacote `Agent_Habitat_Cozy_Cottage_v0.1.zip` partia do zero e propunha um ADR em Tauri 2 + Rust + Canvas 2D com modo estritamente passivo/somente leitura.
- Na prática, o fork `playertwo1/clawd-on-desk` (`v1.6.4`, commit `e216f924`) já entrega prontos no Windows:
  - Overlay transparente de janela dupla (`win` click-through + `hitWin` com `setShape`, `WS_EX_NOACTIVATE`, multi-monitor, DPI e detecção de tela cheia);
  - Hooks e monitores reais para **Claude Code** (CLI + Claude Desktop aba Code, com foco de 2ª instância), **Codex** (hooks oficiais + fallback JSONL) e **Antigravity** (`~/.gemini/config/hooks.json` com wrapper PowerShell anti-BOM);
  - Cards locais de permissão (`Allow`/`Deny`), cards de pergunta/fim de turno e tarefa concluída (auto-close configurável), além de clique para focar a janela da sessão;
  - Assets originais de **Clawd** e **Cloudling** já empacotados em `themes/`.
- O repositório de referência do **Atom** (`https://github.com/Arnav8452/atom`, commit `aae0dfe8603a82a699b210dd8c8ca717ebea31f1`) possui código sob licença MIT; os direitos das artes seguem autorização direta declarada pelo proprietário.

## Decisões

### D1 — Nome oficial e diretório local
- **Pergunta:** qual será o nome oficial do projeto e da pasta em `C:\Users\notefael\projetos\`?
- **Decisão:** **Agent Habitat** (subtítulo da edição inicial: *Cozy Cottage Edition*), pasta local `C:\Users\notefael\projetos\agent-habitat` e repositório `playertwo1/agent-habitat`.
- **Por quê:** preserva o nome conceitual do kit v0.1 e permite novos temas de habitat no futuro (P2) sem engessar a marca.
- **Descartado:** `cozy-cottage`, `agent-cottage`.
- **Difícil de reverter:** não.

### D2 — Base técnica (Stack e herança)
- **Pergunta:** construir do zero em Tauri 2 + Rust, evoluir no próprio `clawd-on-desk`, ou iniciar novo repositório sobre a base Electron do `playertwo1/clawd-on-desk`?
- **Decisão:** novo projeto clonado a partir do `playertwo1/clawd-on-desk` (`e216f924`), reaproveitando o motor Electron, overlay duplo transparente, hooks/monitores, foco de janela e updater. O código-fonte permanece sob **AGPL-3.0**.
- **Por quê:** evita reescrever meses de engenharia delicada de Windows (click-through, `WS_EX_NOACTIVATE`, BOM em pipes PowerShell, foco de múltiplas instâncias e hooks reversíveis), concentrando o esforço no diferencial real: a cena multi-personagem da cabana e o enxugamento de escopo.
- **Descartado:** Tauri 2 do zero (reescreveria o que já está validado); alterar direto `playertwo1/clawd-on-desk` (quebraria quem usa o pet individual `1.6.4`).
- **Difícil de reverter:** sim (define stack Electron/Node e licença AGPL-3.0).

### D3 — Nível de interatividade no MVP
- **Pergunta:** seguir o modo 100% passivo do ZIP ou manter os recursos interativos locais já polidos no `clawd-on-desk`?
- **Decisão:** **Habitat interativo enxuto** — cena viva da cabana + clique para focar terminal/IDE + painel sob demanda + cards locais opcionais de permissão (`Allow`/`Deny`), pergunta de fim de turno e tarefa concluída herdados do `playertwo1/clawd-on-desk`. Sem aprovação automática não solicitada e sem canais remotos (Telegram, Feishu, Slack, PWA mobile saem do caminho principal).
- **Por quê:** preserva a utilidade diária que o proprietário já validou nos commits `adc00498`..`142c2003` sem inflar a interface com canais externos.
- **Descartado:** estritamente passivo sem cards locais; manter Telegram/Feishu/PWA no MVP.
- **Difícil de reverter:** não.

### D4 — Agentes e superfícies de validação no MVP
- **Pergunta:** quais agentes e superfícies entram no escopo de primeira classe?
- **Decisão:** exatamente os **3 moradores da cabana** nas superfícies Windows reais do proprietário:
  1. **Claude (`Clawd`):** Claude Code CLI + Claude Desktop (aba Code);
  2. **Codex (`Cloudling`):** Codex CLI + extensão/app Desktop;
  3. **Antigravity (`Atom`):** Antigravity IDE + Antigravity CLI (`agy`).
- **Por quê:** fecha exatamente a matriz de 8 combinações (`000` a `111`) sem poluir cena, painel ou configurações com 26 agentes não utilizados. WSL, Remote SSH e demais agentes ficam fora do MVP.
- **Descartado:** manter os outros 26 agentes visíveis na UI; incluir WSL/Remote SSH no P0.
- **Difícil de reverter:** não (adaptadores legados podem ficar desativados/isolados antes de poda definitiva).

### D5 — Sprites dos 3 personagens
- **Pergunta:** redesenhar os personagens ou usar os originais autorizados?
- **Decisão:** usar os **assets originais** de **Clawd** e **Cloudling** (já presentes no acervo herdado) + importar os **sprites originais do Atom** (`Arnav8452/atom`), compondo-os com pivôs e escala harmônicos junto às camadas PNG RGBA da cabana Cozy Cottage.
- **Por quê:** respeita a identidade visual autoral de cada mascote e acelera o Gate G1.
- **Descartado:** redesenhar os 3 do zero antes do G1.
- **Difícil de reverter:** não.

### D6 — Pipeline de arte da cabana (Cozy Cottage) e objetos
- **Pergunta:** como produzir as camadas visuais da cabana e das estações?
- **Decisão:** **pipeline assistido no projeto** — gerar/extrair camadas modulares em **PNG RGBA com canal alfa real** (cabana apagada/acesa, porta aberta/fechada, fumaça da chaminé, luz âmbar, bancadas e props de cada estação) guiadas pelas 7 pranchas conceituais e validar juntos em tela real no Windows (fundos claro/escuro e escalas DPI).
- **Por quê:** garante transparência real (nunca xadrez desenhado) e controle fino de camadas sem exigir que tudo seja vetorizado manualmente em SVG.
- **Descartado:** depender apenas de placeholders geométricos; converter toda a cabana em SVG puro.
- **Difícil de reverter:** não.

### D7 — Repositório Git, visibilidade e política zero GitHub Actions
- **Pergunta:** visibilidade inicial do repositório e fluxo de build/release?
- **Decisão:** repositório **privado** em `https://github.com/playertwo1/agent-habitat`, com **zero GitHub Actions** (`.github/workflows` removido na origem). Testes, builds NSIS e publicações de release ocorrem **100% localmente via CLI**.
- **Por quê:** protege os assets durante o inventário formal de atribuições/autorizações (G0) e cumpre a diretriz estrita `no-github-actions`.
- **Descartado:** repositório público imediato antes do inventário G0; manter workflows herdados do upstream.
- **Difícil de reverter:** não.

### D8 — Idioma e arquitetura documental
- **Pergunta:** idioma do produto/docs e organização dos arquivos?
- **Decisão:** **100% pt-BR** (interface do Habitat e documentação), seguindo o padrão modular enxuto:
  - Raiz: `README.md`, `CHANGELOG.md`, `AGENTS.md`, `LICENSE`, `NOTICE.md`;
  - `docs/`: `STATE.md`, `PRODUCT.md`, `DESIGN.md`, `ARCHITECTURE.md`, `ROADMAP.md` (índice), `REFERENCIAS_GITHUB.md`;
  - `docs/roadmap/`: um arquivo curto por gate (`g0` a `g5` + `p1-pos-mvp`);
  - `docs/questionario/`: decisões confirmadas com o proprietário;
  - `docs/referencias_visuais/`: as 7 pranchas conceituais do pacote v0.1;
  - `docs/herdado-clawd/`: documentação original arquivada para consulta técnica do motor herdado.
- **Por quê:** mantém contexto curto para agentes de IA (lê-se o índice e apenas o gate ativo) sem perder referência histórica.
- **Descartado:** tudo empilhado na raiz; interface multilíngue no MVP.
- **Difícil de reverter:** não.
