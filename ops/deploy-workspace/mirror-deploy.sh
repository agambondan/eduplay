#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Mirror the workspace deploy tooling into every repo.
# ============================================================
# ~/works/me is not a git repo, so deploy.sh and Makefile would exist only on
# this laptop. Every repo below carries an identical copy under
# ops/deploy-workspace/ purely as a versioned backup — any one of them can
# restore the whole thing.
#
#   ./mirror-deploy.sh          copy out, then show which repos changed
#   ./mirror-deploy.sh --check  report drift only, change nothing
#
# After editing deploy.sh or Makefile: run this, then commit in each repo.
# ============================================================

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPOS=(games thollabul-ilmi wedding-be wedding-managament-fe)
FILES=(deploy.sh Makefile mirror-deploy.sh)
SUBDIR="ops/deploy-workspace"

CHECK_ONLY=false
[[ "${1:-}" == "--check" ]] && CHECK_ONLY=true

G='\033[0;32m'; Y='\033[1;33m'; N='\033[0m'

readme() {
  cat <<'EOF'
# Workspace deploy tooling — mirrored copy

**This is a backup. Do not run it from here, and do not edit it here.**

The tooling that actually deploys lives on the laptop at `~/works/me/`:

| | |
|---|---|
| `~/works/me/deploy.sh` | generic deploy script — takes its target from the environment, knows nothing about any project |
| `~/works/me/Makefile` | defines one target per deployable service, across every project |
| `~/works/me/mirror-deploy.sh` | copies all three files into every repo, which is how this directory got here |

`~/works/me` is a plain directory, not a git repo, so those files would exist
only on that one machine. Every repo in the workspace carries an identical copy
of this directory so that any single repo can restore the whole set.

## Why the copy is identical everywhere

It covers **every** project, not just this one. Seeing another project's targets
in this repo's `Makefile` is expected — it is a mirror of the workspace file,
not configuration for this repo.

## Restore it

```bash
cp ops/deploy-workspace/{deploy.sh,Makefile,mirror-deploy.sh} ~/works/me/
chmod +x ~/works/me/deploy.sh ~/works/me/mirror-deploy.sh
cd ~/works/me && make help
```

## Change it

Edit the canonical copy, test it, then push the change back out:

```bash
cd ~/works/me
# edit deploy.sh or Makefile, test with: make <something>.status
./mirror-deploy.sh          # refresh every repo's copy
./mirror-deploy.sh --check  # or just report drift
```

Then commit the refreshed `ops/deploy-workspace/` in each repo that changed.

## How to deploy

From the laptop, never from here:

```bash
cd ~/works/me
make help
```
EOF
}

changed=()
for repo in "${REPOS[@]}"; do
  dest="$ROOT/$repo/$SUBDIR"
  [[ -d "$ROOT/$repo" ]] || { echo -e "${Y}[!]${N} $repo not found, skipped"; continue; }

  differs=false
  for f in "${FILES[@]}"; do
    cmp -s "$ROOT/$f" "$dest/$f" || differs=true
  done
  readme | cmp -s - "$dest/README.md" || differs=true

  if ! $differs; then
    echo -e "  $repo ${G}up to date${N}"
    continue
  fi

  changed+=("$repo")
  if $CHECK_ONLY; then
    echo -e "  $repo ${Y}differs${N}"
    continue
  fi

  mkdir -p "$dest"
  for f in "${FILES[@]}"; do cp "$ROOT/$f" "$dest/$f"; done
  readme > "$dest/README.md"
  chmod +x "$dest/deploy.sh" "$dest/mirror-deploy.sh"
  echo -e "  $repo ${G}updated${N}"
done

echo
if [[ ${#changed[@]} -eq 0 ]]; then
  echo "Every mirror matches the canonical copy."
elif $CHECK_ONLY; then
  echo "Out of date: ${changed[*]}"
  echo "Run ./mirror-deploy.sh to refresh them."
  exit 1
else
  echo "Refreshed: ${changed[*]}"
  echo "Commit ops/deploy-workspace/ in each of those repos."
fi
