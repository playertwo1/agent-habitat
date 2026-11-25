# Descoberta Técnica, Licenças e Isolamento — Gate G0

**Data:** 2026-11-24 · **Escopo:** Auditoria de artes e licenças (`G0.1`), matriz comprovada das 6 superfícies no Windows (`G0.2`) e isolamento técnico em relação ao `clawd-on-desk` (`G0.3`).

---

## 1. Inventário de Artes e Licenças

| Personagem / Origem | Arquivos e Localização | Especificação Técnica | Licença / Autorização |
|---|---|---|---|
| **Clawd** (base `playertwo1/clawd-on-desk`) | 50 SVGs em `assets/svg/clawd-*.svg` + manifesto `themes/clawd/theme.json` | Vetores SVG escaláveis utilizados como tema padrão herdado | Código `AGPL-3.0-only`; artes com autorização obtida pelo proprietário |
| **Cloudling** (tema incluído no repositório) | 28 SVGs + 1 PNG em `themes/cloudling/assets/` + manifesto `themes/cloudling/theme.json` | Sprites SVG + asset auxiliar PNG para estados/animações | Autorização de arte obtida pelo proprietário; notice auxiliar em `NOTICE.md` |
| **Atom** (`Arnav8452/atom` @ `aae0dfe8603a82a699b210dd8c8ca717ebea31f1`) | 19 pares `.webp` + `.json` + `LICENSE-ATOM.txt` em `assets/originals/atom/` | Spritesheets `.webp` Lossless (`150x120` por frame em grade de 10 colunas) com metadados de timing/frames em `.json` | Sprites originais do Atom retidos sob autorização obtida pelo proprietário; metadados/ferramental de referência sob licença `MIT` (`NOTICE.md` e `assets/originals/atom/LICENSE-ATOM.txt`) |

### Registros de Licença e Política de Ativos

- **Código da aplicação:** `AGPL-3.0-only` (`package.json`), mantendo compatibilidade com o upstream `clawd-on-desk` e bibliotecas `MIT` listadas em `NOTICE.md` (Fluent Emoji, Lobe Icons, `qrcode-generator`, metadados do `Arnav8452/atom` e áudios CC0).
- **Política de repositório (`tools/repository-asset-policy.json`):** `assets/originals/**` classificado como `source-of-truth` (`packaged: false`) até a conversão/empacotamento para os estados da Cozy Cottage no **Gate G1**.

---

## 2. Análise Técnica do `Arnav8452/atom` e Reaproveitamento

### Como o `Arnav8452/atom` funciona

1. **Plugin e hooks do Antigravity (`plugin.json` e `hooks.json`):** registra 6 eventos de ciclo de vida do agente. Regra crítica observada: o hook de `PreToolUse` **não deve imprimir em `stdout`**, evitando bloquear ou corromper a execução de ferramentas no host.
2. **Estado local em disco (`~/.antigravity-atom/`):** mantém arquivos `convs/*.json` por conversa, `emotion.json` para estado emocional e `limits.json` para telemetria/limites.
3. **Transporte IPC:** utiliza socket local / UDP para notificar mudanças rápidas de estado entre scripts auxiliares e o overlay visual.
4. **Injeção via CDP (`atom_launch.py` + `atom_inject.js`):** lança ou conecta na IDE Desktop via Chrome DevTools Protocol para injetar JS diretamente na interface da IDE.

### O que aproveitamos (e o que descartamos)

- **Aproveitado:**
  - Os 19 pares originais `.webp` + `.json` do **Atom** em `assets/originals/atom/` como matéria-prima oficial para os sprites do Habitat no **Gate G1**.
  - As lições práticas dos hooks do Antigravity (especialmente `PreToolUse` silencioso em `stdout` e mapeamento de eventos reais emitidos pelo executor de hooks do Antigravity).
- **Descartado:**
  - **Zero dependência de Python** (`atom_launch.py`) e **zero injeção de JS via CDP** (`atom_inject.js`) na IDE Desktop. A detecção do Agent Habitat opera 100% por hooks nativos, arquivos de sessão e inspeção local passiva no Windows.

---

## 3. Matriz Comprovada das 6 Superfícies Windows + Lacunas para G2

