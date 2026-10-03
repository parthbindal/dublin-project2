import { formatClock } from '@/lib/format';
import type { EventKind, FeedEvent } from '@/lib/types';

const KIND_ICON: Record<EventKind, string> = {
  post: '📦',
  match: '🤝',
  pickup: '🚐',
  deliver: '✅',
  expire: '⚠️',
  predict: '🔮',
};

const VISIBLE_EVENTS = 25;

export function ActivityLog({ events }: { events: FeedEvent[] }) {
  return (
    <section aria-labelledby="log-heading" className="rounded-3xl border border-line bg-paper p-5 shadow-sm">
      <h2 id="log-heading" className="font-display text-xl font-bold">
        Activity
      </h2>
      {events.length === 0 ? (
        <p className="mt-2 text-sm text-ink-soft">Updates appear here as the evening runs.</p>
      ) : (
        <ol className="mt-2 max-h-72 space-y-1.5 overflow-y-auto pr-1 text-sm">
          {events.slice(0, VISIBLE_EVENTS).map((event) => (
            <li key={event.id} className="flex gap-2">
              <span className="w-16 shrink-0 tabular-nums text-ink-soft">{formatClock(event.at)}</span>
              <span aria-hidden>{KIND_ICON[event.kind]}</span>
              <span>{event.text}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
