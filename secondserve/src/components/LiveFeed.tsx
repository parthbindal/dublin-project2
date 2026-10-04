import { formatClock, summarizeItems } from '@/lib/format';
import type { Donor, Listing, Recipient } from '@/lib/types';
import { StatusChip } from './ui';

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
      className={`ticket animate-ticket-in grid w-full grid-cols-[3.4rem_minmax(0,1fr)_auto] gap-x-3 px-4 py-3.5 text-left ${isSelected ? 'ticket-selected' : ''}`}
    >
      <span className="font-mono pt-0.5 text-sm text-muted">{formatClock(listing.postedAt)}</span>
      <span className="min-w-0">
        <span className="block truncate font-semibold">{donor?.name ?? 'Unknown business'}</span>
        <span className="mt-0.5 line-clamp-2 block text-sm text-muted">{summarizeItems(listing.draft.items)}</span>
        <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <StatusChip status={listing.status} />
          {recipient && <span className="truncate text-xs text-faint">to {recipient.name}</span>}
        </span>
      </span>
      <span className="display text-right text-2xl leading-none">
        {listing.totalLbs}
        <span className="label mt-1 block !text-[0.65rem]">lbs</span>
      </span>
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
    <section aria-labelledby="feed-heading" className="flex h-[520px] flex-col border border-line-strong bg-surface lg:h-[640px]">
      <div className="flex items-center justify-between border-b border-line-strong px-4 py-3">
        <h3 id="feed-heading" className="label !text-fg">
          Tonight&apos;s extra food
        </h3>
        <span className="label">{countLabel}</span>
      </div>
      {listings.length === 0 ? (
        <div className="flex flex-1 flex-col justify-end p-6">
          <p className="display text-3xl leading-tight">The shelves are quiet, for now.</p>
          <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-muted">
            Press <strong className="text-lime">Play the evening</strong> to watch a night unfold, or share food from your own business.
          </p>
        </div>
      ) : (
        <ol className="flex-1 overflow-y-auto">
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
