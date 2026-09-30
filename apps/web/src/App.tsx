import { useState } from 'react';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { useAlerts } from './hooks/useAlerts';
import { useFleet } from './hooks/useFleet';

export function App() {
  const { fleet, connected } = useFleet();
  const { alerts, markRead } = useAlerts();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="app">
      <header className="header">
        <span className="header__logo">🚐 RoadPulse</span>
        <span className="header__subtitle">Fleet Map — Kyiv</span>
      </header>

      <main className="content">
        <Sidebar
          fleet={fleet}
          selectedId={selectedId}
          onSelect={setSelectedId}
          connected={connected}
          alerts={alerts}
          onMarkRead={markRead}
        />

        <div className="map-wrapper">
          <MapView
            fleet={fleet}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
        </div>
      </main>
    </div>
  );
}
