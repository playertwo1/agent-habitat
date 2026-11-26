# P2 — Novos temas de habitat, animações e ajudantes por tema
Status: concluído · Início: 2026-11-25
Objetivo: decidir escopo e método de arte do P2 antes de montar o roadmap da etapa.

## Decisões
### D1 - Por onde começar o P2
- Pergunta: qual das 3 frentes do P2 (temas, 4º morador, ponte com o Lumen) entra primeiro.
- Decisão: **novos temas de habitat**, mais **animações para os moradores** e **sprites novos para os subagentes**. O 4º morador e a ponte com o Lumen continuam parqueados.
- Por quê: resultado visível e reaproveita o manifesto da Cozy Cottage.
- Descartado: 4º morador e Lumen nesta etapa.
- Difícil de reverter: não

### D2 - Quais temas
- Decisão: **Japanese Garden** e **Fantasy Village**, nessa ordem. **Space Habitat** fica para depois.
- Por quê: escolha do dono ("o 1 e o 3").
- Difícil de reverter: não

### D3 - Animações dos moradores
- Decisão: **reaproveitar clipes originais ainda sem uso** (Atom tem 19 pares; Clawd e Cloudling têm outros SVGs) **e movimento por código** (passeio, pulinho, aceno), sem recolorir nem redesenhar Clawd, Cloudling e Atom.
- Por quê: preserva a identidade dos moradores (regra do `AGENTS.md`).
- Descartado: desenhar quadros novos dos moradores; só por código.
- Difícil de reverter: não

### D4 - Ajudantes de subagente
- Decisão: **um ajudante por tema**, com mais quadros (4, com andar), mantendo a cor do provedor por linha da folha. Cozy Cottage mantém os cogumelinhos.
- Descartado: manter só cogumelos; um desenho por provedor igual em todos os temas.
- Difícil de reverter: não

### D5 - Jardim e luz nos novos temas
- Decisão: cada tema tem **a sua versão dos 4 objetos** (banco, fogueira, gatinho, caixa de correio) e usa a **mesma luz dia/noite** e o mesmo seletor em Ajustes.
- Difícil de reverter: não

### D6 - Origem da arte
- Decisão: **o Gemini desenha, a partir de prompts que eu escrevo**; o dono pede a imagem e me entrega os arquivos. Eu escrevo o pacote de prompts (com guia de posições por tema), e um script pós-processa as saídas: remove o fundo de cor chapada, redimensiona sem suavizar para o tamanho exato e grava **PNG RGBA com alfa real** (nunca xadrez desenhado), e valida contra o manifesto.
- Por quê: o dono prefere a arte do Gemini; o script garante as regras de transparência e alinhamento.
- Descartado: eu desenhar tudo por script (cenários inteiros ficariam mais simples que a cabana); o dono fornecer tudo sem prompts.
- Difícil de reverter: não

### D7 - Variedade de clipes e movimento por código (P2.4)
- Decisão: variar **todos os estados exceto erro e aprovação** (inclusive esperando) com clipes originais; clipe de **delegar** quando há ajudante ativo; movimento por código: **pulinho ao concluir, passeio curto no trabalho e virar para olhar em volta**.
- Por quê: escolha do dono; erro e aprovação ficam fixos por fidelidade ao estado.
- Difícil de reverter: não

## Em aberto
- Como o tema é escolhido: proposta (assumida até você dizer o contrário) = seletor em Ajustes, troca ao vivo sem reiniciar, padrão Cozy Cottage, escolha salva em `prefs.json`.
- Lista exata de camadas por tema e tamanhos (assumido o mesmo conjunto da Cozy Cottage: fundo, casa, primeiro plano, porta em 4 quadros, fumaça, 3 adereços de estação, luzes âmbar, folha de objetos, folha de ajudantes).
- Quais clipes não usados de Clawd, Cloudling e Atom viram animações novas (levantar nos arquivos).

## Próximos passos
1. Feito em 2026-11-25: [roadmap do P2](../roadmap/p2-novos-temas.md) (P2.1 infra, P2.2 Japanese Garden, P2.3 Fantasy Village, P2.4 animações) e [pacote de prompts do Gemini](../arte-p2/prompts-gemini.md) com guia de layout gerado por `tools/gerar-guia-tema.py`.
2. Dono pede as 8 peças de cada tema ao Gemini e salva em `assets-novos/<tema>/`.
3. Executar P2.1 (infra e script de pós-processamento).
