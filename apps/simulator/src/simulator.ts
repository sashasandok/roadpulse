import { getLastPosition, listVehicles, postTelemetry, registerVehicle } from './api-client';
import { Car } from './car';
import { config } from './config';
import { DRIVERS, MODELS, pick } from './kyiv';

export async function run(): Promise<void> {
  console.log('╔══════════════════════════════════════╗');
  console.log('║      RoadPulse Traffic Simulator      ║');
  console.log('╚══════════════════════════════════════╝');
  console.log(`  Cars        : ${config.carCount}`);
  console.log(`  Tick        : ${config.tickIntervalMs} ms`);
  console.log(`  API         : ${config.apiUrl}`);
  console.log(`  OSRM        : ${config.osrmUrl}`);
  console.log();

  // ── 1. Reuse existing vehicles by number, register missing ones ─────────
  const cars: Car[] = [];

  try {
    const existing = new Map((await listVehicles()).map((v) => [v.number, v]));

    for (let i = 1; i <= config.carCount; i++) {
      const number = `RP-${String(i).padStart(2, '0')}`;
      const found = existing.get(number);
      const vehicle = found ?? (await registerVehicle(number, pick(MODELS), pick(DRIVERS)));
      const tag = found ? '♻️ ' : '✅ ';
      console.log(`${tag} ${number}  ${vehicle.model.padEnd(22)}  ${vehicle.driver}  [${vehicle.id.slice(0, 8)}]`);
      const start = found ? await getLastPosition(vehicle.id) : null;
      cars.push(new Car(vehicle.id, start ?? undefined));
    }
  } catch (err) {
    console.error('❌  Failed to set up vehicles:', (err as Error).message);
    console.error('    Is the API running? Check API_URL in .env');
    process.exit(1);
  }

  console.log(`\n⏳  Fetching initial routes from OSRM…\n`);

  // ── 2. Wait for cars to pick up their first routes ──────────────────────
  await waitForPositioned(cars);

  console.log(`\n🚀  All cars on road — ticking every ${config.tickIntervalMs}ms\n`);

  // ── 3. Main loop ────────────────────────────────────────────────────────
  let tickCount = 0;

  setInterval(() => {
    tickCount++;
    void tick(cars, tickCount);
  }, config.tickIntervalMs);
}

async function tick(cars: Car[], n: number): Promise<void> {
  const positioned = cars.filter((c) => c.isPositioned);
  if (positioned.length === 0) return;

  const results = await Promise.allSettled(
    positioned.map(async (car) => {
      car.tick(config.tickIntervalMs);
      car.checkParking();
      await postTelemetry(car.telemetry());
    }),
  );

  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  failed.forEach((r) => console.error(`[Tick ${n}] Error:`, (r.reason as Error).message));

  // Status summary every 20 ticks (~30s at default interval)
  if (n % 20 === 0) {
    console.log(`[Tick ${n}] Posted ${positioned.length - failed.length}/${positioned.length} points`);
  }
}

/** Poll until every car has been positioned by its first OSRM route. */
async function waitForPositioned(cars: Car[]): Promise<void> {
  const TIMEOUT_MS = 60_000;
  const CHECK_MS = 500;
  const start = Date.now();

  while (true) {
    if (cars.every((c) => c.isPositioned)) return;
    if (Date.now() - start > TIMEOUT_MS) {
      console.warn('⚠️  Some cars did not receive a route within 60s — continuing anyway');
      return;
    }
    await sleep(CHECK_MS);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
