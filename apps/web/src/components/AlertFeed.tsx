import type { AlertPayload, AlertType } from '@roadpulse/shared';
import type { Fleet } from '../hooks/useFleet';

const ALERT_ICONS: Record<AlertType, string> = {
  SPEEDING: '🚨',
  GEOFENCE: '📍',
  IDLE_ENGINE: '⚙️',
  LOW_FUEL: '⛽',
};

const ALERT_COLORS: Record<AlertType, string> = {
  SPEEDING: '#ef4444',
  GEOFENCE: '#f59e0b',
  IDLE_ENGINE: '#8b5cf6',
  LOW_FUEL: '#f97316',
};

interface AlertFeedProps {
  alerts: AlertPayload[];
  fleet: Fleet;
  onMarkRead: (id: string) => void;
}

export function AlertFeed({ alerts, fleet, onMarkRead }: AlertFeedProps) {
  if (alerts.length === 0) {
    return (
      <p className="sidebar__empty">
        No alerts yet.
        <br />
        Start the simulator.
      </p>
    );
  }

  return (
    <div className="alert-feed">
      {alerts.map((alert) => {
        const car = fleet.get(alert.vehicleId);
        const vehicleLabel = car?.vehicle.number ?? alert.vehicleId.slice(0, 8);
        const color = ALERT_COLORS[alert.type] ?? '#64748b';
        const icon = ALERT_ICONS[alert.type] ?? '⚠️';

        return (
          <div
            key={alert.id}
            className={`alert-item${alert.isRead ? ' alert-item--read' : ''}`}
            style={{ borderLeftColor: color }}
          >
            <div className="alert-item__header">
              <span className="alert-item__icon">{icon}</span>
              <span className="alert-item__vehicle">{vehicleLabel}</span>
              <span className="alert-item__time">
                {new Date(alert.createdAt).toLocaleTimeString()}
              </span>
              {!alert.isRead && (
                <button
                  className="alert-item__read-btn"
                  onClick={() => onMarkRead(alert.id)}
                  title="Mark as read"
                >
                  ✓
                </button>
              )}
            </div>
            <p className="alert-item__message">{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}
