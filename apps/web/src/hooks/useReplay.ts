import { useEffect, useMemo, useRef, useState } from 'react';
import type { TrackPoint } from '@roadpulse/shared';

export interface ReplayPosition {
  lat: number;
  lng: number;
  speed: number;
  /** Absolute time in ms */
  at: number;
  /** Index of the last track point at or before `at` */
  index: number;
}

/** Plays a track back in time: `offset` is ms since the first point. */
export function useReplay(track: TrackPoint[]) {
  const times = useMemo(() => track.map((p) => new Date(p.recordedAt).getTime()), [track]);
  const startMs = times[0] ?? 0;
  const durationMs = times.length > 1 ? times[times.length - 1]! - startMs : 0;

  const [offset, setOffset] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(30);

  useEffect(() => {
    setOffset(0);
    setPlaying(false);
  }, [track]);

  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = now - last;
      last = now;
      setOffset((o) => Math.min(durationMs, o + dt * speedRef.current));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [playing, durationMs]);

  useEffect(() => {
    if (playing && offset >= durationMs) setPlaying(false);
  }, [playing, offset, durationMs]);

  const position = useMemo<ReplayPosition | null>(() => {
    if (track.length === 0) return null;
    const at = startMs + offset;
    // Binary search for the last point at or before `at`
    let lo = 0;
    let hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (times[mid]! <= at) lo = mid;
      else hi = mid - 1;
    }
    const a = track[lo]!;
    const b = track[lo + 1];
    if (!b) return { lat: a.lat, lng: a.lng, speed: a.speed, at, index: lo };
    const span = times[lo + 1]! - times[lo]!;
    const t = span > 0 ? (at - times[lo]!) / span : 0;
    return {
      lat: a.lat + (b.lat - a.lat) * t,
      lng: a.lng + (b.lng - a.lng) * t,
      speed: a.speed + (b.speed - a.speed) * t,
      at,
      index: lo,
    };
  }, [track, times, startMs, offset]);

  const togglePlay = () => {
    if (!playing && offset >= durationMs) setOffset(0);
    setPlaying((p) => !p);
  };

  return { position, offset, setOffset, durationMs, playing, togglePlay, speed, setSpeed };
}
