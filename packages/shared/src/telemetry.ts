export interface TelemetryPoint {
  vehicleId: string;
  /** ISO 8601 timestamp of the reading. */
  timestamp: string;
  /** Latitude in decimal degrees. */
  lat: number;
  /** Longitude in decimal degrees. */
  lng: number;
  /** Speed in km/h. */
  speed: number;
  /** Heading in degrees, 0–359, clockwise from north. */
  heading?: number;
  /** Fuel level in percent, 0–100. */
  fuelLevel?: number;
  /** Engine temperature in °C. */
  engineTemp?: number;
}
