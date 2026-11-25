# Gate G0 — Descoberta, Licenças e Isolamento da Base

**Esforço:** M · **Depende de:** Kickoff concluído (`D1`–`D8`) · **Próximo:** [G1 — Cabana e Demo](../../roadmap/g1-cabana-e-demo.md)

## Objetivo
Inspecionar `Arnav8452/atom` (sprites originais e mecanismo de detecção do Antigravity IDE), comprovar na máquina Windows real como cada uma das 6 superfícies alvo reporta atividade, registrar formalmente licenças/atribuições e isolar a identidade técnica do `agent-habitat` para rodar lado a lado sem colidir com o `clawd-on-desk`.

## Subetapas

### G0.1 — Auditoria do `Arnav8452/atom` e inventário de artes
- [x] Inspecionar `https://github.com/Arnav8452/atom` no commit `aae0dfe8603a82a699b210dd8c8ca717ebea31f1`: listar arquivos de sprites do **Atom**, dimensões, animações disponíveis e como o projeto detecta atividade do Antigravity IDE.
- [x] Inventariar os arquivos exatos de **Clawd** (`themes/clawd`, `assets/svg`) e **Cloudling** (`themes/cloudling`) que serão usados no Habitat.
- [x] Registrar em `docs/discovery-g0.md` e `NOTICE.md` os autores, licenças de código (`AGPL-3.0-only` + `MIT`) e escopo das autorizações de arte declaradas pelo proprietário.

### G0.2 — Matriz real das 6 superfícies no Windows
- [x] Testar e documentar em `docs/discovery-g0.md` os eventos reais emitidos por:
  1. **Claude Code CLI** (hooks HTTP/command);
  2. **Claude Desktop — aba Code** (`CLAUDE_CODE_ENTRYPOINT=claude-desktop` + PID);
  3. **Codex CLI** (hooks oficiais + JSONL `~/.codex/sessions/rollout-*.jsonl`);
  4. **Codex Desktop / extensão IDE** (verificar se compartilha hooks/JSONL do CLI ou requer detector adicional);
  5. **Antigravity CLI (`agy`)** (`~/.gemini/config/hooks.json`);
  6. **Antigravity IDE** (verificar se dispara `~/.gemini/config/hooks.json`, logs de sessão ou mecanismo estilo Atom, diferenciando janela aberta ociosa de execução real).

### G0.3 — Isolamento de identidade do aplicativo (`agent-habitat` vs `clawd-on-desk`)
- [x] Atualizar `package.json` e constantes centrais de configuração (`appId: com.playertwo1.agent-habitat`, `productName: Agent Habitat`, protocolo `agent-habitat://`, diretório userData próprio e faixa de portas loopback dedicada `23433–23437`) para que abrir o `agent-habitat` em dev/instalado não colida com o `clawd-on-desk`.
- [x] Definir estratégia limpa de coexistência/migração de hooks nos arquivos `~/.claude/settings.json`, `~/.codex/` e `~/.gemini/config/hooks.json` (marcador próprio `agent-habitat`, preservando entradas existentes; `AGENT_HABITAT_SYNC_HOOKS=0` por padrão até o G2).
- [x] Rodar `npm test` local e garantir suíte verde nos contratos adaptados após o rebranding estrutural.

## Critério de Saída (Checkpoint G0)
- [x] `docs/discovery-g0.md` preenchido com evidências reais por superfície e links de arquivo/linha.
- [x] Sprites originais do **Atom** copiados para `assets/originals/atom/` com atribuição registrada.
- [x] `npm start` sobe o esqueleto isolado do **Agent Habitat** na porta `23433` (`~/.agent-habitat/runtime.json` + `%APPDATA%\agent-habitat`) sem conflitar com o `clawd-on-desk` nem tocar nos hooks globais, e `npm test` executado localmente.
