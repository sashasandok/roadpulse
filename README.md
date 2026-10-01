# RoadPulse

Real-time fleet monitoring: a live map of your vehicles, their speed, fuel and status, with automatic alerts when something goes wrong.

## What problem it solves

A fleet operator (delivery vans, service cars, taxis) needs to answer a few questions at any moment:

- **Where is every vehicle right now**, and is it moving, parked, or not reporting at all?
- **Is anything wrong**: a driver speeding, a van leaving the service area, an engine idling for minutes, a tank running low?

RoadPulse collects GPS telemetry from vehicles, stores it, and pushes every update to a web dashboard over WebSockets, so the map moves in real time without page refreshes. A rule engine checks each telemetry point and raises alerts as they happen.

Since there are no real vehicles in development, the repo includes a **traffic simulator** that drives virtual vans along real Kyiv streets (routes from OSRM) and reports telemetry exactly like a GPS tracker would.

## How it works

```
┌─────────────┐  POST /api/telemetry   ┌──────────────────────┐   Socket.IO    ┌──────────────┐
│  Simulator  │ ─────────────────────► │         API          │ ─────────────► │  Web (React) │
│  (or real   │   every 1.5 s / car    │  NestJS + TypeORM    │ telemetry:update│  Leaflet map │
│  GPS units) │                        │                      │ alert:new      │  + sidebar   │
└─────────────┘                        └──────────┬───────────┘ ◄───────────── └──────────────┘
       │ routes                                   │                REST (initial load)
       ▼                                          ▼
┌─────────────┐                        ┌──────────────────────┐
│    OSRM     │                        │  PostgreSQL 17       │
│ (routing)   │                        │  (Docker)            │
└─────────────┘                        └──────────────────────┘
```

1. **Simulator** reuses (or registers) vehicles `RP-01`…`RP-05`, asks OSRM for a road route between two random points in Kyiv, and moves each car along it at 20–90 km/h. Every tick it posts a telemetry point: position, speed, fuel, ignition, timestamp. On arrival a car parks for 10–60 s, then picks a new destination.
2. **API** validates and saves the point, then:
   - broadcasts it to all browsers as a `telemetry:update` event;
   - runs the alert rules and, if one fires, saves the alert and broadcasts `alert:new`.
3. **Web** loads vehicles and their last known positions over REST, then applies live updates from the WebSocket. Markers glide between positions; vehicles that appear after the page was opened are added automatically.

### Vehicle status

Status is derived from the data and how fresh it is, not just the last value received:

| Status        | Rule                                  | Shown as                     |
| ------------- | ------------------------------------- | ---------------------------- |
| **Moving**    | update in the last 30 s, ignition on  | green                        |
| **Parked**    | update in the last 30 s, ignition off | grey                         |
| **Offline**   | no update for more than 30 s          | faded, "Offline · 5 min ago" |
| **No signal** | no position ever received             | grey                         |

### Alert rules

| Alert         | Fires when                                         | Cooldown per vehicle |
| ------------- | -------------------------------------------------- | -------------------- |
| `SPEEDING`    | speed > `SPEED_LIMIT_KMH` (default 90 km/h)        | 1 min                |
| `LOW_FUEL`    | fuel < 15 %                                        | 10 min               |
| `GEOFENCE`    | position outside the Kyiv bounding box             | 5 min                |
| `IDLE_ENGINE` | ignition on but not moving for more than 5 minutes | 5 min                |

## Tech stack

| Part      | Technology                                                      |
| --------- | --------------------------------------------------------------- |
| API       | NestJS 10, TypeORM, PostgreSQL 17, Socket.IO, Swagger           |
| Web       | React 18, Vite, Leaflet / react-leaflet, socket.io-client       |
| Simulator | Node.js + TypeScript, OSRM public routing API                   |
| Shared    | `@roadpulse/shared`: REST/WebSocket payload types and constants |
| Tooling   | npm workspaces, TypeScript, ESLint, Prettier, Docker Compose    |

## Project structure

```
apps/
  api/          NestJS backend: vehicles, telemetry, alerts, WebSocket gateways
  web/          React dashboard: map, fleet sidebar, alert feed
  simulator/    Kyiv traffic simulator that feeds the API with telemetry
packages/
  shared/       Types and event names shared by API, web and simulator
docker-compose.yml   PostgreSQL for local development
```

## Getting started

### Requirements

