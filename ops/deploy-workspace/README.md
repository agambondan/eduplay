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
