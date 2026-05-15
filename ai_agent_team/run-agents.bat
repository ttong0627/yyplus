@echo off
chcp 65001 >nul
echo ===================================================
echo   [AI 에이전트 10인 완전체 - 자동 실행 스크립트]
echo ===================================================
echo.

python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [오류] Python이 설치되어 있지 않거나 환경 변수에 없습니다!
    echo 좌측의 'python_installer.exe'를 더블클릭하여 먼저 설치해주세요.
    echo.
    echo 🚨 주의: 설치 첫 화면 맨 아래에 있는
    echo [Add python.exe to PATH] 체크박스를 "반드시" 체크하셔야 합니다!
    echo.
    echo 설치가 끝나면 VSCode 창을 X버튼으로 껐다가 다시 켜주세요.
    echo.
    pause
    exit /b
)

echo [1/2] 필요한 AI 라이브러리 자동 설치 중... (1~3분 소요)
pip install -r requirements.txt --quiet
echo.
echo [2/2] AI 에이전트 완전체 시스템을 시작합니다!
echo.
python main.py
pause
