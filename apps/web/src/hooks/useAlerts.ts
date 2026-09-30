import { useCallback, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import type { AlertPayload } from '@roadpulse/shared';
import { WS_EVENTS } from '@roadpulse/shared';

const API_BASE = import.meta.env['VITE_API_URL'] ?? 'http://localhost:3000/api';
const WS_URL = API_BASE.replace('/api', '');

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertPayload[]>([]);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch(`${API_BASE}/alerts`);
        const data = (await res.json()) as AlertPayload[];
        if (!cancelled) setAlerts(data);
      } catch {
        // ignore initial fetch failures — alerts will arrive via WS
      }
    })();

    const socket = io(WS_URL, { transports: ['websocket'], autoConnect: false });

    socket.on(WS_EVENTS.ALERT_NEW, (data: AlertPayload) => {
      if (!cancelled) setAlerts((prev) => [data, ...prev].slice(0, 100));
    });

    const connectTimer = setTimeout(() => socket.connect(), 0);

    return () => {
      cancelled = true;
      clearTimeout(connectTimer);
      socket.disconnect();
    };
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await fetch(`${API_BASE}/alerts/${id}/read`, { method: 'PATCH' });
      setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
    } catch {
      // ignore
    }
  }, []);

  return { alerts, markRead };
}
