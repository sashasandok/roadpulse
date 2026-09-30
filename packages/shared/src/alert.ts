export type AlertType = 'speeding' | 'low_fuel' | 'engine_overheat' | 'offline';

export type AlertSeverity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: string;
  vehicleId: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  /** ISO 8601 timestamp; null while the alert is still open. */
  resolvedAt: string | null;
}
