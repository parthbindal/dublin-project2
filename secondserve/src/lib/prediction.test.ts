import { describe, expect, it } from 'vitest';
import { median, predictSurplus } from './prediction';
import { buildHistory, DEMO_WEEKDAY, HISTORY, HISTORY_WEEKS } from './sampleData';
import type { HistoryEntry } from './types';

const entry = (overrides: Partial<HistoryEntry>): HistoryEntry => ({
  donorId: 'd1', weekIndex: 0, weekday: 6, minute: 18 * 60, lbs: 30, category: 'bakery', ...overrides,
});

describe('median', () => {
  it('handles odd, even and empty lists', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
    expect(median([])).toBe(0);
  });
});

describe('predictSurplus', () => {
  const history = [
    entry({ weekIndex: 0, lbs: 20, minute: 1070 }),
    entry({ weekIndex: 1, lbs: 30, minute: 1080 }),
    entry({ weekIndex: 2, lbs: 40, minute: 1090 }),
    entry({ weekIndex: 3, weekday: 2 }), // a Tuesday: ignored for Saturday
    entry({ donorId: 'd2', weekIndex: 0 }),
  ];

  it('uses weeks seen out of weeks tracked, only for that weekday', () => {
    const [prediction] = predictSurplus(history, 6, 4);
    expect(prediction).toMatchObject({ donorId: 'd1', weeksSeen: 3, weeksTotal: 4, likelihood: 0.75 });
  });

  it('reports the typical amount and time as medians', () => {
    const [prediction] = predictSurplus(history, 6, 4);
    expect(prediction.typicalLbs).toBe(30);
    expect(prediction.typicalMinute).toBe(1080);
  });

  it('leaves out businesses that rarely have surplus that day', () => {
    expect(predictSurplus(history, 6, 4).map((p) => p.donorId)).toEqual(['d1']);
  });

  it('returns nothing when no weeks are tracked', () => {
    expect(predictSurplus(history, 6, 0)).toEqual([]);
  });
});

describe('sample history', () => {
  it('is the same every time it is built', () => {
    expect(buildHistory()).toEqual(buildHistory());
  });

  it('predicts the bakery on Saturdays, as the demo shows', () => {
    const bakery = predictSurplus(HISTORY, DEMO_WEEKDAY, HISTORY_WEEKS).find((p) => p.donorId === 'd-bakery');
    expect(bakery?.likelihood).toBeGreaterThanOrEqual(0.75);
  });
});
