# RoadPulse

[![CI](https://github.com/sashasandok/roadpulse/actions/workflows/ci.yml/badge.svg)](https://github.com/sashasandok/roadpulse/actions/workflows/ci.yml)

Real-time fleet monitoring: a live map of your vehicles, their speed, fuel and status, with automatic alerts when something goes wrong.

```bash
git clone https://github.com/sashasandok/roadpulse.git && cd roadpulse
docker compose up
```

Then open <http://localhost:8080>: five vans start driving across Kyiv within a few seconds.

<!-- TODO: add media, then uncomment
![Live map with vehicles moving in real time](docs/demo.gif)
![Trip history with route replay](docs/history.png)
-->

## What problem it solves

A fleet operator (delivery vans, service cars, taxis) needs to answer a few questions at any moment:

- **Where is every vehicle right now**, and is it moving, parked, or not reporting at all?
- **Is anything wrong**: a driver speeding, a van leaving the service area, an engine idling for minutes, a tank running low?
- **What happened earlier**: which trips a vehicle made on a given day, how far and how fast it drove, and what route it took.

RoadPulse collects GPS telemetry from vehicles, stores it, and pushes every update to a web dashboard over WebSockets, so the map moves in real time without page refreshes. A rule engine checks each telemetry point and raises alerts as they happen. The stored history is split into trips that can be reviewed and replayed on the map.

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
3. **Web** has two modes, switched in the header:
   - **Live** loads vehicles and their last known positions over REST, then applies updates from the WebSocket. Markers glide between positions; vehicles that appear after the page was opened are added automatically.
   - **History** shows the trips of a chosen vehicle on a chosen day, with their routes on the map and a replay of any trip.

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

### Trips

A **trip** is a continuous run of telemetry points with the ignition on. It starts when ignition turns on and ends when it turns off, or when the vehicle sends nothing for more than 5 minutes (so a tracker that went silent doesn't produce an endless trip).

Trips aren't stored; the API computes them from raw telemetry on each request with a single SQL query (window functions), using the `(vehicleId, recorded_at)` index. For each trip it returns:

| Field         | How it's calculated                                           |
| ------------- | ------------------------------------------------------------- |
| `distanceKm`  | Sum of straight-line (haversine) distances between points     |
| `durationSec` | Time between the first and last point                         |
| `avgSpeedKmh` | `distanceKm` ÷ duration                                       |
| `maxSpeedKmh` | Highest reported speed                                        |
| `path`        | Route simplified to about 100 points, for drawing an overview |

Trips that cross the edges of the requested range (e.g. past midnight) are returned whole.

In the **History** view, pick a vehicle and a day to see its trips and day totals. Click a trip, in the list or on the map, to load its full route and replay it: play/pause, a time slider, and 10×–120× speed. The replay bar shows the time and the speed at that moment.

## Tech stack

| Part      | Technology                                                       |
| --------- | ---------------------------------------------------------------- |
| API       | NestJS 10, TypeORM, PostgreSQL 17, Socket.IO, Swagger            |
| Web       | React 18, Vite, Leaflet / react-leaflet, socket.io-client        |
| Simulator | Node.js + TypeScript, OSRM public routing API                    |
| Shared    | `@roadpulse/shared`: REST/WebSocket payload types and constants  |
| Testing   | Jest, Supertest, PostgreSQL service container in CI              |
| Delivery  | Docker multi-stage builds, nginx, Docker Compose, GitHub Actions |
| Tooling   | npm workspaces, TypeScript, ESLint, Prettier                     |

## Project structure

```
apps/
  api/          NestJS backend: vehicles, telemetry, alerts, trips, WebSocket gateways
    test/       e2e tests (Supertest) and test-database setup
  web/          React dashboard: live map, fleet sidebar, alert feed, trip history and replay
  simulator/    Kyiv traffic simulator that feeds the API with telemetry
packages/
  shared/       Types and event names shared by API, web and simulator
.github/workflows/ci.yml   Lint, typecheck, tests, build and Docker images on every push
docker-compose.yml         Whole stack (db, api, web, simulator)
```

## Getting started

There are two ways to run RoadPulse: the whole stack in Docker (one command, nothing else to install), or the apps locally with hot reload for development.

### Option A: Docker (one command)

Requires Docker with Docker Compose, and internet access (OSRM routing, OpenStreetMap tiles).

```bash
docker compose up
```

| Service     | What it runs                                                             |
| ----------- | ------------------------------------------------------------------------ |
| `db`        | PostgreSQL 17, published on `localhost:5433`                             |
| `api`       | NestJS API; applies database migrations on start                         |
| `web`       | nginx serving the dashboard on <http://localhost:8080>, proxying the API |
| `simulator` | Starts once the API is healthy and drives `RP-01`…`RP-05`                |

The browser only talks to nginx: it serves the built React app and proxies `/api`, `/docs` and the WebSocket (`/socket.io`) to the API container. Swagger is at <http://localhost:8080/docs>.

Stop with `Ctrl+C` or `docker compose down`. Data is kept in the `db-data` volume; `docker compose down -v` deletes it. Ports and simulator settings can be overridden with the variables in [Docker Compose](#root-env-docker-compose).

### Option B: Local development

Requires Node.js 22+ (`nvm use` picks the version from `.nvmrc`) and Docker for the database.

#### 1. Install dependencies

```bash
npm install
```

#### 2. Configure environment

```bash
cp .env.example .env                                   # database (Docker Compose)
cp apps/api/.env.example apps/api/.env                 # API
cp apps/simulator/.env.example apps/simulator/.env     # simulator
```

The defaults work out of the box; change them only if a port is taken. See [Environment variables](#environment-variables).

#### 3. Start the database

```bash
npm run db:up
```

PostgreSQL starts in the background on `localhost:5433`. Data is kept in the `db-data` Docker volume between restarts.

#### 4. Start the apps

Run each in its own terminal, in this order:

```bash
npm run start:dev -w @roadpulse/api         # API on http://localhost:3000
npm run dev -w @roadpulse/web               # Web on http://localhost:5173
npm run start:dev -w @roadpulse/simulator   # starts sending telemetry
```

The API applies any pending [database migrations](#database-migrations) on startup, so the schema is created on first run.

Don't run the local simulator and the Docker stack at the same time: they share the database and would both drive `RP-01`…`RP-05`.

#### 5. Open the dashboard

- Dashboard: <http://localhost:5173>
- API docs (Swagger): <http://localhost:3000/docs>

Within a few seconds of starting the simulator you should see five vans moving across Kyiv.

## Environment variables

### Root `.env` (Docker Compose)

All optional; Docker Compose reads them from the root `.env` or the shell.

| Variable            | Default                          | Description                               |
| ------------------- | -------------------------------- | ----------------------------------------- |
| `POSTGRES_USER`     | `roadpulse`                      | Database user                             |
| `POSTGRES_PASSWORD` | `roadpulse`                      | Database password                         |
| `POSTGRES_DB`       | `roadpulse`                      | Database name                             |
| `POSTGRES_PORT`     | `5433`                           | Host port the database is published on    |
| `WEB_PORT`          | `8080`                           | Host port for the dashboard (Docker)      |
| `SPEED_LIMIT_KMH`   | `90`                             | `SPEEDING` alert threshold (Docker)       |
| `CAR_COUNT`         | `5`                              | Simulated vehicles (Docker)               |
| `TICK_INTERVAL_MS`  | `1500`                           | Simulator reporting interval (Docker)     |
| `OSRM_URL`          | `http://router.project-osrm.org` | Routing server for the simulator (Docker) |

### `apps/api/.env`

| Variable            | Default                                       | Description                                          |
| ------------------- | --------------------------------------------- | ---------------------------------------------------- |
| `POSTGRES_HOST`     | `localhost`                                   | Database host                                        |
| `POSTGRES_PORT`     | `5433`                                        | Database port (must match the root `.env`)           |
| `POSTGRES_USER`     | `roadpulse`                                   | Database user                                        |
| `POSTGRES_PASSWORD` | `roadpulse`                                   | Database password                                    |
| `POSTGRES_DB`       | `roadpulse`                                   | Database name                                        |
| `PORT`              | `3000`                                        | HTTP and WebSocket port                              |
| `NODE_ENV`          | `development`                                 | `development` logs SQL queries                       |
| `SPEED_LIMIT_KMH`   | `90`                                          | Threshold for the `SPEEDING` alert                   |
| `CORS_ORIGINS`      | `http://localhost:5173,http://localhost:4173` | Comma-separated origins allowed to call the REST API |

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
| `GET`    | `/api/vehicles/:id/trips?from&to` | Trips with stats (range ≤ 31 days) |
| `GET`    | `/api/vehicles/:id/track?from&to` | All points, oldest first (≤ 1 day) |
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

`from` and `to` are ISO 8601 timestamps, e.g. `?from=2026-10-01T00:00:00Z&to=2026-10-02T00:00:00Z`.

Payload types (including `Trip` and `TrackPoint`) live in [`packages/shared/src/index.ts`](packages/shared/src/index.ts).

## Testing

```bash
npm run db:up        # tests need PostgreSQL
npm test             # service tests
npm run test:e2e     # HTTP end-to-end tests
```

Tests use a separate database, `roadpulse_test`, which is created automatically and built from migrations, so your development data is never touched.

| Suite                                                                  | What it covers                                                                                                                                                               |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`alerts.service.spec.ts`](apps/api/src/alerts/alerts.service.spec.ts) | Every alert rule, thresholds, per-vehicle cooldowns and idle-engine timing. Pure unit tests: repository and gateway are mocked, the clock is faked.                          |
| [`trips.service.spec.ts`](apps/api/src/trips/trips.service.spec.ts)    | Trip splitting (ignition, 5-minute gaps, blips, other vehicles), distance/speed/duration, path simplification, trips crossing midnight, range validation. Runs the real SQL. |
| [`app.e2e-spec.ts`](apps/api/test/app.e2e-spec.ts)                     | The full app over HTTP with Supertest: vehicles CRUD and validation, telemetry and last position, alerts, trips and track, error codes.                                      |

## Continuous integration

[GitHub Actions](.github/workflows/ci.yml) runs on every push and pull request, in three parallel jobs:

1. **Lint, typecheck & build**: ESLint, Prettier check, TypeScript for every workspace, production builds.
2. **Unit & e2e tests**: against a PostgreSQL 17 service container.
3. **Docker images**: builds all three images with `docker compose build`.

## Database migrations

The schema is managed by TypeORM migrations in [`apps/api/src/migrations`](apps/api/src/migrations), and the API applies pending ones on startup in every environment.

After changing an entity, generate a migration, register it in [`migrations/index.ts`](apps/api/src/migrations/index.ts) and restart the API:

```bash
npm run migration:generate -w @roadpulse/api -- src/migrations/AddSomething
```

## Scripts

### Root

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run build`        | Build all workspaces               |
| `npm run typecheck`    | Type-check all workspaces          |
| `npm run lint`         | Run ESLint                         |
| `npm run format`       | Format with Prettier               |
| `npm run format:check` | Check formatting                   |
| `npm test`             | Service tests (needs the database) |
| `npm run test:e2e`     | e2e API tests (needs the database) |
| `npm run db:up`        | Start PostgreSQL in the background |
| `npm run db:down`      | Stop containers (data is kept)     |

### Per app (`-w <workspace>`)

| Workspace              | Command                              | Description                        |
| ---------------------- | ------------------------------------ | ---------------------------------- |
| `@roadpulse/api`       | `start:dev`                          | Run with watch mode                |
|                        | `build` / `start:prod`               | Production build and run           |
|                        | `migration:generate <path>`          | Generate a migration from entities |
|                        | `migration:run` / `migration:revert` | Apply / roll back migrations       |
|                        | `test` / `test:cov` / `test:e2e`     | Tests, with coverage, e2e          |
| `@roadpulse/web`       | `dev`                                | Vite dev server                    |
|                        | `build` / `preview`                  | Production build and local preview |
| `@roadpulse/simulator` | `start:dev`                          | Run with auto-restart on changes   |
|                        | `start`                              | Run once                           |
|                        | `build` / `start:prod`               | Compile and run the compiled build |

## Troubleshooting

- **Cars don't appear or don't move.** Check the simulator terminal for errors. `Failed to set up vehicles` means the API isn't reachable at `API_URL`; `Route fetch failed` means OSRM is unreachable or rate-limiting (the simulator retries automatically).
- **Status badge says "Reconnecting…".** The browser can't reach the API's WebSocket. Make sure the API is running and `VITE_API_URL` points to it.
- **Many "Offline" vehicles.** These are vehicles that stopped reporting, for example from an older simulator setup. Delete them with `DELETE /api/vehicles/:id`, or reset all data with `docker compose down -v` followed by `npm run db:up`.
- **No trips in History.** Trips need telemetry for that day with the ignition on; the date picker uses your local time zone. Check that the simulator was running on the chosen day.
- **Port already in use.** Change `POSTGRES_PORT` (in both the root and API `.env`), `PORT` in the API `.env`, or `WEB_PORT` for the Docker dashboard.
- **Tests fail with "Tests need PostgreSQL".** Start the database with `npm run db:up`, or point `POSTGRES_HOST`/`POSTGRES_PORT` at another PostgreSQL server.
- **`docker compose up` shows an old version.** Rebuild the images with `docker compose up --build`.