| # | Superfície | Binários / Origem Comprovada | Mecanismo e Arquivos de Estado / Código | Lacunas Identificadas para G2 |
|---|---|---|---|---|
| **1** | **Claude Code CLI** | `~\.local\bin\claude.exe` (`2.1.331`) e `%APPDATA%\npm\claude.cmd` (`2.1.330`) | `~\.claude\settings.json` com 19 chaves de hook; código em `hooks/install.js:78-108,174-243,1309-1318` e `agents/claude-code.js:7-37` | Suportar `TeammateIdle` e `ElicitationResult`; fallback de detecção quando o binário está fora do `PATH` (`~\.local\bin\claude.exe`) |
| **2** | **Claude Desktop (aba Code)** | MSIX Appx `Claude_pzs8sxrjxfjjc` v`6.28899.6.0` (`claude.exe`, `cowork-svc.exe`, `claude-ssh-broker.exe`) | `hooks/clawd-hook.js:43-47,70-77,743-751`, `src/server-route-state.js:64-75,422,1291`, `src/session-focus.js:177-184`, `src/state-stale-cleanup.js:95-105,256-272` | Confirmar em runtime o alcance do pacote MSIX v`6.28899.6.0` a `~\.claude\settings.json` e a emissão de `CLAUDE_CODE_ENTRYPOINT=claude-desktop` |
| **3** | **Codex CLI** | `%LOCALAPPDATA%\Programs\OpenAI\Codex\bin\codex.exe` e `~\.local\bin\codex.cmd` (`codex-cli 0.172.0`) | `~\.codex\hooks.json` com 12 chaves; logs `~\.codex\sessions\rollout-*.jsonl`; código em `hooks/codex-install.js:20-41`, `hooks/codex-install-utils.js:37-48`, `agents/codex.js:8-62`, `agents/codex-log-monitor.js:1-299` | Suportar `SubagentStart` e `SubagentStop`; descoberta fora do `PATH` |
| **4** | **Codex Desktop / Extensão IDE** | MSIX Appx `OpenAI.Codex_2p2nqsd0c76g0` v`26.1117.4957.0` rodando `ChatGPT.exe` + `app\resources\codex.exe` (`app-server 0.171.0-alpha.13.2`) | Emite em `~\.codex\sessions\rollout-*.jsonl` (`originator`: `Codex Desktop`, `codex_work_desktop`, `orca_desktop`); `hooks/codex-originator.js:8-11`, `hooks/codex-hook.js:423-429,837-899`, `src/state-stale-cleanup.js:185-195` | Reconhecer `ChatGPT.exe` no foco de janela, avaliar `orca_desktop` e confirmar disparo de `hooks.json` vs fallback JSONL no MSIX |
| **5** | **Antigravity CLI (`agy`)** | `~\.gemini\bin\agy.exe` (`1.5.15`) + `agy_acp_server.exe` | `~\.gemini\config\hooks.json`; `hooks/antigravity-install.js:22-41,152-250`, `hooks/antigravity-hook.js:25-47,269-323`, `agents/antigravity-cli.js:4-32` | Reconhecer `agy_acp_server.exe`, avaliar `SessionStart` e fallback em `~\.gemini\antigravity-cli\brain\` |
| **6** | **Antigravity IDE / App 2.0** | App 2.0 (`%LOCALAPPDATA%\Programs\antigravity\Antigravity.exe` `2.35.1.0` + `language_server.exe` `2.35.1` com `command_hook_executor.go` comprovado disparando `~\.gemini\config\hooks.json`) e IDE (`%LOCALAPPDATA%\Programs\Antigravity IDE\Antigravity IDE.exe` `2.6.0`) | **Prova idle vs busy:** `Antigravity.exe`, `language_server.exe`, `daemon\hub_*.json` e `presence\*.lock` permanecem vivos em `idle` (personagem dentro da cabana). O estado `busy` decorre **exclusivamente** de eventos de turno (`PreInvocation`, `PostToolUse`, `Stop` não-ocioso), retornando em `PostInvocation`/`Stop` | Detector dedicado para `Antigravity.exe`, `Antigravity IDE.exe` e `language_server.exe` em `src/agent-installation-detector.js` + teste ao vivo na `Antigravity IDE.exe 2.6.0` |

---

## 4. Isolamento Técnico: `agent-habitat` vs `clawd-on-desk`

Para garantir convivência segura lado a lado em desenvolvimento e produção antes da camada de adaptadores do **G2**, o `agent-habitat` aplica os seguintes limites em `src/habitat-identity.js`, `package.json`, `src/settings-window-icon.js`, `src/updater.js`, `src/server.js` e `src/main.js`:

- **Identidade Electron e Windows Shell:** `name: "agent-habitat"`, `build.appId: "com.playertwo1.agent-habitat"`, `build.productName: "Agent Habitat"`, `WINDOWS_APP_USER_MODEL_ID = "com.playertwo1.agent-habitat"` e protocolo `agent-habitat://`.
- **Instância única e dados de usuário:** `app.requestSingleInstanceLock()` e `app.getPath("userData")` isolados em `%APPDATA%\agent-habitat` (sem compartilhar `clawd-on-desk`).
- **Portas loopback dedicadas:** faixa `23433–23437` (`HABITAT_SERVER_PORTS`) injetada em `initServer(...)` sem alterar `DEFAULT_SERVER_PORT = 23333` em `hooks/server-config.js`, preservando os contratos legados de wire.
- **Arquivo de runtime isolado:** `~/.agent-habitat/runtime.json` (`defaultHabitatRuntimeConfigPath()`), evitando leitura/escrita em `~/.clawd/runtime.json` e `~/.clawd/local-server-port.json`.
- **Proteção de hooks globais até o G2:** `shouldSyncHooksOnStartup()` retorna `false` por padrão (`AGENT_HABITAT_SYNC_HOOKS !== "1"`), bloqueando sincronização automática de `integrationSync`, `claudeSettingsWatcher`, `_syncCodexAutoStartGate` e `installTerminalFocusExtension` no startup até que o **Gate G2** introduza marcadores coexistentes próprios (`agent-habitat`).
