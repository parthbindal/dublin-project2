// Moves the sample network (made-up businesses, food programs and drivers) to any place on Earth,
// keeping the same layout. Distances shrink a little so the network fits inside one city.
import { DONORS, DRIVERS, RECIPIENTS } from './sampleData';
import type { Donor, Driver, LatLng, Recipient } from './types';

export interface Network {
  areaName: string;
  donors: Donor[];
  recipients: Recipient[];
  drivers: Driver[];
}

export interface SnappedPoint {
  location: LatLng;
  street: string;
}

export const DEFAULT_AREA = 'Tri-Valley, CA';
export const CITY_SCALE = 0.6;
const KM_PER_DEG_LAT = 110.574;
const MAX_ABS_LAT = 80; // longitude math breaks down near the poles

const kmPerDegLng = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

export function centerOf(points: LatLng[]): LatLng {
  if (points.length === 0) throw new Error('centerOf needs at least one point');
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

export const DEFAULT_NETWORK: Network = { areaName: DEFAULT_AREA, donors: DONORS, recipients: RECIPIENTS, drivers: DRIVERS };

export function networkPoints(network: Network): LatLng[] {
  return [...network.donors, ...network.recipients, ...network.drivers].map((place) => place.location);
}

const BASE_CENTER = centerOf(networkPoints(DEFAULT_NETWORK));

/** Keeps a point's distance and direction from `from`, scaled, but measured from `to` instead. */
export function movePoint(point: LatLng, from: LatLng, to: LatLng, scale: number): LatLng {
  const target = { lat: Math.max(-MAX_ABS_LAT, Math.min(MAX_ABS_LAT, to.lat)), lng: to.lng };
  const eastKm = (point.lng - from.lng) * kmPerDegLng(from.lat) * scale;
  const northKm = (point.lat - from.lat) * KM_PER_DEG_LAT * scale;
  const lng = target.lng + eastKm / kmPerDegLng(target.lat);
  return { lat: target.lat + northKm / KM_PER_DEG_LAT, lng: ((((lng + 180) % 360) + 360) % 360) - 180 };
}

/** The sample network, re-centered on `center`. Names stay fictional; the city label becomes `areaName`. */
export function relocateNetwork(center: LatLng, areaName: string, scale = CITY_SCALE): Network {
  const move = (point: LatLng) => movePoint(point, BASE_CENTER, center, scale);
  const city = areaName.split(',')[0].trim() || areaName;
  return {
    areaName,
    donors: DONORS.map((d) => ({ ...d, city, street: undefined, location: move(d.location) })),
    recipients: RECIPIENTS.map((r) => ({ ...r, city, street: undefined, location: move(r.location) })),
    drivers: DRIVERS.map((v) => ({ ...v, location: move(v.location) })),
  };
}

/** Puts every place onto the nearest real road. `snapped` must be in networkPoints() order. */
export function applySnap(network: Network, snapped: SnappedPoint[]): Network {
  const donorCount = network.donors.length;
  const recipientCount = network.recipients.length;
  if (snapped.length !== donorCount + recipientCount + network.drivers.length) return network;
  const street = (i: number) => snapped[i].street || undefined;
  return {
    ...network,
    donors: network.donors.map((d, i) => ({ ...d, location: snapped[i].location, street: street(i) })),
    recipients: network.recipients.map((r, i) => ({
      ...r,
      location: snapped[donorCount + i].location,
      street: street(donorCount + i),
    })),
    drivers: network.drivers.map((v, i) => ({ ...v, location: snapped[donorCount + recipientCount + i].location })),
  };
}
