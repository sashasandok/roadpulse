# Build context: repository root (npm workspaces share one lockfile).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/simulator/package.json apps/simulator/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @roadpulse/simulator --include-workspace-root=false --ignore-scripts
COPY apps/simulator apps/simulator
RUN npm run build --workspace @roadpulse/simulator

FROM node:22-alpine AS prod-deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/simulator/package.json apps/simulator/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @roadpulse/simulator --include-workspace-root=false --omit=dev --ignore-scripts \
  && mkdir -p apps/simulator/node_modules

FROM node:22-alpine
ENV NODE_ENV=production
WORKDIR /app
COPY --from=prod-deps /app/node_modules node_modules
COPY --from=prod-deps /app/apps/simulator/node_modules apps/simulator/node_modules
COPY --from=build /app/apps/simulator/dist apps/simulator/dist
USER node
CMD ["node", "apps/simulator/dist/index.js"]
