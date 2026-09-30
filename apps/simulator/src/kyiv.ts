export interface Coord {
  lat: number;
  lng: number;
}

/** Approximate bounding box of Kyiv city proper */
const BOUNDS = {
  lat: { min: 50.2131, max: 50.5901 },
  lng: { min: 30.2394, max: 30.8246 },
};

export function randomKyivPoint(): Coord {
  return {
    lat: BOUNDS.lat.min + Math.random() * (BOUNDS.lat.max - BOUNDS.lat.min),
    lng: BOUNDS.lng.min + Math.random() * (BOUNDS.lng.max - BOUNDS.lng.min),
  };
}

/** Haversine distance between two coordinates, in km */
export function distanceKm(a: Coord, b: Coord): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export const MODELS = [
  'Mercedes Sprinter',
  'Renault Trafic',
  'Ford Transit',
  'Volkswagen Crafter',
  'Fiat Ducato',
  'Peugeot Boxer',
];

export const DRIVERS = [
  'Mykola Kovalenko',
  'Olena Petrenko',
  'Dmytro Shevchenko',
  'Iryna Bondarenko',
  'Andriy Lysenko',
  'Natalia Moroz',
  'Vasyl Rudenko',
  'Tetiana Savchenko',
  'Roman Kravchenko',
  'Yulia Tkachenko',
];

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}
