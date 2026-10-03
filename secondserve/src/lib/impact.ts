// Impact numbers and the SB 1383 record log. We count real outcomes (delivered pounds),
// and we also count food that could not be placed in time.
import { formatClock, round1 } from './format';
import type { Donor, Listing, ListingStatus, Recipient } from './types';

/** Feeding America counts about 1.2 pounds of food as one meal. */
export const LBS_PER_MEAL = 1.2;

export interface ImpactTotals {
  rescuedLbs: number;
  meals: number;
  deliveries: number;
  inTransitLbs: number;
  expiredLbs: number;
}

export function computeImpact(listings: Listing[]): ImpactTotals {
  const lbsWith = (statuses: ListingStatus[]) =>
    round1(listings.filter((l) => statuses.includes(l.status)).reduce((sum, l) => sum + l.totalLbs, 0));
  const rescuedLbs = lbsWith(['delivered']);
  return {
    rescuedLbs,
    meals: Math.floor(rescuedLbs / LBS_PER_MEAL),
    deliveries: listings.filter((l) => l.status === 'delivered').length,
    inTransitLbs: lbsWith(['matched', 'picked-up']),
    expiredLbs: lbsWith(['expired']),
  };
}

/** Escapes a CSV cell and blocks spreadsheet formula injection (cells starting with = + - @). */
export function csvCell(value: string | number): string {
  const raw = String(value);
  const text = typeof value === 'string' && /^[=+\-@]/.test(raw) ? `'${raw}` : raw;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const CSV_HEADER = [
  'Date',
  'Donor',
  'Food recovery organization',
  'Organization city',
  'Food types',
  'Pounds recovered',
  'Picked up',
  'Delivered',
];

/** SB 1383 asks generators to record who received their food, what types, and pounds recovered. */
export function toComplianceCsv(listings: Listing[], donors: Donor[], recipients: Recipient[], dateLabel: string): string {
  const rows = listings
    .filter((l) => l.status === 'delivered' && l.match)
    .sort((a, b) => a.postedAt - b.postedAt)
    .map((l) => {
      const recipient = recipients.find((r) => r.id === l.match?.recipientId);
      return [
        dateLabel,
        donors.find((d) => d.id === l.donorId)?.name ?? l.donorId,
        recipient?.name ?? '',
        recipient?.city ?? '',
        [...new Set(l.draft.items.map((i) => i.category))].join('; '),
        l.totalLbs,
        l.pickedUpAt === null ? '' : formatClock(l.pickedUpAt),
        l.deliveredAt === null ? '' : formatClock(l.deliveredAt),
      ];
    });
  return [CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
