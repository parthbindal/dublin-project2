import { CATEGORY_LABEL, describeItem, formatClock } from '@/lib/format';
import type { AppState, CandidateResult, Donor, Listing, Match, Recipient } from '@/lib/types';
import { DietaryTags, Icon, SourceBadge, StatusChip, STORAGE_LABEL, Tag } from './ui';

type Step = { label: string; time: string; isDone: boolean };

function timelineSteps(listing: Listing): Step[] {
  const { match } = listing;
  const posted = { label: 'Posted', time: formatClock(listing.postedAt), isDone: true };
  if (listing.status === 'expired') {
    return [posted, { label: "Couldn't be saved", time: `after ${formatClock(listing.pickupByMin)}`, isDone: true }];
  }
  const expected = (minutes: number | undefined) => (minutes === undefined ? '—' : `about ${formatClock(minutes)}`);
  return [
    posted,
    { label: 'Matched', time: match ? formatClock(match.matchedAt) : '—', isDone: Boolean(match) },
    {
      label: 'Picked up',
      time: listing.pickedUpAt !== null ? formatClock(listing.pickedUpAt) : expected(match?.pickupAt),
      isDone: listing.pickedUpAt !== null,
    },
    {
      label: 'Delivered',
      time: listing.deliveredAt !== null ? formatClock(listing.deliveredAt) : expected(match?.deliverAt),
      isDone: listing.deliveredAt !== null,
    },
  ];
}

function Timeline({ listing }: { listing: Listing }) {
  return (
    <ol className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {timelineSteps(listing).map((step) => (
        <li
          key={step.label}
          className={`relative overflow-hidden rounded-[14px] px-3.5 py-2.5 ring-1 ring-inset transition-colors duration-500 ${
            step.isDone ? 'bg-mint/10 ring-mint/35' : 'bg-white/[0.03] ring-line'
          }`}
        >
          <div className={`flex items-center gap-1.5 text-xs font-semibold ${step.isDone ? 'text-mint' : 'text-faint'}`}>
            {step.isDone ? <Icon name="check" className="h-3.5 w-3.5" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
            {step.label}
          </div>
          <div className="mt-0.5 font-mono text-sm tabular-nums">{step.time}</div>
        </li>
      ))}
    </ol>
  );
}

function FoodSummary({ listing }: { listing: Listing }) {
  const { draft } = listing;
  return (
    <div>
      <h3 className="eyebrow">The food</h3>
      <ul className="mt-2.5 divide-y divide-line overflow-hidden rounded-[14px] bg-white/[0.03] ring-1 ring-inset ring-line">
        {draft.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm">
            <span>
              {describeItem(item)} <span className="text-faint">· {CATEGORY_LABEL[item.category]}</span>
            </span>
            <span className="shrink-0 font-mono tabular-nums">{item.estimatedLbs} lbs</span>
          </li>
        ))}
        <li className="flex justify-between px-3.5 py-2.5 text-sm font-semibold">
          <span>Total</span>
          <span className="font-mono tabular-nums text-orange">{listing.totalLbs} lbs</span>
        </li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>{STORAGE_LABEL[draft.storage]}</Tag>
        <DietaryTags dietary={draft.dietary} />
        <Tag>Pick up by {formatClock(listing.pickupByMin)}</Tag>
      </div>
      {draft.notes && <p className="mt-2 text-sm text-muted">“{draft.notes}”</p>}
      <p className="mt-2 text-xs text-faint">Allergens are spotted automatically from the description. The business should always confirm them.</p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs font-semibold">
        <span className="text-muted">How good a fit</span>
        <span className="text-fresh font-mono text-base tabular-nums">{score} / 100</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="animate-grow-x h-full rounded-full bg-[image:var(--fresh)] shadow-[0_0_16px_var(--mint)]"
          style={{ width: `${Math.min(100, score)}%` }}
        />
      </div>
    </div>
  );
}

function candidateNote(candidate: CandidateResult, match: Match | null): string {
  if (!candidate.eligible) return candidate.blockers.join(' · ');
  if (match && candidate.score > match.score) return 'Good fit, but no driver could get there in time';
  return `Good fit too, but scored lower (${candidate.score} out of 100)`;
}

