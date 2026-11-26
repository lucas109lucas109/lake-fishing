@echo off
chcp 65001 > nul
cd /d "%~dp0"
title 노을 호수 낚시 - GitHub 에 올리기

echo.
echo   ==========================================
echo      노을 호수 낚시 - GitHub 에 올리기
echo   ==========================================
echo.

rem 바뀐 파일을 전부 담아요
git add -A
git diff --cached --quiet
if not errorlevel 1 (
  echo   바뀐 게 없어요. 올릴 게 없어요.
  goto end
)

echo   바뀐 파일:
git diff --cached --name-status
echo.

rem 기록 남기기 (날짜와 시간이 메시지로 들어가요)
git commit -q -m "게임 업데이트 (%date% %time:~0,5%)"

rem GitHub 에서 직접 바꾼 게 있으면 먼저 받아서 합쳐요
git pull -q --rebase origin main
if errorlevel 1 (
  echo.
  echo   [멈춤] GitHub 쪽 파일과 내 파일이 같은 곳이 바뀌어서 자동으로 못 합쳤어요.
  echo          Claude 에게 이 창 내용을 보여 주세요.
  goto end
)

rem 올리기 (처음 한 번은 GitHub 로그인 창이 떠요)
git push -q origin main
if errorlevel 1 (
  echo.
  echo   [실패] 올리지 못했어요. 처음이라면 뜬 GitHub 로그인 창에서 로그인해 주세요.
  echo          그래도 안 되면 Claude 에게 이 창 내용을 보여 주세요.
  goto end
)

echo.
echo   다 올렸어요!
echo   1~3분 뒤 https://lake-fishing.onrender.com 이 새 버전으로 바뀌어요.

:end
echo.
pause
