# Prompts do Gemini — Space Habitat (3º tema do P3)

Pacote de 8 peças do tema **Space Habitat**: um **domo acolhedor com chaminé-antena** sobre um **asteroide flutuante** no espaço estrelado, com jardim de cristais e drones como ajudantes (decisão D8 do [questionário do P3](../questionario/2026-11-26-p3-proximo-ciclo.md)). Mesma geometria dos outros temas, então o processador existente faz o resto.

## Como usar

1. Anexe em todos os pedidos: [`referencia-cozy-cottage.png`](../arte-p2/referencia-cozy-cottage.png) (só para o **nível de detalhe e a organização** da cena: casa no centro, árvores/elementos altos nas laterais, 3 estações) e, no A1, o [`guia-layout.png`](../arte-p2/guia-layout.png). Dê a ordem: *"mantenha a organização da referência, mas troque tudo pelo tema espacial descrito"*.
2. Cole o **Bloco de estilo** e depois o prompt da peça. **Uma peça por vez**; da peça 2 em diante anexe também a **A1 aprovada** (a paleta tem de combinar).
3. Salve como `A1-base.png`, `A2-house.png`, `A3-house-lit.png`, `A4-foreground.png`, `A5-door.png`, `A6-props.png`, `A7-helpers.png`, `A8-garden-objects.png` numa pasta `space-habitat/` e me avise. Não redimensione nem tire o fundo.
4. Errou algo? Corrija no mesmo chat, apontando o erro.

## Lições do P2 já aplicadas

- **Não precisa acertar o tamanho em pixels**: o processador recorta cada peça pelo contorno. Importam a **proporção 5:3 em A1 e A4 (ex.: 1620x972)**, o estilo e a **mesma escala** dentro de uma folha.
- **A3 = A2 com só as janelas acesas**, mesmo tom geral (nada de "versão noturna").
- **A5**: 4 quadros **do mesmo tamanho, mesma altura e mesma moldura**, proporção de cada quadro perto de 1:1,1.
- **A7**: simples e legível em 16x16, **centralizado igual em todos os quadros**, 4 colunas × 3 linhas só mudando a cor.
- **A8**: 4 objetos do **mesmo tamanho aparente**, inteiros e bem separados.
- **Sem personagens** (os moradores entram depois) e **sem magenta no desenho**.
- **O espaço fica em magenta**: o céu estrelado do fundo **não** é desenhado; a cabana flutua sobre o fundo transparente. Só o asteroide, o terreno e objetos entram na imagem (as estrelas, se quiser, entram como poucos pontinhos junto da borda do asteroide, nunca como céu inteiro).

## Bloco de estilo (cole antes de cada peça)

> Pixel art 2D "cozy" de alta qualidade, visão frontal levemente de cima, contorno escuro fino de cor fria (azul-petróleo, nunca preto puro), sombreamento em 3 a 4 tons por superfície, texturas ricas (rocha porosa, metal escovado, vidro, cristais facetados), paleta acolhedora de **azul-petróleo, violeta suave, creme, cobre e âmbar** (aconchegante, não frio nem industrial), sem gradientes suaves, sem antialiasing, sem desfoque, sem texto, sem marca d'água, sem personagens nem criaturas (exceto onde o prompt pede). Pixels bem definidos, como se cada pixel do jogo fosse um bloco 4x4. **Fundo: magenta chapado #FF00FF em toda área transparente** (nunca xadrez, branco, preto ou gradiente) e nenhum magenta no desenho.

## Medidas de referência (só A1, A2 e A4 dependem delas)

Canvas do jogo 320x192 (proporção 5:3). O domo fica no centro (x 104–216, y 24–140), a porta embaixo dele (x 136–184, y 84–136), a chaminé-antena à direita do topo, o terreno caminhável em x 24–296, y 118–184. Cristais grandes e elementos altos ficam atrás e nas laterais, **fora** do retângulo do domo e do terreno caminhável.

---

### SP-A1 — Cenário base (asteroide, atrás do domo)
> [Bloco de estilo] Peça A1, imagem em proporção 5:3 (ex.: 1620x972). O **cenário base** do Space Habitat, **sem o domo**: um **asteroide flutuante** achatado, de rocha violeta-acinzentada com cobertura de musgo luminoso azul-esverdeado no topo (terreno plano e caminhável), borda de rocha com raízes e cristais pendurados embaixo (a ilha flutua, com pedacinhos de rocha soltos ao redor), um caminho de placas de metal e pedra saindo do centro até a frente, cristais altos translúcidos (violeta e azul-gelo) agrupados à esquerda e à direita, uma cerca baixa de postes de cobre com luzinhas, tufos de plantas bioluminescentes. O **retângulo do domo fica vazio** (só o chão e a rocha atrás). Terreno caminhável limpo. Todo o resto, o espaço em volta, em magenta #FF00FF.

