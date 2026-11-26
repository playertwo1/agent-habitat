# Pacote de prompts para o Gemini — temas do P2

Para pedir a arte dos temas **Japanese Garden** e **Fantasy Village** (decisão D6 do [questionário do P2](../questionario/2026-11-25-p2-novos-temas.md)). Cada tema tem **8 peças**; cada peça é um prompt para colar no Gemini **com as imagens de referência anexadas**.

## Como usar

1. Anexe sempre as duas imagens desta pasta: [`guia-layout.png`](guia-layout.png) (onde ficam casa, porta, fumaça, estações e terreno) e [`referencia-cozy-cottage.png`](referencia-cozy-cottage.png) (o estilo a seguir; fundo magenta = transparente).
2. Cole primeiro o **Bloco de estilo** (abaixo) e depois o prompt da peça. Peça uma peça por vez; na peça 2 em diante, anexe também a imagem aprovada da peça 1, para manter o mesmo cenário.
3. Salve cada resultado como `assets-novos/<tema>/<codigo>.png` (ex.: `assets-novos/japanese-garden/A1-base.png`) e me avise. Não precisa redimensionar nem tirar o fundo: o script do P2.1 faz isso.
4. Se o Gemini errar o posicionamento ou o estilo, responda no mesmo chat apontando o erro (ex.: "a casa está 30% maior que o retângulo vermelho do guia"); não recomece do zero.

**Limite honesto:** modelos de imagem não desenham pixel art com grade exata. O script reduz a imagem ao tamanho certo e limita as cores, mas pode precisar de uma segunda rodada. O mais importante para o alinhamento é a **posição** de casa, porta, estações e terreno.

## Bloco de estilo (cole antes de cada peça)

> Pixel art 2D, estilo "cozy" acolhedor, visão frontal levemente de cima (como a imagem de referência anexada), contorno escuro fino de cor quente (nunca preto puro), sombreamento em 3 tons por superfície, cores quentes e suaves, sem gradientes suaves, sem antialiasing, sem desfoque, sem texto, sem marca d'água, sem personagens nem criaturas (os moradores são colocados depois). Desenhe como se cada pixel do jogo fosse um bloco 4x4 da imagem final: imagem final de **1280x768 pixels** (canvas do jogo 320x192 ampliado 4x), blocos de 4x4 pixels bem definidos. **Fundo: cor chapada magenta #FF00FF em toda área que deve ser transparente** (nunca xadrez, nunca branco, nunca gradiente). Não use magenta em nenhuma parte do desenho. Siga o guia de posições anexado: os retângulos coloridos do guia são **só marcações, não os desenhe**.

## Medidas fixas (valem para os dois temas)

| Elemento | Posição no canvas 320x192 | Na imagem 1280x768 (x4) |
|---|---|---|
| Casa (corpo, telhado e chaminé) | x 104–216, y 24–140 | x 416–864, y 96–560 |
| Porta | x 136–184, y 84–136 (48x52) | x 544–736, y 336–544 |
| Fumaça (sobre a chaminé, vai por cima) | x 174–206, y 4–36 | x 696–824, y 16–144 |
| Terreno caminhável | x 24–296, y 118–184 | x 96–1184, y 472–736 |
| Adereços (3 estações) | esquerda x 26–122, y 116–172; centro x 116–212, y 132–186; direita x 204–300, y 112–168 | multiplique por 4 |

A ilha/terreno termina em baixo por volta de y 184 (738 na imagem). Árvores e elementos altos ficam **fora** do retângulo da casa e **fora do terreno caminhável** (podem ficar atrás, nas laterais e acima).

---

# TEMA 1 — Japanese Garden (jardim japonês)

