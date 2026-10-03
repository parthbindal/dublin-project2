import { formatClock, summarizeItems } from '@/lib/format';
import type { Donor, Listing, Recipient } from '@/lib/types';
import { DONOR_EMOJI, StatusChip } from './ui';

type CardProps = {
  listing: Listing;
  donor: Donor | undefined;
  recipient: Recipient | undefined;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

function FeedCard({ listing, donor, recipient, isSelected, onSelect }: CardProps) {
  const outline = isSelected ? 'border-ink ring-2 ring-ink/70' : 'border-line hover:border-ink/40';
  return (
    <button
      type="button"
      onClick={() => onSelect(listing.id)}
      aria-pressed={isSelected}
      className={`w-full rounded-2xl border bg-paper p-3 text-left transition ${outline}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate font-semibold">{donor ? `${DONOR_EMOJI[donor.kind]} ${donor.name}` : 'Unknown business'}</span>
        <span className="shrink-0 text-xs tabular-nums text-ink-soft">{formatClock(listing.postedAt)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{summarizeItems(listing.draft.items)}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="font-display text-lg font-bold tabular-nums">{listing.totalLbs} lbs</span>
        <StatusChip status={listing.status} />
        {recipient && <span className="truncate text-xs text-ink-soft">→ {recipient.name}</span>}
      </div>
    </button>
  );
}

type Props = {
  listings: Listing[];
  donors: Donor[];
  recipients: Recipient[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

export function LiveFeed({ listings, donors, recipients, selectedId, onSelect }: Props) {
  const countLabel = `${listings.length} ${listings.length === 1 ? 'listing' : 'listings'} tonight`;
  return (
    <section
      aria-labelledby="feed-heading"
      className="flex h-[460px] flex-col overflow-hidden rounded-3xl border border-line bg-paper shadow-sm lg:h-[560px]"
    >
      <div className="flex items-baseline justify-between border-b border-line px-5 py-3">
        <h2 id="feed-heading" className="font-display text-xl font-bold">
          Live surplus
        </h2>
        <span className="text-xs text-ink-soft">{countLabel}</span>
      </div>
      {listings.length === 0 ? (
        <div className="grid flex-1 place-items-center p-6 text-center text-sm text-ink-soft">
          <p>
            Nothing posted yet.
            <br />
            Press <strong className="text-ink">Run the evening</strong> to watch a demo night, or post surplus yourself.
          </p>
        </div>
      ) : (
        <ol className="flex-1 space-y-2 overflow-y-auto p-3">
          {listings.map((listing) => (
            <li key={listing.id}>
              <FeedCard
                listing={listing}
                donor={donors.find((d) => d.id === listing.donorId)}
                recipient={recipients.find((r) => r.id === listing.match?.recipientId)}
                isSelected={listing.id === selectedId}
                onSelect={onSelect}
              />
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
