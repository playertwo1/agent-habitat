# Prompts do Gemini — Cozy Cottage v2 (refazer o tema inicial)

Para redesenhar o tema inicial no nível de detalhe dos dois temas novos. A entrega do Japanese Garden e do Fantasy Village mostrou o que funciona; este pacote aplica isso. O Habitat vai guardar a Cozy Cottage atual como `cozy-cottage-classico` (nada se perde) e o dono escolhe no seletor de Ajustes.

## Como usar

1. Anexe em todos os pedidos: [`referencia-cozy-cottage.png`](referencia-cozy-cottage.png) (a cabana atual, para manter a **identidade**: casa de pedra e madeira com chaminé, cogumelos grandes, duas árvores, cercas, 3 estações) e, no A1, o [`guia-layout.png`](guia-layout.png).
2. Cole o **Bloco de estilo** e depois o prompt da peça. Uma peça por vez; da peça 2 em diante anexe também a A1 aprovada.
3. Salve como `A1-base.png`, `A2-house.png` … `A8-garden-objects.png` numa pasta `cozy-cottage-v2/` e me avise. Não redimensione nem tire o fundo.
4. Errou algo? Corrija no mesmo chat, apontando o erro.

## O que mudou em relação ao primeiro pacote (lições da entrega)

- **Não precisa mais acertar o tamanho em pixels.** O processador agora recorta cada peça pelo contorno e encaixa na caixa certa. Importa a **proporção do cenário (A1 e A4 em 5:3, ex.: 1620x972)**, o **estilo** e que as peças de uma mesma folha tenham **a mesma escala**.
- **A3 (casa acesa) deve ser a A2 com as janelas acesas e o resto idêntico em cores.** Na entrega anterior a A3 do Fantasy Village veio em tons de noite; isso força um método de extração menos preciso.
- **Casa sem plantas e cogumelos colados**: ervas, cogumelos e flores ao redor ficam na A1/A4, para a casa ficar limpa e reutilizável. (Os cogumelos grandes à esquerda da casa continuam, mas na A4.)
- **A5 (porta)**: 4 quadros **do mesmo tamanho, na mesma altura e com a mesma moldura**, para a porta não tremer ao abrir. Proporção de cada quadro próxima de 1:1,1 (largura:altura).
- **A7 (ajudantes)**: pequenos e legíveis em 16x16: corpo redondo bem simples, **silhueta clara**, 4 quadros por linha, **o mesmo enquadramento em todos os quadros** (centralizado), 3 linhas só mudando a cor.
- **A8 (objetos)**: 4 objetos do **mesmo tamanho aparente**, cada um inteiro e bem separado dos vizinhos.
- Sem personagens (os moradores entram depois) e **sem magenta no desenho**.

## Bloco de estilo (cole antes de cada peça)

> Pixel art 2D "cozy" de alta qualidade, visão frontal levemente de cima, contorno escuro fino de cor quente (nunca preto puro), sombreamento em 3 a 4 tons por superfície, texturas ricas (pedra, madeira, palha, folhagem em tufos), cores quentes e suaves, sem gradientes suaves, sem antialiasing, sem desfoque, sem texto, sem marca d'água, sem personagens nem criaturas (exceto onde o prompt pede). Pixels bem definidos, como se cada pixel do jogo fosse um bloco 4x4. **Fundo: magenta chapado #FF00FF em toda área transparente** (nunca xadrez, branco ou gradiente) e nenhum magenta no desenho.

## Medidas de referência (só A1, A2 e A4 dependem delas)

Canvas do jogo 320x192 (proporção 5:3). A casa fica no centro (x 104–216, y 24–140), a porta embaixo dela (x 136–184, y 84–136), a chaminé à direita do telhado, o terreno caminhável em x 24–296, y 118–184. Árvores e elementos altos ficam atrás e nas laterais, **fora** do retângulo da casa e do terreno caminhável.

---

