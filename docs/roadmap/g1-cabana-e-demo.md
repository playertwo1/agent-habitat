# Gate G1 — Prova Visual da Cozy Cottage e Demo das 8 Combinações

**Esforço:** G (dividido em G1.1–G1.4) · **Depende de:** [G0](../arquivadas/etapas/g0-descoberta-e-base.md) · **Próximo:** [G2 — Agregador e Adaptadores](g2-agregador-e-adaptadores.md)

## Objetivo
Construir a composição visual completa da **Cozy Cottage** em camadas PNG RGBA com canal alfa real, posicionar os 3 mascotes originais (**Clawd**, **Cloudling**, **Atom**) em suas estações sem colisão e validar as **8 combinações (`000` a `111`)** + transições de porta através de um `Demo Mode` interativo na área de trabalho real.

## Subetapas

### G1.1 — Camadas modulares da Cozy Cottage e props (`D6`)
- [ ] Produzir e validar transparência alfa real (zero checkerboard residual) em `assets/habitat/cozy-cottage/`:
  - Base de jardim/ilha + sombra suave;
  - Estrutura da cabana + janelas apagadas (`night`) e acesas (`amber`);
  - Folha da porta (`closed`, `opening`, `open`, `closing`) e interior iluminado;
  - Chaminé + loop suave de fumaça e lampião externo;
  - Props das 3 estações (livros/caneca à esquerda; bancada/laptop/ferramentas ao centro-frente; livros/orbe luminoso à direita).
- [ ] Escrever `assets/habitat/cozy-cottage/habitat-manifest.json` com dimensões, pivôs, âncora da porta (`doorAnchor`), coordenadas das 3 estações e validação de schema/bounds (`T26`).

### G1.2 — Integração visual dos 3 moradores originais (`D5`)
- [ ] Mapear os clipes originais de **Clawd**, **Cloudling** e **Atom** (`exiting`, `busy`, `waiting_input`, `needs_approval`, `error`, `done`, `entering`) respeitando proporções e cores originais sobre a cabana.
- [ ] Ajustar ordenação Z (`y-sort` por pivô de pé) e nitidez pixel-art (`image-rendering: pixelated` onde aplicável) nas escalas `1×`, `1.5×` e `2×`.

### G1.3 — Máquina de Cena do Habitat e `Demo Mode` (`T01`–`T08`, `T18`, `T28`)
- [ ] Implementar `src/habitat/scene-machine.js` (estados `inside`, `exiting`, `outside`, `entering`, fila única de porta `doorQueue`, interrupção suave se novo trabalho chegar durante `entering` e garantia de `000` = cabana fechada sem personagens fora) com testes unitários determinísticos.
- [ ] Implementar controlador `Demo Mode` explicitamente identificado por badge `[DEMO]` para alternar com 1 clique entre as 8 combinações (`000`–`111`), pedido de permissão, erro, conclusão e modo movimento reduzido (`T27`).

### G1.4 — Validação visual humana no desktop (Checkpoint do dono)
- [ ] Rodar no Windows sobre papel de parede claro e escuro, conferindo recorte alfa, proporção da cabana, legibilidade dos 3 personagens e conforto visual parado (`000`) e cheio (`111`).

## Critério de Saída (Checkpoint G1)
- [ ] Testes unitários da máquina de cena e validador de manifest passando (`npm test`).
- [ ] Capturas reais das 8 combinações registradas e aprovadas visualmente pelo proprietário.
