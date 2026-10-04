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
      className={`ticket animate-ticket-in w-full p-3.5 text-left ${isSelected ? 'ticket-selected' : ''}`}
    >
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-orange/12 text-orange ring-1 ring-inset ring-orange/30">
          {donor ? <Icon name={DONOR_ICON[donor.kind]} className="h-5 w-5" /> : <Icon name="box" className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{donor?.name ?? 'Unknown business'}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-faint">{formatClock(listing.postedAt)}</span>
          </div>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{summarizeItems(listing.draft.items)}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-line pt-3">
        <span className="font-mono text-lg font-medium tabular-nums">
          {listing.totalLbs}
          <span className="ml-1 text-xs text-faint">lbs</span>
        </span>
        <StatusChip status={listing.status} />
        {recipient && (
          <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted">
            <Icon name="arrow" className="h-3 w-3 shrink-0 text-mint" />
            {recipient.name}
          </span>
        )}
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
    <section aria-labelledby="feed-heading" className="card flex h-[520px] flex-col overflow-hidden lg:h-[640px]">
      <div className="flex items-center justify-between border-b border-line px-5 py-4">
        <h3 id="feed-heading" className="flex items-center gap-2.5 font-semibold tracking-tight">
          <span className="live-dot text-orange" />
          Tonight&apos;s extra food
        </h3>
        <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[11px] text-muted ring-1 ring-inset ring-line">{countLabel}</span>
      </div>
      {listings.length === 0 ? (
        <div className="grid flex-1 place-items-center p-8 text-center text-sm leading-relaxed text-muted">
          <div className="flex max-w-[30ch] flex-col items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-[20px] bg-orange/12 text-orange shadow-[0_0_40px_-6px_var(--orange)] ring-1 ring-inset ring-orange/30">
              <Icon name="basket" className="h-8 w-8" />
            </span>
            <p className="text-lg font-semibold tracking-tight text-fg">The shelves are quiet, for now.</p>
            <p>
              Press <strong className="text-mint">Play the evening</strong> to watch a night unfold, or share food from your own business.
            </p>
          </div>
        </div>
      ) : (
        <ol className="flex-1 space-y-2.5 overflow-y-auto p-4">
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
