import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import type { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { resetDb } from './db';

const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

/** Retries an assertion until it passes — alert checks run after the telemetry response. */
async function eventually(assertion: () => Promise<void>, timeoutMs = 3000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      return await assertion();
    } catch (err) {
      if (Date.now() > deadline) throw err;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
}

describe('RoadPulse API (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let api: () => ReturnType<typeof request>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ logger: ['error'] });
    configureApp(app);
    await app.init();
    dataSource = app.get(getDataSourceToken());
    api = () => request(app.getHttpServer());
  });

  afterAll(() => app.close());

  beforeEach(() => resetDb(dataSource));

  async function createVehicle(number = 'AA 1234 BB') {
    const res = await api()
      .post('/api/vehicles')
      .send({ number, model: 'Ford Transit', driver: 'Olena Shevchenko' })
      .expect(201);
    return res.body as { id: string; number: string };
  }

  function telemetry(vehicleId: string, overrides: Record<string, unknown> = {}) {
    return {
      vehicleId,
      latitude: 50.45,
      longitude: 30.52,
      speed: 40,
      fuel: 70,
      ignition: true,
      recordedAt: '2026-10-01T10:00:00.000Z',
      ...overrides,
    };
  }

  describe('/api/vehicles', () => {
    it('creates, lists, reads, updates and deletes a vehicle', async () => {
      const created = await createVehicle();
      expect(created).toMatchObject({ number: 'AA 1234 BB', model: 'Ford Transit' });
      expect(created.id).toMatch(/^[0-9a-f-]{36}$/);

      const list = await api().get('/api/vehicles').expect(200);
      expect(list.body).toHaveLength(1);

      await api().get(`/api/vehicles/${created.id}`).expect(200);

      const updated = await api()
        .patch(`/api/vehicles/${created.id}`)
        .send({ driver: 'Taras Melnyk' })
        .expect(200);
      expect(updated.body.driver).toBe('Taras Melnyk');

      await api().delete(`/api/vehicles/${created.id}`).expect(204);
      await api().get(`/api/vehicles/${created.id}`).expect(404);
    });

    it('rejects a duplicate number with 409', async () => {
      await createVehicle('AA 0001 AA');
      const res = await api()
        .post('/api/vehicles')
        .send({ number: 'AA 0001 AA', model: 'Van', driver: 'Someone' })
        .expect(409);
      expect(res.body.message).toContain('already exists');
    });

    it.each([
      ['missing fields', { number: 'AA 1' }],
      ['invalid characters', { number: 'AA_1!', model: 'Van', driver: 'X' }],
      ['unknown fields', { number: 'AA 1', model: 'Van', driver: 'X', color: 'red' }],
    ])('rejects %s with 400', async (_case, body) => {
      await api().post('/api/vehicles').send(body).expect(400);
    });

    it('returns 400 for a malformed id and 404 for an unknown one', async () => {
      await api().get('/api/vehicles/not-a-uuid').expect(400);
      await api().get(`/api/vehicles/${UNKNOWN_ID}`).expect(404);
    });
  });

  describe('/api/telemetry and last position', () => {
    it('stores points and returns the most recent one by recording time', async () => {
      const { id } = await createVehicle();
      await api().get(`/api/vehicles/${id}/last-position`).expect(404);

      await api()
        .post('/api/telemetry')
        .send(telemetry(id, { latitude: 50.46, recordedAt: '2026-10-01T10:05:00.000Z' }))
        .expect(201);
      await api()
        .post('/api/telemetry')
        .send(telemetry(id, { latitude: 50.44, recordedAt: '2026-10-01T10:00:00.000Z' }))
        .expect(201);

      const last = await api().get(`/api/vehicles/${id}/last-position`).expect(200);
      expect(Number(last.body.latitude)).toBe(50.46);
      expect(last.body.recordedAt).toBe('2026-10-01T10:05:00.000Z');
    });

    it('rejects out-of-range values with 400', async () => {
      const { id } = await createVehicle();
      await api()
        .post('/api/telemetry')
        .send(telemetry(id, { latitude: 91 }))
        .expect(400);
      await api()
        .post('/api/telemetry')
        .send(telemetry(id, { fuel: 101 }))
        .expect(400);
    });

    it('returns 404 for telemetry from an unknown vehicle', async () => {
      await api().post('/api/telemetry').send(telemetry(UNKNOWN_ID)).expect(404);
    });

    it('deletes a vehicle together with its telemetry', async () => {
      const { id } = await createVehicle();
      await api().post('/api/telemetry').send(telemetry(id)).expect(201);
      await api().delete(`/api/vehicles/${id}`).expect(204);

      const [{ count }] = await dataSource.query(
        'SELECT COUNT(*)::int AS count FROM telemetry_points',
      );
      expect(count).toBe(0);
    });
  });

  describe('/api/alerts', () => {
    it('raises an alert for a speeding vehicle and marks it as read', async () => {
      const { id } = await createVehicle();
      await api()
        .post('/api/telemetry')
        .send(telemetry(id, { speed: 120 }))
        .expect(201);

      let alertId = '';
      await eventually(async () => {
        const res = await api().get('/api/alerts').expect(200);
        expect(res.body).toHaveLength(1);
        expect(res.body[0]).toMatchObject({ vehicleId: id, type: 'SPEEDING', isRead: false });
        alertId = res.body[0].id;
      });

      const read = await api().patch(`/api/alerts/${alertId}/read`).expect(200);
      expect(read.body.isRead).toBe(true);
    });

    it('returns 400 for a malformed alert id and 404 for an unknown one', async () => {
      await api().patch('/api/alerts/abc/read').expect(400);
      await api().patch(`/api/alerts/${UNKNOWN_ID}/read`).expect(404);
    });
  });

  describe('/api/vehicles/:id/trips and /track', () => {
    const range = '?from=2026-10-01T00:00:00.000Z&to=2026-10-02T00:00:00.000Z';

    it('builds trips from posted telemetry and returns their track', async () => {
      const { id } = await createVehicle();
      const points = [
        { recordedAt: '2026-10-01T09:00:00.000Z', ignition: false, speed: 0 },
        { recordedAt: '2026-10-01T09:01:00.000Z', latitude: 50.4 },
        { recordedAt: '2026-10-01T09:02:00.000Z', latitude: 50.41 },
        { recordedAt: '2026-10-01T09:03:00.000Z', latitude: 50.42 },
        { recordedAt: '2026-10-01T09:04:00.000Z', ignition: false, speed: 0 },
      ];
      for (const p of points) {
        await api().post('/api/telemetry').send(telemetry(id, p)).expect(201);
      }

      const trips = await api().get(`/api/vehicles/${id}/trips${range}`).expect(200);
      expect(trips.body).toHaveLength(1);
      expect(trips.body[0]).toMatchObject({
        vehicleId: id,
        startedAt: '2026-10-01T09:01:00.000Z',
        endedAt: '2026-10-01T09:03:00.000Z',
        durationSec: 120,
        pointCount: 3,
      });
      expect(trips.body[0].distanceKm).toBeCloseTo(2.22, 1);

      const { startedAt, endedAt } = trips.body[0];
      const track = await api()
        .get(`/api/vehicles/${id}/track?from=${startedAt}&to=${endedAt}`)
        .expect(200);
      expect(track.body.map((p: { lat: number }) => p.lat)).toEqual([50.4, 50.41, 50.42]);
    });

    it('validates the query and the vehicle', async () => {
      const { id } = await createVehicle();
      await api().get(`/api/vehicles/${id}/trips`).expect(400);
      await api().get(`/api/vehicles/${id}/trips?from=yesterday&to=today`).expect(400);
      await api()
        .get(`/api/vehicles/${id}/trips?from=2026-10-02T00:00:00Z&to=2026-10-01T00:00:00Z`)
        .expect(400);
      await api().get(`/api/vehicles/${UNKNOWN_ID}/trips${range}`).expect(404);
    });
  });
});
