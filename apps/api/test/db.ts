import type { DataSource } from 'typeorm';

export async function resetDb(dataSource: DataSource): Promise<void> {
  await dataSource.query('TRUNCATE "alerts", "telemetry_points", "vehicles" CASCADE');
}
