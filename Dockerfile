# base environment
FROM node:16.15.0-alpine3.15 as base-stage
RUN mkdir /app && chown -R node:node /app
WORKDIR /app

# dependency environment
FROM base-stage as dependency-stage
RUN apk add --no-cache python3 make g++
USER node
COPY --chown=node:node package*.json ./
RUN SKIP_BUILD=true npm ci

# build environment
FROM --platform=$BUILDPLATFORM dependency-stage as build-stage
COPY --chown=node:node . .
RUN npm run build

# prod dependency environment
FROM dependency-stage as production-dependency-stage
RUN npm prune --production

# production environment
FROM base-stage as production-stage
RUN apk add --no-cache tini

USER node
COPY --chown=node:node --from=production-dependency-stage /app/node_modules node_modules
COPY --chown=node:node --from=build-stage /app/dist .

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/index.js"]
