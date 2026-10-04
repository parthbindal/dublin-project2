'use client';

import type { ImpactTotals } from '@/lib/impact';
import type { FeedEvent } from '@/lib/types';
import { CountUp, Icon } from './ui';

// How long (in simulated minutes) a delivery note stays on screen.
const TOAST_WINDOW_MIN = 24;
const MAX_TOASTS = 3;

export function Toasts({ events, now }: { events: FeedEvent[]; now: number }) {
  const recent = events
    .filter((event) => (event.kind === 'deliver' || event.kind === 'expire') && now - event.at <= TOAST_WINDOW_MIN)
    .slice(0, MAX_TOASTS);
  return (
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[1500] flex w-[min(92vw,360px)] flex-col gap-2">
      {recent.map((event) => {
        const isDelivered = event.kind === 'deliver';
        return (
          <div key={event.id} className="glass animate-toast-in flex gap-3 px-4 py-3 text-sm">
            <span
              className={`grid h-7 w-7 shrink-0 place-items-center ${
                isDelivered ? 'bg-lime text-lime-ink' : 'bg-red text-bg'
              }`}
            >
              <Icon name={isDelivered ? 'check' : 'alert'} className="h-4 w-4" />
            </span>
            <span className="leading-snug">{event.text}</span>
          </div>
        );
      })}
    </div>
  );
}

type SummaryProps = {
  impact: ImpactTotals;
  areaName: string;
  onReplay: () => void;
  onExport: () => void;
};

export function EveningSummary({ impact, areaName, onReplay, onExport }: SummaryProps) {
  const tripWord = impact.deliveries === 1 ? 'trip' : 'trips';
  return (
    <section
      aria-label="Tonight's results"
      className="card animate-sheet-in relative grid gap-5 overflow-hidden p-7 md:grid-cols-[1fr_auto] md:items-end"
    >
      <div className="relative">
        <p className="eyebrow !text-mint">That&apos;s a wrap for tonight</p>
        <h3 className="display mt-3 text-[clamp(1.7rem,3vw,2.7rem)] leading-[1.05]">
          In {areaName}, <span className="text-fresh"><CountUp value={impact.rescuedLbs} startFrom={0} /> lbs</span> of good food found a table. That&apos;s about{' '}
          <span className="accent text-fresh"><CountUp value={impact.meals} startFrom={0} /> meals.</span>
        </h3>
        <p className="mt-3 text-sm text-muted">
          {impact.deliveries} {tripWord} by volunteer drivers.{' '}
          {impact.expiredLbs > 0 ? `${impact.expiredLbs} lbs couldn't be picked up in time.` : 'Nothing was thrown away.'}
        </p>
      </div>
      <div className="relative flex flex-wrap gap-2">
        <button type="button" onClick={onExport} className="btn btn-glass">
          <Icon name="download" className="h-4 w-4" />
          Donation records
        </button>
        <button type="button" onClick={onReplay} className="btn btn-play">
          <Icon name="restart" className="h-4 w-4" />
          Play it again
        </button>
      </div>
    </section>
  );
}
