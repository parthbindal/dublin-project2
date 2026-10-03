// Clearly labeled SAMPLE data for the demo: fictional businesses, food programs and
// volunteers placed around the Tri-Valley (Dublin, San Ramon, Pleasanton, Danville, Livermore).
import type { Dietary, Donor, Driver, FoodCategory, HistoryEntry, ListingDraft, Recipient } from './types';

export const DEMO_WEEKDAY = 6; // Saturday
export const HISTORY_WEEKS = 8;
export const SIM_START = 17 * 60 + 30; // 5:30 PM
export const SIM_END = 22 * 60; // 10:00 PM

export const DONORS: Donor[] = [
  { id: 'd-bakery', name: 'Golden Crust Bakery', kind: 'bakery', city: 'Dublin', location: { lat: 37.704, lng: -121.93 } },
  { id: 'd-market', name: 'Tri-Valley Fresh Market', kind: 'grocery', city: 'San Ramon', location: { lat: 37.763, lng: -121.956 } },
  { id: 'd-wok', name: 'Dragon Wok Kitchen', kind: 'restaurant', city: 'Pleasanton', location: { lat: 37.693, lng: -121.904 } },
  { id: 'd-cafe', name: 'Bean There Cafe', kind: 'cafe', city: 'Danville', location: { lat: 37.821, lng: -121.999 } },
  { id: 'd-catering', name: 'Ridgeline Catering', kind: 'caterer', city: 'San Ramon', location: { lat: 37.779, lng: -121.977 } },
  { id: 'd-school', name: 'Hillside Middle School cafeteria', kind: 'cafeteria', city: 'Dublin', location: { lat: 37.718, lng: -121.91 } },
];

export const RECIPIENTS: Recipient[] = [
  {
    id: 'r-pantry', name: 'Valley Community Pantry', city: 'Dublin', location: { lat: 37.706, lng: -121.92 },
    hasFridge: true, acceptsHot: false, capacityLbs: 300, receivedLbs: 0, openMin: 9 * 60, closeMin: 20 * 60,
    needs: ['produce', 'dairy', 'protein'], vegetarianOnly: false, nutFree: false, peopleServed: 220,
  },
  {
    id: 'r-shelter', name: 'Harbor House Shelter', city: 'Pleasanton', location: { lat: 37.665, lng: -121.877 },
    hasFridge: true, acceptsHot: true, capacityLbs: 150, receivedLbs: 0, openMin: 0, closeMin: 24 * 60 - 1,
    needs: ['prepared', 'protein'], vegetarianOnly: false, nutFree: false, peopleServed: 60,
  },
  {
    id: 'r-youth', name: 'Northside Youth Center', city: 'San Ramon', location: { lat: 37.774, lng: -121.969 },
    hasFridge: false, acceptsHot: false, capacityLbs: 50, receivedLbs: 0, openMin: 14 * 60, closeMin: 19 * 60,
    needs: ['bakery', 'produce'], vegetarianOnly: false, nutFree: true, peopleServed: 45,
  },
  {
    id: 'r-greentable', name: 'Green Table Community Kitchen', city: 'Livermore', location: { lat: 37.682, lng: -121.77 },
    hasFridge: true, acceptsHot: true, capacityLbs: 120, receivedLbs: 0, openMin: 10 * 60, closeMin: 21 * 60 + 30,
    needs: ['prepared', 'produce'], vegetarianOnly: true, nutFree: false, peopleServed: 90,
  },
  {
    id: 'r-family', name: 'Family Resource Center', city: 'Danville', location: { lat: 37.816, lng: -121.995 },
    hasFridge: false, acceptsHot: false, capacityLbs: 100, receivedLbs: 0, openMin: 9 * 60, closeMin: 18 * 60 + 30,
    needs: ['bakery', 'packaged'], vegetarianOnly: false, nutFree: false, peopleServed: 80,
  },
];

export const DRIVERS: Driver[] = [
  { id: 'v-ana', name: 'Ana', vehicle: 'van with cooler', location: { lat: 37.7, lng: -121.9 }, capacityLbs: 400, hasCooler: true, busyUntil: 0 },
  { id: 'v-sam', name: 'Sam', vehicle: 'SUV', location: { lat: 37.77, lng: -121.965 }, capacityLbs: 200, hasCooler: false, busyUntil: 0 },
  { id: 'v-lee', name: 'Lee', vehicle: 'hatchback', location: { lat: 37.67, lng: -121.88 }, capacityLbs: 80, hasCooler: false, busyUntil: 0 },
];

// ---------- Past listings, used for surplus predictions ----------

interface SurplusPattern {
  donorId: string;
  weekdays: number[];
  minute: number;
  lbs: [number, number];
  category: FoodCategory;
  chance: number;
}

