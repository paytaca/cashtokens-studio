# syntax=docker/dockerfile:1

# Development / staging build (chipnet). Mirrors the root Dockerfile with dev
# defaults baked in, so it can also be built directly:
#   docker build -f deployment/dev.Dockerfile -t cts-dev .

ARG NODE_VERSION=22

# ---------------------------------------------------------------------------
# Stage 1 — build the SSR bundle and install its production dependencies
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS builder

ARG NODE_ENV=development
ARG BUILD_ENV=dev
ENV NODE_ENV=${NODE_ENV} \
    BUILD_ENV=${BUILD_ENV} \
    YARN_CACHE_FOLDER=/tmp/yarn-cache

# git                       -> required for the `github:paytaca/wizardconnect-vue` dependency
# ca-certificates           -> lets git verify HTTPS while resolving that dependency
# python3 + build-essential -> fallback toolchain for native modules
#                              (node-datachannel, @parcel/watcher)
RUN apt-get update \
 && apt-get install -y --no-install-recommends git ca-certificates python3 build-essential \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy manifests first so source edits don't invalidate the dependency layer.
# `patches/` must be present too: the postinstall runs patch-package, which
# needs the patch files before the rest of the source is copied.
COPY package.json yarn.lock ./
COPY patches ./patches
RUN yarn install --ignore-engines --network-timeout 600000

COPY . .
RUN yarn run build -m ssr

# Quasar emits its own manifest in dist/ssr; install only its runtime deps there.
WORKDIR /app/dist/ssr
RUN yarn install --production --ignore-engines --network-timeout 600000

# wizardconnect-vue is a git dependency that only produces dist/ by running its
# `prepare` build (tsc), which needs devDependencies that a --production install
# skips. Reuse the built (and patched) copy from the root install above.
RUN cp -r /app/node_modules/wizardconnect-vue/dist /app/dist/ssr/node_modules/wizardconnect-vue/dist

# Older @bitauth/libauth bundles ship build/lib/key/bip39.js using the legacy
# `assert { type: 'json' }` import attribute, which Node >=22.23 rejects when the SSR
# server loads it at runtime. Rewrite it to the supported form (a no-op if none match).
RUN grep -rlZ --include='*.js' --include='*.mjs' --include='*.cjs' \
      "assert { type: 'json' }" /app/dist/ssr/node_modules \
  | xargs -0 -r sed -i "s/assert { type: 'json' }/with { type: 'json' }/g"

# ---------------------------------------------------------------------------
# Stage 2 — minimal runtime image: built output + production deps only
# ---------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS runtime

ARG NODE_ENV=development
ARG PORT=3001
ENV NODE_ENV=${NODE_ENV} \
    PORT=${PORT}

RUN yarn global add pm2@^5.4.0 --ignore-engines \
 && yarn cache clean

WORKDIR /app
COPY --from=builder /app/dist/ssr ./

EXPOSE ${PORT}

# Quasar SSR exposes index.js; pm2-runtime keeps it running as PID 1.
CMD ["pm2-runtime", "index.js", "-i", "max"]
