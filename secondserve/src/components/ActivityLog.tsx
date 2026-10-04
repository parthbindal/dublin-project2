import { formatClock } from '@/lib/format';
import type { EventKind, FeedEvent } from '@/lib/types';
import { EVENT_ICON, Icon } from './ui';

const KIND_COLOR: Record<EventKind, string> = {
  post: 'text-orange bg-orange/12',
  match: 'text-cyan bg-cyan/12',
  pickup: 'text-yellow bg-yellow/12',
  deliver: 'text-mint bg-mint/12',
  expire: 'text-pink bg-pink/12',
  predict: 'text-violet bg-violet/12',
};

const VISIBLE_EVENTS = 25;

export function ActivityLog({ events }: { events: FeedEvent[] }) {
  return (
    <section aria-labelledby="log-heading" className="card p-5">
      <h3 id="log-heading" className="font-semibold tracking-tight">
        The night so far
      </h3>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Each pickup and delivery shows up here as the evening plays.</p>
      ) : (
        <ol className="mt-3 max-h-80 space-y-2.5 overflow-y-auto pr-1 text-sm">
          {events.slice(0, VISIBLE_EVENTS).map((event) => (
            <li key={event.id} className="animate-chip-in flex gap-3">
              <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-[8px] ${KIND_COLOR[event.kind]}`}>
                <Icon name={EVENT_ICON[event.kind]} className="h-3.5 w-3.5" />
              </span>
              <span className="min-w-0 flex-1 text-muted">
                <span className="mr-2 font-mono text-[11px] tabular-nums text-faint">{formatClock(event.at)}</span>
                <span className="text-fg/90">{event.text}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
