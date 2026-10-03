import { describe, expect, it } from 'vitest';
import { chooseDriver, evaluateRecipient, planMatch, rankRecipients } from './matching';
import type { Dietary, Donor, Driver, Listing, ListingDraft, Recipient } from './types';

const NOW = 18 * 60;
const HERE = { lat: 37.7, lng: -121.9 };
const NEAR = { lat: 37.705, lng: -121.905 };
const FAR = { lat: 37.95, lng: -121.6 }; // about 38 km away

const dietary = (overrides: Partial<Dietary> = {}): Dietary => ({
  vegetarian: true, vegan: false, containsNuts: false, containsDairy: false, containsGluten: false, ...overrides,
});

function makeListing(overrides: Partial<ListingDraft> = {}, totalLbs = 20, id = 'L1'): Listing {
  const draft: ListingDraft = {
    items: [{ name: 'bread', quantity: 10, unit: 'loaves', estimatedLbs: totalLbs, category: 'bakery' }],
    storage: 'shelf-stable', dietary: dietary(), pickupBy: '20:00', notes: '', ...overrides,
  };
  return {
    id, donorId: 'd1', draft, totalLbs, postedAt: NOW, pickupByMin: 20 * 60, status: 'open', source: 'sample',
    match: null, candidates: [], pickedUpAt: null, deliveredAt: null,
  };
}

const donor: Donor = { id: 'd1', name: 'Test Bakery', kind: 'bakery', city: 'Dublin', location: HERE };

function makeRecipient(overrides: Partial<Recipient> = {}): Recipient {
  return {
    id: 'r1', name: 'Test Pantry', city: 'Dublin', location: NEAR, hasFridge: true, acceptsHot: true, capacityLbs: 200,
    receivedLbs: 0, openMin: 0, closeMin: 24 * 60 - 1, needs: ['bakery'], vegetarianOnly: false, nutFree: false,
    peopleServed: 50, ...overrides,
  };
}

function makeDriver(overrides: Partial<Driver> = {}): Driver {
  return { id: 'v1', name: 'Test Driver', vehicle: 'car', location: HERE, capacityLbs: 100, hasCooler: false, busyUntil: 0, ...overrides };
}

describe('evaluateRecipient', () => {
  it('accepts a good fit and explains why', () => {
    const result = evaluateRecipient(makeListing(), donor, makeRecipient(), [], NOW);
    expect(result.eligible).toBe(true);
    expect(result.reasons.join(' ')).toContain('Asked for bakery items');
  });

  it('blocks cold food at a program with no fridge', () => {
    const result = evaluateRecipient(makeListing({ storage: 'refrigerated' }), donor, makeRecipient({ hasFridge: false }), [], NOW);
    expect(result.eligible).toBe(false);
    expect(result.blockers).toContain('No fridge for food that must stay cold');
  });

  it('blocks hot meals where they are not accepted', () => {
    const result = evaluateRecipient(makeListing({ storage: 'hot' }), donor, makeRecipient({ acceptsHot: false }), [], NOW);
    expect(result.blockers).toContain("Can't accept hot meals");
  });

  it('blocks food with nuts at a nut-free program', () => {
    const listing = makeListing({ dietary: dietary({ containsNuts: true }) });
    const result = evaluateRecipient(listing, donor, makeRecipient({ nutFree: true }), [], NOW);
    expect(result.blockers.join(' ')).toContain('Nut-free');
  });

  it('blocks meat at a vegetarian-only program', () => {
    const listing = makeListing({ dietary: dietary({ vegetarian: false }) });
    const result = evaluateRecipient(listing, donor, makeRecipient({ vegetarianOnly: true }), [], NOW);
    expect(result.blockers).toContain('Serves vegetarian meals only');
  });

  it('blocks a program that closes before the food can arrive', () => {
    const result = evaluateRecipient(makeListing(), donor, makeRecipient({ closeMin: NOW + 10 }), [], NOW);
    expect(result.blockers.join(' ')).toContain('Closes at 6:10 PM');
  });

  it('counts food already on its way toward a program’s capacity', () => {
    const onTheWay = { ...makeListing({}, 20, 'L0'), status: 'matched' as const };
    const withMatch: Listing = {
      ...onTheWay,
      match: { recipientId: 'r1', driverId: 'v1', score: 50, reasons: [], matchedAt: NOW, pickupAt: NOW, deliverAt: NOW + 20, distanceKm: 1, driverFrom: HERE },
    };
    const result = evaluateRecipient(makeListing(), donor, makeRecipient({ capacityLbs: 30 }), [withMatch], NOW);
    expect(result.blockers).toContain('Only 10 lbs of space left today');
  });
});

