#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# EduPlay — production deploy
# ============================================================
# Build here, ship to the registry on the VPS, roll the container.
# See docs/DEPLOY.md for the why behind each step.
#
#   scripts/deploy.sh api           build + deploy the API only
#   scripts/deploy.sh web           build + deploy the web app only
#   scripts/deploy.sh all           both
#   scripts/deploy.sh rollback api  put the previous image back
#   scripts/deploy.sh status        what is running and what is in the registry
# ============================================================

SSH_HOST="${SSH_HOST:-sumopod}"
REMOTE_DIR="${REMOTE_DIR:-/works/me/games}"
REGISTRY="${REGISTRY:-localhost:5000}"

# Baked into the web bundle at build time. env_file on the server does nothing
# for these — NEXT_PUBLIC_* is inlined by the compiler.
API_URL="${NEXT_PUBLIC_API_URL:-https://api-games.jangkauin.site/api/v1}"
SITE_URL="${NEXT_PUBLIC_SITE_URL:-https://games.jangkauin.site}"

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SHA="$(git -C "$ROOT" rev-parse --short HEAD)"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${G}[✓]${N} $*"; }
warn() { echo -e "${Y}[!]${N} $*"; }
die()  { echo -e "${R}[✗]${N} $*" >&2; exit 1; }

remote() { ssh -o BatchMode=yes -o ServerAliveInterval=30 "$SSH_HOST" "$@"; }

preflight() {
  git -C "$ROOT" diff --quiet && git -C "$ROOT" diff --cached --quiet \
    || warn "uncommitted changes — the deployed image will not match any commit"
  remote true 2>/dev/null \
    || die "cannot reach $SSH_HOST over SSH (the office BBG network blocks this — use a hotspot)"
}

google_client_id() {
  local f="$ROOT/eduplay-oauth.json"
  [[ -f "$f" ]] || die "missing $f — needed for NEXT_PUBLIC_GOOGLE_CLIENT_ID"
  python3 -c "import json;print(json.load(open('$f'))['web']['client_id'])"
}

build_api() {
  log "building eduplay-api:prod"
  docker build -t eduplay-api:prod "$ROOT/services/api"
}

build_web() {
  local cid; cid="$(google_client_id)"
  log "building eduplay-web:prod (api=$API_URL site=$SITE_URL)"
  docker build \
    --build-arg "NEXT_PUBLIC_API_URL=$API_URL" \
    --build-arg "NEXT_PUBLIC_SITE_URL=$SITE_URL" \
    --build-arg "NEXT_PUBLIC_GOOGLE_CLIENT_ID=$cid" \
    -t eduplay-web:prod "$ROOT/apps/web"
}

# The Docker Desktop daemon runs in its own VM and cannot reach a port forwarded
# to the laptop's localhost, so `docker push` straight to the VPS registry fails
# with an i/o timeout. Stream the image over SSH and push from the VPS instead.
ship() {
  local img="$1"
  log "shipping $img:prod to $SSH_HOST"
  docker save "$img:prod" | gzip -1 | remote 'gunzip | docker load' >/dev/null
  log "pushing $img to the registry as :prod and :$SHA"
  remote "docker tag $img:prod $REGISTRY/$img:prod \
       && docker tag $img:prod $REGISTRY/$img:$SHA \
       && docker push -q $REGISTRY/$img:prod \
       && docker push -q $REGISTRY/$img:$SHA" >/dev/null
}

# Tag whatever is running now, so there is always something to roll back to.
snapshot() {
  local svc="$1" img="eduplay-$1"
  remote "
    old=\$(docker inspect eduplay-${svc}-1 --format '{{.Image}}' 2>/dev/null || true)
    new=\$(docker image inspect $img:prod --format '{{.Id}}' 2>/dev/null || true)
    if [ -n \"\$old\" ] && [ \"\$old\" != \"\$new\" ]; then
      docker tag \"\$old\" $img:rollback-\$(date +%Y%m%d-%H%M%S)
    fi"
}

roll() {
  local svc="$1"
  log "restarting $svc"
  remote "cd $REMOTE_DIR && docker compose up -d $svc" >/dev/null
  sleep 10
  remote "docker ps --filter name=eduplay-$svc --format '  {{.Names}}  {{.Status}}'"
}

deploy() {
  local svc="$1" img="eduplay-$1"
  "build_$svc"
  snapshot "$svc"
  ship "$img"
  roll "$svc"
  log "$svc deployed at $SHA"
}

case "${1:-}" in
  api) preflight; deploy api ;;
  web) preflight; deploy web ;;
  all) preflight; deploy api; deploy web ;;
  rollback)
    svc="${2:-}"; [[ -n "$svc" ]] || die "usage: $0 rollback <api|web>"
    img="eduplay-$svc"
    last="$(remote "docker images $img --format '{{.Tag}}' | grep '^rollback-' | sort -r | head -1")"
    [[ -n "$last" ]] || die "no rollback tag found for $img"
    warn "restoring $img:$last"
    remote "docker tag $img:$last $img:prod && cd $REMOTE_DIR && docker compose up -d $svc" >/dev/null
    roll "$svc"
    ;;
  status)
    remote "cd $REMOTE_DIR && docker compose ps --format '  {{.Name}}  {{.Image}}  {{.Status}}'"
    echo "  --- registry ---"
    remote "curl -s http://127.0.0.1:5000/v2/_catalog; echo"
    for r in eduplay-api eduplay-web; do
      echo -n "  $r: "; remote "curl -s http://127.0.0.1:5000/v2/$r/tags/list"; echo
    done
    ;;
  *)
    sed -n '4,16p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    exit 1 ;;
esac
