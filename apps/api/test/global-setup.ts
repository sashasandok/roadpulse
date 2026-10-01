import { config } from 'dotenv';
import { Client } from 'pg';

/** Creates the test database if it doesn't exist. Tables come from migrations when the app starts. */
export default async function globalSetup(): Promise<void> {
  config();
  const database = process.env['POSTGRES_TEST_DB'] ?? 'roadpulse_test';

  const client = new Client({
    host: process.env['POSTGRES_HOST'] ?? 'localhost',
    port: Number(process.env['POSTGRES_PORT'] ?? 5433),
    user: process.env['POSTGRES_USER'] ?? 'roadpulse',
    password: process.env['POSTGRES_PASSWORD'] ?? 'roadpulse',
    database: 'postgres',
  });

  try {
    await client.connect();
  } catch (err) {
    throw new Error(
      `Tests need PostgreSQL (start it with "npm run db:up"): ${(err as Error).message}`,
      { cause: err },
    );
  }

  const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [
    database,
  ]);
  if (!rowCount) await client.query(`CREATE DATABASE "${database}"`);
  await client.end();
}
