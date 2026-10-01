import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from 'react-leaflet';
import type { TrackPoint, Trip } from '@roadpulse/shared';
import type { ReplayPosition } from '../hooks/useReplay';

const KYIV: [number, number] = [50.4501, 30.5234];

const replayIcon = L.divIcon({
  className: 'replay-marker-icon',
  html: '<div class="replay-marker">🚐</div>',
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }, [map, points]);
  return null;
}

interface HistoryMapProps {
  trips: Trip[];
  selectedTripId: string | null;
  track: TrackPoint[];
  position: ReplayPosition | null;
  onSelectTrip: (id: string) => void;
}

export function HistoryMap({
  trips,
  selectedTripId,
  track,
  position,
  onSelectTrip,
}: HistoryMapProps) {
  const trackLine = useMemo(() => track.map((p): [number, number] => [p.lat, p.lng]), [track]);

  const traveled = useMemo(() => {
    if (!position) return [];
    return [
      ...trackLine.slice(0, position.index + 1),
      [position.lat, position.lng] as [number, number],
    ];
  }, [trackLine, position]);

  const boundsPoints = useMemo(
    () => (trackLine.length > 0 ? trackLine : trips.flatMap((t) => t.path)),
    [trackLine, trips],
  );

  return (
    <MapContainer center={KYIV} zoom={12} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <FitBounds points={boundsPoints} />

      {trips
        .filter((t) => !(t.id === selectedTripId && trackLine.length > 1))
        .map((t) => (
          <Polyline
            key={t.id}
            positions={t.path}
            pathOptions={{
              color: '#3b82f6',
              weight: 4,
              opacity: !selectedTripId || t.id === selectedTripId ? 0.7 : 0.25,
            }}
            eventHandlers={{ click: () => onSelectTrip(t.id) }}
          />
        ))}

      {trackLine.length > 1 && (
        <>
          <Polyline
            positions={trackLine}
            pathOptions={{ color: '#94a3b8', weight: 5, opacity: 0.9 }}
          />
          {traveled.length > 1 && (
            <Polyline positions={traveled} pathOptions={{ color: '#2563eb', weight: 5 }} />
          )}
          <CircleMarker
            center={trackLine[0]!}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#22c55e', fillOpacity: 1 }}
          >
            <Tooltip>Start</Tooltip>
          </CircleMarker>
          <CircleMarker
            center={trackLine[trackLine.length - 1]!}
            radius={7}
            pathOptions={{ color: '#fff', weight: 2, fillColor: '#ef4444', fillOpacity: 1 }}
          >
            <Tooltip>End</Tooltip>
          </CircleMarker>
        </>
      )}

      {position && <Marker position={[position.lat, position.lng]} icon={replayIcon} />}
    </MapContainer>
  );
}
