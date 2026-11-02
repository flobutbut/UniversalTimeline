# Test environment only. The production API image remains server/Dockerfile.
FROM node:22.23.1-alpine AS dependencies
WORKDIR /app
COPY package.json yarn.lock ./
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked yarn install --frozen-lockfile --non-interactive
COPY server/package.json server/yarn.lock ./server/
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,sharing=locked yarn --cwd server install --frozen-lockfile --non-interactive

FROM dependencies AS checks
COPY --chown=node:node tsconfig*.json vite.config.ts vitest.config.ts index.html ./
COPY --chown=node:node public ./public
COPY --chown=node:node src ./src
COPY --chown=node:node server/src ./server/src
COPY --chown=node:node server/test ./server/test
COPY --chown=node:node server/tsconfig.json ./server/
COPY --chown=node:node server/certs ./server/certs
COPY --chown=node:node database ./database
COPY --chown=node:node scripts/check.mjs ./scripts/check.mjs
COPY --chown=node:node scripts/check-design-system.mjs ./scripts/check-design-system.mjs
COPY --chown=node:node scripts/lib/config-review.mjs ./scripts/lib/config-review.mjs
RUN yarn --cwd server build \
  && mkdir -p node_modules/.vite node_modules/.vite-temp node_modules/.tmp \
  && chown node:node /app /app/server node_modules/.vite node_modules/.vite-temp node_modules/.tmp \
  && chown -R node:node server/dist
ENV CI=true
USER node
CMD ["yarn", "verify"]
