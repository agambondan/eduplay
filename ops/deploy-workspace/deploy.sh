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
#     rollback   redeploy an older commit from the registry (needs DEPLOY_TAG)
#     registry   list what the registry holds
#     prune      reclaim dangling images and build cache on the server
#
#   Required, per action:
#     build/ship/deploy    DEPLOY_REPO DEPLOY_IMAGE  (+ DEPLOY_CONTEXT, default .)
#     ship/deploy          DEPLOY_REMOTE_DIR DEPLOY_SERVICE
#     restart/logs         DEPLOY_REMOTE_DIR DEPLOY_SERVICE
#     status               DEPLOY_REMOTE_DIR
#     rollback             DEPLOY_IMAGE DEPLOY_REMOTE_DIR DEPLOY_SERVICE DEPLOY_TAG
#
#   Optional:
#     DEPLOY_BUILD_ARGS  space separated KEY=VALUE passed as --build-arg.
#                        A value of @json:<file>:<dotted.key> is read from that
#                        JSON file inside the repo at deploy time, so ids and
#                        secrets stay out of the Makefile.
#     DEPLOY_ROOT        where a relative DEPLOY_REPO resolves (default: here)
#     DEPLOY_SSH_HOST    default sumopod
#     DEPLOY_REGISTRY    default localhost:5000
#     DEPLOY_TAG         second tag alongside :prod (default: repo git short sha);
#                        for rollback, the tag to restore
#
# No rollback- images are kept on the host. Every deploy is already stored in
# the registry under its commit sha, which is the same thing without leaving
# duplicate tags pinning old images on disk.
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

# Noisy steps write here instead of the terminal. On failure the tail is printed,
# because an opaque "Error 102" tells you nothing about what actually broke.
LOGFILE="$(mktemp -t deploy-XXXXXX.log)"
cleanup() {
  local rc=$?
  if [[ $rc -ne 0 && -s "$LOGFILE" ]]; then
    echo >&2
    warn "failed with exit $rc — last 40 lines:"
    tail -40 "$LOGFILE" >&2
  fi
  rm -f "$LOGFILE"
}
trap cleanup EXIT

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
  docker build "${args[@]}" -t "$DEPLOY_IMAGE" "$repo/$CONTEXT" >>"$LOGFILE" 2>&1
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
  docker save "$DEPLOY_IMAGE" | gzip -1 | remote 'gunzip | docker load' >>"$LOGFILE" 2>&1

  log "pushing to the registry as :prod and :$tag"
  # The registry-prefixed tags are dropped again straight after the push. The
  # blobs live in the registry's own volume from then on, and leaving the tags
  # behind only pins old images on the host so they can never be pruned.
  remote "docker tag $DEPLOY_IMAGE $REGISTRY/$bare:prod \
       && docker tag $DEPLOY_IMAGE $REGISTRY/$bare:$tag \
       && docker push -q $REGISTRY/$bare:prod \
       && docker push -q $REGISTRY/$bare:$tag \
       && docker rmi $REGISTRY/$bare:prod $REGISTRY/$bare:$tag" >>"$LOGFILE" 2>&1
}

do_restart() {
  need DEPLOY_REMOTE_DIR DEPLOY_SERVICE
  reachable
  # --force-recreate is not optional here. Compose decides whether to replace a
  # container from a hash of the service definition, and the definition names
  # the image ("eduplay-web:prod") rather than pinning its id. Retagging :prod
  # to a freshly built image leaves that hash untouched, so a plain `up -d`
  # reports "Running" and the old container keeps serving the old build.
  log "restarting $DEPLOY_SERVICE in $DEPLOY_REMOTE_DIR"
  remote "cd '$DEPLOY_REMOTE_DIR' && docker compose up -d --force-recreate '$DEPLOY_SERVICE'" >>"$LOGFILE" 2>&1
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
    do_build; do_ship; do_restart
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
    if [[ -z "${DEPLOY_TAG:-}" ]]; then
      warn "no tag given. The registry holds:"
      remote "curl -s http://127.0.0.1:5000/v2/$bare/tags/list" | sed 's/^/  /'
      echo
      die "pick one, e.g. TAG=<commit-sha>"
    fi
    log "pulling $bare:$DEPLOY_TAG back out of the registry"
    remote "docker pull -q $REGISTRY/$bare:$DEPLOY_TAG \
         && docker tag $REGISTRY/$bare:$DEPLOY_TAG $DEPLOY_IMAGE \
         && docker rmi $REGISTRY/$bare:$DEPLOY_TAG" >>"$LOGFILE" 2>&1
    do_restart
    log "rolled $bare back to $DEPLOY_TAG"
    ;;
  registry)
    reachable
    remote "curl -s http://127.0.0.1:5000/v2/_catalog" | sed 's/^/  /'; echo
    if [[ -n "${DEPLOY_IMAGE:-}" ]]; then
      echo -n "  $(bare_image): "
      remote "curl -s http://127.0.0.1:5000/v2/$(bare_image)/tags/list"; echo
    fi
    ;;
  prune)
    reachable
    log "reclaiming dangling images and build cache on $SSH_HOST"
    remote "docker image prune -f; docker builder prune -f" >>"$LOGFILE" 2>&1
    remote "docker system df" | sed 's/^/  /'
    ;;
  help | -h | --help)
    sed -n '4,38p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'
    ;;
  *)
    die "unknown action '$ACTION' — run '$0 help'"
    ;;
esac
