import { describe, expect, it } from 'vitest';
import { distanceKm } from './geo';
import { computeImpact } from './impact';
import { applySnap, centerOf, CITY_SCALE, DEFAULT_NETWORK, movePoint, networkPoints, relocateNetwork } from './relocate';
import { DEMO_WEEKDAY, SCENARIO, SIM_END, SIM_START } from './sampleData';
import { createInitialState, simulateUntil } from './simulation';

const AUSTIN = { lat: 30.2711, lng: -97.7437 };
const OSLO = { lat: 59.9133, lng: 10.739 };
const SYDNEY = { lat: -33.8688, lng: 151.2093 };

describe('movePoint', () => {
  it('keeps the distance between places, scaled down for a city', () => {
    const [a, b] = DEFAULT_NETWORK.donors.map((d) => d.location);
    const base = centerOf(networkPoints(DEFAULT_NETWORK));
    const moved = [a, b].map((p) => movePoint(p, base, OSLO, CITY_SCALE));
    expect(distanceKm(moved[0], moved[1]) / distanceKm(a, b)).toBeCloseTo(CITY_SCALE, 1);
  });

  it('wraps around the date line instead of leaving the map', () => {
    const moved = movePoint({ lat: 0, lng: 1 }, { lat: 0, lng: 0 }, { lat: 0, lng: 179.9 }, 1);
    expect(moved.lng).toBeLessThan(-179);
    expect(moved.lng).toBeGreaterThanOrEqual(-180);
  });
});

describe('relocateNetwork', () => {
  const austin = relocateNetwork(AUSTIN, 'Austin, Texas');

  it('centers the network on the chosen place', () => {
    expect(distanceKm(centerOf(networkPoints(austin)), AUSTIN)).toBeLessThan(0.5);
  });

  it('keeps the same made-up names and labels the city', () => {
    expect(austin.donors.map((d) => d.name)).toEqual(DEFAULT_NETWORK.donors.map((d) => d.name));
    expect(austin.donors.every((d) => d.city === 'Austin')).toBe(true);
    expect(austin.areaName).toBe('Austin, Texas');
  });

  it.each([
    ['Austin', AUSTIN],
    ['Oslo', OSLO],
    ['Sydney', SYDNEY],
  ])('runs the whole demo evening in %s', (name, center) => {
    const network = relocateNetwork(center, name);
    const end = simulateUntil(createInitialState(DEMO_WEEKDAY, SIM_START, network), SIM_END, SCENARIO);
    expect(end.listings.every((l) => l.status === 'delivered')).toBe(true);
    expect(computeImpact(end.listings).rescuedLbs).toBe(171);
  });
});

describe('applySnap', () => {
  it('moves each place onto its road and keeps the street name', () => {
    const snapped = networkPoints(DEFAULT_NETWORK).map((p, i) => ({
      location: { lat: p.lat + 0.001, lng: p.lng },
      street: `Street ${i}`,
    }));
    const result = applySnap(DEFAULT_NETWORK, snapped);
    expect(result.donors[0].street).toBe('Street 0');
    expect(result.recipients[0].street).toBe(`Street ${DEFAULT_NETWORK.donors.length}`);
    expect(result.drivers[0].location.lat).toBeCloseTo(DEFAULT_NETWORK.drivers[0].location.lat + 0.001, 6);
  });

  it('ignores a reply with the wrong number of points', () => {
    expect(applySnap(DEFAULT_NETWORK, [])).toBe(DEFAULT_NETWORK);
  });
});
