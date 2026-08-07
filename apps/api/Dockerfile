# syntax=docker/dockerfile:1.7
# Multi-stage build for the Fastify API.
# Stages:
#   deps    - install all npm deps (production + dev) from the committed
#             root lockfile, not an isolated re-resolve (TODO-313)
#   build   - compile TypeScript to dist/
#   test    - run vitest
#   runtime - minimal node image running the compiled API
#
# Build context MUST be the repo root (see docker-compose*.yml's
# `context: .`) -- `npm ci` needs the root package.json + package-lock.json,
# not just apps/api's own manifest, because this is an npm-workspaces
# monorepo and the lockfile is a single root-level file covering every
# workspace (there is no apps/api/package-lock.json).
#
# WHY THIS CHANGED FROM `npm install` (TODO-313): the old `deps` stage ran
# `npm install` against apps/api/package.json alone, outside the workspace
# -- npm re-resolved the dependency graph from scratch instead of reading
# the committed lockfile, so it could (and once did: the ioredis/bullmq
# duplicate-copy incident, 2026-07-12) silently pick different transitive
# versions than what CI/local installs actually tested. `npm ci` refuses to
# run at all if package-lock.json and the workspace's package.json
# disagree, and always installs exactly what the lockfile says --
# deterministic by construction, not by discipline.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/tsconfig.json ./apps/api/
RUN npm ci --workspace=@sybilshield/api --include-workspace-root --no-audit --no-fund

FROM deps AS build
WORKDIR /app/apps/api
COPY apps/api/src ./src
RUN npm run build

FROM deps AS test
WORKDIR /app/apps/api
COPY apps/api/src ./src
COPY apps/api/tests ./tests
ENV NODE_ENV=test
# Allow tests that don't need a DB to pass; integration tests gate on DATABASE_URL.
CMD ["npx", "vitest", "run", "--reporter=verbose"]

FROM node:20-alpine AS runtime
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/package.json
RUN npm ci --workspace=@sybilshield/api --include-workspace-root --omit=dev --no-audit --no-fund
COPY --from=build /app/apps/api/dist ./apps/api/dist
WORKDIR /app/apps/api
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
