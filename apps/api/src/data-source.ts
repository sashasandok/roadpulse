import 'dotenv/config';
import { DataSource } from 'typeorm';

/**
 * Standalone DataSource used by the TypeORM CLI for migrations.
 * The NestJS app uses TypeOrmModule.forRootAsync() in app.module.ts instead.
 */
export default new DataSource({
  type: 'postgres',
  host: process.env['POSTGRES_HOST'] ?? 'localhost',
  port: parseInt(process.env['POSTGRES_PORT'] ?? '5433', 10),
  username: process.env['POSTGRES_USER'] ?? 'roadpulse',
  password: process.env['POSTGRES_PASSWORD'] ?? 'roadpulse',
  database: process.env['POSTGRES_DB'] ?? 'roadpulse',
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
});
