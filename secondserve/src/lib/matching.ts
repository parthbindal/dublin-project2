// Matching engine: scores every food program for a listing, explains why, then finds a
// volunteer driver who can make the pickup in time and keep perishable food safe.
import { distanceKm, travelMinutes } from './geo';
import { CATEGORY_LABEL, formatClock } from './format';
import type { CandidateResult, Donor, Driver, Listing, Match, Recipient } from './types';

export const PICKUP_BUFFER_MIN = 15; // time to reach the donor before a driver is chosen
export const LOADING_MIN = 5;
// Our own safety rule: perishable trips over 30 minutes need a cooler. That keeps us far inside the
// USDA guidance to never leave food out of refrigeration for more than 2 hours (1 hour above 90°F).
export const COLD_CHAIN_MAX_MIN = 30;
const MAX_USEFUL_KM = 25;
const ALL_NIGHT_MIN = 24 * 60 - 1;
const WEIGHTS = { distance: 35, capacity: 25, need: 25, time: 15 } as const;

export function remainingCapacity(recipient: Recipient, listings: Listing[]): number {
  const reserved = listings
    .filter((l) => (l.status === 'matched' || l.status === 'picked-up') && l.match?.recipientId === recipient.id)
    .reduce((sum, l) => sum + l.totalLbs, 0);
  return recipient.capacityLbs - recipient.receivedLbs - reserved;
}

function isPerishable(listing: Listing): boolean {
  return listing.draft.storage !== 'shelf-stable';
}

function findBlockers(listing: Listing, recipient: Recipient, remaining: number, arriveAt: number): string[] {
  const { storage, dietary } = listing.draft;
  const checks: Array<[boolean, string]> = [
    [storage === 'refrigerated' && !recipient.hasFridge, 'No fridge for food that must stay cold'],
    [storage === 'hot' && !recipient.acceptsHot, "Can't accept hot meals"],
    [recipient.vegetarianOnly && !dietary.vegetarian, 'Serves vegetarian meals only'],
    [recipient.nutFree && dietary.containsNuts, 'Nut-free program, and this food contains nuts'],
    [remaining < listing.totalLbs, `Only ${Math.max(0, Math.round(remaining))} lbs of space left today`],
    [arriveAt > recipient.closeMin, `Closes at ${formatClock(recipient.closeMin)}, before the food could arrive`],
    [arriveAt < recipient.openMin, `Not open until ${formatClock(recipient.openMin)}`],
  ];
  return checks.filter(([blocked]) => blocked).map(([, message]) => message);
}

function neededShare(listing: Listing, recipient: Recipient): number {
  const matching = listing.draft.items
    .filter((item) => recipient.needs.includes(item.category))
    .reduce((sum, item) => sum + item.estimatedLbs, 0);
  return listing.totalLbs > 0 ? Math.min(1, matching / listing.totalLbs) : 0;
}

function neededLabel(listing: Listing, recipient: Recipient): string {
  const categories = [...new Set(listing.draft.items.map((item) => item.category))].filter((c) =>
    recipient.needs.includes(c),
  );
  return categories.map((c) => CATEGORY_LABEL[c]).join(' and ');
}

export function evaluateRecipient(
  listing: Listing,
  donor: Donor,
  recipient: Recipient,
  listings: Listing[],
  now: number,
): CandidateResult {
  const km = distanceKm(donor.location, recipient.location);
  const travelMin = travelMinutes(donor.location, recipient.location);
  const arriveAt = now + PICKUP_BUFFER_MIN + LOADING_MIN + travelMin;
  const remaining = remainingCapacity(recipient, listings);
  const share = neededShare(listing, recipient);
  const slack = recipient.closeMin - arriveAt;
  const score =
    WEIGHTS.distance * Math.max(0, 1 - km / MAX_USEFUL_KM) +
    WEIGHTS.capacity * Math.min(1, Math.max(0, remaining) / Math.max(1, listing.totalLbs * 2)) +
    WEIGHTS.need * share +
    WEIGHTS.time * Math.min(1, Math.max(0, slack) / 120);
  const reasons = [
    `${km.toFixed(1)} km away, about ${travelMin} min by car`,
    share > 0 ? `Asked for ${neededLabel(listing, recipient)}` : 'Not on their wish list, but they can use it',
    `Room for ${Math.max(0, Math.round(remaining))} more lbs today`,
    recipient.closeMin >= ALL_NIGHT_MIN ? 'Open all night' : `Open until ${formatClock(recipient.closeMin)}`,
  ];
  const blockers = findBlockers(listing, recipient, remaining, arriveAt);
  return { recipientId: recipient.id, eligible: blockers.length === 0, score: Math.round(score), reasons, blockers, distanceKm: km, travelMin };
}

export function rankRecipients(
  listing: Listing,
  donor: Donor,
  recipients: Recipient[],
  listings: Listing[],
  now: number,
): CandidateResult[] {
  return recipients
    .map((recipient) => evaluateRecipient(listing, donor, recipient, listings, now))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}

export interface DriverPlan {
  driver: Driver;
  pickupAt: number;
  deliverAt: number;
  note: string;
}

export function chooseDriver(
  listing: Listing,
  donor: Donor,
  recipient: Recipient,
  drivers: Driver[],
  now: number,
): DriverPlan | null {
  const legMin = travelMinutes(donor.location, recipient.location);
  const needsCooler = isPerishable(listing) && legMin > COLD_CHAIN_MAX_MIN;
  const best = drivers
    .filter((d) => d.busyUntil <= now && d.capacityLbs >= listing.totalLbs && (!needsCooler || d.hasCooler))
    .map((driver) => {
      const pickupAt = now + travelMinutes(driver.location, donor.location);
      return { driver, pickupAt, deliverAt: pickupAt + LOADING_MIN + legMin };
    })
    .filter((option) => option.pickupAt <= listing.pickupByMin && option.deliverAt <= recipient.closeMin)
    .sort((a, b) => a.deliverAt - b.deliverAt)[0];
  if (!best) return null;
  const who = `${best.driver.name} (${best.driver.vehicle})`;
  const note = needsCooler
    ? `${who} has a cooler for the ${legMin}-minute drive`
    : isPerishable(listing)
      ? `${who} can deliver it in ${legMin} minutes, well inside the USDA's 2-hour limit for food out of temperature control`
      : `${who} can get there first`;
  return { ...best, note };
}

export interface MatchPlan {
  match: Match | null;
  candidates: CandidateResult[];
}

export function planMatch(
  listing: Listing,
  donor: Donor,
  recipients: Recipient[],
  drivers: Driver[],
  listings: Listing[],
  now: number,
): MatchPlan {
  const candidates = rankRecipients(listing, donor, recipients, listings, now);
  for (const candidate of candidates.filter((c) => c.eligible)) {
    const recipient = recipients.find((r) => r.id === candidate.recipientId);
    const plan = recipient ? chooseDriver(listing, donor, recipient, drivers, now) : null;
    if (plan) {
      const match: Match = {
        recipientId: candidate.recipientId,
        driverId: plan.driver.id,
        score: candidate.score,
        reasons: [...candidate.reasons, plan.note],
        matchedAt: now,
        pickupAt: plan.pickupAt,
        deliverAt: plan.deliverAt,
        distanceKm: candidate.distanceKm,
        driverFrom: plan.driver.location,
      };
      return { match, candidates };
    }
  }
  return { match: null, candidates };
}
