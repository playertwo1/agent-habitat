# Agent Habitat — Cozy Cottage Edition

**Um pequeno habitat vivo na área de trabalho do Windows que mostra, sem trocar de janela, quais dos seus agentes de IA estão trabalhando ou precisando de você.**

<p align="center">
  <img src="docs/referencias_visuais/01_visao_geral.png" width="780" alt="Conceito visual do Agent Habitat — Cozy Cottage Edition">
</p>

> **Status atual:** `0.1.0` — Gates G0 a G4 concluídos (cabana, agregador por provedor, painel, hardening Windows e hooks reversíveis). Empacotamento local do instalador em andamento no **[Gate G5](docs/roadmap/g5-release-local.md)**. Acompanhe o andamento em **[`docs/STATE.md`](docs/STATE.md)**.

---

## Como o Habitat Funciona

A **cabana (Cozy Cottage)** permanece discreta sobre o desktop, com fundo transparente real e clique-através nas áreas vazias. Dentro dela moram três companheiros independentes:

| Assistente | Morador | Superfícies suportadas (Windows) | Estação no jardim |
|---|---|---|---|
| **Claude** | **Clawd** | Claude Code CLI + Claude Desktop (aba Code) | Esquerda — livros, notebook e caneca quente |
| **Codex** | **Cloudling** | Codex CLI + extensão/app Desktop | Centro-frente — bancada, laptop `</>` e ferramentas |
| **Antigravity** | **Atom** | Antigravity IDE + Antigravity CLI (`agy`) | Direita — flutuação, livros e orbe luminoso |

### As 8 Cenas Estáveis (`000` a `111`)

Sessão aberta parada (`idle`) **não** tira ninguém de casa. Um morador só cruza a porta quando há **trabalho ativo confirmado** ou **ação sua pendente**:

| Claude | Codex | Antigravity | O que você vê na tela |
| :---: | :---: | :---: | :--- |
| `0` | `0` | `0` | Cabana fechada em repouso, **nenhum mascote fora** |
| `1` | `0` | `0` | Luz âmbar acesa + **Clawd** trabalhando |
| `0` | `1` | `0` | Luz âmbar acesa + **Cloudling** trabalhando |
| `0` | `0` | `1` | Luz âmbar acesa + **Atom** trabalhando |
| `1` | `1` | `0` | **Clawd** + **Cloudling** |
| `1` | `0` | `1` | **Clawd** + **Atom** |
| `0` | `1` | `1` | **Cloudling** + **Atom** |
| `1` | `1` | `1` | **Os três trabalhando simultaneamente** |

Quando a última tarefa termina, o morador comemora brevemente, caminha/flutua de volta pela porta arredondada e a cabana descansa.

### Interações Enxutas
- **Clicar na cabana:** abre o painel sob demanda em pt-BR (estado de cada provedor, contagem de sessões, último evento e saúde da integração).
- **Clicar num morador:** filtra as sessões daquele agente ou foca diretamente o terminal / IDE / Claude Desktop correspondente.
- **Cards locais opcionais:** bolha discreta para aprovar/negar ferramentas (`Allow`/`Deny`), responder perguntas de fim de turno ou ver avisos de conclusão — sempre locais, sem roubar foco e sem enviar nada para fora da sua máquina.

---

## Instalação (Windows)

Baixe na página de **Releases** do repositório `playertwo1/agent-habitat` a versão `v0.1.0` e escolha o instalador da sua arquitetura:

| Arquitetura | Instalador |
|---|---|
| Windows x64 (Intel/AMD) | `Agent-Habitat-Setup-0.1.0-x64.exe` |
| Windows ARM64 | `Agent-Habitat-Setup-0.1.0-arm64.exe` |

**Verifique a integridade antes de executar.** Baixe também o `SHA256SUMS.txt` da mesma release e compare o hash:

