'use client';

import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap, ZoomControl } from 'react-leaflet';
import { interpolateAlong } from '@/lib/geo';
import { LOADING_MIN } from '@/lib/matching';
import { fetchRoadPath } from '@/lib/places';
import type { AppState, Donor, Driver, LatLng, Listing, Match, Recipient } from '@/lib/types';
import { DONOR_ICON, iconMarkup, type IconName } from './ui';

type PinKind = 'donor' | 'recipient' | 'driver';
type Tuple = [number, number];

const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors · Routes: OSRM';
const FIT_PADDING: Tuple = [70, 70];
const ACTIVE = new Set<Listing['status']>(['matched', 'picked-up']);

// Literal colors (not CSS variables) because Leaflet writes them into SVG attributes. They match globals.css.
const ROUTE_COLOR = {
  toPickup: 'oklch(0.965 0.006 95)',
  delivering: 'oklch(0.93 0.2 123)',
  delivered: 'oklch(0.965 0.006 95)',
  light: 'oklch(0.2 0.04 123)',
};

const toTuple = (point: LatLng): Tuple => [point.lat, point.lng];
const vehicleIcon = (driver: Driver): IconName => (driver.vehicle.includes('van') ? 'van' : 'car');

const iconCache = new Map<string, L.DivIcon>();
function pinIcon(kind: PinKind, symbol: IconName, options: { isPulsing?: boolean; isMoving?: boolean } = {}): L.DivIcon {
  const { isPulsing = false, isMoving = false } = options;
  const key = `${kind}|${symbol}|${isPulsing}|${isMoving}`;
  const cached = iconCache.get(key);
  if (cached) return cached;
  const size = kind === 'driver' ? 22 : 26;
  const icon = L.divIcon({
    className: isMoving ? 'pin-wrap pin-wrap-moving' : 'pin-wrap',
    html: `<div class="pin pin-${kind}${isPulsing ? ' pin-pulse' : ''}">${iconMarkup(symbol)}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
  iconCache.set(key, icon);
  return icon;
}

// ---------- Road routes (OSRM, rate-limited in places.ts) with a straight-line fallback ----------

const roadCache = new Map<string, LatLng[]>();
const routeKey = (from: LatLng, to: LatLng) =>
  `${from.lng.toFixed(5)},${from.lat.toFixed(5)};${to.lng.toFixed(5)},${to.lat.toFixed(5)}`;

function useRoadPath(from: LatLng, to: LatLng): LatLng[] {
  const key = routeKey(from, to);
  const [loaded, setLoaded] = useState<{ key: string; path: LatLng[] } | null>(null);
  useEffect(() => {
    if (roadCache.has(key)) return undefined;
    const controller = new AbortController();
    fetchRoadPath(from, to, controller.signal)
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

/** A route is three layers: a wide soft glow, the line itself, and (while food is moving) light flowing along it. */
function ActiveRoute({ listing, match, donor, recipient, driver, now, isSelected }: RouteProps) {
  const toDonor = useRoadPath(match.driverFrom, donor.location);
  const toRecipient = useRoadPath(donor.location, recipient.location);
  const isDelivered = listing.status === 'delivered';
  const weight = isSelected ? 6 : 4;
  const color = isDelivered ? ROUTE_COLOR.delivered : ROUTE_COLOR.delivering;
  const status = listing.status === 'matched' ? 'driving to pick up' : 'delivering';
  const dropOff = toRecipient.map(toTuple);
  return (
    <>
      {listing.status === 'matched' && (
        <Polyline
          positions={toDonor.map(toTuple)}
          pathOptions={{ color: ROUTE_COLOR.toPickup, weight, opacity: 0.95, dashArray: '1 11', lineCap: 'round', className: 'route-dots', interactive: false }}
        />
      )}
      <Polyline positions={dropOff} pathOptions={{ color, weight: weight * 3.5, opacity: isDelivered ? 0.04 : 0.14, lineCap: 'round', lineJoin: 'round', interactive: false }} />
      <Polyline positions={dropOff} pathOptions={{ color, weight, opacity: isDelivered ? 0.35 : 1, lineCap: 'round', lineJoin: 'round', className: 'route-draw' }} />
      {!isDelivered && (
        <Polyline
          positions={dropOff}
          pathOptions={{ color: ROUTE_COLOR.light, weight: weight - 1, opacity: 0.9, dashArray: '2 18', lineCap: 'round', className: 'route-flow', interactive: false }}
        />
      )}
      {!isDelivered && (
        <Marker
          position={toTuple(driverPosition(match, now, toDonor, toRecipient))}
          icon={pinIcon('driver', vehicleIcon(driver), { isMoving: true })}
          zIndexOffset={1000}
        >
          <Tooltip direction="top" offset={[0, -14]}>
            <strong>{driver.name}</strong> ({driver.vehicle}) is {status}
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

/** Re-fits the map whenever its size or the area changes, so every pin stays in view. */
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

const where = (place: { street?: string; city: string }) => (place.street ? `${place.street}, ${place.city}` : place.city);

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
    // Scroll-wheel zoom is off so scrolling the page never gets trapped by the map. Use + and -, pinch, or double-click.
    <MapContainer bounds={bounds} boundsOptions={{ padding: FIT_PADDING }} scrollWheelZoom={false} zoomControl={false} className="h-full w-full">
      <TileLayer url={TILE_URL} attribution={TILE_ATTRIBUTION} />
      <ZoomControl position="bottomright" />
      <KeepInView bounds={bounds} />
      {routes.map((listing) => (
        <RouteFor key={listing.id} listing={listing} state={state} isSelected={listing.id === selectedId} />
      ))}
      {state.recipients.map((recipient) => (
        <Marker key={recipient.id} position={toTuple(recipient.location)} icon={pinIcon('recipient', 'home')}>
          <Tooltip direction="top" offset={[0, -16]}>
            <strong>{recipient.name}</strong>
            <br />
            {where(recipient)}
            <br />
            Received {recipient.receivedLbs} of the {recipient.capacityLbs} lbs it can take today
          </Tooltip>
        </Marker>
      ))}
      {state.donors.map((donor) => {
        const latestId = state.listings.find((l) => l.donorId === donor.id)?.id;
        return (
          <Marker
            key={donor.id}
            position={toTuple(donor.location)}
            icon={pinIcon('donor', DONOR_ICON[donor.kind], { isPulsing: waitingDonorIds.has(donor.id) })}
            eventHandlers={{ click: () => latestId && onSelect(latestId) }}
          >
            <Tooltip direction="top" offset={[0, -16]}>
              <strong>{donor.name}</strong>
              <br />
              {where(donor)}
              {latestId ? <><br />Click to see its food</> : null}
            </Tooltip>
          </Marker>
        );
      })}
      {state.drivers
        .filter((driver) => !busyDriverIds.has(driver.id))
        .map((driver) => (
          <Marker key={driver.id} position={toTuple(driver.location)} icon={pinIcon('driver', vehicleIcon(driver))}>
            <Tooltip direction="top" offset={[0, -14]}>
              <strong>{driver.name}</strong> ({driver.vehicle}) is free to drive
            </Tooltip>
          </Marker>
        ))}
    </MapContainer>
  );
}
