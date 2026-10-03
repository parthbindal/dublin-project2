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
    <div aria-live="polite" className="pointer-events-none fixed bottom-4 right-4 z-[1500] flex w-[min(92vw,340px)] flex-col gap-2">
      {recent.map((event) => (
        <div key={event.id} className="animate-toast-in flex gap-3 rounded-[6px] border-[1.5px] border-ink bg-paper px-4 py-3 text-sm">
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${event.kind === 'deliver' ? 'bg-sage-deep text-paper' : 'bg-terracotta text-paper'}`}
          >
            <Icon name={event.kind === 'deliver' ? 'check' : 'alert'} className="h-3.5 w-3.5" />
          </span>
          <span>{event.text}</span>
        </div>
      ))}
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
    <section aria-label="Tonight's results" className="grid gap-4 rounded-[6px] bg-sage-deep px-6 py-6 text-paper md:grid-cols-[1fr_auto] md:items-end">
      <div>
        <p className="eyebrow !text-paper/75">That&apos;s a wrap for tonight</p>
        <h3 className="animate-reveal mt-2 font-display text-[clamp(1.6rem,3vw,2.6rem)] font-semibold leading-[1.05]">
          In {areaName}, <CountUp value={impact.rescuedLbs} startFrom={0} /> lbs of good food found a table. That&apos;s about{' '}
          <CountUp value={impact.meals} startFrom={0} /> meals.
        </h3>
        <p className="mt-2 text-sm text-paper/80">
          {impact.deliveries} {tripWord} by volunteer drivers.{' '}
          {impact.expiredLbs > 0 ? `${impact.expiredLbs} lbs couldn't be picked up in time.` : 'Nothing was thrown away.'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={onExport} className="btn !text-paper shadow-[inset_0_0_0_1.5px_oklch(0.975_0.012_82/0.5)] hover:bg-paper/10">
          <Icon name="download" className="h-4 w-4" />
          Donation records
        </button>
        <button type="button" onClick={onReplay} className="btn btn-honey">
          <Icon name="restart" className="h-4 w-4" />
          Play it again
        </button>
      </div>
    </section>
  );
}
