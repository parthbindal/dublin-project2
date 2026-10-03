'use client';

import { useState } from 'react';
import { CATEGORY_LABEL, formatClock, WEEKDAYS } from '@/lib/format';
import type { SurplusPrediction } from '@/lib/prediction';
import type { Donor } from '@/lib/types';
import { DONOR_EMOJI } from './ui';

type Props = {
  predictions: SurplusPrediction[];
  donors: Donor[];
  weekday: number;
  onHeadsUp: (text: string) => void;
};

export function PredictionsPanel({ predictions, donors, weekday, onHeadsUp }: Props) {
  const [sentIds, setSentIds] = useState<string[]>([]);
  const dayName = WEEKDAYS[weekday];

  function handleHeadsUp(prediction: SurplusPrediction, donor: Donor) {
    const text =
      `Heads-up sent to nearby food programs: ${donor.name} usually has about ${prediction.typicalLbs} lbs of ` +
      `${CATEGORY_LABEL[prediction.category]} around ${formatClock(prediction.typicalMinute)} on ${dayName}s.`;
    onHeadsUp(text);
    setSentIds((prev) => [...prev, prediction.donorId]);
  }

  return (
    <section aria-labelledby="predict-heading" className="rounded-3xl border border-line bg-paper p-5 shadow-sm">
      <h2 id="predict-heading" className="font-display text-xl font-bold">
        Likely surplus tonight
      </h2>
      <p className="text-xs text-ink-soft">
        Learned from the last {predictions[0]?.weeksTotal ?? 8} {dayName}s of listings. Estimates, not promises.
      </p>
      <ul className="mt-3 space-y-2">
        {predictions.map((prediction) => {
          const donor = donors.find((d) => d.id === prediction.donorId);
          if (!donor) return null;
          const isSent = sentIds.includes(prediction.donorId);
          const percent = Math.round(prediction.likelihood * 100);
          return (
            <li key={prediction.donorId} className="rounded-2xl border border-line p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">
                  {DONOR_EMOJI[donor.kind]} {donor.name}
                </span>
                <span className="font-display text-lg font-bold tabular-nums">{percent}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-line">
                <div className="h-full rounded-full bg-tomato" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-1.5 text-sm text-ink-soft">
                About {prediction.typicalLbs} lbs of {CATEGORY_LABEL[prediction.category]} around{' '}
                {formatClock(prediction.typicalMinute)}. Seen {prediction.weeksSeen} of the last {prediction.weeksTotal} {dayName}s.
              </p>
              <button
                type="button"
                onClick={() => handleHeadsUp(prediction, donor)}
                disabled={isSent}
                className="mt-2 rounded-full px-3 py-1 text-xs font-semibold text-ink ring-1 ring-line transition hover:bg-cream disabled:text-leaf disabled:ring-leaf/40"
              >
                {isSent ? 'Heads-up sent ✓' : 'Give food programs a heads-up'}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
