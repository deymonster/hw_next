.PHONY: build run test clean docker-build

build:
	go build -o bin/licd ./cmd/licd

run:
	go run ./cmd/licd

test:
	go test ./...

clean:
	rm -rf bin/

docker-build:
	docker build -t licd:latest .

dev:
	air # для hot reload в разработке