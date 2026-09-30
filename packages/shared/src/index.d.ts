/** Vehicle as returned by GET /api/vehicles */
export interface Vehicle {
    id: string;
    number: string;
    model: string;
    driver: string;
    createdAt: string;
    updatedAt: string;
}
/** Last-position entry as returned by GET /api/vehicles/:id/last-position */
export interface LastPosition {
    id: string;
    latitude: number;
    longitude: number;
    speed: number;
    fuel: number;
    ignition: boolean;
    recordedAt: string;
    createdAt: string;
}
/** Payload pushed on every `telemetry:update` Socket.IO event */
export interface TelemetryUpdatePayload {
    vehicleId: string;
    latitude: number;
    longitude: number;
    speed: number;
    fuel: number;
    ignition: boolean;
    recordedAt: string;
}
export declare const WS_EVENTS: {
    readonly TELEMETRY_UPDATE: "telemetry:update";
};
//# sourceMappingURL=index.d.ts.map