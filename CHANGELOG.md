# Changelog

Todas as mudanças relevantes do **Agent Habitat** são documentadas neste arquivo, seguindo o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Concluído (Gate G2 — 2026-11-25)
- **G2.1 — Agregador por provedor e invariantes (`T09`–`T19`):** implementado em `src/habitat/provider-aggregator.js`, agregando sessões por provedor (`claude`, `codex`, `antigravity`) com prioridade correta e distinção estrita entre `idle` (dentro) e tarefa ativa (fora).
- **G2.2 — Adaptadores Windows e Runtime (`D4`):** criados `src/habitat/habitat-adapters.js`, `hooks/agent-habitat-hook.js`, `src/habitat/habitat-hook-sync.js` (schemas reais Claude/Codex/Antigravity sem tocar em `$HOME` por padrão) e `src/habitat/habitat-runtime.js` (`/habitat/event`, `/habitat/snapshot`), além de blindagem do sync legado no `server.js`.
- **G2.3 — Poda MVP e isolamento (`D3`, `D4`):** implementado `src/habitat/mvp-scope.js` e bloqueio de canais remotos/agentes extras no `main.js`.

### Planejado (Próximo Gate — G3)
- Conectar telemetria real à cabana, `hitWin` dinâmico, painel sob demanda em pt-BR com opt-in de hooks e validação ao vivo nos 3 apps reais.

### Concluído (Gate G1.1–G1.3 — 2026-11-25)
- **G1.1 — Camadas modulares da Cozy Cottage e props (`D6`):** produção e validação das camadas PNG RGBA em `assets/habitat/cozy-cottage/` (base de jardim, estrutura, janelas amber/night, porta com estados de transição, chaminé com fumaça e lampião, e props das 3 estações) mais `habitat-manifest.json` com limites e âncoras validados por `T26`.
- **G1.2 — Integração visual dos 3 moradores originais (`D5`):** mapeamento dos clipes originais de Clawd, Cloudling e Atom com ordenação Z por pivô de pé e nitidez pixel-art nas escalas `1×`, `1.5×` e `2×`.
- **G1.3 — Máquina de Cena e `Demo Mode` (`T01`–`T08`, `T18`, `T28`):** implementação de `src/habitat/scene-machine.js` com fila única de porta e retomada no retorno, e renderizador + janela `Demo Mode` `[DEMO]` com script de captura automatizada de 11 previews (`tools/capture-habitat-g1-previews.js`).

### Concluído (Gate G0 — 2026-11-24)
- **G0.1 — Auditoria do `Arnav8452/atom` e inventário de artes:** importação de 19 pares `.webp`/`.json` e `LICENSE-ATOM.txt` para `assets/originals/atom/`, registro de atribuições e licenças em `NOTICE.md` e `tools/repository-asset-policy.json`, e inventário de Clawd (50 SVGs + `themes/clawd/theme.json`) e Cloudling (28 SVGs + 1 PNG + `themes/cloudling/theme.json`).
- **G0.2 — Matriz comprovada das 6 superfícies Windows:** documentação em `docs/discovery-g0.md` das evidências reais e lacunas para G2 de Claude Code CLI, Claude Desktop (aba Code), Codex CLI, Codex Desktop/extensão IDE, Antigravity CLI (`agy`) e Antigravity IDE / App 2.0 (incluindo prova de `idle` vs `busy`).
- **G0.3 — Isolamento técnico de identidade e porta:** criação de `src/habitat-identity.js`, atualização de `package.json` (`agent-habitat` v`0.1.0`, `com.playertwo1.agent-habitat`, protocolo `agent-habitat://`, artefatos `Agent-Habitat`), `src/settings-window-icon.js`, `src/updater.js`, `scripts/verify-updater-metadata.js`, `src/server.js`, `src/local-server-port-hint.js` e `src/main.js` para usar portas `23433–23437`, `~/.agent-habitat/runtime.json`, `userData` próprio e `AGENT_HABITAT_SYNC_HOOKS=0` por padrão até o G2, além de `test/habitat-identity.test.js`.

### Planejado (Próximo Gate — G2)
- Agregador de 3 slots por provedor (`provider-aggregator.js`).
- Adaptadores Windows para as 6 superfícies (Claude Code/Desktop, Codex CLI/Desktop, Antigravity CLI/IDE).
- Poda de escopo MVP dos 26 agentes extras/canais remotos.

## [0.1.0-kickoff] - 2026-11-24

### Adicionado
- Criação do repositório **Agent Habitat (Cozy Cottage Edition)** a partir da base validada `playertwo1/clawd-on-desk@1.6.4` (`e216f924`).
- Registro das decisões fundacionais `D1`–`D8` em `docs/questionario/2026-11-24-kickoff-agent-habitat.md`.
- Especificação completa de produto (`docs/PRODUCT.md`), direção artística e camadas da cabana (`docs/DESIGN.md`), arquitetura técnica multi-personagem (`docs/ARCHITECTURE.md`) e inventário de referências (`docs/REFERENCIAS_GITHUB.md`).
- Roadmap modular orientado a gates de evidência (`docs/ROADMAP.md` + `docs/roadmap/g0` a `g5` e `p1-pos-mvp`) e ponto único de retomada (`docs/STATE.md`).
- Guia operacional para agentes em `AGENTS.md`, `README.md` principal em pt-BR e as 7 pranchas conceituais em `docs/referencias_visuais/`.

### Alterado
- Arquivamento dos READMEs multilíngues e guias originais do `clawd-on-desk` em `docs/herdado-clawd/` para consulta técnica preservando a raiz limpa em pt-BR.
- Remoção integral de `.github/workflows/` e adaptação dos testes correspondentes para refletir a política de build, validação e release **100% locais via CLI (zero GitHub Actions)**.
