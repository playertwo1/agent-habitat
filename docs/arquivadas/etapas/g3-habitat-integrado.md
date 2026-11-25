# Gate G3 — Integração Completa do Habitat, Painel pt-BR e Cards Locais

**Esforço:** G (dividido em G3.1–G3.4) · **Depende de:** [G1](g1-cabana-e-demo.md) e [G2](g2-agregador-e-adaptadores.md) · **Próximo:** [G4 — Hardening Windows](g4-hardening-windows.md)

## Objetivo
Ligar o snapshot real dos 3 provedores à cena da Cozy Cottage, ajustar a máscara de clique (`hitWin`) para abraçar apenas a cabana e os mascotes visíveis, entregar o painel compacto sob demanda e os Ajustes **100% em pt-BR**, e conectar o foco de janela + cards locais opcionais (`D3`).

## Subetapas

### G3.1 — Cena ligada a eventos reais e `hitWin` dinâmico (`T21`)
- [x] Conectar `provider-aggregator` → `scene-machine` → `renderWin` e atualizar dinamicamente a região `setShape` do `hitWin` conforme moradores saem/entram (cabana sempre clicável; estações vazias continuam 100% click-through).
- [x] Garantir modo "atravessar todos os cliques" (`clickThrough`) com restauração imediata pelo menu da bandeja.

### G3.2 — Painel compacto do Habitat e menu de bandeja em pt-BR (`D8`)
- [x] Ao clicar na cabana: abrir painel escuro acolhedor (`#24232A` / `#F6EADB` / destaque `#FFC45C`) mostrando os 3 provedores, saúde da integração (`ativo`, `ocioso`, `indisponível`), contagem de sessões, nome opcional do projeto, horário do último evento e botão de foco por sessão.
- [x] Ao clicar num mascote fora da cabana: abrir o painel filtrado naquele morador (ou focar direto quando houver 1 única sessão ativa, conforme preferência).
- [x] Traduzir e enxugar menu de bandeja e janela de Ajustes para **100% pt-BR** (escala, sempre no topo, ocultar em tela cheia, movimento reduzido, iniciar com o Windows desligado por padrão, cards locais, modo Demo e diagnóstico/instalação de integrações).

### G3.3 — Foco de janela e cards locais opcionais (`D3`, `T12`)
- [x] Validar clique para focar terminal / IDE / Claude Desktop (incluindo 2ª instância) a partir do painel e dos cards.
- [x] Posicionar os cards locais opcionais (permissão `Allow`/`Deny`, pergunta de fim de turno e tarefa concluída com auto-close) ancorados de forma harmoniosa à cabana sem cobrir os moradores nem roubar foco.

### G3.4 — Teste real simultâneo com os 3 agentes (Checkpoint do dono)
- [x] Executar sessões reais simultâneas de Claude + Codex + Antigravity (`111`), encerrar uma por vez até `000` e validar fluidez visual e interações (validado ao vivo pelo dono e em suíte E2E em 2026-11-25).

## Critério de Saída (Checkpoint G3)
- [x] Nenhuma tela ou menu restante em outro idioma ou citando recursos removidos.
- [x] Fluxo completo `000 → 111 → 000` com agentes reais validado na máquina Windows. Concluído em 2026-11-25.
