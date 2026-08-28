#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Generic deploy — build here, ship to the VPS registry, roll the container.
# ============================================================
# This script knows nothing about any particular project. Everything comes from
# the environment, so the same script serves every repo. The Makefile beside it
# defines one command per deployable service; run `make help`.
#
#   ACTION (first argument, default "deploy"):
#     deploy     build, ship, push to the registry, restart
#     build      build only, stays on this machine
#     ship       build, ship, push to the registry, do not restart
#     restart    restart the service without rebuilding
#     status     what is running in DEPLOY_REMOTE_DIR
#     logs [n]   tail the service's logs (default 80 lines)
#     rollback   restore the newest rollback- tag
#     registry   list what the registry holds
#
#   Required, per action:
#     build/ship/deploy    DEPLOY_REPO DEPLOY_IMAGE  (+ DEPLOY_CONTEXT, default .)
#     ship/deploy          DEPLOY_REMOTE_DIR DEPLOY_SERVICE
#     restart/logs         DEPLOY_REMOTE_DIR DEPLOY_SERVICE
#     status               DEPLOY_REMOTE_DIR
#     rollback             DEPLOY_IMAGE DEPLOY_REMOTE_DIR DEPLOY_SERVICE
#
#   Optional:
#     DEPLOY_BUILD_ARGS  space separated KEY=VALUE passed as --build-arg.
#                        A value of @json:<file>:<dotted.key> is read from that
#                        JSON file inside the repo at deploy time, so ids and
#                        secrets stay out of the Makefile.
#     DEPLOY_ROOT        where a relative DEPLOY_REPO resolves (default: here)
#     DEPLOY_SSH_HOST    default sumopod
#     DEPLOY_REGISTRY    default localhost:5000
#     DEPLOY_TAG         second tag alongside :prod (default: repo git short sha)
#     DEPLOY_WAIT        seconds to wait after a restart before reporting (default 8)
# ============================================================

ACTION="${1:-deploy}"

DEPLOY_ROOT="${DEPLOY_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)}"
SSH_HOST="${DEPLOY_SSH_HOST:-sumopod}"
REGISTRY="${DEPLOY_REGISTRY:-localhost:5000}"
CONTEXT="${DEPLOY_CONTEXT:-.}"
WAIT="${DEPLOY_WAIT:-8}"

G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; B='\033[1m'; N='\033[0m'
log()  { echo -e "${G}[✓]${N} $*"; }
warn() { echo -e "${Y}[!]${N} $*"; }
die()  { echo -e "${R}[✗]${N} $*" >&2; exit 1; }

remote() { ssh -o BatchMode=yes -o ServerAliveInterval=30 "$SSH_HOST" "$@"; }

need() {
  local v
  for v in "$@"; do
    [[ -n "${!v:-}" ]] || die "$v is required for '$ACTION' — run '$0 help'"
  done
}

