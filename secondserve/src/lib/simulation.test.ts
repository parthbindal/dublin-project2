import { describe, expect, it } from 'vitest';
import { computeImpact } from './impact';
import { DEMO_WEEKDAY, SCENARIO, SIM_END, SIM_START } from './sampleData';
import { advanceTo, createInitialState, postListing, simulateUntil } from './simulation';

const bakeryPost = SCENARIO[0];

describe('postListing', () => {
  it('posts the food, matches it right away and books the driver', () => {
    const start = createInitialState(DEMO_WEEKDAY, SIM_START);
    const state = postListing(start, { id: 'mine', donorId: bakeryPost.donorId, draft: bakeryPost.draft, source: 'ai' });
    const listing = state.listings.find((l) => l.id === 'mine');
    expect(listing?.status).toBe('matched');
    expect(listing?.totalLbs).toBe(30);
    expect(state.events.map((e) => e.kind)).toEqual(['match', 'post']);
    const driver = state.drivers.find((d) => d.id === listing?.match?.driverId);
    expect(driver?.busyUntil).toBe(listing?.match?.deliverAt);
  });

  it('does not change the state it was given', () => {
    const start = createInitialState(DEMO_WEEKDAY, SIM_START);
    postListing(start, { donorId: bakeryPost.donorId, draft: bakeryPost.draft, source: 'sample' });
    expect(start.listings).toHaveLength(0);
    expect(start.drivers.every((d) => d.busyUntil === 0)).toBe(true);
  });
});

describe('advanceTo', () => {
  it('moves a matched listing to picked up, then delivered', () => {
    const posted = postListing(createInitialState(DEMO_WEEKDAY, SIM_START), {
      id: 'x', donorId: bakeryPost.donorId, draft: bakeryPost.draft, source: 'sample',
    });
    const match = posted.listings[0].match;
    if (!match) throw new Error('expected a match');
    const picked = advanceTo(posted, match.pickupAt);
    expect(picked.listings[0].status).toBe('picked-up');
    const delivered = advanceTo(picked, match.deliverAt);
    expect(delivered.listings[0].status).toBe('delivered');
    const recipient = delivered.recipients.find((r) => r.id === match.recipientId);
    expect(recipient?.receivedLbs).toBe(30);
    expect(delivered.drivers.find((d) => d.id === match.driverId)?.location).toEqual(recipient?.location);
  });

  it('expires food that no one can pick up before its deadline', () => {
    const noDrivers = { ...createInitialState(DEMO_WEEKDAY, SIM_START), drivers: [] };
    const posted = postListing(noDrivers, { donorId: bakeryPost.donorId, draft: bakeryPost.draft, source: 'sample' });
    expect(posted.listings[0].status).toBe('open');
    const later = advanceTo(posted, 19 * 60 + 1);
    expect(later.listings[0].status).toBe('expired');
    expect(later.events[0].kind).toBe('expire');
  });
});

describe('the scripted demo evening', () => {
  it('rescues every scripted listing by the end of the night', () => {
    const end = simulateUntil(createInitialState(DEMO_WEEKDAY, SIM_START), SIM_END, SCENARIO);
    expect(end.listings).toHaveLength(SCENARIO.length);
    expect(end.listings.every((l) => l.status === 'delivered')).toBe(true);
    const impact = computeImpact(end.listings);
    expect(impact.expiredLbs).toBe(0);
    expect(impact.rescuedLbs).toBe(171); // 30 + 72 + 24 + 9 + 36
  });

  it('shows at least one program being ruled out for a clear reason', () => {
    const end = simulateUntil(createInitialState(DEMO_WEEKDAY, SIM_START), SIM_END, SCENARIO);
    const blockers = end.listings.flatMap((l) => l.candidates.flatMap((c) => c.blockers));
    expect(blockers.some((b) => b.includes('Nut-free'))).toBe(true);
  });
});
