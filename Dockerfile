# build environment
FROM node:14.14.0-alpine3.12 as build-stage
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
FROM node:14.14.0-alpine3.12 as production-stage
RUN mkdir /app && chown -R node:node /app
WORKDIR /app
RUN apk add --no-cache tini

USER node
COPY --chown=node:node --from=build-stage /app/node_modules node_modules
COPY --chown=node:node --from=build-stage /app/dist .

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["/app/index.js"]
