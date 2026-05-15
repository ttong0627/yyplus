#!/bin/bash
# wssc-unified GCP VM 배포 스크립트
# VM에서 실행: bash vm-deploy.sh

set -e

REPO_DIR="/home/$(whoami)/yyplus"
APP_DIR="$REPO_DIR/wssc-unified"
NGINX_DIR="/var/www/wssc-unified"

echo "=== wssc-unified VM 배포 시작 ==="

# 1. GitHub에서 최신 코드 받기
echo "[1/5] GitHub에서 최신 코드 pull..."
if [ -d "$REPO_DIR" ]; then
  cd "$REPO_DIR" && git pull origin main
else
  git clone https://github.com/ttong0627/yyplus.git "$REPO_DIR"
fi

# 2. 의존성 설치
echo "[2/5] npm install..."
cd "$APP_DIR" && npm install

# 3. 프로덕션 빌드
echo "[3/5] npm run build..."
npm run build

# 4. Nginx 서빙 디렉토리에 복사
echo "[4/5] dist/ → Nginx 디렉토리 복사..."
sudo mkdir -p "$NGINX_DIR"
sudo cp -r dist/* "$NGINX_DIR/"
sudo chown -R www-data:www-data "$NGINX_DIR"

# 5. Nginx 재시작
echo "[5/5] Nginx 재시작..."
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== 배포 완료! http://34.50.53.232 에서 확인하세요 ==="
