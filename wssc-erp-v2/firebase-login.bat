@echo off
chcp 65001 >nul
echo ===================================================
echo   [웰쉐어 배포용 구글 클라우드 로그인 스크립트]
echo ===================================================
echo.
echo 웹 브라우저가 열리면 구글 계정으로 로그인해 주세요.
echo 로그인이 완료되면 이 창은 닫으셔도 됩니다.
echo.
call "C:\Users\ttong\AppData\Roaming\npm\firebase.cmd" login
echo.
pause
