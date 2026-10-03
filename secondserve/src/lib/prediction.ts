// Predictive surplus: learns when each business usually has leftovers from past listings.
// These are estimates from history, not guarantees, and the UI says so.
import type { FoodCategory, HistoryEntry } from './types';

export const MIN_LIKELIHOOD = 0.5;

export interface SurplusPrediction {
  donorId: string;
  likelihood: number;
  weeksSeen: number;
  weeksTotal: number;
  typicalMinute: number;
  typicalLbs: number;
  category: FoodCategory;
}

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function mostCommon<T extends string>(values: T[]): T {
  const counts = values.reduce<Record<string, number>>((acc, v) => ({ ...acc, [v]: (acc[v] ?? 0) + 1 }), {});
  return [...values].sort((a, b) => counts[b] - counts[a])[0];
}

function groupByDonor(entries: HistoryEntry[]): Record<string, HistoryEntry[]> {
  return entries.reduce<Record<string, HistoryEntry[]>>(
    (acc, entry) => ({ ...acc, [entry.donorId]: [...(acc[entry.donorId] ?? []), entry] }),
    {},
  );
}

export function predictSurplus(
  history: HistoryEntry[],
  weekday: number,
  weeksTotal: number,
  minLikelihood = MIN_LIKELIHOOD,
): SurplusPrediction[] {
  if (weeksTotal <= 0) return [];
  const byDonor = groupByDonor(history.filter((entry) => entry.weekday === weekday));
  return Object.entries(byDonor)
    .map(([donorId, entries]) => {
      const weeksSeen = new Set(entries.map((e) => e.weekIndex)).size;
      return {
        donorId,
        likelihood: weeksSeen / weeksTotal,
        weeksSeen,
        weeksTotal,
        typicalMinute: Math.round(median(entries.map((e) => e.minute))),
        typicalLbs: Math.round(median(entries.map((e) => e.lbs))),
        category: mostCommon(entries.map((e) => e.category)),
      };
    })
    .filter((p) => p.likelihood >= minLikelihood)
    .sort((a, b) => b.likelihood - a.likelihood || a.typicalMinute - b.typicalMinute);
}
