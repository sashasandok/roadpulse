import { useState } from 'react';
import { HistoryView } from './components/HistoryView';
import { MapView } from './components/MapView';
import { Sidebar } from './components/Sidebar';
import { useAlerts } from './hooks/useAlerts';
import { useFleet } from './hooks/useFleet';
import { useNow } from './status';

type Mode = 'live' | 'history';

export function App() {
  const { fleet, connected } = useFleet();
  const now = useNow();
  const { alerts, markRead } = useAlerts();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('live');

  return (
    <div className="app">
      <header className="header">
        <span className="header__logo">🚐 RoadPulse</span>
        <span className="header__subtitle">Fleet Map — Kyiv</span>
        <nav className="header__nav">
          {(['live', 'history'] as const).map((m) => (
            <button
              key={m}
              className={`header__nav-btn${mode === m ? ' header__nav-btn--active' : ''}`}
              onClick={() => setMode(m)}
            >
              {m === 'live' ? 'Live' : 'History'}
            </button>
          ))}
        </nav>
      </header>

      <main className="content">
        {mode === 'live' ? (
          <>
            <Sidebar
              fleet={fleet}
              now={now}
              selectedId={selectedId}
              onSelect={setSelectedId}
              connected={connected}
              alerts={alerts}
              onMarkRead={markRead}
            />

            <div className="map-wrapper">
              <MapView fleet={fleet} now={now} selectedId={selectedId} onSelect={setSelectedId} />
            </div>
          </>
        ) : (
          <HistoryView fleet={fleet} initialVehicleId={selectedId} />
        )}
      </main>
    </div>
  );
}
