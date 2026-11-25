# Gate G5 — Empacotamento e Release Local Windows (`v0.1.0`)

**Esforço:** P/M · **Depende de:** [G4](g4-hardening-windows.md) · **Próximo:** [P1 — Pós-MVP](p1-pos-mvp.md)

## Objetivo
Empacotar o instalador Windows NSIS (`x64` e `arm64`) **100% localmente via CLI** (zero GitHub Actions), auditar o pacote extraído, validar instalação limpa/atualização/desinstalação e publicar a release inicial `v0.1.0` no repositório privado `playertwo1/agent-habitat`.

## Subetapas

### G5.1 — Ícone oficial, metadados finais e scripts de build local
- [x] Gerar `assets/icon.ico` e `assets/icon.png` definitivos da **Cozy Cottage** (bandeja, instalador NSIS e atalho do Windows). *Evidência:* `tools/generate-habitat-icon.py` → `icon.png` 1024×1024 RGBA (alfa 0–255), `icon.ico` com 16/24/32/48/64/128/256; `npm run audit:assets -- --prospective` = `0 error(s), 0 warning(s)`.
- [x] Revisar `NOTICE.md`, `LICENSE`, `CHANGELOG.md` e `README.md` com notas de compatibilidade e instruções claras de uso e reversão de hooks. *Evidência:* `CHANGELOG` com `[0.1.0] - 2026-11-25`; README com instalação, coexistência com `clawd-on-desk` e hooks; botão do painel renomeado para "Remover Conectores do Habitat" (a reversão não restaura `.bak`).
- [x] Criar/validar script local `scripts/release-local.ps1` que executa `npm test`, `npm run build:win:x64`, auditoria nativa do pacote extraído e geração de hashes `SHA256SUMS.txt`. *Evidência:* execução completa com exit 0: `npm test` 15.815 pass / 0 fail, `test/habitat-*.test.js` 70/70, build `build:win:all --publish never` (x64 + arm64), auditoria nativa `windows-x64`/`windows-arm64` com 0 erros (só a exceção documentada `elevate.exe` ia32) e `dist/SHA256SUMS.txt` conferido com `Get-FileHash`. Corrigidos 11 testes herdados que já falhavam desde `e216f924` por dependência do ambiente (Claude Code recente → hooks exec form; CLI `hermes` real; ACL do `%TEMP%`).

### G5.2 — Teste de instalação real e publicação via `gh release create`
- [ ] Testar o instalador `.exe` gerado localmente: instalação limpa, primeiro boot (`000`), ativação real de agente, fechamento e desinstalação limpa.
- [ ] Criar tag `v0.1.0` e publicar os artefatos localmente via `gh release create v0.1.0` em `playertwo1/agent-habitat` (sem acionar nenhum workflow remoto).

## Critério de Saída (Checkpoint G5)
- [ ] Release `v0.1.0` publicada com instalador assinado por hash SHA-256 e validada na máquina real pelo proprietário.
