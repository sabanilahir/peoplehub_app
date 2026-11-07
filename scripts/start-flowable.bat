@echo off
setlocal enabledelayedexpansion
title Flowable Engine (Lokal - Tanpa Docker)

echo ========================================================
echo   FLOWABLE ENGINE OPENSOURCE (LOKAL - TANPA DOCKER)
echo ========================================================
echo.

REM 1. Cek apakah Java terpasang
where java >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Java tidak ditemukan di sistem Anda!
    echo Flowable Engine membutuhkan Java (JDK/JRE 11, 17, atau 21).
    echo.
    echo Silakan install Java terlebih dahulu:
    echo - Unduh gratis: https://adoptium.net/temurin/releases/
    echo.
    pause
    exit /b 1
)

echo [OK] Java terdeteksi:
java -version
echo.

REM 2. Cari file binary Flowable JAR / WAR
set TARGET_JAR=
if exist "flowable-7-all-in-one.jar" set TARGET_JAR=flowable-7-all-in-one.jar
if exist "flowable-ui.war" set TARGET_JAR=flowable-ui.war
if exist "flowable-rest.war" set TARGET_JAR=flowable-rest.war
if exist "flowable\flowable-ui.war" set TARGET_JAR=flowable\flowable-ui.war
if exist "flowable\flowable-rest.war" set TARGET_JAR=flowable\flowable-rest.war
if exist "flowable\flowable-all-in-one.jar" set TARGET_JAR=flowable\flowable-all-in-one.jar

REM 3. Jika belum ada, tawarkan unduh otomatis
if "%TARGET_JAR%"=="" (
    echo [INFO] Binary Flowable belum ditemukan di folder project.
    echo.
    echo Pilihan:
    echo 1. Unduh otomatis Flowable Open Source (via PowerShell)
    echo 2. Keluar dan unduh manual
    echo.
    set /p CHOICE="Pilih tindakan (1/2, default 1): "
    if "!CHOICE!"=="" set CHOICE=1
    
    if "!CHOICE!"=="1" (
        echo.
        echo [INFO] Menjalankan unduhan Flowable Open Source ke folder 'flowable/'...
        echo Mohon tunggu proses unduh...
        if not exist "flowable" mkdir flowable
        powershell -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $url = 'https://github.com/flowable/flowable-engine/releases/download/flowable-6.8.0/flowable-6.8.0.zip'; Write-Host 'Downloading Flowable distribution...'; Invoke-WebRequest -Uri $url -OutFile 'flowable\flowable-dist.zip'; Write-Host 'Extracting flowable-ui.war...'; Expand-Archive -Path 'flowable\flowable-dist.zip' -DestinationPath 'flowable\temp' -Force; Copy-Item 'flowable\temp\flowable-6.8.0\wars\flowable-ui.war' 'flowable\flowable-ui.war'; Remove-Item 'flowable\temp' -Recurse -Force; Remove-Item 'flowable\flowable-dist.zip' -Force; Write-Host 'Selesai!'"
        
        if exist "flowable\flowable-ui.war" (
            set TARGET_JAR=flowable\flowable-ui.war
        ) else (
            echo [GAGAL] Pengunduhan otomatis tidak selesai.
            echo Silakan unduh manual dari:
            echo https://github.com/flowable/flowable-engine/releases/download/flowable-6.8.0/flowable-6.8.0.zip
            echo Dan ekstrak file 'flowable-ui.war' ke dalam folder 'flowable/'.
            pause
            exit /b 1
        )
    ) else (
        echo Silakan unduh Flowable Open Source dari:
        echo https://flowable.com/open-source/ atau GitHub releases.
        pause
        exit /b 0
    )
)

echo.
echo ========================================================
echo   Menjalankan: %TARGET_JAR%
echo   Port:        8080
echo   REST API:    http://localhost:8080/flowable-rest
echo   UI Portal:   http://localhost:8080/flowable-ui
echo   Login:       admin / test
echo ========================================================
echo.
echo [INFO] Flowable menggunakan database lokal terintegrasi.
echo Tekan Ctrl + C di jendela ini untuk mematikan engine.
echo.

java -Xmx1024m -jar "%TARGET_JAR%" --server.port=8080

pause
