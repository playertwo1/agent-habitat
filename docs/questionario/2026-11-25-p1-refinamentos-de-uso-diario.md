# P1 — Refinamentos de uso diário
Status: concluído · Início: 2026-11-25
Objetivo: decidir escopo, ordem e regras de cada subetapa do P1 (métricas, histórico, subagentes visuais, jardim) antes de montar o roadmap.

## Fatos levantados (código, 2026-11-25)
- Cotas reais existem para **Claude** e **Codex** (`src/state-account-quota.js`, `quota-ring`); não há dado de cota do **Antigravity**.
- Recap/métricas locais herdados em `src/recap-*.js`.
- Histórico de sessões e retomada do Claude Code em `src/session-history-loader.js` e `session-history-runtime.js`.
- O Habitat já recebe `SubagentStart`/`SubagentStop`, mas não os exibe.
- `docs/referencias_visuais/07_objetos_e_cenario.png` é referência conceitual; não há sprites RGBA dos objetos.

## Decisões
### D1 - Ordem das subetapas
- Pergunta: em que ordem fazer as 4 subetapas?
- Decisão: P1.1 Métricas verificadas, P1.2 Histórico local, P1.3 Subagentes visuais, P1.4 Personalização do jardim. Todos os 4 itens entram.
- Por quê: os dois primeiros só ligam módulos herdados ao painel (sem arte nova); os dois últimos exigem criar arte pixel art e decisões visuais.
- Descartado: começar pelo visual (subagentes/jardim).
- Difícil de reverter: não

### D2 - Métricas do Atom (Antigravity)
- Pergunta: como mostrar métricas para o provedor sem dado de cota?
- Decisão: anéis de cota reais para Claude e Codex; para o Atom, "uso observado" (contagem real de sessões e turnos de hoje vindos dos hooks), sem teto de cota.
- Por quê: o dono pediu uma estimativa; ao ser lembrado da regra "sem estimativas inventadas" do backlog, aceitou a contagem real como forma de cobrir o Atom.
- Descartado: anel de cota estimado; esconder o Atom.
- Difícil de reverter: não

### D3 - Retomada de sessões no histórico
- Pergunta: quais provedores o histórico retoma?
- Decisão: P1.2 entrega retomada do Claude (reaproveita `session-history-runtime`, que só tem `launchClaudeSession("resume")`) e lista o Codex somente leitura. Retomar o Codex vira **P1.2b**, depois de investigar o comando real de retomada no Windows.
- Por quê: o dono queria Claude e Codex; ao saber que o código herdado só cobre Claude, preferiu separar para não aumentar o risco.
- Descartado: incluir Codex já no P1.2; só listar sem retomar.
- Difícil de reverter: não

### D4 - Subagentes visuais
- Pergunta: como um subagente aparece na cabana?
- Decisão: mini-ajudantes **desenhados** (sprites novos de pixel art) por provedor, um por subagente ativo. A aparência exata não é decidível por pergunta: P1.3 começa com **protótipo visual** (folha de sprites + captura na cabana) para o dono aprovar antes de ligar aos eventos `SubagentStart`/`SubagentStop`.
- Por quê: o dono prefere o charme dos ajudantes ao indicador discreto; só é decidido vendo.
- Restrição: os sprites originais de Clawd, Cloudling e Atom não são recoloridos (regra do projeto); os ajudantes são arte nova e distinta, PNG RGBA com alfa real.
- Descartado: indicador discreto; só número no painel.
- Difícil de reverter: não

### D5 - Personalização do jardim e luz dia/noite
- Pergunta: como escolher objetos e como varia a luz?
- Decisão: seletor no painel (aba Ajustes) para ligar/desligar objetos (banco, fogueira, gatinho, caixa de correio) em **posições fixas** do jardim, salvo nas preferências; luz dia/noite pelo **relógio do Windows**, com opção de forçar. A variação vale também para o repouso `000`: a cabana segue fechada e sem ninguém fora, muda só a iluminação (exige **camadas diurnas novas**, hoje só existe `cottage-night.png`).
- Por quê: dá personalização sem virar editor livre; a regra `000` fala de cabana fechada e ninguém fora, não de a luz ser noturna.
- Restrição: a regra `000` e o teste correspondente precisam seguir verdes; objetos e camadas em PNG RGBA com alfa real, sem recolorir os moradores.
- Descartado: arrastar objetos livremente; repouso sempre noturno; deixar a luz para o P2.
- Difícil de reverter: não

### D6 - Período das métricas
- Pergunta: que períodos mostrar?
- Decisão: "hoje" e "últimos 7 dias", alternados por seletor; as cotas atuais ficam sempre à vista.
- Por quê: duas visões simples cobrem o uso diário usando o recap herdado.
- Descartado: só hoje; 30 dias.
- Difícil de reverter: não

### D7 - Publicação do P1
- Pergunta: uma release por subetapa ou uma no fim?
- Decisão: **uma release só no fim do P1** (v0.2.0 com tudo).
- Por quê: escolha do dono, menos releases.
- Salvaguarda registrada: no G5, 5 defeitos só apareceram no app instalado (nenhum teste abre o Electron). Por isso **cada subetapa é instalada localmente e conferida (porta de depuração/CDP) antes de seguir**, mesmo sem publicar.
- Descartado: release por subetapa.
- Difícil de reverter: não

## Em aberto
- Quantas sessões recentes listar e onde fica no painel (P1.2).
- Aparência dos ajudantes, limite por provedor e quando somem (decidir no protótipo do P1.3).
- Posições fixas dos objetos e horário de virada dia/noite (decidir no protótipo do P1.4).
- Como retomar sessões do Codex no Windows (investigar no P1.2b).

## Próximos passos
1. Dono confirma este entendimento.
2. Montar `docs/roadmap/p1-pos-mvp.md` como roadmap em fases: P1.1 métricas, P1.2 histórico, P1.2b retomada do Codex, P1.3 subagentes (começa por protótipo), P1.4 jardim (começa por protótipo), cada uma com pré-requisito e checkpoint de aceite.
3. Executar uma subetapa por vez, com instalação local conferida, e publicar v0.2.0 no fim.
