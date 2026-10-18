# The API image (docs/DEPLOY.md). Build from the repo root, because the
# pnpm workspace lockfile lives there:
#   docker build -f apps/api/Dockerfile .
# Secrets are never baked in: apps/api/.env is passed at runtime.

FROM node:24-slim AS build
WORKDIR /repo
# pnpm at the exact version in package.json "packageManager".
RUN corepack enable

# Manifests first, so dependency layers are reused when only code changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN pnpm install --frozen-lockfile --filter @loophole/api...

COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @loophole/api build \
 # A self-contained copy of the API with production dependencies only.
 && pnpm --filter @loophole/api deploy --prod --legacy /out

FROM node:24-slim
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build --chown=node:node /out/package.json ./
COPY --from=build --chown=node:node /out/node_modules ./node_modules
COPY --from=build --chown=node:node /repo/apps/api/dist ./dist
# Not root: a bug in the API can't touch the rest of the container.
USER node
EXPOSE 3001
CMD ["node", "dist/main.js"]