Identidade: casa tradicional de madeira clara com telhado de telhas azul-acinzentadas curvas e beirais largos, porta de correr (shoji) de papel, lanterna de pedra (tōrō), ponte pequena e lago com carpas ao fundo, cerejeira em flor, pinheiro bonsai, cascalho rastelado e musgo, bambu. Paleta: madeira mel, telhas azul-ardósia, rosa de sakura, verde musgo, areia clara, vermelho torii só em detalhes.

### JG-A1 — Cenário base (atrás da casa)
> [Bloco de estilo] Peça A1: o **cenário base** do tema Japanese Garden, **sem a casa**. Uma pequena ilha flutuante de terra (borda de terra marrom visível embaixo, como na referência) com grama e musgo; ao fundo, atrás do retângulo da casa, um lago pequeno com ponte de madeira arqueada e uma cerejeira em flor à esquerda e um pinheiro bonsai à direita (como as duas árvores da referência, mesma posição e tamanho). Cerca baixa de bambu nas laterais frontais (como as cercas da referência). Caminho de pedras chatas do centro (onde fica a porta, x~160) até a frente. Deixe o **retângulo da casa vazio** (mostre só o fundo/chão que ficaria atrás dela) e o terreno caminhável limpo. Imagem 1280x768, fundo magenta #FF00FF em volta da ilha e do céu (o céu é transparente).

### JG-A2 — Casa
> [Bloco de estilo] Peça A2: **somente a casa** do tema Japanese Garden, na mesma posição do retângulo vermelho do guia (x 416–864, y 96–560 na imagem 1280x768) e no mesmo enquadramento do cenário A1 anexado. Casa de madeira clara de um andar e meio, telhado curvo de telhas azul-ardósia com chaminé de pedra (para a fumaça) na direita do telhado, beirais largos, varanda baixa (engawa), duas janelas pequenas de treliça, **janelas apagadas (escuras, sem luz)**. No lugar da porta (retângulo azul do guia, x 544–736, y 336–544) pinte uma **parede de papel shoji fechada**, que depois será coberta pela porta animada. Tudo fora da casa em magenta #FF00FF.

