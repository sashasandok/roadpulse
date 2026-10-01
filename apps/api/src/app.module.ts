import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { migrations } from './migrations';
import { TelemetryModule } from './telemetry/telemetry.module';
import { TripsModule } from './trips/trips.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('POSTGRES_HOST', 'localhost'),
        port: config.get<number>('POSTGRES_PORT', 5433),
        username: config.get<string>('POSTGRES_USER', 'roadpulse'),
        password: config.get<string>('POSTGRES_PASSWORD', 'roadpulse'),
        database: config.get<string>('POSTGRES_DB', 'roadpulse'),
        autoLoadEntities: true,
        // Schema changes go through migrations in every environment, so a database
        // created by `npm run start:dev` also works with the Docker stack and vice versa.
        synchronize: false,
        migrationsRun: true,
        migrations,
        migrationsTableName: 'typeorm_migrations',
        logging: config.get<string>('NODE_ENV') === 'development',
      }),
    }),
    VehiclesModule,
    TelemetryModule,
    TripsModule,
  ],
})
export class AppModule {}
