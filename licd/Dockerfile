# syntax=docker/dockerfile:1.6

FROM golang:1.23-alpine AS builder
WORKDIR /app

# Устанавливаем необходимые пакеты для CGO и SQLite
RUN apk add --no-cache ca-certificates gcc musl-dev sqlite-dev

# 1) Кешируем зависимости
COPY go.mod ./
COPY go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download

# 2) Копируем исходники
COPY . .

# ВКЛЮЧАЕМ CGO для работы с SQLite
ENV CGO_ENABLED=1
ENV GOOS=linux
ENV GOARCH=amd64

# 3) Аргументы версии
ARG VERSION=dev
ARG COMMIT=none
ARG DATE=unknown

# 4) Путь к main-пакету 
ARG PKG=./cmd/licd

# !!! ВАЖНО: проверь, что ниже путь в -X совпадает с module path из go.mod
#    например, если в go.mod "module github.com/deymonster/licd", то оставляй как есть.
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go build -trimpath -buildvcs=false \
      -ldflags="-s -w \
        -X github.com/deymonster/licd/internal/version.Version=${VERSION} \
        -X github.com/deymonster/licd/internal/version.Commit=${COMMIT} \
        -X github.com/deymonster/licd/internal/version.Date=${DATE}" \
      -o /out/licd ${PKG}

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget sqlite
# Создаем директорию /data с правильными правами
RUN mkdir -p /data && chown 65532:65532 /data
USER 65532:65532
WORKDIR /app

# Копируем бинарник
COPY --from=builder /out/licd /usr/local/bin/licd

# ДОБАВЛЯЕМ: Копируем папку migrations
COPY --from=builder /app/migrations ./migrations

EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/licd"]
