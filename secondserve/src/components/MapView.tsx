'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { interpolateAlong } from '@/lib/geo';
import { LOADING_MIN } from '@/lib/matching';
import type { AppState, Donor, Driver, LatLng, Listing, Match, Recipient } from '@/lib/types';
import { DONOR_EMOJI } from './ui';

type PinKind = 'donor' | 'recipient' | 'driver';
type Tuple = [number, number];

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Routes: OSRM';
const FIT_PADDING: Tuple = [36, 36];
const ACTIVE = new Set<Listing['status']>(['matched', 'picked-up']);

const toTuple = (point: LatLng): Tuple => [point.lat, point.lng];
const vehicleEmoji = (driver: Driver) => (driver.vehicle.includes('van') ? '🚐' : driver.vehicle.includes('SUV') ? '🚙' : '🚗');

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(kind: PinKind, emoji: string, isPulsing = false): L.DivIcon {
  const key = `${kind}|${emoji}|${isPulsing}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const size = kind === 'driver' ? 30 : 34;
  const icon = L.divIcon({
    className: 'pin-wrap',
    html: `<div class="pin pin-${kind}${isPulsing ? ' pin-pulse' : ''}">${emoji}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

// ---------- Road routes from the public OSRM server, with a straight-line fallback ----------

const roadCache = new Map<string, LatLng[]>();
const routeKey = (from: LatLng, to: LatLng) =>
  `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;

async function fetchRoad(from: LatLng, to: LatLng, signal: AbortSignal): Promise<LatLng[] | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${routeKey(from, to)}?overview=full&geometries=geojson`;
  const response = await fetch(url, { signal });
  if (!response.ok) return null;
  const data: unknown = await response.json();
  const coords = (data as { routes?: Array<{ geometry?: { coordinates?: unknown } }> }).routes?.[0]?.geometry?.coordinates;
  if (!Array.isArray(coords)) return null;
  const points = coords
    .filter((c): c is [number, number] => Array.isArray(c) && typeof c[0] === 'number' && typeof c[1] === 'number')
    .map(([lng, lat]) => ({ lat, lng }));
  return points.length >= 2 ? points : null;
}

