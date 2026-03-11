FROM golang:1.23-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app/server ./cmd/server

FROM alpine:3.18
WORKDIR /app
COPY --from=builder /app/server /app/server
RUN apk add --no-cache sqlite ca-certificates
EXPOSE 8080
CMD ["/app/server"]
