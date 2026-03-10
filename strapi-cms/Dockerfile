# ── Build stage ────────────────────────────────────────────────────────────────
FROM node:20-alpine AS build
WORKDIR /opt/app
COPY package.json ./
# Build-time env stubs so Strapi admin compiles without real secrets
ENV NODE_ENV=production \
    APP_KEYS=build,build,build,build \
    API_TOKEN_SALT=buildsalt \
    ADMIN_JWT_SECRET=buildsecret \
    TRANSFER_TOKEN_SALT=buildsalt \
    JWT_SECRET=buildsecret \
    DATABASE_CLIENT=sqlite \
    DATABASE_FILENAME=.tmp/build.db
RUN npm install
COPY . .
RUN npm run build

# ── Runtime stage ───────────────────────────────────────────────────────────────
FROM node:20-alpine
WORKDIR /opt/app
ENV NODE_ENV=production
COPY --from=build /opt/app/package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY --from=build /opt/app/build ./build
COPY --from=build /opt/app/public ./public
COPY --from=build /opt/app/config ./config
COPY --from=build /opt/app/src ./src
EXPOSE 1337
CMD ["node_modules/.bin/strapi", "start"]
