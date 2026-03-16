FROM golang:1.23-alpine AS builder
RUN apk add --no-cache gcc musl-dev
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ENV CGO_ENABLED=1
RUN go build -ldflags="-w -s" -o /app/server ./cmd/server

FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/server /app/server
RUN apk add --no-cache sqlite ca-certificates
EXPOSE 8443
CMD ["/app/server"]
