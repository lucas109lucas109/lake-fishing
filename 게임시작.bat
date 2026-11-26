@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 노을 호수 낚시 - 서버

echo.
echo   ==========================================
echo      노을 호수 낚시
echo   ==========================================
echo.
echo   서버를 시작합니다... 잠시 뒤 브라우저가 열려요.
echo.
echo   [중요] 게임하는 동안 이 검은 창을 닫지 마세요.
echo          게임이 끝나면 이 창을 닫으면 돼요.
echo.

start "" cmd /c "timeout /t 2 /nobreak > nul && start http://localhost:5201"
node server.js

echo.
echo   서버가 종료되었습니다.
pause
