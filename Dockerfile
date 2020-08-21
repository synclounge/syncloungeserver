# build environment
FROM node:current-alpine as build-stage
WORKDIR /app
RUN apk add --no-cache python make g++
COPY package*.json ./
RUN npm ci
COPY . .

RUN npm run build
RUN npm prune --production

# production environment
FROM node:current-alpine as production-stage
LABEL org.opencontainers.image.title="SyncLoungeSocket"
LABEL org.opencontainers.image.description="Enjoy Plex with your friends. In Sync. Together."
LABEL org.opencontainers.image.url="https://synclounge.tv/"
LABEL org.opencontainers.image.source="https://github.com/ttshivers/syncloungesocket"
LABEL org.opencontainers.image.vendor="SyncLounge"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.documentation="https://docs.synclounge.tv/"

WORKDIR /app
COPY --from=build-stage /app/node_modules node_modules
COPY --from=build-stage /app/dist .


ARG VERSION
LABEL org.opencontainers.image.version=$VERSION

ARG REVISION
LABEL org.opencontainers.image.revision=$REVISION

ARG BUILD_DATE
LABEL org.opencontainers.image.created=$BUILD_DATE

ENTRYPOINT ["/app/index.js"]
