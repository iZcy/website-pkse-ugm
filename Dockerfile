FROM alpine:3.21
WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Jakarta
COPY webapp-prod .
COPY static/ static/
EXPOSE 8080
CMD ["./webapp-prod"]
