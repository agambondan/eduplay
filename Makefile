.PHONY: up down build rebuild deploy logs ps clean load-test load-test-local format format-api format-web dev dev-api dev-web

dev:
	@bash dev.sh

dev-api:
	@for port in 8080; do \
		pid=$$(lsof -ti tcp:$$port 2>/dev/null) && kill $$pid 2>/dev/null && sleep 0.5 || true; \
	done
	@if command -v air >/dev/null 2>&1; then \
		cd services/api && air; \
	else \
		cd services/api && go run ./cmd/main.go; \
	fi

dev-web:
	@for port in 3000; do \
		pid=$$(lsof -ti tcp:$$port 2>/dev/null) && kill $$pid 2>/dev/null && sleep 0.5 || true; \
	done
	cd apps/web && npm run dev

up:
	docker compose up -d

down:
	docker compose down

build:
	docker compose build

rebuild:
	docker compose down --remove-orphans
	docker compose build --no-cache
	docker compose up -d

deploy:
	docker-compose -f docker-compose.prod.yml up -d --build

rebuild-api:
	docker compose build --no-cache api
	docker compose up -d api

rebuild-web:
	docker compose build --no-cache web
	docker compose up -d web

logs:
	docker compose logs -f

ps:
	docker compose ps

clean:
	docker compose down -v --remove-orphans
	docker compose rm -f

format: format-api format-web

format-api:
	cd services/api && gofmt -w . && goimports -w .

format-web:
	cd apps/web && npx prettier --write --ignore-unknown .

load-test:
	k6 run load-test/script.js

load-test-local:
	BASE_URL=http://localhost:8080/api/v1 k6 run load-test/script.js
