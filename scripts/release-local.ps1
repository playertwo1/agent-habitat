<#
.SYNOPSIS
  Pipeline local de release do Agent Habitat (sem GitHub Actions).

.DESCRIPTION
  Roda testes, auditoria de assets, builds NSIS (x64 e, opcionalmente, arm64),
  auditoria nativa dos diretórios desempacotados e gera dist/SHA256SUMS.txt.
  Não faz commit, push, criação de tag nem chama gh. Não encerra processos.

.PARAMETER SkipArm64
  Não gera nem audita o build windows-arm64.

.PARAMETER SkipBuild
  Roda apenas testes e auditoria de assets. Pula builds, auditoria nativa e checksums.

.EXAMPLE
  pwsh -NoProfile -File scripts/release-local.ps1 -SkipBuild
#>
[CmdletBinding()]
param(
  [switch]$SkipArm64,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
$repoRaiz = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $repoRaiz

function Invoke-Etapa {
  param(
    [Parameter(Mandatory)][string]$Nome,
    [Parameter(Mandatory)][string]$Comando,
    [string[]]$Argumentos = @()
  )
  Write-Host "`n== $Nome ==" -ForegroundColor Cyan
  Write-Host "   $Comando $($Argumentos -join ' ')" -ForegroundColor DarkGray
  & $Comando @Argumentos
  if ($LASTEXITCODE -ne 0) {
    throw "Etapa falhou: $Nome (código de saída $LASTEXITCODE)."
  }
}

$package = Get-Content -LiteralPath (Join-Path $repoRaiz 'package.json') -Raw | ConvertFrom-Json
$versao = $package.version
$dist = Join-Path $repoRaiz 'dist'
$geradosNesta = [System.Collections.Generic.List[string]]::new()

# 1. Suíte automatizada completa
Invoke-Etapa -Nome 'npm test' -Comando 'npm' -Argumentos @('test')

# 2. Testes habitat (o run-tests.js já cobre test/*.test.js; rodar de novo é barato)
$testDir = Join-Path $repoRaiz 'test'
$specsHabitat = @(Get-ChildItem -LiteralPath $testDir -Filter 'habitat-*.test.js' -File |
  Sort-Object Name | ForEach-Object { "test/$($_.Name)" })
if ($specsHabitat.Count -eq 0) {
  throw 'Nenhum arquivo test/habitat-*.test.js encontrado.'
}
Invoke-Etapa -Nome "node --test habitat ($($specsHabitat.Count) arquivos)" -Comando 'node' `
  -Argumentos (@('--test', '--test-concurrency=2', '--test-timeout=120000') + $specsHabitat)

# 3. Auditoria de assets (árvore de trabalho prospectiva)
Invoke-Etapa -Nome 'npm run audit:assets -- --prospective' -Comando 'npm' `
  -Argumentos @('run', 'audit:assets', '--', '--prospective')

if ($SkipBuild) {
  Write-Host "`n== Builds, auditoria nativa e checksums ignorados (-SkipBuild) ==" -ForegroundColor Yellow
} else {
  # 4. Builds NSIS (x64+arm64 numa só chamada para o latest.yml listar os dois; nunca publicar daqui)
  $scriptBuild = if ($SkipArm64) { 'build:win:x64' } else { 'build:win:all' }
  Invoke-Etapa -Nome "npm run $scriptBuild (NSIS)" -Comando 'npm' -Argumentos @('run', $scriptBuild, '--', '--publish', 'never')

  # 5. Auditoria nativa dos diretórios desempacotados (electron-builder: win-unpacked / win-arm64-unpacked)
  $alvos = @(@{ Alvo = 'windows-x64'; Pasta = 'win-unpacked' })
  if (-not $SkipArm64) {
    $alvos += @{ Alvo = 'windows-arm64'; Pasta = 'win-arm64-unpacked' }
  }
  foreach ($item in $alvos) {
    $appRoot = Join-Path $dist $item.Pasta
    if (-not (Test-Path -LiteralPath (Join-Path $appRoot 'resources\app.asar') -PathType Leaf)) {
      throw "app.asar não encontrado em $($item.Pasta)/resources. Verifique o build anterior."
    }
    $saidaJson = Join-Path $dist "native-audit-$($item.Alvo).json"
    Invoke-Etapa -Nome "auditoria nativa $($item.Alvo)" -Comando 'npm' -Argumentos @(
      'run', 'audit:native-package', '--',
      '--app-root', $appRoot,
      '--target', $item.Alvo,
      '--output', $saidaJson
    )
    $geradosNesta.Add("dist/native-audit-$($item.Alvo).json")
  }

  # 6. SHA256SUMS.txt (formato sha256sum: "<hash>  <nome>", UTF-8 sem BOM, LF)
  Write-Host "`n== SHA256SUMS.txt ==" -ForegroundColor Cyan
  $padraoExe = if ($SkipArm64) { "Agent-Habitat-Setup-$versao-x64.exe" } else { "Agent-Habitat-Setup-$versao-*.exe" }
  $instaladores = @(Get-ChildItem -LiteralPath $dist -Filter $padraoExe -File | Sort-Object Name)
  if ($instaladores.Count -eq 0) {
    throw "Nenhum instalador '$padraoExe' encontrado em dist/."
  }
  $nomes = [System.Collections.Generic.List[string]]::new()
  foreach ($exe in $instaladores) {
    $nomes.Add($exe.Name)
    $blockmap = "$($exe.Name).blockmap"
    if (Test-Path -LiteralPath (Join-Path $dist $blockmap) -PathType Leaf) { $nomes.Add($blockmap) }
  }
  if (Test-Path -LiteralPath (Join-Path $dist 'latest.yml') -PathType Leaf) { $nomes.Add('latest.yml') }

  $linhas = foreach ($nome in ($nomes | Sort-Object)) {
    $hash = (Get-FileHash -LiteralPath (Join-Path $dist $nome) -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $nome"
  }
  $sumsPath = Join-Path $dist 'SHA256SUMS.txt'
  [System.IO.File]::WriteAllText($sumsPath, (($linhas -join "`n") + "`n"), [System.Text.UTF8Encoding]::new($false))
  Write-Host "   Gerado: dist/SHA256SUMS.txt ($($nomes.Count) arquivos)"
  $geradosNesta.Add('dist/SHA256SUMS.txt')
  foreach ($nome in $nomes) { $geradosNesta.Add("dist/$nome") }
}

# Resumo final
Write-Host "`n== Resumo da release local (versão $versao) ==" -ForegroundColor Green
if ($SkipBuild) {
  Write-Host '   Modo -SkipBuild: testes e auditoria de assets passaram. Nenhum artefato novo foi gerado.'
} else {
  Write-Host '   Artefatos gerados nesta execução:'
  foreach ($relativo in $geradosNesta) {
    $caminho = Join-Path $repoRaiz $relativo
    if (Test-Path -LiteralPath $caminho -PathType Leaf) {
      $tamanhoMb = [math]::Round((Get-Item -LiteralPath $caminho).Length / 1MB, 2)
      Write-Host ("   - {0} ({1} MB)" -f $relativo, $tamanhoMb)
    } else {
      Write-Host ("   - {0} (ausente)" -f $relativo) -ForegroundColor Yellow
    }
  }
  Write-Host '   Próximo passo manual: revisar dist/ e decidir a publicação (este script não publica nada).'
}
Write-Host 'Pipeline concluído com sucesso.' -ForegroundColor Green
