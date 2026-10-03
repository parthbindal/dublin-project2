import { formatClock, summarizeItems } from '@/lib/format';
import type { Donor, Listing, Recipient } from '@/lib/types';
import { DONOR_ICON, Icon, StatusChip } from './ui';

type TicketProps = {
  listing: Listing;
  donor: Donor | undefined;
  recipient: Recipient | undefined;
  isSelected: boolean;
  onSelect: (id: string) => void;
};

function FeedTicket({ listing, donor, recipient, isSelected, onSelect }: TicketProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(listing.id)}
      aria-pressed={isSelected}
      className={`ticket animate-ticket-in w-full px-4 py-3 text-left ${isSelected ? 'ticket-selected' : ''}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-2 font-semibold">
          {donor && <Icon name={DONOR_ICON[donor.kind]} className="h-[18px] w-[18px] shrink-0 text-terracotta-deep" />}
          <span className="truncate">{donor?.name ?? 'Unknown business'}</span>
        </span>
        <span className="shrink-0 text-xs tabular-nums text-ink-soft">{formatClock(listing.postedAt)}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-ink-soft">{summarizeItems(listing.draft.items)}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-dashed border-line pt-2">
        <span className="font-display text-xl font-semibold tabular-nums">{listing.totalLbs} lbs</span>
        <StatusChip status={listing.status} />
        {recipient && <span className="truncate text-xs text-ink-soft">to {recipient.name}</span>}
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
  const countLabel = `${listings.length} ${listings.length === 1 ? 'post' : 'posts'}`;
  return (
    <section
      aria-labelledby="feed-heading"
      className="flex h-[480px] flex-col overflow-hidden rounded-[6px] border-[1.5px] border-ink bg-linen lg:h-[580px]"
    >
      <div className="flex items-baseline justify-between border-b-[1.5px] border-ink bg-paper px-5 py-3">
        <h3 id="feed-heading" className="font-display text-xl font-semibold">
          Tonight&apos;s extra food
        </h3>
        <span className="text-xs text-ink-soft">{countLabel}</span>
      </div>
      {listings.length === 0 ? (
        <div className="grid flex-1 place-items-center p-8 text-center text-sm leading-relaxed text-ink-soft">
          <p className="max-w-[30ch]">
            Nothing has been shared yet. Press <strong className="text-ink">Play the evening</strong> to watch a night unfold, or share some food yourself.
          </p>
        </div>
      ) : (
        <ol className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <FeedTicket
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
