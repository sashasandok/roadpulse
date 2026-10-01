import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TypeOrmModule, getRepositoryToken } from '@nestjs/typeorm';
import type { DataSource, Repository } from 'typeorm';
import { getDataSourceToken } from '@nestjs/typeorm';
import { resetDb } from '../../test/db';
import { Alert } from '../alerts/entities/alert.entity';
import { migrations } from '../migrations';
import { TelemetryEntry } from '../telemetry/entities/telemetry-entry.entity';
import { Vehicle } from '../vehicles/entities/vehicle.entity';
import { TripsService } from './trips.service';

/**
 * The trip breakdown is a single SQL query, so these tests run it against a real
 * PostgreSQL test database (created by test/global-setup.ts, schema from migrations).
 */
describe('TripsService', () => {
  let service: TripsService;
  let dataSource: DataSource;
  let vehicles: Repository<Vehicle>;
  let telemetry: Repository<TelemetryEntry>;
  let vehicleId: string;

  const DAY = '2026-10-01';
  const NEXT_DAY = '2026-10-02';
  const dayRange = (d = DAY, next = NEXT_DAY) =>
    [`${d}T00:00:00.000Z`, `${next}T00:00:00.000Z`] as const;

  interface P {
    at: string; // HH:MM:SS on DAY, or full ISO
    on: boolean;
    lat?: number;
    lng?: number;
    speed?: number;
  }

  async function insert(points: P[], vid = vehicleId) {
    await telemetry.insert(
      points.map((p) => ({
        vehicle: { id: vid },
        recordedAt: new Date(p.at.includes('T') ? p.at : `${DAY}T${p.at}.000Z`),
        latitude: p.lat ?? 50.45,
        longitude: p.lng ?? 30.52,
        speed: p.speed ?? (p.on ? 40 : 0),
        fuel: 80,
        ignition: p.on,
      })),
    );
  }

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env['POSTGRES_HOST'] ?? 'localhost',
          port: Number(process.env['POSTGRES_PORT'] ?? 5433),
          username: process.env['POSTGRES_USER'] ?? 'roadpulse',
          password: process.env['POSTGRES_PASSWORD'] ?? 'roadpulse',
          database: process.env['POSTGRES_DB'],
          entities: [Vehicle, TelemetryEntry, Alert],
          migrations,
          migrationsTableName: 'typeorm_migrations',
          migrationsRun: true,
        }),
        TypeOrmModule.forFeature([TelemetryEntry, Vehicle]),
      ],
      providers: [TripsService],
    }).compile();

    service = moduleRef.get(TripsService);
    dataSource = moduleRef.get(getDataSourceToken());
    vehicles = moduleRef.get(getRepositoryToken(Vehicle));
    telemetry = moduleRef.get(getRepositoryToken(TelemetryEntry));
  });

  afterAll(() => dataSource.destroy());

  beforeEach(async () => {
    await resetDb(dataSource);
    vehicleId = (await vehicles.save({ number: 'TEST-01', model: 'Van', driver: 'Tester' })).id;
  });

  describe('splitting into trips', () => {
    it('starts a trip when ignition turns on and ends it when ignition turns off', async () => {
      await insert([
        { at: '08:00:00', on: false },
        { at: '08:01:00', on: true },
        { at: '08:02:00', on: true },
        { at: '08:03:00', on: true },
        { at: '08:04:00', on: false },
        { at: '09:00:00', on: false },
        { at: '09:01:00', on: true },
        { at: '09:02:00', on: true },
        { at: '09:03:00', on: false },
      ]);

      const trips = await service.findTrips(vehicleId, ...dayRange());

      expect(trips.map((t) => [t.startedAt, t.endedAt, t.pointCount])).toEqual([
        ['2026-10-01T08:01:00.000Z', '2026-10-01T08:03:00.000Z', 3],
        ['2026-10-01T09:01:00.000Z', '2026-10-01T09:02:00.000Z', 2],
      ]);
      expect(trips[0]!.id).toBe(trips[0]!.startedAt);
      expect(trips[0]!.vehicleId).toBe(vehicleId);
    });

    it('ends a trip after a gap of more than 5 minutes even if ignition stays on', async () => {
      await insert([
        { at: '10:00:00', on: true },
        { at: '10:01:00', on: true },
        { at: '10:07:00', on: true }, // 6-minute silence
        { at: '10:08:00', on: true },
      ]);

      const trips = await service.findTrips(vehicleId, ...dayRange());
      expect(trips.map((t) => t.startedAt)).toEqual([
        '2026-10-01T10:00:00.000Z',
        '2026-10-01T10:07:00.000Z',
      ]);
    });

    it('keeps a trip together across gaps of up to 5 minutes', async () => {
      await insert([
        { at: '10:00:00', on: true },
        { at: '10:05:00', on: true },
        { at: '10:06:00', on: true },
      ]);
      expect(await service.findTrips(vehicleId, ...dayRange())).toHaveLength(1);
    });

    it('ignores single-point ignition blips', async () => {
      await insert([
        { at: '11:00:00', on: false },
        { at: '11:00:01', on: true },
        { at: '11:00:02', on: false },
      ]);
      expect(await service.findTrips(vehicleId, ...dayRange())).toEqual([]);
    });

    it('does not mix in points from other vehicles', async () => {
      const otherId = (await vehicles.save({ number: 'TEST-02', model: 'Van', driver: 'Other' }))
        .id;
      await insert([
        { at: '12:00:00', on: true },
        { at: '12:01:00', on: true },
      ]);
      await insert(
        [
          { at: '12:00:30', on: false },
          { at: '12:00:40', on: true },
          { at: '12:00:50', on: true },
        ],
        otherId,
      );

      const trips = await service.findTrips(vehicleId, ...dayRange());
      expect(trips).toHaveLength(1);
      expect(trips[0]!.pointCount).toBe(2);
    });
  });

  describe('statistics', () => {
    it('computes distance, duration, average and maximum speed', async () => {
      // 0.01° of latitude ≈ 1.112 km, so three steps north ≈ 3.336 km in 10 minutes.
      await insert([
        { at: '14:00:00', on: true, lat: 50.4, speed: 20 },
        { at: '14:03:20', on: true, lat: 50.41, speed: 55 },
        { at: '14:06:40', on: true, lat: 50.42, speed: 30 },
        { at: '14:10:00', on: true, lat: 50.43, speed: 10 },
      ]);

      const [trip] = await service.findTrips(vehicleId, ...dayRange());

      expect(trip!.durationSec).toBe(600);
      expect(trip!.distanceKm).toBeCloseTo(3.34, 2);
      expect(trip!.avgSpeedKmh).toBeCloseTo(20, 0);
      expect(trip!.maxSpeedKmh).toBe(55);
    });

    it('returns a simplified path of about 100 points that keeps both ends', async () => {
      const points: P[] = Array.from({ length: 1000 }, (_, i) => ({
        at: new Date(Date.parse(`${DAY}T15:00:00.000Z`) + i * 1500).toISOString(),
        on: true,
        lat: 50.4 + i * 0.0001,
      }));
      await insert(points);

      const [trip] = await service.findTrips(vehicleId, ...dayRange());

      expect(trip!.pointCount).toBe(1000);
      expect(trip!.path.length).toBeLessThanOrEqual(101);
      expect(trip!.path.length).toBeGreaterThanOrEqual(90);
      expect(trip!.path[0]).toEqual([50.4, 30.52]);
      expect(trip!.path.at(-1)![0]).toBeCloseTo(50.4999, 4);
    });
  });

  describe('date range', () => {
    it('returns a trip crossing midnight whole, for both days', async () => {
      await insert([
        { at: '2026-10-01T23:50:00.000Z', on: true },
        { at: '2026-10-01T23:55:00.000Z', on: true },
        { at: '2026-10-02T00:00:00.000Z', on: true },
        { at: '2026-10-02T00:05:00.000Z', on: true },
      ]);

      const [day1] = await service.findTrips(vehicleId, ...dayRange());
      const [day2] = await service.findTrips(vehicleId, ...dayRange(NEXT_DAY, '2026-10-03'));

      for (const trip of [day1, day2]) {
        expect(trip!.startedAt).toBe('2026-10-01T23:50:00.000Z');
        expect(trip!.endedAt).toBe('2026-10-02T00:05:00.000Z');
      }
    });

    it('excludes trips entirely outside the range', async () => {
      await insert([
        { at: '2026-09-30T10:00:00.000Z', on: true },
        { at: '2026-09-30T10:01:00.000Z', on: true },
      ]);
      expect(await service.findTrips(vehicleId, ...dayRange())).toEqual([]);
    });

    it('rejects an empty or reversed range', async () => {
      const [from, to] = dayRange();
      await expect(service.findTrips(vehicleId, to, from)).rejects.toThrow(BadRequestException);
      await expect(service.findTrips(vehicleId, from, from)).rejects.toThrow(BadRequestException);
    });

    it('rejects ranges longer than 31 days for trips and 1 day for tracks', async () => {
      await expect(
        service.findTrips(vehicleId, '2026-08-01T00:00:00Z', '2026-09-02T00:00:00Z'),
      ).rejects.toThrow('Range must not exceed 31 day(s)');
      await expect(
        service.findTrack(vehicleId, '2026-10-01T00:00:00Z', '2026-10-02T00:00:01Z'),
      ).rejects.toThrow('Range must not exceed 1 day(s)');
    });
  });

  describe('findTrack', () => {
    it('returns every point in the range, oldest first, with numeric values', async () => {
      await insert([
        { at: '16:00:02', on: true, lat: 50.42, speed: 31.5 },
        { at: '16:00:00', on: true, lat: 50.4 },
        { at: '16:00:01', on: false, lat: 50.41 },
        { at: '17:00:00', on: true },
      ]);

      const track = await service.findTrack(vehicleId, `${DAY}T16:00:00Z`, `${DAY}T16:30:00Z`);

      expect(track).toEqual([
        {
          lat: 50.4,
          lng: 30.52,
          speed: 40,
          ignition: true,
          recordedAt: '2026-10-01T16:00:00.000Z',
        },
        {
          lat: 50.41,
          lng: 30.52,
          speed: 0,
          ignition: false,
          recordedAt: '2026-10-01T16:00:01.000Z',
        },
        {
          lat: 50.42,
          lng: 30.52,
          speed: 31.5,
          ignition: true,
          recordedAt: '2026-10-01T16:00:02.000Z',
        },
      ]);
    });
  });
});
