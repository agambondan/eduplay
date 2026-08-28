SHELL := /bin/bash
DEPLOY := ./deploy.sh

# ============================================================
# Deploy commands for the works/me workspace.
#
# deploy.sh is generic — it takes everything from the environment. Each block
# below defines one service as a variable, and the commands underneath just
# hand that variable to the script. To add a project, copy a block and edit it:
#
#   DEPLOY_REPO        repo directory, relative to this file (or absolute)
#   DEPLOY_CONTEXT     docker build context inside the repo (default .)
#   DEPLOY_IMAGE       image tag the compose file on the VPS expects
#   DEPLOY_REMOTE_DIR  directory on the VPS holding docker-compose.yml
#   DEPLOY_SERVICE     compose service name
#   DEPLOY_BUILD_ARGS  optional; NEXT_PUBLIC_* MUST live here, because it is
#                      inlined at build time and the server's .env cannot supply it
# ============================================================

# ---------- EduPlay — games.jangkauin.site ----------
EDUPLAY_API := DEPLOY_REPO=games \
               DEPLOY_CONTEXT=services/api \
               DEPLOY_IMAGE=eduplay-api:prod \
               DEPLOY_REMOTE_DIR=/works/me/games \
               DEPLOY_SERVICE=api

EDUPLAY_WEB := DEPLOY_REPO=games \
               DEPLOY_CONTEXT=apps/web \
               DEPLOY_IMAGE=eduplay-web:prod \
               DEPLOY_REMOTE_DIR=/works/me/games \
               DEPLOY_SERVICE=web \
               DEPLOY_BUILD_ARGS="NEXT_PUBLIC_API_URL=https://api-games.jangkauin.site/api/v1 NEXT_PUBLIC_SITE_URL=https://games.jangkauin.site NEXT_PUBLIC_GOOGLE_CLIENT_ID=@json:eduplay-oauth.json:web.client_id"

# ---------- Thullaabul 'Ilmi — thollabul.jangkauin.site ----------
THOLLABUL_API := DEPLOY_REPO=thollabul-ilmi \
                 DEPLOY_CONTEXT=services/api \
                 DEPLOY_IMAGE=tholabul-ilmi-api:prod \
                 DEPLOY_REMOTE_DIR=/works/me/thollabul-ilmi \
                 DEPLOY_SERVICE=tholabul-ilmi-api

THOLLABUL_WEB := DEPLOY_REPO=thollabul-ilmi \
                 DEPLOY_CONTEXT=apps/web \
                 DEPLOY_IMAGE=tholabul-ilmi-web:prod \
                 DEPLOY_REMOTE_DIR=/works/me/thollabul-ilmi \
                 DEPLOY_SERVICE=tholabul-ilmi-web \
                 DEPLOY_BUILD_ARGS="NEXT_PUBLIC_API_URL=https://api-thollabul.jangkauin.site NEXT_PUBLIC_SITE_URL=https://thollabul.jangkauin.site"

# ---------- Wedding — wedding.jangkauin.site ----------
# The VPS directory and image still carry the old "vercel" name; only the local
# repo was renamed. Renaming the remote side means editing the compose file and
# the cloudflared ingress, so it is left alone on purpose.
WEDDING_API := DEPLOY_REPO=wedding-be \
               DEPLOY_IMAGE=wedding-be-vercel:prod \
               DEPLOY_REMOTE_DIR=/works/me/wedding-be-vercel \
               DEPLOY_SERVICE=api

WEDDING_WEB := DEPLOY_REPO=wedding-managament-fe \
               DEPLOY_IMAGE=wedding-fe:prod \
               DEPLOY_REMOTE_DIR=/works/me/wedding-managament-fe \
               DEPLOY_SERVICE=web \
               DEPLOY_BUILD_ARGS="NEXT_PUBLIC_SITE_URL=https://wedding.jangkauin.site NEXT_PUBLIC_IP=https://api-wedding.jangkauin.site/api/v1 NEXT_PUBLIC_ENDPOINT_MASTER=https://api-wedding.jangkauin.site/api/v1/master NEXT_PUBLIC_ENDPOINT_AUTH=https://api-wedding.jangkauin.site/api/v1/auth NEXT_PUBLIC_ENDPOINT_USERS=https://api-wedding.jangkauin.site/api/v1/users"

# ============================================================
# Commands
# ============================================================

