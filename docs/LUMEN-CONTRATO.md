# Contrato de leitura local para o Lumen

Leitura **opcional**, **somente leitura** e **só neste computador** do estado do Agent Habitat (decisões D2–D5 e D10 do [questionário do P3](questionario/2026-11-26-p3-proximo-ciclo.md)). Consumir isto dentro do Lumen é outro projeto.

## Como ligar
Painel do Habitat → Ajustes → **Permitir que o Lumen leia o estado**. Vem **desligado**; desligado, a rota não existe (responde `404` como qualquer outra rota desconhecida).

## Onde achar a porta
O Habitat usa a primeira porta livre da faixa `23433–23437`, gravada em `~/.agent-habitat/runtime.json` (campo `port`). Não há porta nova: a rota vive no mesmo servidor local já usado pelos conectores.

## Requisição
```
GET http://127.0.0.1:<porta>/lumen/v1/estado
```
- Só `GET`. Qualquer outro método → `405` (`Allow: GET`).
- O cabeçalho `Host` precisa ser `127.0.0.1:<porta>` ou `localhost:<porta>`; outro valor → `403` (barra DNS rebinding).
- Pedidos com `Origin` ou `Sec-Fetch-Site: cross-site` (páginas web) → `403`. Sem cabeçalhos CORS: nenhuma página web ganha permissão de leitura.
- Sem token. Respostas com `Cache-Control: no-store`.

## Resposta (`200`, JSON)
```json
{
  "schema": 1,
  "geradoEmMs": 1764115200000,
  "provedores": {
    "claude":      { "fora": true,  "estado": "working", "pendente": true,  "sessoes": 2 },
    "codex":       { "fora": false, "estado": "idle",    "pendente": false, "sessoes": 0 },
    "antigravity": { "fora": true,  "estado": "unknown", "pendente": false, "sessoes": 1 }
  }
}
```
| Campo | Significado |
|---|---|
| `fora` | O morador está fora da cabana (saindo, fora ou voltando). Com `000`, todos `false`. |
| `estado` | `working`, `waiting` (espera resposta ou aprovação), `done`, `error`, `idle` (sem trabalho) ou `unknown`. Estado não reconhecido é **sempre** `unknown`, nunca `working`. |
| `pendente` | Há permissão pendente ou erro que exige ação. |
| `sessoes` | Quantidade de sessões do provedor conhecidas agora. |

Não há ids de sessão, pastas, prompts, PIDs nem comandos: o Habitat não recebe nada por esta rota.

## Teste com `curl`
```powershell
$porta = (Get-Content "$env:USERPROFILE\.agent-habitat\runtime.json" | ConvertFrom-Json).port
curl.exe -i "http://127.0.0.1:$porta/lumen/v1/estado"                                  # 200 com a opção ligada; 404 desligada
curl.exe -i -X POST "http://127.0.0.1:$porta/lumen/v1/estado"                          # 405
curl.exe -i -H "Host: evil.example.com" "http://127.0.0.1:$porta/lumen/v1/estado"      # 403
curl.exe -i -H "Origin: https://site.com" "http://127.0.0.1:$porta/lumen/v1/estado"    # 403
```