```powershell
Get-FileHash .\Agent-Habitat-Setup-0.1.0-x64.exe -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

O hash calculado deve ser idêntico ao da linha do arquivo correspondente. Se não bater, não execute o instalador.

> **Aviso:** o instalador **não é assinado** com certificado de assinatura de código. O Windows SmartScreen pode exibir um alerta ("O Windows protegeu o seu PC"). Isso é esperado nesta versão; confira o hash antes de prosseguir.

Para desinstalar, use o desinstalador do Windows (**Configurações > Aplicativos**). Antes disso, remova os conectores pelo painel (veja [Hooks: ativação e reversão](#hooks-ativação-e-reversão)): o desinstalador só limpa as entradas do Habitat em `~/.claude/settings.json` (com backup `.agent-habitat-uninstall-*.bak`) e **não** mexe em `~/.codex` nem em `~/.gemini`. Os hooks do `clawd-on-desk` nunca são removidos.

## Coexistência com o clawd-on-desk

O Agent Habitat é um app independente e pode rodar **ao mesmo tempo** que o `clawd-on-desk`. Os dois usam identificadores diferentes:

| Item | Agent Habitat | clawd-on-desk |
|---|---|---|
| Identificador do app (appId) | `com.playertwo1.agent-habitat` | `com.clawd.on-desk` |
| Portas locais | `23433`–`23437` | `23333`–`23337` |
| Arquivo de runtime | `~/.agent-habitat/runtime.json` | diretório `~/.clawd/` |
| Dados do app | `%APPDATA%\agent-habitat` | dados próprios do clawd-on-desk |
| Marcador dos ganchos no Claude Code | `agent-habitat-hook.js` | `clawd-hook.js` |

Cada app grava e remove apenas as próprias entradas. Se os dois tiverem ganchos instalados, ambos ficam registrados em `~/.claude/settings.json` lado a lado.

## Hooks: ativação e reversão

Os ganchos (hooks) são o que permite ao Habitat saber quando Claude Code, Codex e Antigravity estão trabalhando ou aguardando você. A integração é **opcional e não é ativada sozinha**.

Arquivos que o Habitat pode alterar:

| Provedor | Arquivo |
|---|---|
| Claude (Claude Code) | `~/.claude/settings.json` |
| Codex | `~/.codex/hooks.json` |
| Antigravity | `~/.gemini/config/hooks.json` |

### Ativar

1. Clique na cabana para abrir o painel do Habitat.
2. Na seção **Integração opcional por conectores**, clique em **Sincronizar Conectores (Requer Confirmação)**.
3. Confirme no diálogo.

Regras aplicadas na gravação:

- **Backup automático:** antes de alterar um arquivo cujo conteúdo mudaria, o Habitat cria ao lado dele uma cópia `<arquivo>.agent-habitat-<data-e-hora>.bak`. Se nada mudar, nenhum backup é criado.
- **Hooks e configurações existentes são preservados:** só são acrescentadas as entradas do Habitat.
- **Provedor não instalado é ignorado:** se o arquivo e a pasta do provedor (`~/.claude`, `~/.codex` ou `~/.gemini/config`) não existirem, nada é criado para ele.
- **JSON inválido não é reescrito:** o provedor é reportado com erro e o arquivo permanece como está.
- **Repetir é seguro:** executar a sincronização de novo não duplica entradas. Ela também repara entradas do Habitat que estejam ausentes ou alteradas.

### Reverter (remover os conectores)

1. Abra o painel do Habitat e clique em **Remover Conectores do Habitat**.
2. Confirme no diálogo.

O que acontece:

- São removidas **somente** as entradas cujo comando contém `agent-habitat-hook.js`. Os demais hooks e configurações são mantidos, e chaves de `hooks` que ficarem vazias são apagadas.
- Um backup `.bak` é criado antes de cada arquivo alterado.

> **Atenção:** a reversão **não copia o `.bak` de volta** automaticamente; ela remove as entradas do Habitat do arquivo atual. Para voltar um arquivo exatamente ao estado anterior, copie manualmente o `.bak` desejado por cima do original, com os agentes fechados. Os arquivos `.bak` não são apagados pelo app: remova-os quando não precisar mais deles.

### Variável `AGENT_HABITAT_SYNC_HOOKS`

- Padrão: ausente, equivalente a `0`. **Não é necessário defini-la** para usar o Habitat.
- Somente `AGENT_HABITAT_SYNC_HOOKS=1` liga a sincronização automática de integrações herdada do clawd-on-desk no startup (`src/server.js`, `src/main.js`). Essa rotina não é o instalador do Agent Habitat: os ganchos do Habitat são instalados e removidos apenas pelos botões do painel.

## Privacidade e segurança

- **Zero telemetria:** o app não envia dados para serviços externos.
- **Só local:** o servidor de estado escuta apenas em `127.0.0.1`.
- **Canais remotos desativados:** Telegram, Feishu, Slack, Discord, Remote SSH, PWA mobile e WSL remoto estão bloqueados no MVP (`src/habitat/mvp-scope.js`).
- **Nada é aprovado sozinho:** os cards opcionais de permissão só respondem a clique explícito.

## Build local (Windows)

Pré-requisitos: **Node.js `>= 22.12.0`** (o `.nvmrc` indica `24.18.0`) e **Git**. Todo o empacotamento roda localmente, sem GitHub Actions.

```powershell
# Pipeline completo de release local
pwsh scripts/release-local.ps1
```

O script executa a suíte de testes, a auditoria de assets, o build NSIS `x64` e `arm64`, a auditoria nativa dos diretórios desempacotados e gera `dist/SHA256SUMS.txt`. Ele não publica nada: a publicação é um passo manual posterior.

- `-SkipArm64`: não gera nem audita o instalador `arm64`.
- `-SkipBuild`: roda apenas testes e auditoria de assets; não gera builds, auditoria nativa nem checksums.

Os comandos individuais também estão disponíveis em `package.json`: `npm run build:win:x64`, `npm run build:win:arm64` e `npm run build:win:all`.

## Documentação do Projeto

| Documento | Conteúdo |
|---|---|
| [`docs/STATE.md`](docs/STATE.md) | Ponto único de retomada: onde estamos, próxima ação e pendências do dono |
| [`docs/PRODUCT.md`](docs/PRODUCT.md) | Visão, regras de verdade das 8 combinações, estados e critérios de aceitação P0 |
| [`docs/DESIGN.md`](docs/DESIGN.md) | Norte artístico Cozy Cottage, paleta, camadas PNG RGBA, estações e cadência |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | Arquitetura sobre a base Electron, janela dupla, máquina de cena e segurança |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | Índice dos gates `G0`–`G5`, backlog `P1/P2` e matriz de testes `T01`–`T28` |
| [`docs/REFERENCIAS_GITHUB.md`](docs/REFERENCIAS_GITHUB.md) | Fontes primárias (`clawd-on-desk`, `Arnav8452/atom`), commits e diretrizes de licenças |
| [`docs/questionario/`](docs/questionario/2026-11-24-kickoff-agent-habitat.md) | Registro das decisões `D1`–`D8` tomadas no kickoff |
| [`AGENTS.md`](AGENTS.md) | Guia operacional rápido para agentes de código |
| [`CHANGELOG.md`](CHANGELOG.md) | Histórico de entregas e mudanças |

---

## Desenvolvimento Local (Windows)

Pré-requisitos: **Node.js `>= 22.12.0`** (recomendado `24.18.0` conforme `.nvmrc`) e **Git**. Todas as validações, builds e releases são **100% locais via CLI** (zero GitHub Actions).

```powershell
# Instalar dependências
npm install

