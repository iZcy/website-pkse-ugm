# ── Build stage ────────────────────────────────────────────────────────────────
FROM golang:1.24-alpine AS build
WORKDIR /app
COPY go.mod ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o webapp-prod .

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Jakarta
COPY --from=build /app/webapp-prod .
COPY templates/ templates/
COPY static/ static/
EXPOSE 8080
CMD ["./webapp-prod"]
