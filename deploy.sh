#!/usr/bin/env bash
# ==============================================================================
# Sridattam E-Commerce Platform — 1-Click Automated VPS Setup & Deploy Script
# Compatible with Ubuntu 20.04 / 22.04 / 24.04 & Debian 11 / 12 on Hostinger VPS
# ==============================================================================

set -e

# Color helpers
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${BLUE}       Starting Automated Setup for Sridattam E-Commerce Stack               ${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# 1. Require root or sudo privileges
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Please run this script with sudo or as root: sudo bash deploy.sh${NC}"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

# 2. Configure 4GB Swap Space if insufficient (prevents OOM on VPS during build)
SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$SWAP_TOTAL" -lt 2000 ]; then
  echo -e "${YELLOW}[1/7] Creating 4GB swap space to ensure smooth Docker builds...${NC}"
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo -e "${GREEN}✓ 4GB Swap file created and enabled.${NC}"
  else
    swapon /swapfile 2>/dev/null || true
  fi
else
  echo -e "${GREEN}[1/7] Swap memory is sufficient (${SWAP_TOTAL}MB).${NC}"
fi

# 3. Install Docker & Docker Compose if missing
echo -e "${YELLOW}[2/7] Checking Docker & Docker Compose installation...${NC}"
if ! command -v docker &> /dev/null; then
  echo -e "${YELLOW}Installing Docker Engine via official installer...${NC}"
  apt-get update -y
  apt-get install -y curl ca-certificates gnupg lsb-release
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  systemctl enable --now docker
  echo -e "${GREEN}✓ Docker successfully installed.${NC}"
else
  echo -e "${GREEN}✓ Docker is already installed: $(docker --version)${NC}"
fi

# Check Docker Compose (v2 plugin)
if ! docker compose version &> /dev/null; then
  echo -e "${YELLOW}Installing Docker Compose plugin...${NC}"
  apt-get update -y
  apt-get install -y docker-compose-plugin
  echo -e "${GREEN}✓ Docker Compose plugin installed.${NC}"
fi

# 4. Auto-detect Public IP Address
echo -e "${YELLOW}[3/7] Detecting VPS Public IP address...${NC}"
SERVER_IP=$(curl -s4 --max-time 5 icanhazip.com || curl -s4 --max-time 5 ifconfig.me || echo "localhost")
echo -e "${GREEN}✓ Detected VPS IP: ${SERVER_IP}${NC}"

# 5. Prepare Environment Files (.env & backend/.env)
echo -e "${YELLOW}[4/7] Configuring environment variables...${NC}"

if [ ! -f "$PROJECT_DIR/.env" ]; then
  cat <<EOF > "$PROJECT_DIR/.env"
# Sridattam Platform Configuration
POSTGRES_USER=sridattam_admin
POSTGRES_PASSWORD=sridattam_secure_pass_2026
POSTGRES_DB=sridattam_dev_db
DATABASE_URL=postgresql://sridattam_admin:sridattam_secure_pass_2026@postgres:5432/sridattam_dev_db?schema=public

# Public Endpoints
BACKEND_PUBLIC_URL=http://${SERVER_IP}:5000
FRONTEND_URL=http://${SERVER_IP}:3000
ADMIN_URL=http://${SERVER_IP}:3001

# Cloudflare R2 Object Storage
R2_ACCOUNT_ID=8297543f989a371e60d225f84de5548b
R2_ACCESS_KEY_ID=196749a619271bfe47720d90f373ebce
R2_SECRET_ACCESS_KEY=d99b25a7df049e93750190476de031bb34e727c435bffc22cfa365a4aa66e54a
R2_BUCKET_NAME=sridattam-product-media
R2_PUBLIC_BASE_URL=https://pub-78b25314ac78421fb5abe572bdbf3407.r2.dev

# Security & Secrets
JWT_SECRET=sridattam-dev-jwt-access-secret-key-2026
JWT_REFRESH_SECRET=sridattam-dev-jwt-refresh-secret-key-2026

# Razorpay Payment Gateway
RAZORPAY_KEY_ID=rzp_test_TeDsxH8VAgL0ZA
RAZORPAY_KEY_SECRET=Y9thJkIcOkD90gh8jncph6zb

# Notifications & SMTP (falls back gracefully to console if unreachable)
EMAIL_PROVIDER=smtp
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_SECURE=false
SMTP_USER=dev
SMTP_PASS=dev
EMAIL_FROM="Sridattam <dev@sridattam.com>"
EMAIL_BRAND_NAME="Sridattam"
INTERNAL_ALERT_EMAILS="admin@sridattam.com"
EOF
  echo -e "${GREEN}✓ Created .env file.${NC}"
else
  # Ensure BACKEND_PUBLIC_URL, FRONTEND_URL, and ADMIN_URL match server IP if previously localhost
  if grep -q "localhost" "$PROJECT_DIR/.env" && [ "$SERVER_IP" != "localhost" ]; then
    sed -i "s|FRONTEND_URL=http://localhost:3000|FRONTEND_URL=http://${SERVER_IP}:3000|g" "$PROJECT_DIR/.env"
    sed -i "s|ADMIN_URL=http://localhost:3001|ADMIN_URL=http://${SERVER_IP}:3001|g" "$PROJECT_DIR/.env"
    if ! grep -q "BACKEND_PUBLIC_URL" "$PROJECT_DIR/.env"; then
      echo "BACKEND_PUBLIC_URL=http://${SERVER_IP}:5000" >> "$PROJECT_DIR/.env"
    fi
  fi
fi

# Ensure backend/.env exists and is synced
cp -f "$PROJECT_DIR/.env" "$PROJECT_DIR/backend/.env"
echo -e "${GREEN}✓ Synced environment to backend/.env.${NC}"

# 6. Build and Start All Docker Services
echo -e "${YELLOW}[5/7] Building and launching Docker Compose containers (this may take 2-4 minutes)...${NC}"
docker compose pull postgres redis
docker compose up -d --build

# 7. Wait for Database & Redis to become healthy
echo -e "${YELLOW}[6/7] Waiting for PostgreSQL & Redis health checks...${NC}"
for i in {1..30}; do
  PG_HEALTH=$(docker inspect --format='{{json .State.Health.Status}}' sridattam_postgres 2>/dev/null || echo "starting")
  REDIS_HEALTH=$(docker inspect --format='{{json .State.Health.Status}}' sridattam_redis 2>/dev/null || echo "starting")
  if [ "$PG_HEALTH" = "\"healthy\"" ] && [ "$REDIS_HEALTH" = "\"healthy\"" ]; then
    echo -e "${GREEN}✓ PostgreSQL and Redis are healthy!${NC}"
    break
  fi
  sleep 2
done

# Wait for backend to be ready
echo -e "${YELLOW}Waiting for Backend service to initialize...${NC}"
sleep 10

# 8. Synchronize Prisma Database Schema & Seed Data
echo -e "${YELLOW}[7/7] Synchronizing database schema and populating demo catalog & users...${NC}"
docker compose exec -T backend npx prisma db push --schema=./src/prisma/schema.prisma || true
docker compose exec -T backend npx prisma db seed || true

echo -e "\n${GREEN}==============================================================================${NC}"
echo -e "${GREEN}                 SRIDATTAM DEPLOYMENT COMPLETE & ONLINE!                      ${NC}"
echo -e "${GREEN}==============================================================================${NC}"
echo -e "\nAccess your services in your browser:"
echo -e "  🛍️  ${BLUE}Customer Storefront:${NC} http://${SERVER_IP}:3000"
echo -e "  🛡️  ${BLUE}Staff Admin Portal:${NC}  http://${SERVER_IP}:3001"
echo -e "  ⚙️  ${BLUE}Backend REST API:${NC}     http://${SERVER_IP}:5000"
echo -e "\n${YELLOW}Default Admin Login Credentials:${NC}"
echo -e "  Email:    ${GREEN}admin@sridattam.com${NC}"
echo -e "  Password: ${GREEN}password123${NC}"
echo -e "\nTo view live logs at any time, run:"
echo -e "  docker compose logs -f\n"

