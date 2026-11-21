@echo off
title PetaLab - Local Web GIS & Spatial ML
echo ===================================================
echo   Menyalakan PetaLab Local Server...
echo   Browser akan terbuka otomatis di http://127.0.0.1:8765
echo ===================================================
set PYTHONPATH=%~dp0backend
if exist "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" (
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe" "%~dp0backend\petalab\main.py" --open-browser
) else (
    python "%~dp0backend\petalab\main.py" --open-browser
)
pause