### SP-A2 — Domo
> [Bloco de estilo] Peça A2: **somente o domo**, num único objeto inteiro, com uma pequena margem magenta em volta. Casa-domo acolhedora: base de pedra clara e cobre, **cúpula de vidro azulado com estrutura de metal cobre** e painéis creme, duas janelas redondas (óculos) e um óculo grande no topo, **chaminé-antena de metal à direita** com uma pontinha e uma bolinha luminosa apagada (de onde sai o "vapor" do tema), **porta redonda ou em arco de metal e madeira fechada** no centro embaixo, degraus de placa metálica. **Janelas apagadas (vidro escuro).** Sem plantas, cristais ou objetos encostados no domo.

### SP-A3 — Domo com janelas acesas
> [Bloco de estilo] Peça A3: **idêntica à A2 anexada em tudo** (mesma posição, mesmas cores, mesmo tom, mesmos pixels), mudando **apenas** o vidro das janelas redondas e do óculo, que ficam **acesos em âmbar quente (#FFB54A) com brilho amarelado**. Nada mais muda, nem o tom geral (**não escureça o domo**).

### SP-A4 — Primeiro plano
> [Bloco de estilo] Peça A4, imagem em proporção 5:3 (ex.: 1620x972). **Somente o primeiro plano**, na faixa de baixo do cenário: pedras redondas, tufos de plantas bioluminescentes, **cogumelos-lanterna grandes** de chapéu violeta com pontinhos luminosos à esquerda, mudas de cristal miúdas, pedacinhos de rocha e trevos de luz, deixando o centro livre. O resto em magenta #FF00FF.

### SP-A5 — Porta (4 quadros)
> [Bloco de estilo] Peça A5: a **porta do domo da A2 com a moldura e a soleira**, em **4 quadros do mesmo tamanho** lado a lado, sem espaço entre eles, na ordem: (1) fechada, (2) abrindo (a porta desliza ou gira, fresta quente à mostra), (3) aberta (interior aconchegante com luz âmbar, lanterna e prateleira), (4) fechando (parecido com o 2). Mesma moldura, mesma altura e mesma posição da moldura em todos os quadros. Fundo magenta #FF00FF.

### SP-A6 — Adereços das 3 estações
> [Bloco de estilo] Peça A6: **3 conjuntos de objetos lado a lado**, mesma escala, cada um apoiado no chão e **bem separado** dos outros: (esquerda, estação do Claude) pilha de livros-tablet e baú de metal com um tinteiro de cristal e pena; (centro, estação do Codex) mesa baixa de metal e madeira com caneca fumegante, mapa estelar holográfico, pergaminho e lanterna acesa; (direita, estação do Atom) pedestal de rocha com musgo luminoso e uma esfera mágica roxa brilhante. Fundo magenta #FF00FF.

### SP-A7 — Ajudantes de subagente (drones)
> [Bloco de estilo] Peça A7: **folha de sprites** de um **drone ajudante pequeno e fofo**: corpo redondo de metal com um olho luminoso, duas hélices pequenas e uma antena com bolinha de luz. Desenho simples e legível em tamanho minúsculo. **4 colunas de quadros (ciclo de voo: hélices para cima, meio, para baixo, meio) × 3 linhas** (uma por provedor), **todos os quadros do mesmo tamanho e centralizados do mesmo jeito**. Só muda a cor do acento (corpo e luz): linha 1 laranja-terracota #D6704E, linha 2 azul-violeta #7884DC, linha 3 verde-água #40B2A8. Sem sombra. Fundo magenta #FF00FF.

### SP-A8 — Objetos do jardim de cristais
> [Bloco de estilo] Peça A8: **4 objetos pequenos do jardim**, lado a lado, de **mesmo tamanho aparente**, cada um inteiro, apoiado no chão e bem separado dos vizinhos, na ordem: (1) banco de metal e madeira com encosto, (2) fogueirinha de cristal laranja acesa com pedras em volta, (3) gatinho laranja e branco dormindo enrolado (com uma coleira luminosa), (4) caixa de correio de cobre em poste de metal com uma antenezinha. Fundo magenta #FF00FF.

---

## Checklist de conferência (P3.1.3)

- [ ] A1 e A4 em 5:3; retângulo do domo vazio na A1; céu/espaço todo em magenta.
- [ ] A3 igual à A2, só com as janelas âmbar, mesmo tom.
- [ ] A5 com 4 quadros do mesmo tamanho e moldura na mesma posição.
- [ ] A6 com 3 conjuntos separados, mesma escala.
- [ ] A7 com 4 colunas × 3 linhas, drone centralizado, só o acento muda.
- [ ] A8 com 4 objetos do mesmo tamanho, separados.
- [ ] Nenhum magenta dentro do desenho; nenhum personagem.
