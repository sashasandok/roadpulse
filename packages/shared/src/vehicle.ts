export type VehicleStatus = 'active' | 'idle' | 'offline' | 'maintenance';

export interface Vehicle {
  id: string;
  /** License plate number. */
  plate: string;
  name: string;
  status: VehicleStatus;
  /** ISO 8601 timestamp. */
  createdAt: string;
}
