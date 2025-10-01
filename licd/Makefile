.PHONY: build run test clean docker-build

VERSION ?= dev
COMMIT  ?= $(shell git rev-parse --short HEAD 2>/dev/null || echo "none")
DATE    ?= $(shell date -u +%Y-%m-%dT%H:%M:%SZ)
LDFLAGS := -s -w \
	-X github.com/deymonster/licd/internal/version.Version=$(VERSION) \
	-X github.com/deymonster/licd/internal/version.Commit=$(COMMIT) \
	-X github.com/deymonster/licd/internal/version.Date=$(DATE)

build:
	go build -ldflags '$(LDFLAGS)' -o bin/licd ./cmd/licd

run:
	go run ./cmd/licd

test:
	go test ./...

clean:
	rm -rf bin/

docker-build:
	docker build --build-arg VERSION=$(VERSION) --build-arg COMMIT=$(COMMIT) --build-arg DATE=$(DATE) -t licd:latest .

dev:
	air # для hot reload в разработке