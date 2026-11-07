# Script untuk mengunduh Flowable Open Source secara otomatis (Tanpa Docker)
$ErrorActionPreference = 'Stop'

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   PENGUNDUH FLOWABLE OPEN SOURCE LOKAL (TANPA DOCKER)   " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$targetDir = Join-Path $PSScriptRoot "..\flowable"
if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$targetWar = Join-Path $targetDir "flowable-ui.war"
if (Test-Path $targetWar) {
    Write-Host "[OK] flowable-ui.war sudah ada di: $targetWar" -ForegroundColor Green
    Write-Host "Anda dapat langsung menjalankan: scripts\start-flowable.bat" -ForegroundColor Yellow
    exit 0
}

$zipUrl = "https://github.com/flowable/flowable-engine/releases/download/flowable-6.8.0/flowable-6.8.0.zip"
$zipPath = Join-Path $targetDir "flowable-dist.zip"
$tempExtractDir = Join-Path $targetDir "temp"

Write-Host "[1/3] Mengunduh Flowable distribution dari GitHub..." -ForegroundColor Yellow
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath

Write-Host "[2/3] Mengekstrak paket flowable-ui.war..." -ForegroundColor Yellow
Expand-Archive -Path $zipPath -DestinationPath $tempExtractDir -Force
Copy-Item (Join-Path $tempExtractDir "flowable-6.8.0\wars\flowable-ui.war") $targetWar -Force

Write-Host "[3/3] Membersihkan file sementara..." -ForegroundColor Yellow
Remove-Item $tempExtractDir -Recurse -Force
Remove-Item $zipPath -Force

Write-Host ""
Write-Host "[BERHASIL] Flowable Engine telah siap di: $targetWar" -ForegroundColor Green
Write-Host "Untuk menyalakan engine, jalankan:" -ForegroundColor Cyan
Write-Host "  .\scripts\start-flowable.bat" -ForegroundColor White
Write-Host "atau:" -ForegroundColor Cyan
Write-Host "  java -jar flowable\flowable-ui.war --server.port=8080" -ForegroundColor White
Write-Host ""

