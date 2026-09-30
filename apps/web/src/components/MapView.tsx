import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect } from 'react';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { CarState, Fleet } from '../hooks/useFleet';

// ── Kyiv city centre ─────────────────────────────────────────────────────────
const KYIV: [number, number] = [50.4501, 30.5234];

// ── Car icon factory ─────────────────────────────────────────────────────────
function carIcon(car: CarState, selected: boolean): L.DivIcon {
  const color = !car.hasPosition
    ? '#cbd5e1'
    : car.ignition
      ? '#22c55e'
      : '#94a3b8';

  const size = selected ? 38 : 32;
  const border = selected ? '3px solid #3b82f6' : '2px solid #fff';

  return L.divIcon({
    className: 'car-marker-icon',
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${color};
      border:${border};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${Math.round(size * 0.55)}px;
      box-shadow:0 2px 8px rgba(0,0,0,.3);
      cursor:pointer;
    ">🚐</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Fly-to helper (must be inside MapContainer) ───────────────────────────────
function FlyTo({ selectedId, fleet }: { selectedId: string | null; fleet: Fleet }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedId) return;
    const car = fleet.get(selectedId);
    if (car?.hasPosition) {
      map.flyTo([car.lat, car.lng], 15, { duration: 1 });
    }
  }, [selectedId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}

// ── Component ─────────────────────────────────────────────────────────────────
interface MapViewProps {
  fleet: Fleet;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function MapView({ fleet, selectedId, onSelect }: MapViewProps) {
  const cars = Array.from(fleet.values()).filter((c) => c.hasPosition);

  return (
    <MapContainer
      center={KYIV}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      <FlyTo selectedId={selectedId} fleet={fleet} />

      {cars.map((car) => (
        <Marker
          key={car.vehicle.id}
          position={[car.lat, car.lng]}
          icon={carIcon(car, car.vehicle.id === selectedId)}
          eventHandlers={{ click: () => onSelect(car.vehicle.id) }}
        >
          <Tooltip direction="top" offset={[0, -16]}>
            <strong>{car.vehicle.number}</strong>
            <br />
            {car.ignition ? `${car.speed.toFixed(0)} km/h` : 'Parked'}
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
