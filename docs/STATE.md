# STATE — Ponto de Retomada do Agent Habitat

**Atualizado:** 2026-11-24 · **Versão atual:** `0.1.0-kickoff` (pré-G0, herdado de `playertwo1/clawd-on-desk@1.6.4`) · **Etapa da vez:** [G0 — Descoberta, Licenças e Isolamento da Base](roadmap/g0-descoberta-e-base.md)

Este arquivo registra **apenas** onde estamos, o que aguarda validação do dono e qual é a próxima ação imediata. Para detalhes das etapas, consulte o [ROADMAP](ROADMAP.md).

## Onde Estamos

| Etapa | Estado |
|---|---|
| **Kickoff (`D1`–`D8`)** | **Concluído em 2026-11-24.** Repositório criado em `C:\Users\notefael\projetos\agent-habitat` sobre `playertwo1/clawd-on-desk` (`e216f924`), workflows de GitHub Actions removidos, referências visuais integradas em `docs/referencias_visuais/` e documentação fundacional completa (`PRODUCT`, `DESIGN`, `ARCHITECTURE`, `ROADMAP`, `README`, `CHANGELOG`, `AGENTS` e `questionario`). |
| **G0** | **Próxima etapa** (`G0.1` → `G0.3`). |
| **G1 – G5** | Pendentes na fila do MVP. |
| **P1 / P2** | Parqueados até o fechamento do G5. |

## Próxima Ação Imediata

1. **Executar `G0.1` ([`g0-descoberta-e-base.md`](roadmap/g0-descoberta-e-base.md)):** inspecionar `https://github.com/Arnav8452/atom` (`aae0dfe8603a82a699b210dd8c8ca717ebea31f1`), importar os sprites originais do **Atom** para `assets/originals/atom/`, inventariar os assets de **Clawd** e **Cloudling** e registrar tudo em `docs/discovery-g0.md` + `NOTICE.md`.
2. **Em seguida (`G0.2` e `G0.3`):** comprovar os eventos das 6 superfícies Windows (Claude CLI/Desktop, Codex CLI/Desktop, Antigravity IDE/CLI) e isolar `appId`, porta loopback e marcadores de hook do `agent-habitat` para não conflitar com o `clawd-on-desk`.

## Pendências do Proprietário

- Revisar se a estrutura inicial de documentos e etapas (`G0`–`G5`) está de acordo para darmos a largada no **G0.1**.
- Durante o **G0.1**, confirmar notas de atribuição/autorização dos autores de **Clawd**, **Cloudling** e **Atom** para registro formal no repositório privado (necessário antes de eventual abertura pública futura).

## Notas Técnicas Atuais

- Os testes herdados que exigiam `.github/workflows/*.yml` ou READMEs multilíngues na raiz foram adaptados no kickoff para refletir a política **100% local sem GitHub Actions** e os arquivos arquivados em `docs/herdado-clawd/`.
- Enquanto `G0.3` não for executado, `package.json` ainda carrega `appId` e portas originais do `clawd-on-desk`; portanto, **não iniciar `npm start` simultaneamente** com o `clawd-on-desk` aberto antes de concluir `G0.3`.
