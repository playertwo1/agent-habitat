# Briefing para o Codex — arte da P3.7 do Agent Habitat

Codex, você vai desenhar peças de pixel art para o **Agent Habitat**, um app de desktop com uma ilhazinha flutuante onde moram três mascotes. Desenhe **somente** as peças listadas abaixo, salve cada uma como PNG em `assets-novos/p3.7/` (nomes exatos abaixo) e não altere nenhum outro arquivo do repositório. Não desenhe os mascotes (Clawd, Cloudling e Atom): eles são sprites originais e não podem ser recriados nem recoloridos.

## Antes de desenhar, olhe as referências
- Estilo aprovado da cena atual: `docs/arte-p2/previa-cozy-v2.png` e `docs/arte-p2/previa-temas-p2.png`.
- Peças atuais de cada tema: `assets/habitat/<tema>/` (`cozy-cottage-v2`, `japanese-garden`, `fantasy-village`). Combine paleta, contorno e nível de detalhe com elas.

## Regras de estilo (valem para todas as peças)
- Pixel art 2D "cozy", visão frontal levemente de cima, contorno escuro fino de cor quente (nunca preto puro), sombreamento em 3 a 4 tons por superfície, sem gradientes suaves, sem antialiasing, sem desfoque, sem texto, sem marca d'água.
- **Fundo magenta chapado `#FF00FF`** em toda área transparente (nunca xadrez, branco ou gradiente) e **nenhum magenta dentro do desenho**. O pipeline do projeto troca o magenta por transparência real.
- Peças de uma mesma folha com **a mesma escala**, inteiras e **bem separadas** umas das outras (pelo menos 1/10 da largura de espaço entre elas).
- Tamanho livre (o processador recorta e encaixa), mas desenhe grande e nítido, com pixels bem definidos, como se cada pixel do jogo fosse um bloco 4x4.

## Peças

### 1. Árvores variadas — `trees-<tema>.png` (uma folha por tema, 3 folhas)
Hoje toda cena tem uma árvore verde de um lado e uma rosa do outro. Desenhe **6 árvores por tema**, lado a lado na mesma folha, mesma altura aproximada (árvore alta de copa cheia, com tronco e raízes aparecendo), cada uma uma variação diferente:
- `trees-cozy-cottage-v2.png`: carvalho verde, cerejeira rosa, bordo de outono laranja-avermelhado, bétula dourada, glicínia lilás pendente, pinheiro verde-escuro.
- `trees-japanese-garden.png`: pinheiro japonês (niwaki) em camadas, cerejeira (sakura) rosa, bordo japonês vermelho, bambuzal denso, glicínia lilás, ginkgo amarelo.
- `trees-fantasy-village.png`: carvalho antigo retorcido, árvore de copa azul-turquesa mágica, árvore com lanternas penduradas, árvore de folhas douradas, salgueiro roxo, macieira com frutos.
Sem chão grande embaixo: só a base do tronco com um tufo de grama.

### 2. Castelo do Fantasy Village — `fv-castle.png`, `fv-castle-lit.png`, `fv-castle-door.png`
- `fv-castle.png`: **um castelo pequeno e acolhedor**, não uma casa: muralha frontal de pedra clara com ameias, **duas torres redondas** com telhados cônicos de telha azul-ardósia e bandeirolas, uma torre central um pouco mais alta, janelas estreitas em arco, **portão em arco de madeira com ferragens, fechado**, no centro embaixo, degraus de pedra. Proporção do conjunto perto de 1:1 (tão largo quanto alto). **Janelas apagadas (vidro escuro).** Sem plantas, cogumelos ou objetos encostados.
- `fv-castle-lit.png`: **idêntico ao `fv-castle.png` em tudo** (mesma posição, mesmas cores e tom), mudando **só** o vidro das janelas, aceso em âmbar quente `#FFB54A`. Não escureça o castelo.
- `fv-castle-door.png`: o **portão do castelo com o arco e a soleira**, em **4 quadros do mesmo tamanho** lado a lado, sem espaço entre eles: (1) fechado, (2) abrindo, (3) aberto com interior quente e luz âmbar, (4) fechando. Mesma moldura e mesma posição em todos os quadros.

### 3. Aviso de tarefa concluída integrado à ilha — `done-sign.png`
Substitui uma janelinha de aviso que destoa da cena. Desenhe uma folha com **4 quadros do mesmo tamanho** lado a lado: uma **plaquinha de madeira em estaca, com uma bandeirinha e um pergaminho**, que **surge do chão** (quadro 1: só a ponta da estaca; 2: metade; 3: inteira; 4: inteira com a bandeirinha balançando e brilhinhos dourados em volta). Área lisa no centro da placa, **sem texto** (o app escreve por cima), proporção da placa perto de 3:2. Tamanho pequeno na cena (cabe ao lado de um mascote).
Em seguida, na mesma pasta, `done-icons.png`: **3 ícones pequenos e simples** lado a lado para pôr na placa, um por provedor, só como acento de cor: estrela laranja-terracota `#D6704E`, nuvenzinha azul-violeta `#7884DC`, átomo verde-água `#40B2A8`.

### 4. Objetos do jardim um pouco maiores — `garden-objects-<tema>.png` (opcional, 3 folhas)
Se sobrar tempo: os mesmos 4 objetos do jardim de cada tema (banco, fogueira, gatinho dormindo, caixa de correio), redesenhados **com silhueta mais forte e um pouco maiores**, mantendo a ordem e o mesmo tamanho aparente entre si. Use as folhas atuais `assets/habitat/<tema>/garden-objects.png` como referência de conteúdo.

## Entrega
1. Salve tudo em `assets-novos/p3.7/` com os nomes acima e uma prévia `assets-novos/p3.7/_previa.png` com todas as peças lado a lado.
2. Liste no final o que desenhou e qualquer peça que não conseguiu fazer.
3. Não rode o processador, não mexa em `assets/habitat/`, `src/` nem nos manifestos: a integração é feita depois, na P3.7.6.
