import { useState } from 'react';
import type { AlertPayload } from '@roadpulse/shared';
import type { CarState, Fleet } from '../hooks/useFleet';
import { formatAgo, getStatus, STATUS_LABEL, type CarStatus } from '../status';
import { AlertFeed } from './AlertFeed';

const STATUS_CLASS: Record<CarStatus, string> = {
  moving: 'status-green',
  parked: 'status-gray',
  offline: 'status-offline',
  'no-signal': 'status-gray',
};

function statusText(car: CarState, status: CarStatus, now: number): string {
  if (status === 'offline' && car.lastUpdate) {
    return `${STATUS_LABEL.offline} · ${formatAgo(car.lastUpdate, now)}`;
  }
  return STATUS_LABEL[status];
}

interface SidebarProps {
  fleet: Fleet;
  now: number;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  connected: boolean;
  alerts: AlertPayload[];
  onMarkRead: (id: string) => void;
}

// ── Fuel bar ──────────────────────────────────────────────────────────────────
function FuelBar({ pct }: { pct: number }) {
  const color = pct > 30 ? '#22c55e' : pct > 15 ? '#f59e0b' : '#ef4444';
  return (
    <div className="fuel-bar-track">
      <div
        className="fuel-bar-fill"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, background: color }}
      />
    </div>
  );
}

// ── Single car card ───────────────────────────────────────────────────────────
function CarCard({
  car,
  now,
  selected,
  onClick,
}: {
  car: CarState;
  now: number;
  selected: boolean;
  onClick: () => void;
}) {
  const status = getStatus(car, now);
  const classes = ['car-card'];
  if (selected) classes.push('car-card--selected');
  if (status === 'offline') classes.push('car-card--offline');

  return (
    <button className={classes.join(' ')} onClick={onClick}>
      <div className="car-card__header">
        <span className="car-card__number">{car.vehicle.number}</span>
        <span className={`car-card__status ${STATUS_CLASS[status]}`}>
          {statusText(car, status, now)}
        </span>
      </div>

      <div className="car-card__model">{car.vehicle.model}</div>
      <div className="car-card__driver">👤 {car.vehicle.driver}</div>

      <div className="car-card__stats">
        <span>⚡ {car.hasPosition ? `${car.speed.toFixed(0)} km/h` : '—'}</span>
        <span>⛽ {car.hasPosition ? `${car.fuel.toFixed(0)}%` : '—'}</span>
      </div>

      <FuelBar pct={car.fuel} />
    </button>
  );
}

// ── Selected car details panel ────────────────────────────────────────────────
function CarDetails({ car, now, onClose }: { car: CarState; now: number; onClose: () => void }) {
  const status = getStatus(car, now);
  return (
    <div className="car-details">
      <div className="car-details__title">
        <span>{car.vehicle.number}</span>
        <button className="car-details__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>

      <table className="car-details__table">
        <tbody>
          <tr>
            <td>Model</td>
            <td>{car.vehicle.model}</td>
          </tr>
          <tr>
            <td>Driver</td>
            <td>{car.vehicle.driver}</td>
          </tr>
          <tr>
            <td>Status</td>
            <td>
              <span className={`car-card__status ${STATUS_CLASS[status]}`}>
                {statusText(car, status, now)}
              </span>
            </td>
          </tr>
          {car.hasPosition && (
            <>
              <tr>
                <td>Speed</td>
                <td>{car.speed.toFixed(1)} km/h</td>
              </tr>
              <tr>
                <td>Fuel</td>
                <td>
                  {car.fuel.toFixed(1)} %
                  <FuelBar pct={car.fuel} />
                </td>
              </tr>
              <tr>
                <td>Lat</td>
                <td>{car.lat.toFixed(6)}</td>
              </tr>
              <tr>
                <td>Lng</td>
                <td>{car.lng.toFixed(6)}</td>
              </tr>
              <tr>
                <td>Updated</td>
                <td>{car.lastUpdate ? car.lastUpdate.toLocaleTimeString() : '—'}</td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Sidebar root ──────────────────────────────────────────────────────────────
export function Sidebar({
  fleet,
  now,
  selectedId,
  onSelect,
  connected,
  alerts,
  onMarkRead,
}: SidebarProps) {
  const [tab, setTab] = useState<'fleet' | 'alerts'>('fleet');

  const cars = Array.from(fleet.values()).sort((a, b) =>
    a.vehicle.number.localeCompare(b.vehicle.number),
  );
  const movingCount = cars.filter((c) => getStatus(c, now) === 'moving').length;
  const selectedCar = selectedId != null ? fleet.get(selectedId) : undefined;
  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <aside className="sidebar">
      {/* Connection badge */}
      <div className="sidebar__badge">
        <span className={`dot ${connected ? 'dot--green' : 'dot--red'}`} />
        {connected ? 'Live' : 'Reconnecting…'}
        <span className="sidebar__count">
          {movingCount}/{cars.length} moving
        </span>
      </div>

      {/* Tabs */}
      <div className="sidebar__tabs">
        <button
          className={`sidebar__tab${tab === 'fleet' ? ' sidebar__tab--active' : ''}`}
          onClick={() => setTab('fleet')}
        >
          Fleet
        </button>
        <button
          className={`sidebar__tab${tab === 'alerts' ? ' sidebar__tab--active' : ''}`}
          onClick={() => setTab('alerts')}
        >
          Alerts
          {unreadCount > 0 && <span className="sidebar__tab-badge">{unreadCount}</span>}
        </button>
      </div>

      {tab === 'fleet' ? (
        <>
          {/* Car list */}
          <div className="sidebar__list">
            {cars.length === 0 ? (
              <p className="sidebar__empty">
                No vehicles yet.
                <br />
                Start the simulator.
              </p>
            ) : (
              cars.map((car) => (
                <CarCard
                  key={car.vehicle.id}
                  car={car}
                  now={now}
                  selected={car.vehicle.id === selectedId}
                  onClick={() => onSelect(car.vehicle.id === selectedId ? null : car.vehicle.id)}
                />
              ))
            )}
          </div>

          {/* Details panel */}
          {selectedCar && <CarDetails car={selectedCar} now={now} onClose={() => onSelect(null)} />}
        </>
      ) : (
        <div className="sidebar__list">
          <AlertFeed alerts={alerts} fleet={fleet} onMarkRead={onMarkRead} />
        </div>
      )}
    </aside>
  );
}
