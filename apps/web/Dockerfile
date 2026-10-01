# Build context: repository root (npm workspaces share one lockfile).

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci --workspace @roadpulse/web --include-workspace-root=false
COPY packages/shared/src packages/shared/src
COPY apps/web apps/web
# Same-origin API: nginx proxies /api and /socket.io to the api container.
ENV VITE_API_URL=/api
RUN npm run build --workspace @roadpulse/web

FROM nginx:1.27-alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
