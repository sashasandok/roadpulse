import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelemetryEntry } from '../telemetry/entities/telemetry-entry.entity';

/** Matches Trip in packages/shared */
export interface Trip {
  id: string;
  vehicleId: string;
  startedAt: string;
  endedAt: string;
  durationSec: number;
  distanceKm: number;
  avgSpeedKmh: number;
  maxSpeedKmh: number;
  pointCount: number;
  path: [number, number][];
}

/** Matches TrackPoint in packages/shared */
export interface TrackPoint {
  lat: number;
  lng: number;
  speed: number;
  ignition: boolean;
  recordedAt: string;
}

const DAY_MS = 24 * 60 * 60_000;
const MAX_TRIPS_RANGE_MS = 31 * DAY_MS;
const MAX_TRACK_RANGE_MS = DAY_MS;

/** A silence longer than this ends a trip even if ignition never reported "off". */
const TRIP_GAP = '5 minutes';
/** Points are read this far outside [from, to] so trips crossing the edges come back whole. */
const LOOKAROUND = '6 hours';
const PATH_MAX_POINTS = 100;

interface TripRow {
  started_at: Date;
  ended_at: Date;
  distance_km: number;
  max_speed: number;
  point_count: number;
  path: [number, number][];
}

@Injectable()
export class TripsService {
  constructor(
    @InjectRepository(TelemetryEntry)
    private readonly telemetryRepo: Repository<TelemetryEntry>,
  ) {}

  async findTrips(vehicleId: string, fromIso: string, toIso: string): Promise<Trip[]> {
    const [from, to] = this.parseRange(fromIso, toIso, MAX_TRIPS_RANGE_MS);
    const { table, vehicleCol, recordedCol } = this.columns();

    // Gaps-and-islands: a point starts a trip when ignition is on and the previous point
    // had ignition off, doesn't exist, or is older than TRIP_GAP. A running sum of those
    // starts numbers the trips; distance is the haversine sum between consecutive points.
    const rows: TripRow[] = await this.telemetryRepo.query(
      `
      WITH pts AS (
        SELECT ${recordedCol} AS at,
               latitude::float8  AS lat,
               longitude::float8 AS lng,
               speed::float8     AS speed,
               ignition,
               LAG(ignition)    OVER w AS prev_ignition,
               LAG(${recordedCol}) OVER w AS prev_at
        FROM ${table}
        WHERE ${vehicleCol} = $1
          AND ${recordedCol} >= $2::timestamptz - interval '${LOOKAROUND}'
          AND ${recordedCol} <  $3::timestamptz + interval '${LOOKAROUND}'
        WINDOW w AS (ORDER BY ${recordedCol})
      ),
      numbered AS (
        SELECT *,
               SUM(CASE WHEN prev_ignition IS DISTINCT FROM true
                          OR at - prev_at > interval '${TRIP_GAP}'
                        THEN 1 ELSE 0 END) OVER (ORDER BY at) AS trip_no
        FROM pts
        WHERE ignition
      ),
      segs AS (
        SELECT *,
               LAG(lat) OVER t AS plat,
               LAG(lng) OVER t AS plng,
               ROW_NUMBER() OVER t AS rn,
               COUNT(*) OVER (PARTITION BY trip_no) AS cnt
        FROM numbered
        WINDOW t AS (PARTITION BY trip_no ORDER BY at)
      )
      SELECT MIN(at) AS started_at,
             MAX(at) AS ended_at,
             COALESCE(SUM(
               CASE WHEN plat IS NULL THEN 0 ELSE
                 2 * 6371 * ASIN(SQRT(
                   POWER(SIN(RADIANS(lat - plat) / 2), 2) +
                   COS(RADIANS(plat)) * COS(RADIANS(lat)) * POWER(SIN(RADIANS(lng - plng) / 2), 2)
                 ))
               END), 0) AS distance_km,
             MAX(speed) AS max_speed,
             COUNT(*)::int AS point_count,
             json_agg(json_build_array(lat, lng) ORDER BY at) FILTER (
               WHERE rn = 1 OR rn = cnt
                  OR (rn - 1) % GREATEST(1, CEIL(cnt / ${PATH_MAX_POINTS}.0)::int) = 0
             ) AS path
      FROM segs
      GROUP BY trip_no
      HAVING COUNT(*) >= 2
         AND MAX(at) >= $2::timestamptz
         AND MIN(at) <  $3::timestamptz
      ORDER BY started_at
      `,
      [vehicleId, from.toISOString(), to.toISOString()],
    );

    return rows.map((r) => {
      const durationSec = Math.round((r.ended_at.getTime() - r.started_at.getTime()) / 1000);
      const distanceKm = Number(r.distance_km);
      return {
        id: r.started_at.toISOString(),
        vehicleId,
        startedAt: r.started_at.toISOString(),
        endedAt: r.ended_at.toISOString(),
        durationSec,
        distanceKm: round(distanceKm, 2),
        avgSpeedKmh: durationSec > 0 ? round(distanceKm / (durationSec / 3600), 1) : 0,
        maxSpeedKmh: round(Number(r.max_speed), 1),
        pointCount: r.point_count,
        path: r.path,
      };
    });
  }

  async findTrack(vehicleId: string, fromIso: string, toIso: string): Promise<TrackPoint[]> {
    const [from, to] = this.parseRange(fromIso, toIso, MAX_TRACK_RANGE_MS);
    const { table, vehicleCol, recordedCol } = this.columns();

    const rows: { at: Date; lat: number; lng: number; speed: number; ignition: boolean }[] =
      await this.telemetryRepo.query(
        `
        SELECT ${recordedCol} AS at, latitude::float8 AS lat, longitude::float8 AS lng,
               speed::float8 AS speed, ignition
        FROM ${table}
        WHERE ${vehicleCol} = $1 AND ${recordedCol} >= $2 AND ${recordedCol} <= $3
        ORDER BY ${recordedCol}
        `,
        [vehicleId, from.toISOString(), to.toISOString()],
      );

    return rows.map((r) => ({
      lat: r.lat,
      lng: r.lng,
      speed: r.speed,
      ignition: r.ignition,
      recordedAt: r.at.toISOString(),
    }));
  }

  private parseRange(fromIso: string, toIso: string, maxMs: number): [Date, Date] {
    const from = new Date(fromIso);
    const to = new Date(toIso);
    if (from >= to) throw new BadRequestException('"from" must be earlier than "to"');
    if (to.getTime() - from.getTime() > maxMs) {
      throw new BadRequestException(`Range must not exceed ${Math.round(maxMs / DAY_MS)} day(s)`);
    }
    return [from, to];
  }

  /** Column names come from entity metadata so raw SQL follows the real schema. */
  private columns() {
    const meta = this.telemetryRepo.metadata;
    const col = (prop: string) => `"${meta.findColumnsWithPropertyPath(prop)[0]!.databaseName}"`;
    return {
      table: `"${meta.tableName}"`,
      vehicleCol: col('vehicle'),
      recordedCol: col('recordedAt'),
    };
  }
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}
