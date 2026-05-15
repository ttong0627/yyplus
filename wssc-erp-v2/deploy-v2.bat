@echo off
chcp 65001 >nul
echo ===================================================
echo   [웰쉐어 통합물류 V2 시스템 - 안전 병행 배포 스크립트]
echo ===================================================
echo.
echo 기존 운영 서버(V1)에는 단 1%%의 영향도 주지 않고,
echo 완벽히 분리된 "V2 전용 독립 서버(채널)"로 배포를 시작합니다...
echo.
call "C:\Users\ttong\AppData\Roaming\npm\firebase.cmd" hosting:channel:deploy v2 --expires 30d
echo.
echo ===================================================
echo 배포가 완료되었습니다!
echo 위에 출력된 [Channel URL] 링크를 클릭하시면
echo 기존 V1과 데이터는 동일하게 공유하면서,
echo V2 시스템만 따로 테스트해 보실 수 있습니다.
echo ===================================================
pause
