import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Fleet } from '../hooks/useFleet';
import { formatAgo, getStatus, type CarStatus } from '../status';

const KYIV: [number, number] = [50.4501, 30.5234];

const STATUS_COLOR: Record<CarStatus, string> = {
  moving: '#22c55e',
  parked: '#94a3b8',
  offline: '#cbd5e1',
  'no-signal': '#cbd5e1',
};

// ── Icon cache ────────────────────────────────────────────────────────────────
// One icon per (status × selected). Reusing the same L.DivIcon object for the
// same visual state means React-Leaflet never calls setIcon (no DOM element
// replacement → no pulsing animation on every tick).
const _icons = new Map<string, L.DivIcon>();

function getCachedIcon(status: CarStatus, selected: boolean): L.DivIcon {
  const k = `${status}:${selected ? 1 : 0}`;
  let icon = _icons.get(k);
  if (icon == null) {
    const size = selected ? 38 : 32;
    const border = selected ? '3px solid #3b82f6' : '2px solid #fff';
    const opacity = status === 'offline' ? 0.5 : 1;
    icon = L.divIcon({
      className: 'car-marker-icon',
      html: `<div style="
        width:${size}px;height:${size}px;
        background:${STATUS_COLOR[status]};border:${border};
        border-radius:50%;opacity:${opacity};
        display:flex;align-items:center;justify-content:center;
        font-size:${Math.round(size * 0.55)}px;
        box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;
      ">🚐</div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
    });
    _icons.set(k, icon);
  }
  return icon;
}

// ── Fly-to helper ─────────────────────────────────────────────────────────────
function FlyTo({ selectedId, fleet }: { selectedId: string | null; fleet: Fleet }) {
  const map = useMap();
  useEffect(() => {
    if (!selectedId) return;
    const car = fleet.get(selectedId);
    if (car?.hasPosition) map.flyTo([car.lat, car.lng], 16, { duration: 1 });
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface MapViewProps {
  fleet: Fleet;
  now: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function tooltipText(
  status: CarStatus,
  speed: number,
  lastUpdate: Date | null,
  now: number,
): string {
  if (status === 'moving') return `${speed.toFixed(0)} km/h`;
  if (status === 'offline' && lastUpdate)
    return `Offline · last seen ${formatAgo(lastUpdate, now)}`;
  return 'Parked';
}

export function MapView({ fleet, now, selectedId, onSelect }: MapViewProps) {
  const cars = Array.from(fleet.values()).filter((c) => c.hasPosition);

  return (
    <MapContainer
      center={KYIV}
      zoom={13}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FlyTo selectedId={selectedId} fleet={fleet} />

      {cars.map((car) => {
        const status = getStatus(car, now);
        return (
          <Marker
            key={car.vehicle.id}
            position={[car.lat, car.lng]}
            icon={getCachedIcon(status, car.vehicle.id === selectedId)}
            zIndexOffset={status === 'offline' ? -1000 : 0}
            eventHandlers={{ click: () => onSelect(car.vehicle.id) }}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              <strong>{car.vehicle.number}</strong>
              <br />
              {tooltipText(status, car.speed, car.lastUpdate, now)}
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
