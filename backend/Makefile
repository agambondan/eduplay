.PHONY: dev build run migrate test clean

dev:
	air

build:
	go build -o tmp/main cmd/main.go

run:
	go run cmd/main.go

test:
	go test ./...

migrate:
	@echo "Running migrations..."
	# In a real setup, we'd use a migrator tool like golang-migrate
	# For now, AutoMigrate is in main.go

clean:
	rm -rf tmp
