@echo off
cd /d "%~dp0"
chcp 65001 > nul
echo ========================================================
echo   INICIANDO KOVAXFILES DESKTOP EM MODO DESENVOLVIMENTO
echo ========================================================
echo.
call npm.cmd run dev
pause
