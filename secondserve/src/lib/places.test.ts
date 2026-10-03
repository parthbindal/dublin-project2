import { describe, expect, it, vi } from 'vitest';
import { createRateLimiter, parseNominatimReverse, parseNominatimSearch, parseOsrmRoute, parseOsrmSnap } from './places';

// Trimmed copies of real replies from the live services.
const AUSTIN_SEARCH = [
  {
    lat: '30.2711286',
    lon: '-97.7436995',
    name: 'Austin',
    display_name: 'Austin, Travis County, Texas, United States',
    address: { city: 'Austin', county: 'Travis County', state: 'Texas', 'ISO3166-2-lvl4': 'US-TX', country: 'United States', country_code: 'us' },
  },
];

const LONDON_REVERSE = {
  lat: '51.4973206',
  lon: '-0.1371490',
  name: 'City of Westminster',
  display_name: 'City of Westminster, Greater London, England, United Kingdom',
  address: { city: 'City of Westminster', state: 'England', country: 'United Kingdom', country_code: 'gb' },
};

const OSRM_TABLE = {
  code: 'Ok',
  sources: [
    { hint: 'a', location: [-97.74313, 30.267208], name: 'Congress Avenue', distance: 3.02 },
    { hint: 'b', location: [-97.750029, 30.279887], name: '', distance: 12.83 },
  ],
};

describe('parseNominatimSearch', () => {
  it('reads a real search reply', () => {
    expect(parseNominatimSearch(AUSTIN_SEARCH)).toEqual({
      center: { lat: 30.2711286, lng: -97.7436995 },
      areaName: 'Austin, Texas',
      label: 'Austin, Travis County, Texas',
    });
  });

  it('returns null when nothing was found or the reply is unexpected', () => {
    expect(parseNominatimSearch([])).toBeNull();
    expect(parseNominatimSearch({ error: 'Unable to geocode' })).toBeNull();
  });
});

describe('parseNominatimReverse', () => {
  it('names the area around a location', () => {
    expect(parseNominatimReverse(LONDON_REVERSE)?.areaName).toBe('City of Westminster, England');
  });
});

describe('parseOsrmSnap', () => {
  it('turns road points into map points with street names', () => {
    expect(parseOsrmSnap(OSRM_TABLE, 2)).toEqual([
      { location: { lat: 30.267208, lng: -97.74313 }, street: 'Congress Avenue' },
      { location: { lat: 30.279887, lng: -97.750029 }, street: '' },
    ]);
  });

  it('rejects replies with the wrong count or an error code', () => {
    expect(parseOsrmSnap(OSRM_TABLE, 3)).toBeNull();
    expect(parseOsrmSnap({ code: 'NoTable', sources: [] }, 0)).toBeNull();
  });
});

describe('parseOsrmRoute', () => {
  it('turns a route into map points', () => {
    const reply = { code: 'Ok', routes: [{ geometry: { coordinates: [[-97.74, 30.26], [-97.75, 30.27]] } }] };
    expect(parseOsrmRoute(reply)).toEqual([
      { lat: 30.26, lng: -97.74 },
      { lat: 30.27, lng: -97.75 },
    ]);
  });

  it('returns null when no route was found', () => {
    expect(parseOsrmRoute({ code: 'NoRoute', routes: [] })).toBeNull();
  });
});

describe('createRateLimiter', () => {
  it('keeps requests at least the given gap apart, in order', async () => {
    vi.useFakeTimers();
    try {
      const schedule = createRateLimiter(1000);
      const starts: number[] = [];
      const task = async () => {
        starts.push(Date.now());
      };
      const all = Promise.all([schedule(task), schedule(task), schedule(task)]);
      await vi.runAllTimersAsync();
      await all;
      expect(starts).toHaveLength(3);
      expect(starts[1] - starts[0]).toBeGreaterThanOrEqual(1000);
      expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(1000);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps going after a task fails', async () => {
    const schedule = createRateLimiter(0);
    await expect(schedule(async () => Promise.reject(new Error('busy')))).rejects.toThrow('busy');
    await expect(schedule(async () => 'ok')).resolves.toBe('ok');
  });
});
