@echo off
title PetaLab Installer & Health Check
echo ===================================================
echo   PetaLab GIS Web - Instalasi & Pemeriksaan Sistem
echo ===================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Python tidak ditemukan di PATH. Silakan instal Python 3.11+ terlebih dahulu.
    pause
    exit /b 1
)

echo [1/3] Memeriksa dan memasang paket Python backend...
python -m pip install -e backend

echo.
echo [2/3] Memeriksa dan membangun frontend React...
if exist frontend\package.json (
    pushd frontend
    call npm install
    call npm run build
    popd
)

echo.
echo [3/3] Menjalankan Health Check PetaLab...
python -c "from petalab.core.health import get_system_health; import json; print(json.dumps(get_system_health(), indent=2))"

echo.
echo ===================================================
echo   Instalasi selesai! Jalankan PetaLab.bat untuk mulai.
echo ===================================================
pause
