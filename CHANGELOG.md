# Changelog

Todas as mudanças relevantes do **Agent Habitat** são documentadas neste arquivo, seguindo o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Planejado (Próximo Gate — G0)
- Auditoria do repositório `Arnav8452/atom` (sprites originais do Atom e detecção do Antigravity IDE).
- Matriz comprovada das 6 superfícies Windows (Claude CLI/Desktop, Codex CLI/Desktop, Antigravity IDE/CLI).
- Isolamento de `appId`, porta loopback, diretório `userData` e marcadores de hook em relação ao `clawd-on-desk`.

## [0.1.0-kickoff] - 2026-11-24

### Adicionado
- Criação do repositório **Agent Habitat (Cozy Cottage Edition)** a partir da base validada `playertwo1/clawd-on-desk@1.6.4` (`e216f924`).
- Registro das decisões fundacionais `D1`–`D8` em `docs/questionario/2026-11-24-kickoff-agent-habitat.md`.
- Especificação completa de produto (`docs/PRODUCT.md`), direção artística e camadas da cabana (`docs/DESIGN.md`), arquitetura técnica multi-personagem (`docs/ARCHITECTURE.md`) e inventário de referências (`docs/REFERENCIAS_GITHUB.md`).
- Roadmap modular orientado a gates de evidência (`docs/ROADMAP.md` + `docs/roadmap/g0` a `g5` e `p1-pos-mvp`) e ponto único de retomada (`docs/STATE.md`).
- Guia operacional para agentes em `AGENTS.md`, `README.md` principal em pt-BR e as 7 pranchas conceituais em `docs/referencias_visuais/`.

### Alterado
- Arquivamento dos READMEs multilíngues e guias originais do `clawd-on-desk` em `docs/herdado-clawd/` para consulta técnica preservando a raiz limpa em pt-BR.
- Remoção integral de `.github/workflows/` e adaptação dos testes correspondentes para refletir a política de build, validação e release **100% locais via CLI (zero GitHub Actions)**.
