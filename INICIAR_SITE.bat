@echo off
cd /d "%~dp0"
echo ==========================================
echo   INICIANDO O SITE "O QUE ASSISTIR?"
echo ==========================================
echo.
echo Mantenha esta janela aberta enquanto usa o site.
echo Para encerrar, feche esta janela.
echo.

:: O site usa modulos ES: precisa de um servidor local (abrir o index.html direto nao funciona)
start "" cmd /c "timeout /t 3 >nul & start http://localhost:5173"
call npm start
pause