const PATTERNS: SurplusPattern[] = [
  { donorId: 'd-bakery', weekdays: [5, 6], minute: 18 * 60, lbs: [28, 45], category: 'bakery', chance: 0.9 },
  { donorId: 'd-market', weekdays: [0, 1, 2, 3, 4, 5, 6], minute: 20 * 60, lbs: [40, 80], category: 'produce', chance: 0.75 },
  { donorId: 'd-wok', weekdays: [5, 6], minute: 21 * 60, lbs: [15, 25], category: 'prepared', chance: 0.65 },
  { donorId: 'd-cafe', weekdays: [1, 2, 3, 4, 5], minute: 17 * 60, lbs: [8, 15], category: 'bakery', chance: 0.7 },
  { donorId: 'd-catering', weekdays: [6], minute: 19 * 60 + 30, lbs: [30, 60], category: 'prepared', chance: 0.55 },
  { donorId: 'd-school', weekdays: [1, 2, 3, 4, 5], minute: 13 * 60 + 30, lbs: [20, 40], category: 'prepared', chance: 0.85 },
];

/** Small seeded random generator so the sample history is the same on every load. */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function buildHistory(weeks = HISTORY_WEEKS, seed = 2026): HistoryEntry[] {
  const random = seededRandom(seed);
  return PATTERNS.flatMap((pattern) =>
    Array.from({ length: weeks }, (_, weekIndex) => weekIndex).flatMap((weekIndex) =>
      pattern.weekdays
        .filter(() => random() < pattern.chance)
        .map((weekday) => ({
          donorId: pattern.donorId,
          weekIndex,
          weekday,
          minute: pattern.minute + Math.round((random() - 0.5) * 60),
          lbs: Math.round(pattern.lbs[0] + random() * (pattern.lbs[1] - pattern.lbs[0])),
          category: pattern.category,
        })),
    ),
  );
}

export const HISTORY: HistoryEntry[] = buildHistory();

// ---------- Scripted evening for the live demo ----------

export interface ScenarioPost {
  at: number;
  donorId: string;
  draft: ListingDraft;
}

const diet = (overrides: Partial<Dietary>): Dietary => ({
  vegetarian: true,
  vegan: false,
  containsNuts: false,
  containsDairy: false,
  containsGluten: false,
  ...overrides,
});

export const SCENARIO: ScenarioPost[] = [
  {
    at: 17 * 60 + 35,
    donorId: 'd-bakery',
    draft: {
      items: [
        { name: 'bagels', quantity: 40, unit: 'pieces', estimatedLbs: 12, category: 'bakery' },
        { name: 'sourdough', quantity: 12, unit: 'loaves', estimatedLbs: 18, category: 'bakery' },
      ],
      storage: 'shelf-stable',
      dietary: diet({ vegan: true, containsGluten: true }),
      pickupBy: '19:00',
      notes: 'Baked this morning.',
    },
  },
  {
    at: 17 * 60 + 50,
    donorId: 'd-market',
    draft: {
      items: [
        { name: 'bananas', quantity: 2, unit: 'boxes', estimatedLbs: 40, category: 'produce' },
        { name: 'apples', quantity: 1, unit: 'crate', estimatedLbs: 20, category: 'produce' },
        { name: 'yogurt cups', quantity: 24, unit: 'pieces', estimatedLbs: 12, category: 'dairy' },
      ],
      storage: 'refrigerated',
      dietary: diet({ containsDairy: true }),
      pickupBy: '20:30',
      notes: 'Yogurt is good until Monday.',
    },
  },
  {
    at: 18 * 60 + 20,
    donorId: 'd-wok',
    draft: {
      items: [{ name: 'chicken fried rice', quantity: 3, unit: 'trays', estimatedLbs: 24, category: 'prepared' }],
      storage: 'hot',
      dietary: diet({ vegetarian: false }),
      pickupBy: '21:00',
      notes: 'Contains egg and soy.',
    },
  },
  {
    at: 18 * 60 + 45,
    donorId: 'd-cafe',
    draft: {
      items: [{ name: 'pesto sandwiches', quantity: 18, unit: 'pieces', estimatedLbs: 9, category: 'prepared' }],
      storage: 'refrigerated',
      dietary: diet({ containsNuts: true, containsDairy: true, containsGluten: true }),
      pickupBy: '19:45',
      notes: 'Pesto contains pine nuts and parmesan.',
    },
  },
  {
    at: 19 * 60 + 10,
    donorId: 'd-catering',
    draft: {
      items: [{ name: 'veggie lasagna', quantity: 4, unit: 'trays', estimatedLbs: 36, category: 'prepared' }],
      storage: 'refrigerated',
      dietary: diet({ containsDairy: true, containsGluten: true }),
      pickupBy: '21:30',
      notes: 'From a cancelled event. Never served.',
    },
  },
];
