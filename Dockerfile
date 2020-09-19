# build environment
FROM node:14.11.0-alpine3.12 as build-stage
RUN mkdir /app && chown -R node:node /app
WORKDIR /app
RUN apk add --no-cache python3 make g++
USER node
COPY --chown=node:node package*.json ./
RUN SKIP_BUILD=true npm ci
COPY --chown=node:node . .

RUN npm run build
RUN npm prune --production

# production environment
FROM node:14.11.0-alpine3.12 as production-stage
LABEL org.opencontainers.image.title="SyncLoungeSocket"
LABEL org.opencontainers.image.description="Enjoy Plex with your friends. In Sync. Together."
LABEL org.opencontainers.image.url="https://synclounge.tv/"
LABEL org.opencontainers.image.source="https://github.com/ttshivers/syncloungesocket"
LABEL org.opencontainers.image.vendor="SyncLounge"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.documentation="https://docs.synclounge.tv/"

RUN mkdir /app && chown -R node:node /app
WORKDIR /app
COPY --chown=node:node --from=build-stage /app/node_modules node_modules
COPY --chown=node:node --from=build-stage /app/dist .


ARG VERSION
LABEL org.opencontainers.image.version=$VERSION

ARG REVISION
LABEL org.opencontainers.image.revision=$REVISION

ARG BUILD_DATE
LABEL org.opencontainers.image.created=$BUILD_DATE

ENTRYPOINT ["/app/index.js"]