function MatchExplanation({ listing, recipients }: { listing: Listing; recipients: Recipient[] }) {
  const { match, candidates } = listing;
  const nameOf = (id: string) => recipients.find((r) => r.id === id)?.name ?? id;
  const others = candidates.filter((c) => c.recipientId !== match?.recipientId);
  const waiting =
    listing.status === 'expired'
      ? 'No food bank and driver could make it before the pickup deadline.'
      : 'Waiting for a free driver or a food bank with room. SecondServe keeps checking as the evening goes on.';
  return (
    <div>
      <h3 className="eyebrow">{match ? `Why ${nameOf(match.recipientId)}?` : 'Still looking for a home'}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-faint">
        We compare distance, free space, what each place asked for, and time before it closes. Then we rule out any place that can&apos;t store the food safely or serve it to the people it feeds.
      </p>
      {match ? (
        <div className="mt-3 rounded-[16px] bg-mint/[0.06] p-4 ring-1 ring-inset ring-mint/25">
          <ScoreBar key={listing.id} score={match.score} />
          <ul className="mt-3 space-y-1.5 text-sm">
            {match.reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-mint" />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted">{waiting}</p>
      )}
      {others.length > 0 && (
        <>
          <h4 className="eyebrow mt-5">Other places we checked</h4>
          <ul className="mt-2 space-y-1.5 text-sm">
            {others.map((candidate) => (
              <li key={candidate.recipientId} className="rounded-[12px] bg-white/[0.03] px-3.5 py-2.5 ring-1 ring-inset ring-line">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{nameOf(candidate.recipientId)}</span>
                  <span className={`font-mono text-xs font-semibold ${candidate.eligible ? 'text-muted' : 'text-red'}`}>
                    {candidate.eligible ? `${candidate.score}/100` : 'Not a fit'}
                  </span>
                </div>
                <p className={`mt-0.5 text-xs ${candidate.eligible ? 'text-faint' : 'text-red/90'}`}>{candidateNote(candidate, match)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function placeLabel(place: Donor | Recipient): string {
  return place.street ? `${place.street}, ${place.city}` : place.city;
}

type Props = {
  listing: Listing | null;
  state: AppState;
  isFollowingLatest: boolean;
};

export function ListingDetail({ listing, state, isFollowingLatest }: Props) {
  if (!listing) {
    return (
      <section className="card grid min-h-[280px] place-items-center p-8 text-center">
        <div>
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-[14px] bg-cyan/12 text-cyan ring-1 ring-inset ring-cyan/30">
            <Icon name="link" className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-xl font-semibold tracking-tight">Every match comes with reasons</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted">
            When food is posted, you&apos;ll see where it goes, which places were ruled out and why, and which volunteer drives it over.
          </p>
        </div>
      </section>
    );
  }
  const donor = state.donors.find((d) => d.id === listing.donorId);
  const recipient = state.recipients.find((r) => r.id === listing.match?.recipientId);
  const destination = recipient?.name ?? (listing.status === 'expired' ? "couldn't be saved" : 'finding a home…');
  return (
    <section aria-labelledby="detail-heading" className="card p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow">
            {isFollowingLatest ? 'Following the newest post' : 'Selected post'} · posted {formatClock(listing.postedAt)}
          </p>
          <h3 id="detail-heading" className="mt-2 text-2xl font-semibold leading-tight tracking-[-0.03em]">
            {donor?.name ?? 'Unknown business'} <span className="text-brand">→</span> {destination}
          </h3>
          {donor && (
            <p className="mt-1 text-sm text-muted">
              From {placeLabel(donor)}
              {recipient ? ` to ${placeLabel(recipient)}` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={listing.source} />
          <StatusChip status={listing.status} />
        </div>
      </div>
      <Timeline key={listing.id} listing={listing} />
      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.3fr]">
        <FoodSummary listing={listing} />
        <MatchExplanation listing={listing} recipients={state.recipients} />
      </div>
    </section>
  );
}
