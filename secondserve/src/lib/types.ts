// Shared data types. All times are minutes since midnight on the demo day.

export interface LatLng {
  lat: number;
  lng: number;
}

export const FOOD_CATEGORIES = ['bakery', 'produce', 'prepared', 'dairy', 'protein', 'packaged'] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export const STORAGE_TYPES = ['shelf-stable', 'refrigerated', 'hot'] as const;
export type Storage = (typeof STORAGE_TYPES)[number];

export interface Dietary {
  vegetarian: boolean;
  vegan: boolean;
  containsNuts: boolean;
  containsDairy: boolean;
  containsGluten: boolean;
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  estimatedLbs: number;
  category: FoodCategory;
}

/** What a donor describes before posting. pickupBy is "HH:MM" (24-hour) or null. */
export interface ListingDraft {
  items: FoodItem[];
  storage: Storage;
  dietary: Dietary;
  pickupBy: string | null;
  notes: string;
}

export type ListingStatus = 'open' | 'matched' | 'picked-up' | 'delivered' | 'expired';
export type DraftSource = 'ai' | 'builtin' | 'sample';

/** How one food program scored for one listing, with the reasons shown to people. */
export interface CandidateResult {
  recipientId: string;
  eligible: boolean;
  score: number;
  reasons: string[];
  blockers: string[];
  distanceKm: number;
  travelMin: number;
}

export interface Match {
  recipientId: string;
  driverId: string;
  score: number;
  reasons: string[];
  matchedAt: number;
  pickupAt: number;
  deliverAt: number;
  distanceKm: number;
  driverFrom: LatLng;
}

export interface Listing {
  id: string;
  donorId: string;
  draft: ListingDraft;
  totalLbs: number;
  postedAt: number;
  pickupByMin: number;
  status: ListingStatus;
  source: DraftSource;
  match: Match | null;
  candidates: CandidateResult[];
  pickedUpAt: number | null;
  deliveredAt: number | null;
}

export type DonorKind = 'bakery' | 'grocery' | 'restaurant' | 'cafeteria' | 'cafe' | 'caterer';

export interface Donor {
  id: string;
  name: string;
  kind: DonorKind;
  city: string;
  street?: string;
  location: LatLng;
}

export interface Recipient {
  id: string;
  name: string;
  city: string;
  street?: string;
  location: LatLng;
  hasFridge: boolean;
  acceptsHot: boolean;
  capacityLbs: number;
  receivedLbs: number;
  openMin: number;
  closeMin: number;
  needs: FoodCategory[];
  vegetarianOnly: boolean;
  nutFree: boolean;
  peopleServed: number;
}

export interface Driver {
  id: string;
  name: string;
  vehicle: string;
  location: LatLng;
  capacityLbs: number;
  hasCooler: boolean;
  busyUntil: number;
}

export interface HistoryEntry {
  donorId: string;
  weekIndex: number;
  weekday: number;
  minute: number;
  lbs: number;
  category: FoodCategory;
}

export type EventKind = 'post' | 'match' | 'pickup' | 'deliver' | 'expire' | 'predict';

export interface FeedEvent {
  id: string;
  at: number;
  kind: EventKind;
  text: string;
}

export interface AppState {
  now: number;
  weekday: number;
  areaName: string;
  donors: Donor[];
  recipients: Recipient[];
  drivers: Driver[];
  listings: Listing[];
  events: FeedEvent[];
  nextId: number;
}
