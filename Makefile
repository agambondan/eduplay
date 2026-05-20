.PHONY: up down build rebuild deploy logs ps clean load-test load-test-local format format-api format-web dev dev-api dev-web

dev-api:
	cd services/api && go run ./cmd/main.go

dev-web:
	cd apps/web && npm run dev

dev:
	@echo "Starting API on :8080 and Web on :3000..."
	$(MAKE) dev-api & $(MAKE) dev-web

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
