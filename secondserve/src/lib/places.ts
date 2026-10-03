// Finding places, streets and road routes with free OpenStreetMap services, called from the browser.
// Both services ask for at most 1 request per second, so every call goes through a small queue.
// Nominatim (place search) also forbids search-as-you-type and asks apps to cache results:
// we only search when someone presses the button, and remember answers for this visit.
import { z } from 'zod';
import type { SnappedPoint } from './relocate';
import type { LatLng } from './types';

const NOMINATIM = 'https://nominatim.openstreetmap.org';
const OSRM = 'https://router.project-osrm.org';
const MIN_GAP_MS = 1100; // a little over 1 second between requests to the same service

/** Runs tasks one at a time, at least `minGapMs` apart. */
export function createRateLimiter(minGapMs: number) {
  let lastStart = 0;
  let queue: Promise<unknown> = Promise.resolve();
  return function schedule<T>(task: () => Promise<T>): Promise<T> {
    const run = queue.then(async () => {
      const wait = lastStart + minGapMs - Date.now();
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      lastStart = Date.now();
      return task();
    });
    queue = run.catch(() => undefined);
    return run;
  };
}

const nominatimQueue = createRateLimiter(MIN_GAP_MS);
const osrmQueue = createRateLimiter(MIN_GAP_MS);
const searchCache = new Map<string, FoundPlace | null>();

export interface FoundPlace {
  center: LatLng;
  areaName: string;
}

const AddressSchema = z
  .object({
    city: z.string(),
    town: z.string(),
    village: z.string(),
    hamlet: z.string(),
    municipality: z.string(),
    county: z.string(),
    state: z.string(),
    country: z.string(),
  })
  .partial();

const PlaceSchema = z.object({
  lat: z.string(),
  lon: z.string(),
  name: z.string().optional(),
  display_name: z.string(),
  address: AddressSchema.optional(),
});
type NominatimPlace = z.infer<typeof PlaceSchema>;

export function toAreaName(place: NominatimPlace): string {
  const a = place.address ?? {};
  const local =
    a.city ?? a.town ?? a.village ?? a.hamlet ?? a.municipality ?? (place.name || undefined) ?? a.county ?? place.display_name.split(',')[0].trim();
  const region = a.state ?? a.country;
  return region && region !== local ? `${local}, ${region}` : local;
}

function toFoundPlace(place: NominatimPlace): FoundPlace | null {
  const lat = Number(place.lat);
  const lng = Number(place.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { center: { lat, lng }, areaName: toAreaName(place) };
}

export function parseNominatimSearch(data: unknown): FoundPlace | null {
  const parsed = z.array(PlaceSchema).safeParse(data);
  return parsed.success && parsed.data.length > 0 ? toFoundPlace(parsed.data[0]) : null;
}

export function parseNominatimReverse(data: unknown): FoundPlace | null {
  const parsed = PlaceSchema.safeParse(data);
  return parsed.success ? toFoundPlace(parsed.data) : null;
}

const OsrmTableSchema = z.object({
  code: z.literal('Ok'),
  sources: z.array(z.object({ location: z.tuple([z.number(), z.number()]), name: z.string().catch('') })),
});

export function parseOsrmSnap(data: unknown, expectedCount: number): SnappedPoint[] | null {
  const parsed = OsrmTableSchema.safeParse(data);
  if (!parsed.success || parsed.data.sources.length !== expectedCount) return null;
  return parsed.data.sources.map(({ location: [lng, lat], name }) => ({ location: { lat, lng }, street: name }));
}

const OsrmRouteSchema = z.object({
  code: z.literal('Ok'),
  routes: z.array(z.object({ geometry: z.object({ coordinates: z.array(z.tuple([z.number(), z.number()])) }) })).min(1),
});

export function parseOsrmRoute(data: unknown): LatLng[] | null {
  const parsed = OsrmRouteSchema.safeParse(data);
  if (!parsed.success) return null;
  const points = parsed.data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
  return points.length >= 2 ? points : null;
}

async function getJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' } });
  if (response.status === 429) throw new Error('The free map service is busy. Wait a few seconds and try again.');
  if (!response.ok) throw new Error(`The map service had a problem (error ${response.status}). Try again in a moment.`);
  return response.json();
}

const lonLat = (p: LatLng) => `${p.lng.toFixed(5)},${p.lat.toFixed(5)}`;

export async function searchPlace(query: string, signal?: AbortSignal): Promise<FoundPlace | null> {
  const cacheKey = query.trim().toLowerCase();
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey) ?? null;
  const params = new URLSearchParams({ q: query, format: 'jsonv2', limit: '1', addressdetails: '1', 'accept-language': 'en' });
  const found = parseNominatimSearch(await nominatimQueue(() => getJson(`${NOMINATIM}/search?${params}`, signal)));
  searchCache.set(cacheKey, found);
  return found;
}

export async function reverseGeocode(point: LatLng, signal?: AbortSignal): Promise<FoundPlace | null> {
  const params = new URLSearchParams({
    lat: point.lat.toFixed(4),
    lon: point.lng.toFixed(4),
    format: 'jsonv2',
    zoom: '10',
    addressdetails: '1',
    'accept-language': 'en',
  });
  const found = parseNominatimReverse(await nominatimQueue(() => getJson(`${NOMINATIM}/reverse?${params}`, signal)));
  // Keep the exact spot the person is standing, not the center of the town it belongs to.
  return found ? { ...found, center: point } : null;
}

/** Moves each point to the nearest road and returns that road's name. Null if the service fails. */
export async function snapToRoads(points: LatLng[], signal?: AbortSignal): Promise<SnappedPoint[] | null> {
  const url = `${OSRM}/table/v1/driving/${points.map(lonLat).join(';')}?annotations=duration`;
  return parseOsrmSnap(await osrmQueue(() => getJson(url, signal)), points.length);
}

/** The driving route between two points as a list of map points. Null if the service fails. */
export async function fetchRoadPath(from: LatLng, to: LatLng, signal?: AbortSignal): Promise<LatLng[] | null> {
  const url = `${OSRM}/route/v1/driving/${lonLat(from)};${lonLat(to)}?overview=full&geometries=geojson`;
  return parseOsrmRoute(await osrmQueue(() => getJson(url, signal)));
}
