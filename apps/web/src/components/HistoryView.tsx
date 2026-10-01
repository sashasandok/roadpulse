import { useEffect, useMemo, useState } from 'react';
import type { Trip } from '@roadpulse/shared';
import type { Fleet } from '../hooks/useFleet';
import { useReplay } from '../hooks/useReplay';
import { useTrack, useTrips } from '../hooks/useTrips';
import { HistoryMap } from './HistoryMap';

const REPLAY_SPEEDS = [10, 30, 60, 120];

function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatDuration(sec: number): string {
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min`;
  return `${Math.floor(min / 60)} h ${min % 60} min`;
}

function formatTime(iso: string | number): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatClock(ms: number): string {
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function TripCard({ trip, index, selected, onClick }: { trip: Trip; index: number; selected: boolean; onClick: () => void }) {
  return (
    <button className={`car-card ${selected ? 'car-card--selected' : ''}`} onClick={onClick}>
      <div className="car-card__header">
        <span className="car-card__number">
          Trip {index + 1} · {formatTime(trip.startedAt)}–{formatTime(trip.endedAt)}
        </span>
      </div>
      <div className="trip-stats">
        <span>📏 {trip.distanceKm.toFixed(1)} km</span>
        <span>⏱ {formatDuration(trip.durationSec)}</span>
        <span>⌀ {trip.avgSpeedKmh.toFixed(0)} km/h</span>
        <span>▲ {trip.maxSpeedKmh.toFixed(0)} km/h</span>
      </div>
    </button>
  );
}

export function HistoryView({ fleet, initialVehicleId }: { fleet: Fleet; initialVehicleId: string | null }) {
  const vehicles = useMemo(
    () => Array.from(fleet.values(), (c) => c.vehicle).sort((a, b) => a.number.localeCompare(b.number)),
    [fleet],
  );

  const [vehicleId, setVehicleId] = useState<string | null>(initialVehicleId);
  const [date, setDate] = useState(todayLocal);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleId == null && vehicles.length > 0) setVehicleId(vehicles[0]!.id);
  }, [vehicleId, vehicles]);

  useEffect(() => setSelectedTripId(null), [vehicleId, date]);

  const trips = useTrips(vehicleId, date);
  const selectedTrip = trips.data.find((t) => t.id === selectedTripId) ?? null;
  const track = useTrack(selectedTrip);
  const replay = useReplay(track.data);

  const totals = useMemo(
    () => ({
      km: trips.data.reduce((s, t) => s + t.distanceKm, 0),
      sec: trips.data.reduce((s, t) => s + t.durationSec, 0),
    }),
    [trips.data],
  );

  return (
    <>
      <aside className="sidebar">
        <div className="history-controls">
          <label className="history-field">
            <span>Vehicle</span>
            <select value={vehicleId ?? ''} onChange={(e) => setVehicleId(e.target.value)}>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.number} — {v.model}
                </option>
              ))}
            </select>
          </label>
          <label className="history-field">
            <span>Day</span>
            <input type="date" value={date} max={todayLocal()} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        </div>

        <div className="sidebar__badge">
          {trips.loading
            ? 'Loading…'
            : `${trips.data.length} trip${trips.data.length === 1 ? '' : 's'}`}
          {trips.data.length > 0 && (
            <span className="sidebar__count">
              {totals.km.toFixed(1)} km · {formatDuration(totals.sec)}
            </span>
          )}
        </div>

        <div className="sidebar__list">
          {trips.error && <p className="sidebar__empty">Couldn't load trips: {trips.error}</p>}
          {!trips.loading && !trips.error && trips.data.length === 0 && (
            <p className="sidebar__empty">No trips on this day.</p>
          )}
          {trips.data.map((t, i) => (
            <TripCard
              key={t.id}
              trip={t}
              index={i}
              selected={t.id === selectedTripId}
              onClick={() => setSelectedTripId(t.id === selectedTripId ? null : t.id)}
            />
          ))}
        </div>
      </aside>

      <div className="map-wrapper">
        <HistoryMap
          trips={trips.data}
          selectedTripId={selectedTripId}
          track={track.data}
          position={replay.position}
          onSelectTrip={setSelectedTripId}
        />

        {selectedTrip && (
          <div className="replay-bar">
            {track.loading ? (
              <span className="replay-bar__info">Loading route…</span>
            ) : track.error ? (
              <span className="replay-bar__info">Couldn't load route: {track.error}</span>
            ) : (
              <>
                <button className="replay-bar__play" onClick={replay.togglePlay} aria-label={replay.playing ? 'Pause' : 'Play'}>
                  {replay.playing ? '❚❚' : '▶'}
                </button>
                <input
                  className="replay-bar__slider"
                  type="range"
                  min={0}
                  max={replay.durationMs}
                  step={1000}
                  value={replay.offset}
                  onChange={(e) => replay.setOffset(Number(e.target.value))}
                />
                <span className="replay-bar__info">
                  {replay.position ? formatClock(replay.position.at) : '—'}
                  {' · '}
                  {replay.position ? `${replay.position.speed.toFixed(0)} km/h` : ''}
                </span>
                <select
                  className="replay-bar__speed"
                  value={replay.speed}
                  onChange={(e) => replay.setSpeed(Number(e.target.value))}
                >
                  {REPLAY_SPEEDS.map((s) => (
                    <option key={s} value={s}>
                      {s}×
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