### CZ-A1 — Cenário base (atrás da casa)
> [Bloco de estilo] Peça A1, imagem em proporção 5:3 (ex.: 1620x972). O **cenário base** da Cozy Cottage, **sem a casa**: pequena ilha flutuante de terra (borda de terra e raízes visível embaixo), grama viçosa com flores miúdas, uma árvore grande de copa verde cheia à esquerda e outra de flores rosa à direita, cercas baixas de madeira nas laterais, um caminho de pedras chatas saindo do centro até a frente, tufos de grama e pedrinhas. O **retângulo da casa fica vazio** (só o chão e a folhagem de trás). Terreno caminhável limpo. Fundo e céu em magenta #FF00FF.

### CZ-A2 — Casa
> [Bloco de estilo] Peça A2: **somente a casa**, num único objeto inteiro, com uma pequena margem magenta em volta. Casa de pedra clara com vigas de madeira, telhado de palha dourada densa e detalhada com um pouco de musgo, **chaminé de pedra à direita do telhado**, óculo redondo no frontão, duas janelas com venezianas de madeira e floreiras de flores, arco de pedra com uma **porta de madeira arqueada fechada**, degraus de pedra na frente. **Janelas apagadas (vidro escuro).** Sem plantas, cogumelos ou objetos encostados na casa.

### CZ-A3 — Casa com janelas acesas
> [Bloco de estilo] Peça A3: **idêntica à A2 anexada em tudo** (mesma posição, mesmas cores, mesmo tom, mesmos pixels), mudando **apenas** o vidro das janelas e do óculo, que ficam **acesos em âmbar quente (#FFB54A) com brilho amarelado**. Nada mais muda, nem o tom geral (**não escureça a casa**).

### CZ-A4 — Primeiro plano
> [Bloco de estilo] Peça A4, imagem em proporção 5:3 (ex.: 1620x972). **Somente o primeiro plano**, na faixa de baixo: tufos de grama alta, cogumelos grandes de chapéu vermelho com bolinhas à esquerda, cogumelinhos, flores, pedrinhas e trevos, deixando o centro livre. O resto em magenta #FF00FF.

### CZ-A5 — Porta (4 quadros)
> [Bloco de estilo] Peça A5: a **porta de madeira arqueada da A2 com o arco de pedra e a soleira**, em **4 quadros do mesmo tamanho** lado a lado, sem espaço entre eles, na ordem: (1) fechada, (2) abrindo (a folha gira para dentro, fresta quente à mostra), (3) aberta (as duas folhas abertas nas laterais, interior aconchegante com lanterna e prateleira, brilho âmbar), (4) fechando (parecido com o 2). Mesma moldura, mesma altura e mesma posição da moldura em todos os quadros. Fundo magenta #FF00FF.

### CZ-A6 — Adereços das 3 estações
> [Bloco de estilo] Peça A6: **3 conjuntos de objetos lado a lado**, mesma escala, cada um apoiado no chão e **bem separado** dos outros: (esquerda, estação do Claude) pilha de livros coloridos com um baú e tinteiro com pena; (centro, estação do Codex) mesa baixa de madeira com caneca fumegante, mapa, pergaminho e lanterna acesa; (direita, estação do Atom) pedestal de pedra com musgo e uma esfera mágica roxa brilhante. Fundo magenta #FF00FF.

### CZ-A7 — Ajudantes de subagente
> [Bloco de estilo] Peça A7: **folha de sprites** de um **ajudante pequeno e fofo**: um vaga-lume redondo com asinhas e uma antena com bolinha luminosa. Desenho simples e legível em tamanho minúsculo. **4 colunas de quadros (ciclo de voo: asas para cima, meio, para baixo, meio) × 3 linhas** (uma por provedor), **todos os quadros do mesmo tamanho e centralizados do mesmo jeito**. Só muda a cor do corpo: linha 1 laranja-terracota #D6704E, linha 2 azul-violeta #7884DC, linha 3 verde-água #40B2A8. Sem sombra. Fundo magenta #FF00FF.

### CZ-A8 — Objetos do jardim
> [Bloco de estilo] Peça A8: **4 objetos pequenos do jardim**, lado a lado, de **mesmo tamanho aparente**, cada um inteiro, apoiado no chão e bem separado dos vizinhos, na ordem: (1) banco de madeira com encosto, (2) fogueirinha acesa com pedras em volta, (3) gatinho laranja e branco dormindo enrolado, (4) caixa de correio vermelha em poste de madeira. Fundo magenta #FF00FF.
