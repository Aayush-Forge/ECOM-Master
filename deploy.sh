#!/usr/bin/env bash
# ==============================================================================
# Sridattam E-Commerce Platform — VPS bootstrap & production deploy
# Ubuntu 20.04 / 22.04 / 24.04 & Debian 11 / 12 (Hostinger VPS)
#
# First run creates ./.env from production.env.example with random secrets and
# stops so you can fill in domains, R2, Razorpay and email settings.
# Later runs validate .env and (re)build + start docker-compose.prod.yml.
# ==============================================================================

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] Run with sudo or as root: sudo bash deploy.sh${NC}"
  exit 1
fi

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"
COMPOSE="docker compose -f docker-compose.prod.yml"

# 1. Swap space — Next.js builds need more memory than small VPS plans have.
SWAP_TOTAL=$(free -m | awk '/^Swap:/ {print $2}')
if [ "$SWAP_TOTAL" -lt 2000 ]; then
  echo -e "${YELLOW}[1/5] Creating 4GB swap space...${NC}"
  if [ ! -f /swapfile ]; then
    fallocate -l 4G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=4096
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
  else
    swapon /swapfile 2>/dev/null || true
  fi
else
  echo -e "${GREEN}[1/5] Swap is sufficient (${SWAP_TOTAL}MB).${NC}"
fi

# 2. Docker & Compose plugin
echo -e "${YELLOW}[2/5] Checking Docker...${NC}"
if ! command -v docker &> /dev/null; then
  apt-get update -y
  apt-get install -y curl ca-certificates
  curl -fsSL https://get.docker.com -o get-docker.sh
  sh get-docker.sh
  rm -f get-docker.sh
  systemctl enable --now docker
fi
if ! docker compose version &> /dev/null; then
  apt-get update -y
  apt-get install -y docker-compose-plugin
fi
echo -e "${GREEN}✓ $(docker --version)${NC}"

# 3. Environment file
echo -e "${YELLOW}[3/5] Checking .env...${NC}"
if [ ! -f .env ]; then
  cp production.env.example .env
  chmod 600 .env
  for key in POSTGRES_PASSWORD REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET REVALIDATE_SECRET; do
    sed -i "s|^${key}=.*|${key}=$(openssl rand -hex 32)|" .env
  done
  echo -e "${GREEN}✓ Created .env with random database, Redis, JWT and revalidation secrets.${NC}"
  echo -e "${YELLOW}Now edit .env and fill in the domains, R2, Razorpay and email settings, then run this script again:${NC}"
  echo -e "  nano $PROJECT_DIR/.env"
  exit 0
fi

REQUIRED=(SITE_DOMAIN ADMIN_DOMAIN API_DOMAIN FRONTEND_URL ADMIN_URL BACKEND_PUBLIC_URL
  POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB REDIS_PASSWORD JWT_SECRET JWT_REFRESH_SECRET REVALIDATE_SECRET
  R2_ACCOUNT_ID R2_ACCESS_KEY_ID R2_SECRET_ACCESS_KEY R2_BUCKET_NAME R2_PUBLIC_BASE_URL
  RAZORPAY_KEY_ID RAZORPAY_KEY_SECRET)
MISSING=()
for key in "${REQUIRED[@]}"; do
  if ! grep -qE "^${key}=[^[:space:]]" .env; then
    MISSING+=("$key")
  fi
done
if [ ${#MISSING[@]} -gt 0 ]; then
  echo -e "${RED}[ERROR] These values are empty or missing in .env:${NC} ${MISSING[*]}"
  exit 1
fi
echo -e "${GREEN}✓ .env has all required values.${NC}"
if ! grep -qE "^RAZORPAY_WEBHOOK_SECRET=[^[:space:]]" .env; then
  echo -e "${YELLOW}Note: RAZORPAY_WEBHOOK_SECRET is empty, so Razorpay webhooks will be rejected. Payments still confirm via the browser callback; add the webhook once the site has a domain with HTTPS.${NC}"
fi

# 4. Build and start. Database migrations run automatically when the backend starts.
echo -e "${YELLOW}[4/5] Building and starting containers (first build can take 5-10 minutes)...${NC}"
$COMPOSE up -d --build

# 5. Wait for the backend health check
echo -e "${YELLOW}[5/5] Waiting for the backend to become healthy...${NC}"
BACKEND_ID=$($COMPOSE ps -q backend)
for i in $(seq 1 60); do
  STATUS=$(docker inspect --format='{{.State.Health.Status}}' "$BACKEND_ID" 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    break
  fi
  sleep 5
done
if [ "$STATUS" != "healthy" ]; then
  echo -e "${RED}[ERROR] Backend did not become healthy. Check: $COMPOSE logs backend${NC}"
  exit 1
fi

env_value() { grep -E "^$1=" .env | head -1 | cut -d= -f2-; }
echo -e "\n${GREEN}Deployment is up.${NC}"
echo -e "  Storefront:   ${BLUE}$(env_value FRONTEND_URL)${NC}"
echo -e "  Admin portal: ${BLUE}$(env_value ADMIN_URL)${NC}"
echo -e "  API health:   ${BLUE}$(env_value BACKEND_PUBLIC_URL)/health${NC}"
case "$(env_value SITE_DOMAIN)" in
  :*) echo -e "\n${YELLOW}IP mode: plain HTTP, no HTTPS. Use a domain before taking real customers.${NC}" ;;
  *)  echo -e "\nHTTPS certificates are issued on first visit once DNS points at this server." ;;
esac
echo -e "Logs: $COMPOSE logs -f"
