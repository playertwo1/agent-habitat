# Design — Cozy Cottage Edition

## 1. Direção Artística

Estética **cozy pixel art artesanal 2D**, com madeira aquecida, telhado azul-ardósia coberto de musgo, luz interna âmbar acolhedora e pequeno jardim em formato de ilha/diorama flutuante sobre a área de trabalho — **sem retângulo de fundo, sem moldura corporativa e sem barra de texto permanente**.

- **Cabana e cenário:** criados em camadas PNG RGBA com canal alfa real (`image-rendering: pixelated` / nearest-neighbor sem borrão bilinear).
- **Os 3 moradores:** preservam seus **assets e cores originais autorizados** (`D5`):
  - **Clawd** (caranguejo laranja original de `themes/clawd`);
  - **Cloudling** (mascote branco/ciano original de `themes/cloudling`);
  - **Atom** (espírito/orbe flutuante roxo-lavanda original de `Arnav8452/atom`).

## 2. Paleta do Ambiente (Cabana, Jardim e Painel)

Aplicada exclusivamente ao cenário e à interface sob demanda — **nunca recolorir os mascotes originais**.

| Token | Hex | Aplicação |
|---|---|---|
| `wood-dark` | `#56352C` | Contorno de vigas e madeira escura |
| `wood-warm` | `#A96B45` | Porta arredondada, bancadas, cercas e madeira principal |
| `plaster` | `#F1CFA2` | Paredes de reboco iluminadas |
| `roof` | `#456487` | Telhas azul-ardósia |
| `roof-shadow` | `#293A54` | Sombra do telhado e beiral |
| `moss` | `#71883E` | Musgo do telhado e base de grama |
| `leaf-light` | `#B5C45C` | Luz alta da folhagem |
| `amber` | `#FFC45C` | Luz ativa das janelas, lampiões, interior da porta e destaques |
| `rose` | `#E68BA7` | Flores, cerejeira e detalhes quentes |
| `night` | `#3C425C` | Janelas apagadas quando cabana em repouso (`000`) |
| `outline` | `#302638` | Contorno externo suave da arte |
| `panel-bg` | `#24232A` | Fundo do painel sob demanda e cards locais |
| `panel-fg` | `#F6EADB` | Texto principal do painel (`Segoe UI` / sistema — nunca fonte pixel em textos longos) |

## 3. Composição Espacial e Camadas

- **Canvas lógico base de referência:** `320 × 192 px` (ajustável na validação real G1), com escalas nítidas (`1×`, `1.5×`, `2×`).
- **Cabana central:** ~`112 × 112 px`, posicionada como âncora imóvel (entrar/sair de personagens nunca desloca a cabana na tela).
- **Âncora única de travessia:** soleira da porta arredondada central (`doorAnchor`), de onde todo personagem parte ao sair (`exiting`) e para onde converge ao retornar (`entering`).
- **Três estações de trabalho fixas e sem colisão:**
  1. **Esquerda (jardim/livros) → Clawd (Claude):** pilha de livros, bancada baixa, notebook e caneca quente;
  2. **Centro-frente / direita da trilha → Cloudling (Codex):** bancada de madeira, laptop `</>` e caixa de ferramentas;
  3. **Direita elevada / jardim mágico → Atom (Antigravity):** flutuação leve junto a livros, lampião e cristal/orbe luminoso.

### Ordem de pintura (Z-layers do Diorama)
1. `layer-0-shadow`: sombra suave da ilha no desktop;
2. `layer-1-backdrop`: copa de árvore/cerejeira traseira, chaminé e fumaça lenta;
3. `layer-2-cottage-body`: estrutura da cabana + janelas (`night` em `000`, `amber` quando há atividade);
4. `layer-3-door`: interior iluminado + folha da porta (`closed`, `opening`, `open`, `closing`);
5. `layer-4-stations-back`: bancadas e objetos traseiros das estações ativas;
6. `layer-5-actors`: **Clawd**, **Cloudling** e **Atom** ordenados por coordenada `y` do pivô de pé (`footPivot`);
7. `layer-6-foreground`: tufos frontais de grama/flores, canecas sobre a mesa e partículas discretas de celebração/alerta.

## 4. Estados Visuais e Cadência

### Cabana
- **Repouso (`000`):** porta fechada, janelas em tom `night` (`#3C425C`), sem fumaça intensa, 0 fps de loop pesado (economia total em idle).
- **Despertar (`000 → ativo`):** janelas acendem em `amber` (`#FFC45C`), lampião aquece, porta abre (`0,35 s`) para passagem do morador.
- **Ativa:** janelas acesas e fumaça leve em loop calmo; a porta volta a fechar após a saída do morador e só reabre quando outro morador sai ou entra.
- **Adormecer (`último retorno → 000`):** morador cruza a porta, porta fecha e janelas suavizam para repouso.

### Moradores
- **Saída (`exiting`):** `0,5–1,0 s` da soleira até a estação do provedor.
- **Trabalho (`outside / busy`):** animação original de trabalho/digitação (ou variante específica quando confirmada por ferramenta: leitura, construção, pesquisa).
- **Pedido de atenção (`needs_approval` / `waiting_input`):** animação original de notificação/aceno + indicador visual limpo acima da estação (integrado aos cards locais quando habilitados).
- **Conclusão (`done`):** celebração curta (`1,2–1,8 s`) e caminhada/flutuação de volta até a porta (`entering`, `0,5–1,0 s`).
- **Movimento reduzido (`reducedMotion`):** suprime deslocamento de caminhada e fumaça contínua, trocando estados por fade/quadro estático limpo.

## 5. Pipeline de Arte (`D5` + `D6`)

1. **Inventário e preservação (`assets/originals/`):** manter intactos os assets originais de `Clawd` e `Cloudling` (do `clawd-on-desk`) e os sprites originais do `Atom` (`Arnav8452/atom`), registrando origem, commit e atribuição em `NOTICE.md` / `docs/discovery-g0.md`.
2. **Produção modular da cabana (`assets/habitat/cozy-cottage/`):** separar em PNG RGBA reais (sem resíduos de checkerboard) a base do jardim, corpo da cabana, máscara de luz das janelas, sprites da porta, fumaça e props das 3 estações.
3. **Manifest declarativo (`habitat-manifest.json`):** cada camada, estação e personagem declara pivô, caixa de clique (`hitBox`), frames/SVGs e estados suportados.
4. **Validação humana obrigatória (Gate G1):** inspeção lado a lado sobre papéis de parede claro e escuro do Windows, em `100%`, `125%`, `150%` e `200%` DPI.

## 6. Referências Visuais do Repositório

Guardadas em [`docs/referencias_visuais/`](referencias_visuais/):
- `01_visao_geral.png` — norte geral de composição e atmosfera;
- `02_casa_cozy.png` — materiais, telhado com musgo, porta e luz âmbar;
- `03_claude_clawd.png` — situações conceituais do Clawd e ciclo de porta;
- `04_codex_cloudling.png` — situações conceituais do Cloudling e bancada técnica;
- `05_antigravity_atom.png` — situações conceituais do Atom flutuando e estudando;
- `06_estados_habitat.png` — progressão de estados da cabana (ignorar o último quadro de cochilo fora da casa);
- `07_objetos_e_cenario.png` — biblioteca conceitual de vegetação, cercas, luzes e objetos.
