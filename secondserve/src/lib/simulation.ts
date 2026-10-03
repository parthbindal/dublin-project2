// The evening's state machine: post -> match -> picked up -> delivered (or expired).
// Every function returns a new state object; nothing is mutated.
import { LBS_PER_MEAL } from './impact';
import { formatClock, parseHHMM, round1, summarizeItems } from './format';
import { planMatch } from './matching';
import { DONORS, DRIVERS, RECIPIENTS, type ScenarioPost } from './sampleData';
import type { AppState, DraftSource, EventKind, FeedEvent, Listing, ListingDraft } from './types';

const MAX_EVENTS = 60;
export const DEFAULT_PICKUP_WINDOW_MIN = 120;

export function createInitialState(weekday: number, now: number): AppState {
  return { now, weekday, donors: DONORS, recipients: RECIPIENTS, drivers: DRIVERS, listings: [], events: [], nextId: 1 };
}

export function logEvent(state: AppState, kind: EventKind, text: string): AppState {
  const event: FeedEvent = { id: `e${state.nextId}`, at: state.now, kind, text };
  return { ...state, nextId: state.nextId + 1, events: [event, ...state.events].slice(0, MAX_EVENTS) };
}

function nameOf(list: Array<{ id: string; name: string }>, id: string): string {
  return list.find((item) => item.id === id)?.name ?? 'Unknown';
}

function updateListing(state: AppState, id: string, patch: Partial<Listing>): AppState {
  return { ...state, listings: state.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) };
}

export interface NewListingInput {
  id?: string;
  donorId: string;
  draft: ListingDraft;
  source: DraftSource;
}

export function postListing(state: AppState, input: NewListingInput): AppState {
  const id = input.id ?? `L${state.nextId}`;
  const totalLbs = round1(input.draft.items.reduce((sum, item) => sum + item.estimatedLbs, 0));
  const listing: Listing = {
    id,
    donorId: input.donorId,
    draft: input.draft,
    totalLbs,
    postedAt: state.now,
    pickupByMin: parseHHMM(input.draft.pickupBy) ?? state.now + DEFAULT_PICKUP_WINDOW_MIN,
    status: 'open',
    source: input.source,
    match: null,
    candidates: [],
    pickedUpAt: null,
    deliveredAt: null,
  };
  const text = `${nameOf(state.donors, input.donorId)} posted ${totalLbs} lbs: ${summarizeItems(input.draft.items)}.`;
  const posted = logEvent({ ...state, nextId: state.nextId + 1, listings: [listing, ...state.listings] }, 'post', text);
  return tryMatch(posted, id);
}

export function tryMatch(state: AppState, listingId: string): AppState {
  const listing = state.listings.find((l) => l.id === listingId);
  const donor = listing ? state.donors.find((d) => d.id === listing.donorId) : undefined;
  if (!listing || !donor || listing.status !== 'open') return state;
  const { match, candidates } = planMatch(listing, donor, state.recipients, state.drivers, state.listings, state.now);
  if (!match) return updateListing(state, listingId, { candidates });
  const matched = updateListing(state, listingId, { status: 'matched', match, candidates });
  const drivers = matched.drivers.map((d) => (d.id === match.driverId ? { ...d, busyUntil: match.deliverAt } : d));
  const text =
    `Matched ${listing.totalLbs} lbs from ${donor.name} to ${nameOf(state.recipients, match.recipientId)}. ` +
    `${nameOf(state.drivers, match.driverId)} picks up at ${formatClock(match.pickupAt)}.`;
  return logEvent({ ...matched, drivers }, 'match', text);
}

function deliver(state: AppState, listing: Listing): AppState {
  const match = listing.match;
  if (!match) return state;
  const recipient = state.recipients.find((r) => r.id === match.recipientId);
  const recipients = state.recipients.map((r) =>
    r.id === match.recipientId ? { ...r, receivedLbs: round1(r.receivedLbs + listing.totalLbs) } : r,
  );
  const drivers = state.drivers.map((d) =>
    d.id === match.driverId && recipient ? { ...d, location: recipient.location } : d,
  );
  const delivered = updateListing({ ...state, recipients, drivers }, listing.id, {
    status: 'delivered',
    deliveredAt: match.deliverAt,
  });
  const meals = Math.floor(listing.totalLbs / LBS_PER_MEAL);
  return logEvent(delivered, 'deliver', `Delivered ${listing.totalLbs} lbs to ${recipient?.name ?? 'a food program'}, about ${meals} meals.`);
}

function progressListing(state: AppState, listingId: string): AppState {
  const listing = state.listings.find((l) => l.id === listingId);
  if (!listing) return state;
  const { match } = listing;
  if (listing.status === 'matched' && match && state.now >= match.pickupAt) {
    const picked = updateListing(state, listing.id, { status: 'picked-up', pickedUpAt: match.pickupAt });
    const text = `${nameOf(state.drivers, match.driverId)} picked up ${listing.totalLbs} lbs at ${nameOf(state.donors, listing.donorId)}.`;
    return progressListing(logEvent(picked, 'pickup', text), listing.id);
  }
  if (listing.status === 'picked-up' && match && state.now >= match.deliverAt) return deliver(state, listing);
  if (listing.status !== 'open') return state;
  if (state.now > listing.pickupByMin) {
    const text = `No one could pick up ${listing.totalLbs} lbs from ${nameOf(state.donors, listing.donorId)} in time.`;
    return logEvent(updateListing(state, listing.id, { status: 'expired' }), 'expire', text);
  }
  return tryMatch(state, listing.id);
}

/** Moves the clock forward and lets every listing progress, oldest first. */
export function advanceTo(state: AppState, now: number): AppState {
  const timed = { ...state, now: Math.max(state.now, now) };
  const oldestFirst = [...timed.listings].reverse().map((l) => l.id);
  return oldestFirst.reduce(progressListing, timed);
}

/** Runs the clock to `target`, posting any scripted listings that come due on the way. */
export function simulateUntil(state: AppState, target: number, scenario: ScenarioPost[]): AppState {
  const due = scenario.filter((post) => post.at > state.now && post.at <= target).sort((a, b) => a.at - b.at);
  const afterPosts = due.reduce(
    (acc, post) => postListing(advanceTo(acc, post.at), { donorId: post.donorId, draft: post.draft, source: 'sample' }),
    state,
  );
  return advanceTo(afterPosts, target);
}
