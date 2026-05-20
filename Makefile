.PHONY: up down build rebuild logs ps clean

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
