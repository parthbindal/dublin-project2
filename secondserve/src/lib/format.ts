import type { FoodCategory, FoodItem } from './types';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const CATEGORY_LABEL: Record<FoodCategory, string> = {
  bakery: 'bakery items',
  produce: 'fresh produce',
  prepared: 'prepared meals',
  dairy: 'dairy',
  protein: 'protein',
  packaged: 'packaged food',
};

const COUNT_UNITS = new Set(['', 'piece', 'pieces', 'item', 'items']);

export function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 1,140 -> "7:00 PM" */
export function formatClock(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(mins).padStart(2, '0')} ${hours24 >= 12 ? 'PM' : 'AM'}`;
}

/** "19:00" -> 1,140. Returns null for anything that is not a valid 24-hour time. */
export function parseHHMM(value: string | null): number | null {
  if (!value) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** 1,140 -> "19:00" */
export function toHHMM(minutes: number): string {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(wrapped / 60)).padStart(2, '0')}:${String(wrapped % 60).padStart(2, '0')}`;
}

export function describeItem(item: FoodItem): string {
  return COUNT_UNITS.has(item.unit.toLowerCase())
    ? `${item.quantity} ${item.name}`
    : `${item.quantity} ${item.unit} of ${item.name}`;
}

export function summarizeItems(items: FoodItem[]): string {
  return items.map(describeItem).join(', ');
}
