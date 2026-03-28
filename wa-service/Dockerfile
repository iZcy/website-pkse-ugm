FROM golang:latest AS builder

RUN apt-get update && apt-get install -y gcc

WORKDIR /src
ENV GOPROXY=https://goproxy.cn,https://proxy.golang.org,direct
ENV GOTOOLCHAIN=auto
COPY go.mod ./
RUN go mod download
COPY . .
RUN go mod tidy && CGO_ENABLED=1 go build -o wa-service .

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libsqlite3-0 && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=builder /src/wa-service .
EXPOSE 8081
CMD ["./wa-service"]
