# Gate G4 — Hardening Windows, Desempenho, Acessibilidade e Segurança

**Esforço:** M · **Depende de:** [G3](g3-habitat-integrado.md) · **Próximo:** [G5 — Release Local](g5-release-local.md)

## Objetivo
Endurecer o aplicativo no uso contínuo em Windows 10/11: escalas fracionárias de DPI, múltiplos monitores, jogos/vídeos em tela cheia, orçamento de CPU/RAM durante 1 hora, acessibilidade por teclado e reversibilidade total dos hooks.

## Subetapas

### G4.1 — Matriz de monitores, DPI e tela cheia (`T20`, `T21`, `T22`)
- [ ] Validar nitidez de pixel art, posicionamento de cards/painel e área segura (sem cobrir barra de tarefas) em `100%`, `125%`, `150%` e `200%` DPI e na troca/desconexão de monitor secundário.
- [ ] Validar ocultação automática em tela cheia e ausência total de roubo de foco (`WS_EX_NOACTIVATE`).

### G4.2 — Desempenho e estabilidade de longa duração (`T23`)
- [ ] Medir consumo de CPU e RAM (processo principal + renderers) por 5 min em repouso (`000`), 5 min com os 3 ativos (`111`) e 1 hora contínua sem vazamento de memória; pausar timers/animações supérfluas quando em `000`.

### G4.3 — Segurança, privacidade e hooks reversíveis (`T24`, `T25`, `T26`, `T27`)
- [ ] Testar instalação, reparo e desinstalação dos hooks sobre configurações reais com outros hooks/skills já presentes (ex.: Impeccable, Lumen), comprovando backup datado e preservação integral de terceiros.
- [ ] Auditar logs/armazenamento local para confirmar zero gravação de prompts, código ou segredos (`T25`) e validar navegação completa por teclado + modo movimento reduzido (`T27`).

## Critério de Saída (Checkpoint G4)
- [ ] Relatório de medições reais (CPU, RAM, latência, DPI) registrado em `docs/evidencias-g4.md`.
- [ ] Todos os cenários `T01`–`T28` aprovados.
