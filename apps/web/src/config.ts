export const API_BASE: string = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000/api';

/** Socket.IO server origin; undefined means "same origin as the page" (e.g. behind the nginx proxy). */
export const WS_URL: string | undefined = /^https?:\/\//.test(API_BASE)
  ? new URL(API_BASE).origin
  : undefined;
