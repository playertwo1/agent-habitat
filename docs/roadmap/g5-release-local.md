# Gate G5 — Empacotamento e Release Local Windows (`v0.1.0`)

**Esforço:** P/M · **Depende de:** [G4](g4-hardening-windows.md) · **Próximo:** [P1 — Pós-MVP](p1-pos-mvp.md)

## Objetivo
Empacotar o instalador Windows NSIS (`x64` e `arm64`) **100% localmente via CLI** (zero GitHub Actions), auditar o pacote extraído, validar instalação limpa/atualização/desinstalação e publicar a release inicial `v0.1.0` no repositório privado `playertwo1/agent-habitat`.

## Subetapas

### G5.1 — Ícone oficial, metadados finais e scripts de build local
- [ ] Gerar `assets/icon.ico` e `assets/icon.png` definitivos da **Cozy Cottage** (bandeja, instalador NSIS e atalho do Windows).
- [ ] Revisar `NOTICE.md`, `LICENSE`, `CHANGELOG.md` e `README.md` com notas de compatibilidade e instruções claras de uso e reversão de hooks.
- [ ] Criar/validar script local `scripts/release-local.ps1` que executa `npm test`, `npm run build:win:x64`, auditoria nativa do pacote extraído e geração de hashes `SHA256SUMS.txt`.

### G5.2 — Teste de instalação real e publicação via `gh release create`
- [ ] Testar o instalador `.exe` gerado localmente: instalação limpa, primeiro boot (`000`), ativação real de agente, fechamento e desinstalação limpa.
- [ ] Criar tag `v0.1.0` e publicar os artefatos localmente via `gh release create v0.1.0` em `playertwo1/agent-habitat` (sem acionar nenhum workflow remoto).

## Critério de Saída (Checkpoint G5)
- [ ] Release `v0.1.0` publicada com instalador assinado por hash SHA-256 e validada na máquina real pelo proprietário.
