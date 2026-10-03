import type { LatLng } from './types';

const EARTH_RADIUS_KM = 6371;
const ROAD_FACTOR = 1.3; // roads are longer than a straight line
const AVERAGE_SPEED_KMH = 40; // suburban driving with lights
const MIN_TRIP_MINUTES = 3;

export function distanceKm(a: LatLng, b: LatLng): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function travelMinutes(a: LatLng, b: LatLng): number {
  const minutes = ((distanceKm(a, b) * ROAD_FACTOR) / AVERAGE_SPEED_KMH) * 60;
  return Math.max(MIN_TRIP_MINUTES, Math.round(minutes));
}

/** The point a given fraction (0-1) of the way along a path. Used to move drivers on the map. */
export function interpolateAlong(points: LatLng[], fraction: number): LatLng {
  if (points.length === 0) throw new Error('interpolateAlong needs at least one point');
  const last = points[points.length - 1];
  if (points.length === 1 || fraction <= 0) return points[0];
  if (fraction >= 1) return last;
  const legs = points.slice(1).map((point, i) => distanceKm(points[i], point));
  const total = legs.reduce((sum, leg) => sum + leg, 0);
  if (total === 0) return last;
  let remaining = fraction * total;
  for (let i = 0; i < legs.length; i += 1) {
    if (remaining <= legs[i]) {
      const t = legs[i] === 0 ? 0 : remaining / legs[i];
      const from = points[i];
      const to = points[i + 1];
      return { lat: from.lat + (to.lat - from.lat) * t, lng: from.lng + (to.lng - from.lng) * t };
    }
    remaining -= legs[i];
  }
  return last;
}
