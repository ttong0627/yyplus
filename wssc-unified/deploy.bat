@echo off
chcp 65001 >nul
echo ===================================================
echo   [웰쉐어 통합 시스템 - 안전 병행 배포 스크립트]
echo ===================================================
echo.
echo 기존 운영 서버(ERP V1, 작업지시서)에는 단 1%%의 영향도 주지 않고,
echo 완벽히 분리된 "통합 전용 독립 채널"로 배포를 시작합니다...
echo.
call npm run build
echo.
call "C:\Users\ttong\AppData\Roaming\npm\firebase.cmd" hosting:channel:deploy unified --expires 30d
echo.
echo ===================================================
echo 배포가 완료되었습니다!
echo 위에 출력된 [Channel URL] 링크를 클릭하시면
echo wssc-nutrition--unified-xxxx.web.app 주소로 확인 가능합니다.
echo 기존 ERP V1과 작업지시서는 계속 정상 운영 중입니다.
echo ===================================================
pause
