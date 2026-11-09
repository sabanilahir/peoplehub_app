param (
    [string]$VpsHost
)

Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host "          PEOPLEHUB - SSH TUNNEL DATABASE VPS KE LOKAL" -ForegroundColor Yellow
Write-Host "=====================================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Tunnel ini memetakan port PostgreSQL VPS (5432) ke port lokal Anda (5433)."
Write-Host ""

if (-not $VpsHost) {
    $VpsHost = Read-Host "Masukkan user dan IP VPS (contoh: root@103.xxx.xxx.xxx)"
}

if (-not $VpsHost) {
    Write-Host "[ERROR] Target VPS tidak boleh kosong!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[*] Membuka SSH Tunnel ke $VpsHost ..." -ForegroundColor Green
Write-Host "[*] Port Lokal: 5433 ---> VPS Port: 5432" -ForegroundColor Green
Write-Host ""
Write-Host "PENTING:" -ForegroundColor Yellow
Write-Host "  1. Biarkan jendela terminal ini TETAP TERBUKA selama menjalankan 'npm run dev'."
Write-Host "  2. Pastikan file .env lokal mengarah ke localhost:5433"
Write-Host "  3. Tekan Ctrl+C untuk menutup koneksi tunnel."
Write-Host ""

ssh -N -L 5433:localhost:5432 $VpsHost