.PHONY: help
help: ## Show this list
	@echo "Deploy — works/me"
	@echo
	@grep -hE '^[a-zA-Z0-9_.-]+:.*?## ' $(MAKEFILE_LIST) \
	  | awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-26s\033[0m %s\n", $$1, $$2}'
	@echo
	@echo "  N=200 sets how many lines the *.logs commands tail."
	@echo "  Script options: ./deploy.sh help"

N ?= 80

# ---------- EduPlay ----------
.PHONY: eduplay eduplay-api eduplay-web
eduplay: eduplay-api eduplay-web ## Deploy both EduPlay services
eduplay-api: ## Deploy the EduPlay API
	@$(EDUPLAY_API) $(DEPLOY) deploy
eduplay-web: ## Deploy the EduPlay web app
	@$(EDUPLAY_WEB) $(DEPLOY) deploy

.PHONY: eduplay.status eduplay-api.logs eduplay-web.logs
eduplay.status: ## What is running for EduPlay
	@$(EDUPLAY_API) $(DEPLOY) status
eduplay-api.logs: ## Tail the EduPlay API logs
	@$(EDUPLAY_API) $(DEPLOY) logs $(N)
eduplay-web.logs: ## Tail the EduPlay web logs
	@$(EDUPLAY_WEB) $(DEPLOY) logs $(N)

.PHONY: eduplay-api.rollback eduplay-web.rollback
eduplay-api.rollback: ## Roll the EduPlay API back one image
	@$(EDUPLAY_API) $(DEPLOY) rollback
eduplay-web.rollback: ## Roll the EduPlay web app back one image
	@$(EDUPLAY_WEB) $(DEPLOY) rollback

# ---------- Thullaabul 'Ilmi ----------
.PHONY: thollabul thollabul-api thollabul-web
thollabul: thollabul-api thollabul-web ## Deploy both Thullaabul services
thollabul-api: ## Deploy the Thullaabul API
	@$(THOLLABUL_API) $(DEPLOY) deploy
thollabul-web: ## Deploy the Thullaabul web app
	@$(THOLLABUL_WEB) $(DEPLOY) deploy

.PHONY: thollabul.status thollabul-api.logs thollabul-web.logs
thollabul.status: ## What is running for Thullaabul
	@$(THOLLABUL_API) $(DEPLOY) status
thollabul-api.logs: ## Tail the Thullaabul API logs
	@$(THOLLABUL_API) $(DEPLOY) logs $(N)
thollabul-web.logs: ## Tail the Thullaabul web logs
	@$(THOLLABUL_WEB) $(DEPLOY) logs $(N)

.PHONY: thollabul-api.rollback thollabul-web.rollback
thollabul-api.rollback: ## Roll the Thullaabul API back one image
	@$(THOLLABUL_API) $(DEPLOY) rollback
thollabul-web.rollback: ## Roll the Thullaabul web app back one image
	@$(THOLLABUL_WEB) $(DEPLOY) rollback

# ---------- Wedding ----------
.PHONY: wedding wedding-api wedding-web
wedding: wedding-api wedding-web ## Deploy both Wedding services
wedding-api: ## Deploy the Wedding API
	@$(WEDDING_API) $(DEPLOY) deploy
wedding-web: ## Deploy the Wedding web app
	@$(WEDDING_WEB) $(DEPLOY) deploy

.PHONY: wedding.status wedding-api.logs wedding-web.logs
wedding.status: ## What is running for Wedding
	@$(WEDDING_API) $(DEPLOY) status
	@$(WEDDING_WEB) $(DEPLOY) status
wedding-api.logs: ## Tail the Wedding API logs
	@$(WEDDING_API) $(DEPLOY) logs $(N)
wedding-web.logs: ## Tail the Wedding web logs
	@$(WEDDING_WEB) $(DEPLOY) logs $(N)

.PHONY: wedding-api.rollback wedding-web.rollback
wedding-api.rollback: ## Roll the Wedding API back one image
	@$(WEDDING_API) $(DEPLOY) rollback
wedding-web.rollback: ## Roll the Wedding web app back one image
	@$(WEDDING_WEB) $(DEPLOY) rollback

# ---------- Everything ----------
.PHONY: status registry all
status: eduplay.status thollabul.status wedding.status ## What is running everywhere
registry: ## What the VPS registry holds
	@$(DEPLOY) registry
all: eduplay thollabul wedding ## Rebuild and redeploy every service
