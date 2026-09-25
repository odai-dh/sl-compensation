import type { LatLng } from "./types";

const EARTH_RADIUS_KM = 6371;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in km. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Road distances in Stockholm are roughly 1.3× the straight line. */
export const ROAD_FACTOR = 1.3;

export function roadDistanceKm(a: LatLng, b: LatLng): number {
  return Math.round(haversineKm(a, b) * ROAD_FACTOR * 10) / 10;
}

/** Linear interpolation between two points, t clamped to [0, 1]. */
export function interpolate(a: LatLng, b: LatLng, t: number): LatLng {
  const k = Math.min(1, Math.max(0, t));
  return { lat: a.lat + (b.lat - a.lat) * k, lng: a.lng + (b.lng - a.lng) * k };
}

/** A point `km` away from `origin` in the given bearing (degrees). Good enough for short distances. */
export function offsetKm(origin: LatLng, km: number, bearingDeg: number): LatLng {
  const b = toRad(bearingDeg);
  const dLat = (km * Math.cos(b)) / 111.32;
  const dLng = (km * Math.sin(b)) / (111.32 * Math.cos(toRad(origin.lat)));
  return { lat: origin.lat + dLat, lng: origin.lng + dLng };
}
