# Go API image. Builds from source so CI never depends on a binary committed
# to the repo or compiled on the production host.
FROM golang:1.24-alpine AS build
WORKDIR /src
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w -X main.version=$VERSION" -o webapp-prod .

FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Jakarta
COPY --from=build /src/webapp-prod .
COPY static/ static/
COPY templates/ templates/
EXPOSE 8080
CMD ["./webapp-prod"]