### JG-A3 — Casa com janelas acesas
> [Bloco de estilo] Peça A3: **idêntica à peça A2 anexada em tudo** (mesma posição, mesmas cores, mesmos pixels), mudando **apenas** as janelas e a lanterna da varanda, que ficam **acesas em âmbar quente (#FFB54A com brilho amarelado)**. Nada mais pode mudar, porque o script vai comparar as duas imagens para extrair só a luz. Fundo magenta #FF00FF.

### JG-A4 — Primeiro plano
> [Bloco de estilo] Peça A4: **somente elementos do primeiro plano**, na faixa de baixo da imagem (y 700–760 na imagem 1280x768): tufos de grama e musgo, cogumelinhos pequenos, pedrinhas e pétalas de sakura, espalhados nas duas laterais e deixando o centro livre (como a camada de primeiro plano da referência). Todo o resto da imagem em magenta #FF00FF.

### JG-A5 — Porta (4 quadros)
> [Bloco de estilo] Peça A5: **folha da porta shoji em 4 quadros** lado a lado, cada quadro com **192x208 pixels** (48x52 do jogo x4), total **768x208**, sem espaço entre quadros, na ordem: (1) fechada (painéis de papel com moldura de madeira), (2) abrindo (uma folha deslizou até a metade, interior quente e escuro à mostra), (3) aberta (as duas folhas recolhidas nas laterais, interior escuro com brilho âmbar), (4) fechando (igual ao 2, espelhado no tempo). Mesma moldura e mesma altura em todos. Fundo magenta #FF00FF fora da porta.

### JG-A6 — Adereços das 3 estações
> [Bloco de estilo] Peça A6: **três pequenos conjuntos de objetos**, lado a lado, cada um num quadro de **384x224 pixels** (96x56 do jogo x4), total **1152x224**, objetos apoiados no chão na base de cada quadro e centralizados: (esquerda, estação do Claude) pilha de livros e rolos de pergaminho ao lado de uma mesinha baixa de chá com xícara fumegante; (centro, estação do Codex) uma mesa baixa com bule, xícara e uma lanterna de papel pequena; (direita, estação do Atom) uma lanterna de pedra (tōrō) com cristal azulado brilhante no topo. Fundo magenta #FF00FF.

### JG-A7 — Ajudantes de subagente (andando)
> [Bloco de estilo] Peça A7: **folha de sprites** de um **ajudante pequeno e fofo do jardim japonês**: um espírito kodama/lanterninha de papel de 16x16 do jogo (64x64 na imagem), de pé, com **ciclo de andar de 4 quadros** (quadro 1 em pé, 2 passo com pezinho para a esquerda, 3 em pé de novo, 4 passo para a direita). **3 linhas** (uma por provedor), cada linha igual no desenho e diferente **só na cor de destaque** (chapéu/enfeite): linha 1 laranja-terracota #D6704E, linha 2 azul-violeta #7884DC, linha 3 verde-água #40B2A8. Folha total **256x192 pixels** (4 colunas de 64 x 3 linhas de 64), sem espaço entre quadros, fundo magenta #FF00FF. Sem sombra no chão.

### JG-A8 — Objetos do jardim
> [Bloco de estilo] Peça A8: **4 objetos pequenos do jardim**, lado a lado, cada um num quadro de **96x96 pixels** (24x24 do jogo x4), total **384x96**, centralizados e apoiados na base do quadro, na ordem: (1) banco de madeira baixo com encosto de ripas, (2) **lanterna de pedra acesa** com chama âmbar (substitui a fogueira), (3) gatinho dormindo enrolado (laranja e branco, olhos fechados), (4) caixa de correio vermelha em poste de madeira com bandeirinha. Fundo magenta #FF00FF.

---

# TEMA 2 — Fantasy Village (vila de fantasia)

Identidade: casinha de pedra e madeira com telhado de palha ou telhas marrons, porta de arco em madeira com ferragens, chaminé de pedra, janelas redondas, cogumelos grandes, árvore velha e torre ao fundo, lampião de ferro, caminho de terra e pedras. Paleta: pedra cinza-quente, madeira escura, palha dourada, verde-floresta, roxo suave das flores mágicas, âmbar das tochas.

### FV-A1 — Cenário base (atrás da casa)
> [Bloco de estilo] Peça A1: o **cenário base** do tema Fantasy Village, **sem a casa**. Pequena ilha flutuante de terra (borda de terra visível embaixo, como na referência) com grama e flores roxas pequenas; ao fundo, atrás do retângulo da casa, um moinho de vento pequeno e uma torre de pedra distante entre colinas suaves; uma árvore velha e torta à esquerda e uma árvore de folhas verde-azuladas à direita (mesma posição e tamanho das árvores da referência); cerca baixa de estacas de madeira nas laterais frontais; caminho de terra batida com pedras do centro (x~160) até a frente. **Retângulo da casa vazio** e terreno caminhável limpo. Imagem 1280x768, fundo magenta #FF00FF no céu e em volta da ilha.

### FV-A2 — Casa
> [Bloco de estilo] Peça A2: **somente a casa** do tema Fantasy Village, na mesma posição do retângulo vermelho do guia (x 416–864, y 96–560 na imagem 1280x768) e no mesmo enquadramento do cenário A1 anexado. Casinha de pedra clara com vigas de madeira, telhado de palha dourada bem inclinado com chaminé de pedra na direita, janela redonda no alto, duas janelas pequenas com venezianas, um cogumelo gigante vermelho ao lado, **janelas apagadas**. No lugar da porta (retângulo azul do guia, x 544–736, y 336–544) pinte uma **porta de arco em madeira fechada**, que depois será coberta pela porta animada. Fora da casa em magenta #FF00FF.

### FV-A3 — Casa com janelas acesas
> [Bloco de estilo] Peça A3: **idêntica à peça A2 anexada em tudo**, mudando **apenas** as janelas e o lampião da entrada, que ficam **acesos em âmbar quente (#FFB54A com brilho amarelado)**. Nada mais pode mudar, porque o script compara as duas imagens para extrair só a luz. Fundo magenta #FF00FF.

### FV-A4 — Primeiro plano
> [Bloco de estilo] Peça A4: **somente elementos do primeiro plano** na faixa de baixo (y 700–760 na imagem 1280x768): tufos de grama, cogumelinhos coloridos, pedrinhas, flores roxas e vaga-lumes, deixando o centro livre. Todo o resto em magenta #FF00FF.

### FV-A5 — Porta (4 quadros)
> [Bloco de estilo] Peça A5: **folha da porta de arco em 4 quadros** lado a lado, cada quadro **192x208 pixels** (48x52 do jogo x4), total **768x208**, sem espaço entre quadros: (1) fechada (madeira com ferragens de ferro), (2) abrindo (entreaberta, fresta âmbar), (3) aberta (folhas recolhidas, interior quente e escuro), (4) fechando (igual ao 2). Mesma moldura e altura em todos. Fundo magenta #FF00FF.

### FV-A6 — Adereços das 3 estações
> [Bloco de estilo] Peça A6: **três conjuntos de objetos**, cada um num quadro de **384x224 pixels** (96x56 do jogo x4), total **1152x224**, apoiados na base e centralizados: (esquerda, estação do Claude) pilha de grimórios e um tinteiro com pena sobre um baú pequeno; (centro, estação do Codex) mesa de madeira com caneca, mapa enrolado e lampião de ferro; (direita, estação do Atom) pedestal de pedra com uma esfera de cristal roxo brilhante. Fundo magenta #FF00FF.

### FV-A7 — Ajudantes de subagente (andando)
> [Bloco de estilo] Peça A7: **folha de sprites** de um **ajudante pequeno e fofo da vila de fantasia**: uma fadinha-vaga-lume ou slime sorridente de 16x16 do jogo (64x64 na imagem), com **ciclo de andar/pairar de 4 quadros**. **3 linhas** (uma por provedor), mesmo desenho e **só a cor de destaque muda**: linha 1 laranja-terracota #D6704E, linha 2 azul-violeta #7884DC, linha 3 verde-água #40B2A8. Folha total **256x192 pixels** (4 colunas de 64 x 3 linhas de 64), sem espaço entre quadros, fundo magenta #FF00FF, sem sombra.

### FV-A8 — Objetos do jardim
> [Bloco de estilo] Peça A8: **4 objetos pequenos**, cada um num quadro de **96x96 pixels** (24x24 do jogo x4), total **384x96**, centralizados e apoiados na base, na ordem: (1) banco de madeira rústico, (2) **fogueira pequena de acampamento** em círculo de pedras com chamas âmbar, (3) gatinho dormindo enrolado (laranja e branco, olhos fechados), (4) caixa de correio de madeira em forma de casinha de passarinho num poste, com bandeirinha. Fundo magenta #FF00FF.

---

## O que eu faço com cada peça

| Peça | Vira |
|---|---|
| A1 | `layer-1-backdrop` do tema |
| A2 | camada da casa do tema |
| A3 | camada de luzes âmbar (diferença A3 − A2) |
| A4 | `layer-6-foreground` do tema |
| A5 | `door-closed/opening/open/closing` |
| A6 | `station-left/center/right-props` |
| A7 | `helpers.png` do tema (4 quadros x 3 linhas) |
| A8 | `garden-objects.png` do tema (4 objetos) |

A sombra de chão e a fumaça são geradas pelo script (a fumaça reaproveita os 4 quadros atuais, posicionados sobre a chaminé). Nada aqui recolore ou redesenha Clawd, Cloudling ou Atom: os moradores são desenhados pelo app por cima do cenário.
