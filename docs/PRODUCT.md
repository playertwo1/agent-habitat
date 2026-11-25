# Produto — Agent Habitat (Cozy Cottage Edition)

## 1. Visão

Um **desktop habitat vivo e acolhedor** para Windows que mostra, sem exigir troca de janelas, quais dos seus três assistentes de programação (**Claude**, **Codex** e **Antigravity**) estão trabalhando ou pedindo atenção neste instante.

A **cabana (Cozy Cottage)** representa o lar compartilhado — nunca desaparece enquanto o widget está visível e não é um quarto agente nem um orquestrador. Os moradores só saem da cabana quando há **trabalho real confirmado** ou **intervenção pendente**; quando todos terminam, celebram brevemente, entram na cabana, a porta se fecha e a luz descansa.

## 2. Escopo do MVP (P0) — Decisões Consolidadas

Com base no [questionário de kickoff](questionario/2026-11-24-kickoff-agent-habitat.md) (`D1`–`D8`):

- **Alvo:** Windows 10/11 (x64/ARM64), instância local única, interface e docs **100% em pt-BR**.
- **Janela do Habitat:** transparente (alfa real), discreta, arrastável, escalável (`1×`, `1.5×`, `2×` ou ajuste fino), `always-on-top` configurável, ocultação automática opcional em tela cheia, clique-através em todas as áreas transparentes e recuperação garantida pelo ícone da bandeja (tray).
- **Três moradores fixos (1 presença visual por provedor):**
  - **Claude → Clawd** (Claude Code CLI + Claude Desktop aba Code);
  - **Codex → Cloudling** (Codex CLI + extensão/app Desktop);
  - **Antigravity → Atom** (Antigravity IDE + Antigravity CLI `agy`).
- **Interatividade enxuta (`D3`):**
  - **Clique na cabana:** abre/fecha o painel compacto do Habitat (status por provedor, contagem de sessões ativas, projeto opcional, horário do último evento, saúde da integração e atalho de foco);
  - **Clique em um mascote:** abre o painel filtrado naquele provedor ou foca diretamente a janela da sessão ativa;
  - **Cards locais opcionais (herdados e polidos da base `clawd-on-desk`):** bolha local para `Allow`/`Deny` quando o provedor suportar hook bloqueante, card de pergunta de fim de turno e card discreto de tarefa concluída com auto-close configurável;
  - **Alertas sem roubo de foco** e som desligado por padrão.
- **Modo Demonstração (`Demo Mode`):** explícito e isolado da telemetria real (selo visível `[DEMO]`), permitindo inspecionar as 8 combinações (`000` a `111`), transições de porta, pedido de atenção, erro e perda de fonte.
- **Fora do MVP:** 3D, loja, moedas/gamificação, chat embutido, LLM pago para animar mascotes, canais remotos (Telegram, Feishu, Slack, PWA mobile), WSL/Remote SSH e os outros 26 agentes secundários do upstream.

## 3. Regra de Visibilidade — As 8 Cenas Estáveis

Cada provedor tem no máximo **um mascote fora da cabana**, independentemente de quantas sessões simultâneas daquele provedor estejam abertas. Processo aberto ou sessão ociosa (`idle`) **não** conta como presença externa.

| Claude (`Clawd`) | Codex (`Cloudling`) | Antigravity (`Atom`) | Cena estável na área de trabalho |
| :---: | :---: | :---: | :--- |
| `0` | `0` | `0` | **Cabana fechada**, janelas em repouso, **nenhum mascote fora** |
| `1` | `0` | `0` | Cabana iluminada + **Clawd** na estação esquerda |
| `0` | `1` | `0` | Cabana iluminada + **Cloudling** na estação central/frontal |
| `0` | `0` | `1` | Cabana iluminada + **Atom** na estação direita |
| `1` | `1` | `0` | Cabana iluminada + **Clawd** + **Cloudling** |
| `1` | `0` | `1` | Cabana iluminada + **Clawd** + **Atom** |
| `0` | `1` | `1` | Cabana iluminada + **Cloudling** + **Atom** |
| `1` | `1` | `1` | Cabana iluminada + **Clawd** + **Cloudling** + **Atom** |

