# syntax=docker/dockerfile:1.7
# Multi-stage build for the Fastify API.
# Stages:
#   deps    - install all npm deps (production + dev)
#   build   - compile TypeScript to dist/
#   test    - run vitest
#   runtime - minimal node image running the compiled API

FROM node:20-alpine AS deps
WORKDIR /app/apps/api
COPY apps/api/package.json apps/api/tsconfig.json ./
RUN npm install --no-audit --no-fund

FROM deps AS build
COPY apps/api/src ./src
RUN npm run build

FROM deps AS test
COPY apps/api/src ./src
COPY apps/api/tests ./tests
ENV NODE_ENV=test
# Allow tests that don't need a DB to pass; integration tests gate on DATABASE_URL.
CMD ["npx", "vitest", "run", "--reporter=verbose"]

FROM node:20-alpine AS runtime
WORKDIR /app/apps/api
COPY apps/api/package.json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY --from=build /app/apps/api/dist ./dist
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
