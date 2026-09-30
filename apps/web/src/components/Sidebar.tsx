import type { CarState, Fleet } from '../hooks/useFleet';

interface SidebarProps {
  fleet: Fleet;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  connected: boolean;
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
  selected,
  onClick,
}: {
  car: CarState;
  selected: boolean;
  onClick: () => void;
}) {
  const status = !car.hasPosition ? 'No signal' : car.ignition ? 'Moving' : 'Parked';
  const statusClass = !car.hasPosition ? 'status-gray' : car.ignition ? 'status-green' : 'status-gray';

  return (
    <button className={`car-card ${selected ? 'car-card--selected' : ''}`} onClick={onClick}>
      <div className="car-card__header">
        <span className="car-card__number">{car.vehicle.number}</span>
        <span className={`car-card__status ${statusClass}`}>{status}</span>
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
function CarDetails({ car, onClose }: { car: CarState; onClose: () => void }) {
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
              <span className={car.ignition ? 'status-green' : 'status-gray'}>
                {car.ignition ? '🟢 Moving' : '⚫ Parked'}
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
                <td>
                  {car.lastUpdate
                    ? car.lastUpdate.toLocaleTimeString()
                    : '—'}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ── Sidebar root ──────────────────────────────────────────────────────────────
export function Sidebar({ fleet, selectedId, onSelect, connected }: SidebarProps) {
  const cars = Array.from(fleet.values()).sort((a, b) =>
    a.vehicle.number.localeCompare(b.vehicle.number),
  );
  const movingCount = cars.filter((c) => c.ignition).length;
  const selectedCar = selectedId != null ? fleet.get(selectedId) : undefined;

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
              selected={car.vehicle.id === selectedId}
              onClick={() =>
                onSelect(car.vehicle.id === selectedId ? null : car.vehicle.id)
              }
            />
          ))
        )}
      </div>

      {/* Details panel */}
      {selectedCar && (
        <CarDetails car={selectedCar} onClose={() => onSelect(null)} />
      )}
    </aside>
  );
}
