#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EduPlay — Production Deployment Script
# ============================================================
# Jalankan di SERVER PRODUCTION (VPS) sebagai root atau sudo
# ============================================================

DOMAIN="${DOMAIN:-eduplay.id}"
EMAIL="${EMAIL:-admin@eduplay.id}"
APP_DIR="${APP_DIR:-/opt/eduplay}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; }

echo "=============================================="
echo "  EduPlay Production Deployment"
echo "  Domain: $DOMAIN"
echo "  Target: $APP_DIR"
echo "=============================================="

if [[ $EUID -ne 0 ]]; then
  err "Jalankan sebagai root: sudo bash $0"
  exit 1
fi

log "1/7 — Install dependencies"
apt-get update -qq
apt-get install -y -qq curl docker.io docker-compose-v2 nginx acme.sh ca-certificates

log "2/7 — Setup Docker"
systemctl enable --now docker

log "3/7 — Setup ACME (Let's Encrypt SSL)"
if [[ ! -f /root/.acme.sh/$DOMAIN/$DOMAIN.cer ]]; then
  acme.sh --issue --standalone -d "$DOMAIN" -d "www.$DOMAIN" --email "$EMAIL" --force
  log "SSL certificate issued"
else
  warn "SSL certificate already exists, renewing..."
  acme.sh --renew -d "$DOMAIN" -d "www.$DOMAIN" --force
fi

mkdir -p "$APP_DIR/nginx/certs"
FULLCHAIN="/root/.acme.sh/${DOMAIN}/fullchain.cer"
PRIVKEY="/root/.acme.sh/${DOMAIN}/${DOMAIN}.key"
if [[ -f "$FULLCHAIN" ]]; then
  cp "$FULLCHAIN" "$APP_DIR/nginx/certs/$DOMAIN.crt"
  cp "$PRIVKEY" "$APP_DIR/nginx/certs/$DOMAIN.key"
  log "SSL certs copied to $APP_DIR/nginx/certs/"
else
  err "SSL certs not found at $FULLCHAIN"
  exit 1
fi

acme.sh --install-cronjob > /dev/null 2>&1 || true

log "4/7 — Create app directory & prepare .env"
mkdir -p "$APP_DIR"

if [[ ! -f "$APP_DIR/.env" ]]; then
  cat > "$APP_DIR/.env" << 'EOF'
# === Database ===
DB_HOST=postgres
DB_PORT=5432
DB_NAME=edugame
DB_USER=admin
DB_PASSWORD=changeme_prod_password
DB_SSL_MODE=disable

# === Redis ===
REDIS_URL=redis://redis:6379

# === JWT ===
JWT_SECRET=generate-a-secure-random-string-min-32-chars
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=168h

# === Anthropic ===
ANTHROPIC_API_KEY=sk-ant-xxxxx
ANTHROPIC_MODEL=claude-sonnet-4-20250514
AI_QUESTIONS_PER_REQUEST=20

# === Email ===
RESEND_API_KEY=re_xxxxx
EMAIL_FROM=noreply@eduplay.id

# === Push Notification ===
VAPID_PUBLIC_KEY=xxxxx
VAPID_PRIVATE_KEY=xxxxx
VAPID_EMAIL=mailto:admin@eduplay.id

# === App ===
APP_ENV=production
APP_PORT=8080
FRONTEND_URL=https://eduplay.id
ALLOWED_ORIGINS=https://eduplay.id

# === Sentry ===
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# === Admin ===
ADMIN_SECRET=change-this-too

# === Frontend Build Args ===
NEXT_PUBLIC_API_URL=https://eduplay.id/api/v1
NEXT_PUBLIC_SITE_URL=https://eduplay.id
NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-xxxxxxxxxxxxxxxx
NEXT_PUBLIC_ADMOB_APP_ID=ca-app-pub-xxxxxxxx~xxxxxxxx
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_VAPID_PUBLIC_KEY=xxxxx
NEXT_PUBLIC_ENABLE_DARK_MODE=true
NEXT_PUBLIC_ENABLE_SOUNDS=true
EOF
  warn ".env file created at $APP_DIR/.env — EDIT IT with real secrets!"
else
  log ".env already exists, skipping"
fi

log "5/7 — Deploy via GitHub Actions"
echo ""
echo "  Setup GitHub Secrets untuk repository:"
echo "    PROD_HOST     = IP server ini ($(curl -s ifconfig.me || echo '<your-server-ip>'))"
echo "    PROD_USER     = root"
echo "    PROD_SSH_KEY  = private key (bisa generate: ssh-keygen -t ed25519)"
echo "    PROD_ENV      = isi file .env di atas (base64 encoded)"
echo "    PROD_API_URL  = https://$DOMAIN/api/v1"
echo "    PROD_SITE_URL = https://$DOMAIN"
echo ""

log "6/7 — Auto-renew SSL via cron"
(crontab -l 2>/dev/null; echo "0 3 * * * /root/.acme.sh/acme.sh --renew -d $DOMAIN -d www.$DOMAIN --force --post-hook 'cp /root/.acme.sh/$DOMAIN/fullchain.cer $APP_DIR/nginx/certs/$DOMAIN.crt && cp /root/.acme.sh/$DOMAIN/$DOMAIN.key $APP_DIR/nginx/certs/$DOMAIN.key && docker compose -f $APP_DIR/docker-compose.prod.yml exec nginx nginx -s reload'") | crontab -
log "Cron installed"

log "7/7 — Setup DNS records"
echo ""
echo "  Buat DNS records di domain registrar:"
echo "    A     @       → $(curl -s ifconfig.me || echo '<server-ip>')"
echo "    CNAME www     → $DOMAIN"
echo ""
echo "  Lalu push tag untuk trigger deploy:"
echo "    git tag v1.0.0-alpha && git push origin v1.0.0-alpha"
echo ""

log "DONE! Akses: https://$DOMAIN"