- Node.js 22+ (`nvm use` picks the version from `.nvmrc`)
- Docker with Docker Compose
- Internet access for the simulator (OSRM routing) and the web map (OpenStreetMap tiles)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env                                   # database (Docker Compose)
cp apps/api/.env.example apps/api/.env                 # API
cp apps/simulator/.env.example apps/simulator/.env     # simulator
```

The defaults work out of the box; change them only if a port is taken. See [Environment variables](#environment-variables).

### 3. Start the database

```bash
npm run db:up
```

PostgreSQL starts in the background on `localhost:5433`. Data is kept in the `db-data` Docker volume between restarts.

### 4. Start the apps

Run each in its own terminal, in this order:

```bash
npm run start:dev -w @roadpulse/api         # API on http://localhost:3000
npm run dev -w @roadpulse/web               # Web on http://localhost:5173
npm run start:dev -w @roadpulse/simulator   # starts sending telemetry
```

In development the API creates and updates the database schema automatically (`synchronize` is on when `NODE_ENV` is not `production`).

### 5. Open the dashboard

- Dashboard: <http://localhost:5173>
- API docs (Swagger): <http://localhost:3000/docs>

Within a few seconds of starting the simulator you should see five vans moving across Kyiv.

## Environment variables

### Root `.env` (Docker Compose)

| Variable            | Default     | Description                            |
| ------------------- | ----------- | -------------------------------------- |
| `POSTGRES_USER`     | `roadpulse` | Database user                          |
| `POSTGRES_PASSWORD` | `roadpulse` | Database password                      |
| `POSTGRES_DB`       | `roadpulse` | Database name                          |
| `POSTGRES_PORT`     | `5433`      | Host port the database is published on |

### `apps/api/.env`

| Variable            | Default       | Description                                            |
| ------------------- | ------------- | ------------------------------------------------------ |
| `POSTGRES_HOST`     | `localhost`   | Database host                                          |
| `POSTGRES_PORT`     | `5433`        | Database port (must match the root `.env`)             |
| `POSTGRES_USER`     | `roadpulse`   | Database user                                          |
| `POSTGRES_PASSWORD` | `roadpulse`   | Database password                                      |
| `POSTGRES_DB`       | `roadpulse`   | Database name                                          |
| `PORT`              | `3000`        | HTTP and WebSocket port                                |
| `NODE_ENV`          | `development` | `production` disables auto schema sync and SQL logging |
| `SPEED_LIMIT_KMH`   | `90`          | Threshold for the `SPEEDING` alert                     |

### `apps/simulator/.env`

| Variable           | Default                          | Description                             |
| ------------------ | -------------------------------- | --------------------------------------- |
| `API_URL`          | `http://localhost:3000/api`      | API base URL                            |
| `CAR_COUNT`        | `5`                              | Number of simulated vehicles            |
| `TICK_INTERVAL_MS` | `1500`                           | How often each car reports (min 500 ms) |
| `OSRM_URL`         | `http://router.project-osrm.org` | OSRM routing server                     |

### `apps/web` (optional)

| Variable       | Default                     | Description                                    |
| -------------- | --------------------------- | ---------------------------------------------- |
| `VITE_API_URL` | `http://localhost:3000/api` | API base URL; the WebSocket uses the same host |

## API overview

All REST endpoints are under `/api`. Full, interactive documentation is at `/docs`.

| Method   | Path                              | Description                        |
| -------- | --------------------------------- | ---------------------------------- |
| `POST`   | `/api/vehicles`                   | Register a vehicle                 |
| `GET`    | `/api/vehicles`                   | List vehicles                      |
| `GET`    | `/api/vehicles/:id`               | Get one vehicle                    |
| `GET`    | `/api/vehicles/:id/last-position` | Latest telemetry point             |
| `PATCH`  | `/api/vehicles/:id`               | Update a vehicle                   |
| `DELETE` | `/api/vehicles/:id`               | Delete a vehicle and its telemetry |
| `POST`   | `/api/telemetry`                  | Submit a telemetry point           |
| `GET`    | `/api/alerts`                     | Latest 100 alerts                  |
| `PATCH`  | `/api/alerts/:id/read`            | Mark an alert as read              |

**WebSocket** (Socket.IO on the API host, e.g. `http://localhost:3000`):

| Event              | Payload                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `telemetry:update` | `{ vehicleId, latitude, longitude, speed, fuel, ignition, recordedAt }` |
| `alert:new`        | `{ id, vehicleId, type, message, isRead, createdAt }`                   |

Payload types live in [`packages/shared/src/index.ts`](packages/shared/src/index.ts).

## Scripts

### Root

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run build`        | Build all workspaces               |
| `npm run typecheck`    | Type-check all workspaces          |
| `npm run lint`         | Run ESLint                         |
| `npm run format`       | Format with Prettier               |
| `npm run format:check` | Check formatting                   |
| `npm run db:up`        | Start PostgreSQL in the background |
| `npm run db:down`      | Stop containers (data is kept)     |

### Per app (`-w <workspace>`)

| Workspace              | Command                              | Description                        |
| ---------------------- | ------------------------------------ | ---------------------------------- |
| `@roadpulse/api`       | `start:dev`                          | Run with watch mode                |
|                        | `build` / `start:prod`               | Production build and run           |
|                        | `migration:generate <path>`          | Generate a migration from entities |
|                        | `migration:run` / `migration:revert` | Apply / roll back migrations       |
| `@roadpulse/web`       | `dev`                                | Vite dev server                    |
|                        | `build` / `preview`                  | Production build and local preview |
| `@roadpulse/simulator` | `start:dev`                          | Run with auto-restart on changes   |
|                        | `start`                              | Run once                           |

## Troubleshooting

- **Cars don't appear or don't move.** Check the simulator terminal for errors. `Failed to set up vehicles` means the API isn't reachable at `API_URL`; `Route fetch failed` means OSRM is unreachable or rate-limiting (the simulator retries automatically).
- **Status badge says "Reconnecting…".** The browser can't reach the API's WebSocket. Make sure the API is running and `VITE_API_URL` points to it.
- **Many "Offline" vehicles.** These are vehicles that stopped reporting, for example from an older simulator setup. Delete them with `DELETE /api/vehicles/:id`, or reset all data with `docker compose down -v` followed by `npm run db:up`.
- **Port already in use.** Change `POSTGRES_PORT` (in both the root and API `.env`) or `PORT` in the API `.env`.
