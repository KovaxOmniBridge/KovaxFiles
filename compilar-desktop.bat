@echo off
cd /d "%~dp0"
chcp 65001 > nul
set CSC_IDENTITY_AUTO_DISCOVERY=false
echo ========================================================
echo   KOVAXFILES DESKTOP - COMPILACAO NATIVA 100%% LOCAL
echo ========================================================
echo.
echo [1/3] Verificando dependencias e instalando...
call npm.cmd install --no-fund --no-audit
if errorlevel 1 goto erro

echo.
echo [2/3] Compilando codigo TypeScript e interface React...
call npm.cmd run build
if errorlevel 1 goto erro

echo.
echo [3/3] Criando instaladores desktop para Windows (.exe / .msi)...
call npm.cmd run package:win
if errorlevel 1 goto erro

echo.
echo ========================================================
echo   SUCESSO! Instaladores gerados na pasta: release/
echo ========================================================
pause
exit /b 0

:erro
echo.
echo ========================================================
echo   ERRO NA COMPILACAO! Verifique as mensagens acima.
echo ========================================================
pause
exit /b 1
