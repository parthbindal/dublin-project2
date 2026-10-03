'use client';

import { useState, type FormEvent } from 'react';
import { reverseGeocode, searchPlace, snapToRoads, type FoundPlace } from '@/lib/places';
import { applySnap, DEFAULT_NETWORK, networkPoints, relocateNetwork, type Network } from '@/lib/relocate';
import type { LatLng } from '@/lib/types';
import { Icon } from './ui';

const LOOKUP_TIMEOUT_MS = 10000;
const SNAP_TIMEOUT_MS = 8000;

type Status = { isError: boolean; text: string };

async function buildNetwork(place: FoundPlace): Promise<{ network: Network; isOnRoads: boolean }> {
  const moved = relocateNetwork(place.center, place.areaName);
  try {
    const snapped = await snapToRoads(networkPoints(moved), AbortSignal.timeout(SNAP_TIMEOUT_MS));
    return snapped ? { network: applySnap(moved, snapped), isOnRoads: true } : { network: moved, isOnRoads: false };
  } catch {
    return { network: moved, isOnRoads: false }; // the roads service is busy: keep the approximate layout
  }
}

export function currentPosition(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error("This browser can't share its location. Type a city instead."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
      (error) =>
        reject(
          new Error(
            error.code === error.PERMISSION_DENIED
              ? 'Location access was blocked. You can type a city instead.'
              : "We couldn't get your location. Try typing a city instead.",
          ),
        ),
      { enableHighAccuracy: false, timeout: LOOKUP_TIMEOUT_MS, maximumAge: 10 * 60 * 1000 },
    );
  });
}

type Props = {
  areaName: string;
  onChange: (network: Network) => void;
};

export function AreaPicker({ areaName, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  async function moveTo(findPlace: () => Promise<FoundPlace | null>, notFound: string) {
    setIsBusy(true);
    setStatus({ isError: false, text: 'Finding that place…' });
    try {
      const place = await findPlace();
      if (!place) {
        setStatus({ isError: true, text: notFound });
        return;
      }
      setStatus({ isError: false, text: `Placing the demo businesses on real streets in ${place.areaName}…` });
      const { network, isOnRoads } = await buildNetwork(place);
      onChange(network);
      setStatus({
        isError: false,
        text: isOnRoads
          ? `Now showing ${place.areaName}. The businesses, food banks and drivers are made-up examples placed on real streets.`
          : `Now showing ${place.areaName}. The street service was busy, so places are approximate. The businesses are made-up examples.`,
      });
    } catch (error: unknown) {
      setStatus({ isError: true, text: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
    } finally {
      setIsBusy(false);
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setStatus({ isError: true, text: 'Type a city, neighborhood or address.' });
      return;
    }
    void moveTo(
      () => searchPlace(trimmed, AbortSignal.timeout(LOOKUP_TIMEOUT_MS)),
      `We couldn't find "${trimmed}". Try a city name, like "Austin, TX".`,
    );
  }

  function handleUseLocation() {
    void moveTo(
      async () => reverseGeocode(await currentPosition(), AbortSignal.timeout(LOOKUP_TIMEOUT_MS)),
      "We couldn't name your area. Try typing your city instead.",
    );
  }

  function handleBackToDemo() {
    onChange(DEFAULT_NETWORK);
    setStatus(null);
    setQuery('');
  }

  return (
    <section aria-label="Choose an area" className="rounded-[16px] border-[1.5px] border-line bg-paper px-4 py-3">
      <p className="font-semibold">Try it in your own town</p>
      <p className="text-xs text-ink-soft">
        Now showing <strong className="text-ink">{areaName}</strong>
      </p>
      <form onSubmit={handleSearch} role="search" className="mt-3 flex items-center gap-2">
        <label htmlFor="area-search" className="sr-only">
          City or address
        </label>
        <input
          id="area-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Any city or address, like Austin, TX"
          maxLength={120}
          className="field min-w-0 flex-1 px-3 py-2"
        />
        <button type="submit" disabled={isBusy} className="btn btn-ink shrink-0">
          {isBusy ? 'Moving…' : 'Show it here'}
        </button>
      </form>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={isBusy}
          className="inline-flex items-center gap-1.5 font-semibold text-dusk underline-offset-4 hover:underline disabled:opacity-60"
        >
          <Icon name="locate" className="h-4 w-4" />
          Use my location
        </button>
        {areaName !== DEFAULT_NETWORK.areaName && (
          <button type="button" onClick={handleBackToDemo} disabled={isBusy} className="text-ink-soft underline-offset-4 hover:text-ink hover:underline">
            Back to Tri-Valley
          </button>
        )}
      </div>
      {status && (
        <p role="status" className={`w-full text-sm ${status.isError ? 'font-semibold text-tomato' : 'text-ink-soft'}`}>
          {status.text}
        </p>
      )}
      <p className="mt-2 w-full text-[11px] text-ink-soft">
        Place search by OpenStreetMap Nominatim. Streets and routes by OSRM. Your location is only used to center the map and is never saved.
      </p>
    </section>
  );
}
