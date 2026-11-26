# P3 — próximo ciclo do Agent Habitat
Status: concluído · Início: 2026-11-26
Objetivo: decidir o escopo, a ordem e as regras do ciclo depois da v0.3.1 (itens parqueados e dívida técnica).

## Contexto
Versão publicada: v0.3.1. P1 e P2 sem pendências do dono. Parqueados desde o P1/P2: Space Habitat, 4º morador (provedor extra), ponte de status com o Lumen. Dívida técnica anotada: teste instável sob carga (`codex-file-identity`, `accessory-motion-electron`), desinstalar hooks do painel remove grupos mistos, `KILL_PROCESS` por prefixo no NSIS, instalador sem assinatura, build arm64 e atualização automática ainda não usados.

## Decisões
### D1 - Frentes do P3
- Pergunta: quais frentes entram no P3.
- Decisão: **Space Habitat (3º tema)**, **Robustez e distribuição** e **ponte de status com o Lumen**.
- Por quê: o tema reaproveita o pipeline do Gemini; a robustez fecha dívidas já anotadas; a ponte com o Lumen foi escolhida pelo dono.
- Descartado: 4º morador / provedor extra nesta etapa (continua parqueado).
- Difícil de reverter: não

### D2 - Direção da ponte com o Lumen
- Pergunta: como deve ser a ponte de status entre o Habitat e o Lumen.
- Decisão: **o Lumen lê o estado, só local**: o Habitat expõe um estado mínimo somente leitura em `127.0.0.1`; o Lumen consulta. O Habitat não recebe comandos e nada sai da máquina.
- Por quê: mantém a interatividade segura (D3 do projeto) e zero canais remotos; é a menor superfície.
- Descartado: o Habitat avisar o Lumen (push, exige conhecer o endereço dele) e o Lumen comandar o Habitat (amplia a superfície de ataque).
- Difícil de reverter: não

### D3 - Dados expostos ao Lumen
- Pergunta: que dados o Lumen pode ler.
- Decisão: **resumo mínimo por provedor**: fora da cabana ou não, estado (trabalhando, esperando, concluído, erro, desconhecido), intervenção pendente e número de sessões. **Sem ids, pastas, prompts nem PIDs.** `unknown` nunca vira trabalhando.
- Por quê: o `/habitat/snapshot` atual já devolve ids de sessão, PIDs e nome de pasta; o Lumen não precisa disso.
- Descartado: incluir nome do projeto; expor o snapshot completo.
- Difícil de reverter: não

### D4 - Ativação da ponte
- Pergunta: a ponte local para o Lumen vem ligada ou desligada.
- Decisão: **desligada por padrão; o dono liga em Ajustes** (opt-in explícito). Sem ligar, não existe nenhuma porta de leitura nova.
- Por quê: mesmo com dado mínimo é saída de informação; quem nunca pediu não ganha superfície.
- Descartado: ligada por padrão.
- Difícil de reverter: não

### D5 - Proteção da leitura local
- Pergunta: como proteger a leitura local do estado.
- Decisão: **só `127.0.0.1`, só `GET`, sem token**; sem cabeçalhos CORS e recusando `Host`/`Origin` estranhos (barra páginas web e DNS rebinding).
- Por quê: o dado é mínimo e sem identificadores; token daria atrito ao Lumen e mais pontos de falha.
- Descartado: token local em `~/.agent-habitat`.
- Difícil de reverter: não

### D6 - Itens de robustez e distribuição
- Pergunta: quais itens entram.
- Decisão: **correções de confiabilidade** (testes instáveis sob carga, desinstalador do painel preservando grupos mistos de hooks, `KILL_PROCESS` do NSIS por correspondência exata) e **aviso de nova versão**.
- Por quê: as correções fecham dívidas já anotadas sem mudar o comportamento; o aviso ajuda a manter instalações atualizadas.
- Descartado: instalador arm64 e assinatura de código (certificado pago) nesta etapa.
- Difícil de reverter: não