> `1` = há pelo menos uma sessão daquele provedor com **trabalho ativo confirmado** ou **intervenção do usuário pendente**.
> **Regra pétrea:** nunca manter mascotes cochilando fora da cabana quando todos os agentes estiverem inativos (a última vinheta da prancha `06_estados_habitat.png` é apenas inspiração artística descartada).

## 4. Semântica de Estados e Prioridade por Provedor

Quando um provedor possui múltiplas sessões abertas ao mesmo tempo, seu estado visual na cena é o de **maior prioridade** entre suas sessões ativas:

`needs_approval` > `waiting_input` > `busy` > `error` (com ação pendente) > `done` (transitório) > `idle` / `offline`

| Estado normalizado | Condição comprovada | Comportamento no Habitat |
|---|---|---|
| `offline` | Nenhuma sessão ativa / encerramento confirmado | Mascote dentro da cabana |
| `idle` | Sessão aberta aguardando novo prompt sem bloqueio | Mascote dentro da cabana (sessão listada apenas no painel se aplicável) |
| `busy` | Prompt em andamento, execução de ferramenta ou raciocínio ativo | Mascote sai pela porta e trabalha em sua estação |
| `waiting_input` | Pergunta explícita de fim de turno ou bloqueio aguardando resposta | Mascote fora com indicador discreto + card opcional |
| `needs_approval` | Solicitação explícita de permissão de ferramenta | Mascote fora acenando/alerta + card local de permissão (`Allow`/`Deny`) |
| `error` | Falha reportada por hook/evento | Reação curta; se exigir ação permanece fora, se terminal recolhe após transição |
| `done` | Turno/tarefa concluída e nenhuma outra sessão `busy` no mesmo provedor | Celebração curta (1–2 s) seguida de caminhada/flutuação de retorno pela porta + card opcional de conclusão |
| `unknown` | Integração indisponível, fonte perdida ou evento vencido após reconciliação | **Nunca finge trabalho**; recolhe mascote e sinaliza indisponibilidade no painel |

### Regras de transição sem falsos positivos
- Encerrar uma sessão `S1` de Claude enquanto `S2` de Claude ainda está `busy` **não** recolhe o Clawd nem dispara retorno à cabana.
- Se um novo turno começar enquanto o mascote está voltando para a porta (`entering`), a transição é interrompida suavemente e ele reassume sua estação.
- Animações específicas (leitura, construção, pesquisa) só tocam quando o evento trouxer evidência real da ferramenta/fase; na dúvida, usa-se a animação de trabalho padrão (`busy`) do morador.

## 5. Critérios de Aceitação do MVP (P0)

1. As **8 combinações (`000`–`111`)** funcionam sem sobreposição visual e com `000` exibindo estritamente cabana fechada sem personagens fora.
2. Abrir Claude Code, Codex ou Antigravity sem rodar tarefa (`idle`) **não** tira mascotes da cabana.
3. Duas sessões simultâneas do mesmo provedor mantêm o mascote ativo até a **última** terminar.
4. Clique na área transparente passa direto para o app de fundo; clique na cabana abre o painel; clique no mascote/sessão foca a janela correta (incluindo múltiplas instâncias do Claude Desktop).
5. Cards opcionais de permissão e conclusão respeitam configuração de auto-close e nunca aprovam nada sozinhos sem ação explícita do usuário.
6. Escalas de DPI Windows (`100%`, `125%`, `150%`, `200%`), múltiplos monitores e tela cheia validados sem borrão ou corte.
7. Instalação e remoção de hooks preservam configurações preexistentes do usuário com backup atômico.
8. `Demo Mode` claramente rotulado e incapaz de contaminar estado real.

## 6. Pós-MVP (P1 e P2)

- **P1:** métricas locais verificadas (cotas/recap já existentes na base onde suportado), personalização de objetos do jardim, clima/hora do dia sutil, visualização opcional de subagentes quando identificáveis.
- **P2:** novos temas de habitat (*Japanese Garden*, *Space Habitat*, *Fantasy Village*), suporte opcional a provedores extras sob demanda e ponte opcional de status com **Lumen**.
