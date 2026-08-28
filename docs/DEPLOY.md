# Deploy — EduPlay production

Production is `https://games.jangkauin.site`, served from a VPS. Deploys are
manual: build on your laptop, ship the image to the VPS registry, roll the
container.

Day to day this is driven from the workspace, which deploys every project on
the VPS rather than just this one:

```bash
cd ~/works/me
make help                   # every command
make eduplay                # API + web
make eduplay-web            # one service
make eduplay.status
make eduplay-web.rollback TAG=<commit-sha>
```

`~/works/me/deploy.sh` is generic and takes its target from the environment;
`~/works/me/Makefile` supplies it per command. `scripts/deploy.sh` in this repo
does the same job self-contained, for when you only have this checkout:

```bash
scripts/deploy.sh api       # API only
scripts/deploy.sh web       # web only
scripts/deploy.sh all       # both
scripts/deploy.sh status    # what is running, what is in the registry
scripts/deploy.sh rollback web <commit-sha>
```

Either script is the whole procedure. The rest of this page explains what it does
and why, so you can do it by hand when something breaks.

## What is actually wired up

| | |
|---|---|
| Web | `https://games.jangkauin.site` → Cloudflare Tunnel → container on `127.0.0.1:33000` |
| API | `https://api-games.jangkauin.site` → Cloudflare Tunnel → container on `127.0.0.1:38080` |
| VPS | `ssh sumopod` (`ssh.jangkauin.site` via cloudflared, user `ubuntu`) |
| Compose | `/works/me/games/docker-compose.yml` — `.env` + compose only, **no source checkout** |
| Registry | `registry:2` on the VPS at `127.0.0.1:5000`, shared with the thollabul project |

Two things that are easy to get wrong:

- **nginx is not in the request path.** Cloudflare Tunnel goes straight to the
  container. `nginx/prod.conf` is not used in production, so the security
  headers browsers actually see come from `apps/web/proxy.ts` (the Next
  middleware). Editing the nginx config to change a header will do nothing.
- **GitHub Actions does not deploy.** `.github/workflows/deploy-prod.yml`
  triggers on a `v*` tag, but the repo has no secrets and no `production`
  environment, and no such tag has ever been pushed. Treat those workflows as
  aspirational until the secrets exist.

## The four steps

### 1. Build

The API needs no build arguments. The web app needs three, because
`NEXT_PUBLIC_*` values are **inlined into the bundle at compile time** — putting
them in the server's `.env` has no effect at all:

```bash
docker build -t eduplay-api:prod services/api

docker build \
  --build-arg NEXT_PUBLIC_API_URL=https://api-games.jangkauin.site/api/v1 \
  --build-arg NEXT_PUBLIC_SITE_URL=https://games.jangkauin.site \
  --build-arg NEXT_PUBLIC_GOOGLE_CLIENT_ID="$(python3 -c "import json;print(json.load(open('eduplay-oauth.json'))['web']['client_id'])")" \
  -t eduplay-web:prod apps/web
```

Omit `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and the Google button is compiled out of the
page entirely. Omit `NEXT_PUBLIC_API_URL` and the bundle falls back to
`http://localhost:8080`, which fails for every visitor.

### 2. Ship to the VPS

```bash
docker save eduplay-web:prod | gzip -1 | ssh sumopod 'gunzip | docker load'
```

You cannot `docker push` from the laptop straight to the registry. The registry
is bound to `127.0.0.1:5000` on the VPS, and even with an SSH tunnel the Docker
Desktop daemon runs inside its own VM and cannot reach a port forwarded to the
laptop's localhost — the push dies with `dial tcp [::1]:5000: i/o timeout`.
Streaming over SSH avoids the problem entirely.

### 3. Record it in the registry

Run this **on the VPS**, where `localhost:5000` really is the registry:

```bash
ssh sumopod '
  docker tag eduplay-web:prod localhost:5000/eduplay-web:prod
  docker tag eduplay-web:prod localhost:5000/eduplay-web:<commit-sha>
  docker push localhost:5000/eduplay-web:prod
  docker push localhost:5000/eduplay-web:<commit-sha>
'
```

The `prod` tag is what gets deployed; the commit-sha tag is the history, and it
is what a rollback pulls from. Drop the `localhost:5000/...` tags again right
after pushing — the blobs live in the registry's own volume from then on, and
leaving the tags behind only pins old images on the host so they can never be
pruned. No `rollback-*` images are kept for the same reason.

### 4. Roll the container

```bash
ssh sumopod 'cd /works/me/games && docker compose up -d --force-recreate web'
```

`--force-recreate` is not optional. Compose decides whether to replace a
container from a hash of the service definition, and the definition names the
image (`eduplay-web:prod`) rather than pinning its id. Retagging `:prod` to a
freshly built image leaves that hash untouched, so a plain `up -d` prints
"Running" and the old container keeps serving the old build.

## Rollback

Every deploy is in the registry under its commit sha, so a rollback is just
redeploying one of those. Run it without a tag to see what is available:

```bash
cd ~/works/me && make eduplay-web.rollback              # lists the tags
cd ~/works/me && make eduplay-web.rollback TAG=3d45926
```

By hand:

```bash
ssh sumopod 'curl -s http://127.0.0.1:5000/v2/eduplay-web/tags/list'
ssh sumopod 'docker pull -q localhost:5000/eduplay-web:<sha> \
             && docker tag localhost:5000/eduplay-web:<sha> eduplay-web:prod \
             && docker rmi localhost:5000/eduplay-web:<sha> \
             && cd /works/me/games && docker compose up -d --force-recreate web'
```

## Housekeeping

```bash
cd ~/works/me && make prune     # dangling images + build cache on the VPS
```

## Verify after deploying

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://games.jangkauin.site/login
curl -s -o /dev/null -w '%{http_code}\n' https://api-games.jangkauin.site/api/v1/games

# CORS must echo the site origin and refuse anything else
curl -s -X OPTIONS https://api-games.jangkauin.site/api/v1/auth/google \
  -H 'Origin: https://games.jangkauin.site' \
  -H 'Access-Control-Request-Method: POST' -D - -o /dev/null | grep -i access-control

# the API logs its allowlist at startup
ssh sumopod 'docker logs eduplay-api-1 2>&1 | grep "CORS allowed"'
```

## Server configuration

`/works/me/games/.env` on the VPS. The ones that matter beyond the obvious:

| Key | Why |
|---|---|
| `FRONTEND_URL` | doubles as the CORS allowlist when `CORS_ALLOWED_ORIGINS` is unset |
| `CORS_ALLOWED_ORIGINS` | comma separated, no wildcard. The API sends `AllowCredentials`, so a wildcard would let any site call it with the visitor's cookie |
| `GOOGLE_CLIENT_ID` | must match the id baked into the web bundle, or every Google login fails the audience check |

## Google sign-in

Google Cloud Console must list every origin you serve from under **Authorized
JavaScript origins** — currently `https://games.jangkauin.site`. Add
`http://localhost:3000` if you want to test locally. This flow uses Google
Identity Services (an ID token posted to `/auth/google`), not the redirect-based
authorization-code flow, so there are no redirect URIs to configure and no
client secret in play.

## Caveats

- SSH to the VPS **does not work from the BBG office network**. Use a hotspot.
- `scripts/deploy-prod.sh` is obsolete. It provisions `eduplay.id`, which now
  serves someone else's site.
