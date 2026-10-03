'use client';

import { useState } from 'react';
import { CATEGORY_LABEL, formatClock, WEEKDAYS } from '@/lib/format';
import type { SurplusPrediction } from '@/lib/prediction';
import type { Donor } from '@/lib/types';
import { DONOR_ICON, Icon } from './ui';

type Props = {
  predictions: SurplusPrediction[];
  donors: Donor[];
  weekday: number;
  onHeadsUp: (text: string) => void;
};

export function PredictionsPanel({ predictions, donors, weekday, onHeadsUp }: Props) {
  const [sentIds, setSentIds] = useState<string[]>([]);
  const dayName = WEEKDAYS[weekday];
  const weeksTracked = predictions[0]?.weeksTotal ?? 8;

  function handleHeadsUp(prediction: SurplusPrediction, donor: Donor) {
    const text =
      `Food banks nearby got a heads-up: ${donor.name} usually has about ${prediction.typicalLbs} lbs of ` +
      `${CATEGORY_LABEL[prediction.category]} around ${formatClock(prediction.typicalMinute)} on ${dayName}s.`;
    onHeadsUp(text);
    setSentIds((prev) => [...prev, prediction.donorId]);
  }

  return (
    <section aria-labelledby="predict-heading" className="card p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-[10px] bg-violet/12 text-violet ring-1 ring-inset ring-violet/30">
          <Icon name="sparkle" className="h-4 w-4" />
        </span>
        <h3 id="predict-heading" className="font-semibold tracking-tight">
          Who usually has extra on {dayName}s
        </h3>
      </div>
      <p className="mt-2 text-xs text-faint">
        Learned from the last {weeksTracked} {dayName}s of posts. A good guess, not a promise.
      </p>
      <ul className="mt-3 divide-y divide-line">
        {predictions.map((prediction) => {
          const donor = donors.find((d) => d.id === prediction.donorId);
          if (!donor) return null;
          const isSent = sentIds.includes(prediction.donorId);
          const percent = Math.round(prediction.likelihood * 100);
          return (
            <li key={prediction.donorId} className="py-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-sm font-semibold">
                  <Icon name={DONOR_ICON[donor.kind]} className="h-4 w-4 shrink-0 text-orange" />
                  <span className="truncate">{donor.name}</span>
                </span>
                <span className="text-brand font-mono text-lg font-semibold tabular-nums">{percent}%</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="animate-grow-x h-full rounded-full bg-[image:var(--brand)]" style={{ width: `${percent}%` }} />
              </div>
              <p className="mt-2 text-sm text-muted">
                Usually about {prediction.typicalLbs} lbs of {CATEGORY_LABEL[prediction.category]} around{' '}
                {formatClock(prediction.typicalMinute)}. Happened on {prediction.weeksSeen} of the last {prediction.weeksTotal} {dayName}s.
              </p>
              <button
                type="button"
                onClick={() => handleHeadsUp(prediction, donor)}
                disabled={isSent}
                className="btn btn-glass mt-2.5 !px-3 !py-1 text-xs disabled:!opacity-100 disabled:text-mint"
              >
                {isSent ? (
                  <>
                    <Icon name="check" className="h-3.5 w-3.5" /> Food banks know
                  </>
                ) : (
                  <>
                    <Icon name="bell" className="h-3.5 w-3.5" /> Let food banks know
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