### D7 - Aviso de nova versão
- Pergunta: como o aviso funciona, sendo a única chamada de rede do app.
- Decisão: **opt-in (desligado por padrão), só avisa, nunca baixa**: ligado em Ajustes, lê o `latest.yml` público do GitHub no máximo 1 vez por dia, sem enviar nada do usuário (sem id, sem telemetria), e mostra no painel "versão X disponível" com link para a release. Baixar e instalar continua manual.
- Por quê: ajuda a manter instalações atualizadas sem abrir canal nem executar nada sozinho; é exceção explícita e mínima à regra de zero rede.
- Descartado: ligado por padrão; baixar e instalar sozinho (instalador não é assinado).
- Difícil de reverter: não

### D8 - Conceito do Space Habitat
- Pergunta: qual é a ideia do tema.
- Decisão: **domo/cápsula em asteroide flutuante**: a cabana vira um domo com chaminé-antena sobre uma ilha de rocha no espaço estrelado; mantém terreno, 3 estações e jardim (jardim de cristais). Ajudantes: drones pequenos. Mesmo pipeline e geometria dos outros temas (arte pelo Gemini, processador existente).
- Por quê: cabe na geometria atual sem código novo e preserva o tom acolhedor.
- Descartado: base em superfície lunar/Marte; interior de estação espacial (muda o layout).
- Difícil de reverter: não

### D9 - Ordem das fases e release
- Pergunta: ordem das fases e quando sai a release.
- Decisão: **P3.1** prompts do Space Habitat (para o dono pedir ao Gemini em paralelo); **P3.2** correções de confiabilidade; **P3.3** ponte local para o Lumen; **P3.4** aviso de nova versão; **P3.5** processar e aprovar o Space com a arte entregue. **Um build único no fim e release `v0.4.0`** (versão menor: traz recursos novos).
- Por quê: a arte é o item mais demorado e independente do código, então começa primeiro.
- Descartado: tema por último (a arte atrasaria o ciclo); duas releases (0.3.2 e 0.4.0).
- Difícil de reverter: não

### D10 - Alcance do lado do Lumen
- Pergunta: até onde o P3 vai do lado do Lumen.
- Decisão: **só o endpoint e o contrato**: o Habitat entrega o servidor de leitura, o JSON documentado e um teste com `curl`; consumir isso dentro do Lumen é outro projeto e fica fora do P3.
- Por quê: não mexe em outro repositório nem em decisões dele.
- Descartado: cliente de exemplo; alterar o código do Lumen.
- Difícil de reverter: não

## Em aberto
- Detalhes técnicos que o roadmap fecha sem nova decisão do dono: porta e caminho do endpoint (dentro da faixa `23433–23437`), campos exatos do JSON, frequência e texto do aviso de versão.
- Space Habitat: detalhes dos 8 prompts (jardim de cristais, drones) saem no pacote de prompts e podem ser ajustados com o dono depois de ver a arte.
- Quais testes instáveis entram na estabilização (hoje: `codex-file-identity` e `accessory-motion-electron`).

## Próximos passos
1. Dono confirma este entendimento.
2. Montar o roadmap do P3 com a skill `roadmap-fases` (índice `docs/roadmap/p3-*.md` + um arquivo por fase P3.1–P3.5) e atualizar `docs/ROADMAP.md` e `docs/STATE.md`.
3. P3.1: escrever o pacote de prompts do Space Habitat (`docs/arte-p3/`), com guia de layout, para o dono pedir ao Gemini.
4. Executar P3.2 a P3.5 uma fase por vez, build único no fim e release `v0.4.0` só com confirmação do dono.

## Regras que continuam valendo
Zero GitHub Actions, zero telemetria, `000` = ninguém fora, moradores originais sem recolorir, hooks reversíveis com backup. Exceção única e opt-in: a consulta diária do aviso de versão (D7), e a leitura local para o Lumen (D2–D5), também opt-in.
