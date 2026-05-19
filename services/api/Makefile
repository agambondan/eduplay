.PHONY: dev build run migrate test lint fmt clean

dev:
	air

build:
	go build -o tmp/main cmd/main.go

run:
	go run cmd/main.go

test:
	go test ./...

lint:
	golangci-lint run ./...

fmt:
	gofmt -w .
	goimports -w .

migrate:
	@echo "Running migrations..."

clean:
	rm -rf tmp
