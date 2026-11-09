@echo off
setlocal

echo =====================================================================
echo           PEOPLEHUB - SSH TUNNEL DATABASE VPS KE LOKAL
echo =====================================================================
echo.
echo Tunnel ini akan memetakan port PostgreSQL VPS (5432)
echo ke port lokal komputer Anda (5433).
echo.

set VPS_HOST=%1

if "%VPS_HOST%"=="" (
    set /p VPS_HOST="Masukkan user dan IP VPS (contoh: root@103.xxx.xxx.xxx): "
)

if "%VPS_HOST%"=="" (
    echo [ERROR] Target VPS tidak boleh kosong!
    pause
    exit /b 1
)

echo.
echo [*] Membuka SSH Tunnel ke %VPS_HOST% ...
echo [*] Port Lokal: 5433 ---> VPS Port: 5432
echo.
echo PENTING:
echo - Biarkan jendela terminal ini TETAP TERBUKA selama Anda coding di lokal.
echo - Tekan Ctrl+C untuk menutup koneksi tunnel kapan saja.
echo.

ssh -N -L 5433:localhost:5432 %VPS_HOST%

if errorlevel 1 (
    echo.
    echo [ERROR] Koneksi SSH terputus atau gagal.
    pause
)
