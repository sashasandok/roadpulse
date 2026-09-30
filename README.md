# RoadPulse

Fleet telemetry monorepo (npm workspaces).

## Structure

```
apps/             applications (added in later phases)
packages/shared   shared TypeScript types: Vehicle, TelemetryPoint, Alert
```

## Requirements

- Node.js 22+
- Docker with Docker Compose

## Getting started

```bash
cp .env.example .env
npm install
docker compose up db
```

PostgreSQL is then available at `localhost:5433` (port and credentials are set in `.env`).

## Scripts

| Command             | Description                        |
| ------------------- | ---------------------------------- |
| `npm run build`     | Build all workspaces               |
| `npm run typecheck` | Type-check all workspaces          |
| `npm run lint`      | Run ESLint                         |
| `npm run format`    | Format with Prettier               |
| `npm run db:up`     | Start PostgreSQL in the background |
| `npm run db:down`   | Stop containers                    |