repo_path() {
  case "${DEPLOY_REPO:-}" in
    /*) printf '%s' "$DEPLOY_REPO" ;;
    *)  printf '%s/%s' "$DEPLOY_ROOT" "$DEPLOY_REPO" ;;
  esac
}

reachable() {
  remote true 2>/dev/null \
    || die "cannot reach $SSH_HOST over SSH — the BBG office network blocks it, use a hotspot"
}

bare_image() { printf '%s' "${DEPLOY_IMAGE%%:*}"; }

git_sha() { git -C "$(repo_path)" rev-parse --short HEAD 2>/dev/null || echo none; }

resolve_build_arg() {
  local kv="$1" key val repo
  key="${kv%%=*}"; val="${kv#*=}"
  if [[ "$val" == @json:* ]]; then
    # Separate statements on purpose: bash expands every argument of a single
    # `local` before assigning any of them, so file/path would read an empty rest.
    local rest file path
    rest="${val#@json:}"
    file="${rest%%:*}"
    path="${rest#*:}"
    repo="$(repo_path)"
    [[ -f "$repo/$file" ]] || die "$key: no such file $repo/$file"
    val="$(FILE="$repo/$file" KEYPATH="$path" python3 -c '
import json, os
d = json.load(open(os.environ["FILE"]))
for k in os.environ["KEYPATH"].split("."):
    d = d[k]
print(d)')" || die "$key: cannot read $path from $file"
  fi
  printf '%s=%s' "$key" "$val"
}

do_build() {
  need DEPLOY_REPO DEPLOY_IMAGE
  local repo; repo="$(repo_path)"
  [[ -d "$repo/$CONTEXT" ]] || die "build context not found: $repo/$CONTEXT"

  if [[ -d "$repo/.git" ]] && ! git -C "$repo" diff --quiet HEAD 2>/dev/null; then
    warn "$(basename "$repo") has uncommitted changes — the image will not match $(git_sha)"
  fi

  local args=() kv
  for kv in ${DEPLOY_BUILD_ARGS:-}; do
    args+=(--build-arg "$(resolve_build_arg "$kv")")
  done

  log "building $DEPLOY_IMAGE from $(basename "$repo")/$CONTEXT"
  docker build "${args[@]}" -t "$DEPLOY_IMAGE" "$repo/$CONTEXT" >/dev/null
}

do_ship() {
  need DEPLOY_IMAGE
  reachable
  local bare tag
  bare="$(bare_image)"; tag="${DEPLOY_TAG:-$(git_sha)}"

  # A direct `docker push` to the registry does not work: it is bound to the
  # VPS's own localhost, and the Docker Desktop daemon runs in a VM that cannot
  # reach a port forwarded to this laptop. Stream over SSH and push from there.
  log "shipping $DEPLOY_IMAGE to $SSH_HOST"
  docker save "$DEPLOY_IMAGE" | gzip -1 | remote 'gunzip | docker load' >/dev/null

  log "pushing to the registry as :prod and :$tag"
  remote "docker tag $DEPLOY_IMAGE $REGISTRY/$bare:prod \
       && docker tag $DEPLOY_IMAGE $REGISTRY/$bare:$tag \
       && docker push -q $REGISTRY/$bare:prod \
       && docker push -q $REGISTRY/$bare:$tag" >/dev/null
}

# Tag whatever is running now, so there is always a way back.
snapshot() {
  local bare; bare="$(bare_image)"
  remote "
    cd '$DEPLOY_REMOTE_DIR' || exit 0
    cid=\$(docker compose ps -q '$DEPLOY_SERVICE' 2>/dev/null | head -1)
    [ -n \"\$cid\" ] || exit 0
    old=\$(docker inspect \"\$cid\" --format '{{.Image}}')
    new=\$(docker image inspect '$DEPLOY_IMAGE' --format '{{.Id}}' 2>/dev/null || true)
    [ -n \"\$old\" ] && [ \"\$old\" != \"\$new\" ] \
      && docker tag \"\$old\" $bare:rollback-\$(date +%Y%m%d-%H%M%S) || true" >/dev/null
}

do_restart() {
  need DEPLOY_REMOTE_DIR DEPLOY_SERVICE
  reachable
  log "restarting $DEPLOY_SERVICE in $DEPLOY_REMOTE_DIR"
  remote "cd '$DEPLOY_REMOTE_DIR' && docker compose up -d '$DEPLOY_SERVICE'" >/dev/null
  sleep "$WAIT"
  remote "cd '$DEPLOY_REMOTE_DIR' && docker compose ps --format '    {{.Name}}  {{.Status}}' '$DEPLOY_SERVICE'"
}

case "$ACTION" in
  build)
    do_build
    ;;
  ship)
    need DEPLOY_REPO DEPLOY_IMAGE
    do_build; do_ship
    ;;
  deploy)
    need DEPLOY_REPO DEPLOY_IMAGE DEPLOY_REMOTE_DIR DEPLOY_SERVICE
    echo -e "${B}── $DEPLOY_IMAGE  ($DEPLOY_REPO @ $(git_sha))${N}"
    do_build; do_ship; snapshot; do_restart
    log "deployed $DEPLOY_IMAGE at ${DEPLOY_TAG:-$(git_sha)}"
    ;;
  restart)
    do_restart
    ;;
  status)
    need DEPLOY_REMOTE_DIR
    reachable
    echo -e "${B}$DEPLOY_REMOTE_DIR${N}"
    remote "cd '$DEPLOY_REMOTE_DIR' && docker compose ps --format '    {{.Name}}  {{.Image}}  {{.Status}}'"
    ;;
  logs)
    need DEPLOY_REMOTE_DIR DEPLOY_SERVICE
    reachable
    remote "cd '$DEPLOY_REMOTE_DIR' && docker compose logs --tail ${2:-80} '$DEPLOY_SERVICE'"
    ;;
  rollback)
    need DEPLOY_IMAGE DEPLOY_REMOTE_DIR DEPLOY_SERVICE
    reachable
    bare="$(bare_image)"
    last="$(remote "docker images $bare --format '{{.Tag}}' | grep '^rollback-' | sort -r | head -1")"
    [[ -n "$last" ]] || die "no rollback- tag exists for $bare"
    warn "restoring $bare:$last"
    remote "docker tag $bare:$last $DEPLOY_IMAGE" >/dev/null
    do_restart
    log "rolled back $bare to $last"
    ;;
  registry)
    reachable
    remote "curl -s http://127.0.0.1:5000/v2/_catalog" | sed 's/^/  /'; echo
    if [[ -n "${DEPLOY_IMAGE:-}" ]]; then
      echo -n "  $(bare_image): "
      remote "curl -s http://127.0.0.1:5000/v2/$(bare_image)/tags/list"; echo
    fi
    ;;
  help | -h | --help)
    sed -n '4,38p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    die "unknown action '$ACTION' — run '$0 help'"
    ;;
esac
