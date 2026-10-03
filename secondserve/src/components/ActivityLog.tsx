import { formatClock } from '@/lib/format';
import type { EventKind, FeedEvent } from '@/lib/types';
import { EVENT_ICON, Icon } from './ui';

const KIND_COLOR: Record<EventKind, string> = {
  post: 'text-terracotta-deep',
  match: 'text-dusk',
  pickup: 'text-ink',
  deliver: 'text-sage-deep',
  expire: 'text-terracotta-deep',
  predict: 'text-plum',
};

const VISIBLE_EVENTS = 25;

export function ActivityLog({ events }: { events: FeedEvent[] }) {
  return (
    <section aria-labelledby="log-heading" className="border-t-[1.5px] border-ink pt-4">
      <h3 id="log-heading" className="font-display text-xl font-semibold">
        The night so far
      </h3>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Each pickup and delivery shows up here as the evening plays.</p>
      ) : (
        <ol className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1 text-sm">
          {events.slice(0, VISIBLE_EVENTS).map((event) => (
            <li key={event.id} className="animate-chip-in flex gap-2.5">
              <span className="w-16 shrink-0 tabular-nums text-ink-soft">{formatClock(event.at)}</span>
              <Icon name={EVENT_ICON[event.kind]} className={`mt-0.5 h-4 w-4 shrink-0 ${KIND_COLOR[event.kind]}`} />
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
