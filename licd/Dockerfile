FROM golang:1.23-alpine AS builder
WORKDIR /app
RUN apk add --no-cache ca-certificates
COPY licd/go.mod ./
RUN go mod download
COPY licd/. .
ENV CGO_ENABLED=0

ARG VERSION=dev
ARG COMMIT=none
ARG DATE=unknown
RUN go build -ldflags="-s -w -X github.com/deymonster/licd/internal/version.Version=${VERSION} -X github.com/deymonster/licd/internal/version.Commit=${COMMIT} -X github.com/deymonster/licd/internal/version.Date=${DATE}" -o /out/licd ./cmd/licd

FROM alpine:3.19
RUN apk add --no-cache ca-certificates wget
USER 65532:65532
WORKDIR /app
COPY --from=builder /out/licd /usr/local/bin/licd
EXPOSE 8081
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8081/healthz || exit 1
ENTRYPOINT ["/usr/local/bin/licd"]