function useRoadPath(from: LatLng, to: LatLng): LatLng[] {
  const key = routeKey(from, to);
  const [loaded, setLoaded] = useState<{ key: string; path: LatLng[] } | null>(null);
  useEffect(() => {
    if (roadCache.has(key)) return undefined;
    const controller = new AbortController();
    fetchRoad(from, to, controller.signal)
      .then((path) => {
        if (!path) return;
        roadCache.set(key, path);
        setLoaded({ key, path });
      })
      .catch(() => undefined); // offline or rate-limited: keep showing the straight line
    return () => controller.abort();
    // `from` and `to` are fully described by `key`; depending on the objects would refetch on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return roadCache.get(key) ?? (loaded?.key === key ? loaded.path : [from, to]);
}

function driverPosition(match: Match, now: number, toDonor: LatLng[], toRecipient: LatLng[]): LatLng {
  if (now < match.pickupAt) {
    return interpolateAlong(toDonor, (now - match.matchedAt) / Math.max(1, match.pickupAt - match.matchedAt));
  }
  const leaveAt = match.pickupAt + LOADING_MIN;
  if (now < leaveAt) return toRecipient[0];
  return interpolateAlong(toRecipient, (now - leaveAt) / Math.max(1, match.deliverAt - leaveAt));
}

type RouteProps = {
  listing: Listing;
  match: Match;
  donor: Donor;
  recipient: Recipient;
  driver: Driver;
  now: number;
  isSelected: boolean;
};

function ActiveRoute({ listing, match, donor, recipient, driver, now, isSelected }: RouteProps) {
  const toDonor = useRoadPath(match.driverFrom, donor.location);
  const toRecipient = useRoadPath(donor.location, recipient.location);
  const isDelivered = listing.status === 'delivered';
  const weight = isSelected ? 7 : 4;
  return (
    <>
      {listing.status === 'matched' && (
        <Polyline positions={toDonor.map(toTuple)} pathOptions={{ color: '#e3a21a', weight, opacity: 0.95, dashArray: '2 10', lineCap: 'round' }} />
      )}
      <Polyline
        positions={toRecipient.map(toTuple)}
        pathOptions={{ color: isDelivered ? '#2d8a4e' : '#2f6fd1', weight, opacity: isDelivered ? 0.5 : 0.9 }}
      />
      {!isDelivered && (
        <Marker position={toTuple(driverPosition(match, now, toDonor, toRecipient))} icon={pinIcon('driver', vehicleEmoji(driver))} zIndexOffset={1000}>
          <Tooltip direction="top" offset={[0, -14]}>
            {driver.name} · {driver.vehicle}
          </Tooltip>
        </Marker>
      )}
    </>
  );
}

function RouteFor({ listing, state, isSelected }: { listing: Listing; state: AppState; isSelected: boolean }) {
  const { match } = listing;
  const donor = state.donors.find((d) => d.id === listing.donorId);
  const recipient = match ? state.recipients.find((r) => r.id === match.recipientId) : undefined;
  const driver = match ? state.drivers.find((d) => d.id === match.driverId) : undefined;
  if (!match || !donor || !recipient || !driver) return null;
  return <ActiveRoute listing={listing} match={match} donor={donor} recipient={recipient} driver={driver} now={state.now} isSelected={isSelected} />;
}

/** Re-fits the map whenever its box changes size (first layout, window resize), so every pin stays in view. */
function KeepInView({ bounds }: { bounds: L.LatLngBounds }) {
  const map = useMap();
  useEffect(() => {
    const refit = () => {
      map.invalidateSize();
      map.fitBounds(bounds, { padding: FIT_PADDING });
    };
    refit();
    const observer = new ResizeObserver(refit);
    observer.observe(map.getContainer());
    return () => observer.disconnect();
  }, [map, bounds]);
  return null;
}

type Props = {
  state: AppState;
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export default function MapView({ state, selectedId, onSelect }: Props) {
  const bounds = useMemo(
    () => L.latLngBounds([...state.donors, ...state.recipients].map((place) => toTuple(place.location))),
    [state.donors, state.recipients],
  );
  const routes = state.listings.filter((l) => l.match && (ACTIVE.has(l.status) || l.id === selectedId));
  const busyDriverIds = new Set(state.listings.filter((l) => ACTIVE.has(l.status)).map((l) => l.match?.driverId));
  const waitingDonorIds = new Set(state.listings.filter((l) => l.status === 'open' || l.status === 'matched').map((l) => l.donorId));

  return (
    <MapContainer bounds={bounds} boundsOptions={{ padding: FIT_PADDING }} scrollWheelZoom className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <KeepInView bounds={bounds} />
      {routes.map((listing) => (
        <RouteFor key={listing.id} listing={listing} state={state} isSelected={listing.id === selectedId} />
      ))}
      {state.recipients.map((recipient) => (
        <Marker key={recipient.id} position={toTuple(recipient.location)} icon={pinIcon('recipient', '🤝')}>
          <Tooltip direction="top" offset={[0, -16]}>
            <strong>{recipient.name}</strong>
            <br />
            {recipient.city} · received {recipient.receivedLbs} of {recipient.capacityLbs} lbs today
          </Tooltip>
        </Marker>
      ))}
      {state.donors.map((donor) => {
        const latestId = state.listings.find((l) => l.donorId === donor.id)?.id;
        return (
          <Marker
            key={donor.id}
            position={toTuple(donor.location)}
            icon={pinIcon('donor', DONOR_EMOJI[donor.kind], waitingDonorIds.has(donor.id))}
            eventHandlers={{ click: () => latestId && onSelect(latestId) }}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              <strong>{donor.name}</strong>
              <br />
              {donor.city}
              {latestId ? ' · click to see its listing' : ''}
            </Tooltip>
          </Marker>
        );
      })}
      {state.drivers
        .filter((driver) => !busyDriverIds.has(driver.id))
        .map((driver) => (
          <Marker key={driver.id} position={toTuple(driver.location)} icon={pinIcon('driver', vehicleEmoji(driver))}>
            <Tooltip direction="top" offset={[0, -14]}>
              {driver.name} · {driver.vehicle} · available
            </Tooltip>
          </Marker>
        ))}
    </MapContainer>
  );
}
