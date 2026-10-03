import { describe, expect, it } from 'vitest';
import { computeImpact, csvCell, toComplianceCsv } from './impact';
import { DONORS, RECIPIENTS } from './sampleData';
import type { Listing, ListingStatus } from './types';

function listing(status: ListingStatus, totalLbs: number, id: string): Listing {
  return {
    id, donorId: 'd-bakery', totalLbs, postedAt: 1060, pickupByMin: 1140, status, source: 'sample',
    draft: {
      items: [{ name: 'bagels', quantity: 10, unit: 'pieces', estimatedLbs: totalLbs, category: 'bakery' }],
      storage: 'shelf-stable',
      dietary: { vegetarian: true, vegan: true, containsNuts: false, containsDairy: false, containsGluten: true },
      pickupBy: '19:00', notes: '',
    },
    match: status === 'open' || status === 'expired' ? null : {
      recipientId: 'r-pantry', driverId: 'v-ana', score: 80, reasons: [], matchedAt: 1060, pickupAt: 1070, deliverAt: 1085,
      distanceKm: 1, driverFrom: { lat: 0, lng: 0 },
    },
    candidates: [],
    pickedUpAt: status === 'delivered' ? 1070 : null,
    deliveredAt: status === 'delivered' ? 1085 : null,
  };
}

describe('computeImpact', () => {
  it('counts delivered food as meals, plus food in transit and food that expired', () => {
    const totals = computeImpact([
      listing('delivered', 25, 'a'),
      listing('picked-up', 10, 'b'),
      listing('expired', 4, 'c'),
      listing('open', 7, 'd'),
    ]);
    expect(totals).toEqual({ rescuedLbs: 25, meals: 20, deliveries: 1, inTransitLbs: 10, expiredLbs: 4 });
  });
});

describe('csvCell', () => {
  it('quotes commas and quotes', () => {
    expect(csvCell('bagels, bread')).toBe('"bagels, bread"');
    expect(csvCell('the "good" bread')).toBe('"the ""good"" bread"');
  });

  it('defuses spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`);
  });

  it('leaves numbers alone', () => {
    expect(csvCell(-5)).toBe('-5');
  });
});

describe('toComplianceCsv', () => {
  it('lists only delivered donations, with the SB 1383 fields', () => {
    const csv = toComplianceCsv([listing('delivered', 25, 'a'), listing('open', 7, 'b')], DONORS, RECIPIENTS, '2026-10-03');
    const lines = csv.split('\r\n');
    expect(lines[0]).toBe('Date,Donor,Food recovery organization,Organization city,Food types,Pounds recovered,Picked up,Delivered');
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe('2026-10-03,Golden Crust Bakery,Valley Community Pantry,Dublin,bakery,25,5:50 PM,6:05 PM');
  });
});
