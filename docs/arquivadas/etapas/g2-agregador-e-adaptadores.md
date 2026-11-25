# Gate G2 — Agregador por Provedor, Adaptadores Reais e Poda de Escopo

**Esforço:** M · **Depende de:** [G0](g0-descoberta-e-base.md) (pode correr em paralelo parcial com G1.1) · **Próximo:** [G3 — Habitat Integrado](g3-habitat-integrado.md)

## Objetivo
Transformar o gerenciamento de estado herdado (que reduzia tudo a 1 pet global) num **agregador de 3 provedores independentes** (`claude`, `codex`, `antigravity`), completar os adaptadores das superfícies reais descobertas no G0 e podar da execução ativa os 26 agentes extras e canais remotos fora do MVP.

## Subetapas

### G2.1 — Agregador por provedor e invariantes de sessão (`T09`–`T19`)
- [x] Criar `src/habitat/provider-aggregator.js` sobre o store de sessões: agrupa sessões por provedor (`claude`, `codex`, `antigravity`), calcula prioridade (`needs_approval > waiting_input > busy > error > done > idle/offline`) e distingue estritamente sessão `idle` (dentro da cabana) de sessão com tarefa ativa (fora da cabana).
- [x] Cobrir com testes automatizados (`T09` a `T19`): duas sessões do mesmo provedor, encerramento parcial, deduplicação, eventos atrasados, reconciliação por morte de PID (`T16`) e fonte indisponível `unknown` (`T17`).

### G2.2 — Adaptadores das 3 famílias no Windows (`D4`)
- [x] **Claude (`Clawd`):** validar hooks do Claude Code CLI + Claude Desktop (aba Code) alimentando o slot `claude`.
- [x] **Codex (`Cloudling`):** validar hooks oficiais + monitor JSONL alimentando o slot `codex` tanto na CLI quanto na extensão/app Desktop.
- [x] **Antigravity (`Atom`):** validar hooks de `~/.gemini/config/hooks.json` (`agy`) + adaptador/monitor da superfície **Antigravity IDE** conforme evidência do G0.2, alimentando o slot `antigravity`.

### G2.3 — Poda limpa de escopo (`D3`, `D4`)
- [x] Desligar do registro ativo e das telas os 26 agentes fora do escopo e os canais remotos (Telegram, Feishu/Lark, Slack, Remote SSH, PWA mobile), mantendo o código enxuto e sem conexões externas.

## Critério de Saída (Checkpoint G2)
- [x] Suíte automatizada cobrindo `T09`–`T19` verde (`node --test: habitat-provider-aggregator.test.js, habitat-adapters.test.js, habitat-g2-e2e.test.js — 73 testes verdes na bateria Habitat + build/start-http e 690 testes server-* sem falhas`).
- [x] Teste local comprovando que abrir e rodar tarefas reais em Claude, Codex e Antigravity atualiza o snapshot dos 3 slots independentemente (validado via adaptadores e loopback HTTP / snapshot ao vivo). Concluído em 2026-11-25.