# Rodar a suíte de testes automatizados
npm test

# Iniciar em desenvolvimento
npm start

# Gerar instalador Windows x64 localmente
npm run build:win:x64
```

---

## Licença e Direitos Autorais

- **Código-fonte:** licenciado sob a **[GNU Affero General Public License v3.0](LICENSE)** (`AGPL-3.0-only`), derivado de [`playertwo1/clawd-on-desk`](https://github.com/playertwo1/clawd-on-desk) (commit `e216f924`, origem em [`rullerzhou-afk/clawd-on-desk`](https://github.com/rullerzhou-afk/clawd-on-desk)). Avisos de componentes de terceiros constam em [`NOTICE.md`](NOTICE.md).
- **Personagens e artes:** os sprites de **Clawd**, **Cloudling** e **Atom** **não** são cobertos pela licença AGPL-3.0 do código e pertencem aos seus respectivos autores/detentores (veja [`assets/LICENSE`](assets/LICENSE) e [`docs/REFERENCIAS_GITHUB.md`](docs/REFERENCIAS_GITHUB.md)). As imagens em `docs/referencias_visuais/` são pranchas conceituais de direção de arte.
- **Atom:** sprites e metadados de [`Arnav8452/atom`](https://github.com/Arnav8452/atom) (commit `aae0dfe8`), com autorização do titular do repositório; metadados sob MIT (detalhes em [`NOTICE.md`](NOTICE.md)).
- **Ícone do app:** derivado das camadas da Cozy Cottage deste projeto.