describe('rankRecipients', () => {
  it('ranks a closer program above a farther one when both fit', () => {
    const near = makeRecipient({ id: 'near', location: NEAR });
    const far = makeRecipient({ id: 'far', location: FAR });
    const ranked = rankRecipients(makeListing(), donor, [far, near], [], NOW);
    expect(ranked.map((c) => c.recipientId)).toEqual(['near', 'far']);
  });

  it('puts blocked programs after every eligible one', () => {
    const blocked = makeRecipient({ id: 'blocked', location: NEAR, hasFridge: false });
    const open = makeRecipient({ id: 'open', location: FAR });
    const ranked = rankRecipients(makeListing({ storage: 'refrigerated' }), donor, [blocked, open], [], NOW);
    expect(ranked[0].recipientId).toBe('open');
  });

  it('scores higher when the program asked for that kind of food', () => {
    const wants = evaluateRecipient(makeListing(), donor, makeRecipient({ needs: ['bakery'] }), [], NOW);
    const doesNot = evaluateRecipient(makeListing(), donor, makeRecipient({ needs: ['protein'] }), [], NOW);
    expect(wants.score).toBeGreaterThan(doesNot.score);
  });
});

describe('chooseDriver', () => {
  const farRecipient = makeRecipient({ location: FAR });

  it('requires a cooler for long trips with perishable food', () => {
    const listing = makeListing({ storage: 'refrigerated' });
    const noCooler = makeDriver({ id: 'plain' });
    const cooler = makeDriver({ id: 'cooler', hasCooler: true, location: NEAR });
    expect(chooseDriver(listing, donor, farRecipient, [noCooler, cooler], NOW)?.driver.id).toBe('cooler');
    expect(chooseDriver(listing, donor, farRecipient, [noCooler], NOW)).toBeNull();
  });

  it('allows a short perishable trip without a cooler', () => {
    const plan = chooseDriver(makeListing({ storage: 'refrigerated' }), donor, makeRecipient(), [makeDriver()], NOW);
    expect(plan?.note).toContain('food-safe');
  });

  it('skips busy drivers and drivers without enough room', () => {
    const busy = makeDriver({ id: 'busy', busyUntil: NOW + 30 });
    const small = makeDriver({ id: 'small', capacityLbs: 5 });
    const free = makeDriver({ id: 'free', location: NEAR });
    expect(chooseDriver(makeListing(), donor, makeRecipient(), [busy, small, free], NOW)?.driver.id).toBe('free');
  });

  it('returns null when no one can reach the pickup before the deadline', () => {
    const listing = { ...makeListing(), pickupByMin: NOW + 2 };
    expect(chooseDriver(listing, donor, makeRecipient(), [makeDriver({ location: FAR })], NOW)).toBeNull();
  });
});

describe('planMatch', () => {
  it('builds a match with the driver plan in the reasons', () => {
    const { match } = planMatch(makeListing(), donor, [makeRecipient()], [makeDriver()], [], NOW);
    expect(match?.recipientId).toBe('r1');
    expect(match?.driverId).toBe('v1');
    expect(match?.deliverAt).toBeGreaterThan(match?.pickupAt ?? Infinity);
    expect(match?.reasons.at(-1)).toContain('Test Driver');
  });

  it('still returns the scored candidates when nothing can be matched', () => {
    const plan = planMatch(makeListing(), donor, [makeRecipient()], [], [], NOW);
    expect(plan.match).toBeNull();
    expect(plan.candidates).toHaveLength(1);
  });
});
