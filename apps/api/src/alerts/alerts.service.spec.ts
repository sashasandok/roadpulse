import type { Repository } from 'typeorm';
import type { TelemetryEntry } from '../telemetry/entities/telemetry-entry.entity';
import type { AlertsGateway } from './alerts.gateway';
import { AlertsService } from './alerts.service';
import { type Alert, AlertType } from './entities/alert.entity';

const KYIV_CENTER = { latitude: 50.45, longitude: 30.52 };

function point(
  overrides: Partial<Record<keyof TelemetryEntry, unknown>> & { vehicleId?: string } = {},
) {
  const { vehicleId = 'v1', ...rest } = overrides;
  return {
    vehicle: { id: vehicleId },
    ...KYIV_CENTER,
    speed: 50,
    fuel: 80,
    ignition: true,
    ...rest,
  } as unknown as TelemetryEntry;
}

describe('AlertsService', () => {
  let service: AlertsService;
  let repo: { create: jest.Mock; save: jest.Mock };
  let gateway: { broadcast: jest.Mock };

  const firedTypes = () => repo.save.mock.calls.map(([a]: [Alert]) => a.type);

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T12:00:00Z'));
    repo = {
      create: jest.fn((data: Partial<Alert>) => data),
      save: jest.fn(async (a: Partial<Alert>) => ({
        ...a,
        id: 'alert-id',
        isRead: false,
        createdAt: new Date(),
      })),
    };
    gateway = { broadcast: jest.fn() };
    service = new AlertsService(
      repo as unknown as Repository<Alert>,
      gateway as unknown as AlertsGateway,
    );
  });

  afterEach(() => jest.useRealTimers());

  const advance = (ms: number) => jest.setSystemTime(Date.now() + ms);

  it('raises nothing for a normal point inside Kyiv', async () => {
    await service.check(point());
    expect(repo.save).not.toHaveBeenCalled();
  });

  describe('SPEEDING', () => {
    it('fires above the limit, saves the alert and broadcasts it', async () => {
      await service.check(point({ speed: 95 }));

      expect(firedTypes()).toEqual([AlertType.SPEEDING]);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          vehicle: { id: 'v1' },
          type: AlertType.SPEEDING,
          message: 'Speed 95 km/h exceeds limit of 90 km/h',
        }),
      );
      expect(gateway.broadcast).toHaveBeenCalledWith(expect.objectContaining({ id: 'alert-id' }));
    });

    it('does not fire at exactly the limit', async () => {
      await service.check(point({ speed: 90 }));
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('respects a 1-minute cooldown per vehicle', async () => {
      await service.check(point({ speed: 100 }));
      advance(59_000);
      await service.check(point({ speed: 100 }));
      expect(firedTypes()).toEqual([AlertType.SPEEDING]);

      advance(2_000);
      await service.check(point({ speed: 100 }));
      expect(firedTypes()).toEqual([AlertType.SPEEDING, AlertType.SPEEDING]);
    });

    it('tracks cooldowns separately for each vehicle', async () => {
      await service.check(point({ vehicleId: 'v1', speed: 100 }));
      await service.check(point({ vehicleId: 'v2', speed: 100 }));
      expect(firedTypes()).toEqual([AlertType.SPEEDING, AlertType.SPEEDING]);
    });

    it('accepts decimal values returned as strings by PostgreSQL', async () => {
      await service.check(point({ speed: '91.50' }));
      expect(firedTypes()).toEqual([AlertType.SPEEDING]);
    });
  });

  describe('LOW_FUEL', () => {
    it('fires below 15 %', async () => {
      await service.check(point({ fuel: 14.9 }));
      expect(firedTypes()).toEqual([AlertType.LOW_FUEL]);
    });

    it('does not fire at 15 %', async () => {
      await service.check(point({ fuel: 15 }));
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('fires again only after the 10-minute cooldown', async () => {
      await service.check(point({ fuel: 10 }));
      advance(9 * 60_000);
      await service.check(point({ fuel: 10 }));
      advance(2 * 60_000);
      await service.check(point({ fuel: 10 }));
      expect(firedTypes()).toEqual([AlertType.LOW_FUEL, AlertType.LOW_FUEL]);
    });
  });

  describe('GEOFENCE', () => {
    it.each([
      ['north', { latitude: 50.8 }],
      ['south', { latitude: 50.0 }],
      ['east', { longitude: 31.0 }],
      ['west', { longitude: 30.0 }],
    ])('fires when the vehicle is %s of Kyiv', async (_side, coords) => {
      await service.check(point(coords));
      expect(firedTypes()).toEqual([AlertType.GEOFENCE]);
    });
  });

  describe('IDLE_ENGINE', () => {
    it('fires after more than 5 minutes stationary with ignition on', async () => {
      await service.check(point({ speed: 0 }));
      advance(5 * 60_000);
      await service.check(point({ speed: 0 }));
      expect(repo.save).not.toHaveBeenCalled();

      advance(1_000);
      await service.check(point({ speed: 0 }));
      expect(firedTypes()).toEqual([AlertType.IDLE_ENGINE]);
    });

    it('resets the timer when the vehicle moves', async () => {
      await service.check(point({ speed: 0 }));
      advance(4 * 60_000);
      await service.check(point({ speed: 30 }));
      advance(4 * 60_000);
      await service.check(point({ speed: 0 }));
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('resets the timer when ignition is turned off', async () => {
      await service.check(point({ speed: 0 }));
      advance(4 * 60_000);
      await service.check(point({ speed: 0, ignition: false }));
      advance(2 * 60_000);
      await service.check(point({ speed: 0 }));
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('treats speed of 2 km/h or less as stationary (GPS drift)', async () => {
      await service.check(point({ speed: 0 }));
      advance(6 * 60_000);
      await service.check(point({ speed: 2 }));
      expect(firedTypes()).toEqual([AlertType.IDLE_ENGINE]);
    });
  });

  it('can raise several alert types from one point', async () => {
    await service.check(point({ speed: 120, fuel: 5, latitude: 51 }));
    expect(firedTypes().sort()).toEqual(
      [AlertType.GEOFENCE, AlertType.LOW_FUEL, AlertType.SPEEDING].sort(),
    );
  });
});
