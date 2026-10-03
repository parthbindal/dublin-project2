import { CATEGORY_LABEL, describeItem, formatClock } from '@/lib/format';
import type { AppState, CandidateResult, Donor, Listing, Match, Recipient } from '@/lib/types';
import { DietaryTags, SourceBadge, StatusChip, STORAGE_LABEL, Tag } from './ui';

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
    <ol className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {timelineSteps(listing).map((step) => (
        <li
          key={step.label}
          className={`rounded-[4px] border px-3 py-2 transition-colors duration-500 ${step.isDone ? 'border-leaf/40 bg-leaf/10' : 'border-line bg-cream/60'}`}
        >
          <div className="text-xs font-semibold text-ink-soft">
            {step.isDone ? '✓ ' : ''}
            {step.label}
          </div>
          <div className="text-sm font-semibold tabular-nums">{step.time}</div>
        </li>
      ))}
    </ol>
  );
}

function FoodSummary({ listing }: { listing: Listing }) {
  const { draft } = listing;
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">The food</h3>
      <ul className="mt-2 divide-y divide-line rounded-[4px] border border-line">
        {draft.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
            <span>
              {describeItem(item)} <span className="text-ink-soft">· {CATEGORY_LABEL[item.category]}</span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{item.estimatedLbs} lbs</span>
          </li>
        ))}
        <li className="flex justify-between px-3 py-2 text-sm font-bold">
          <span>Total</span>
          <span className="tabular-nums">{listing.totalLbs} lbs</span>
        </li>
      </ul>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Tag>{STORAGE_LABEL[draft.storage]}</Tag>
        <DietaryTags dietary={draft.dietary} />
        <Tag>Pick up by {formatClock(listing.pickupByMin)}</Tag>
      </div>
      {draft.notes && <p className="mt-2 text-sm text-ink-soft">“{draft.notes}”</p>}
      <p className="mt-2 text-xs text-ink-soft">Allergens are spotted automatically from the description. The business should always confirm them.</p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold">
        <span>How good a fit</span>
        <span className="tabular-nums">{score} out of 100</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className="animate-grow-x h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, score)}%` }} />
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
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {match ? `Why ${nameOf(match.recipientId)}?` : 'Still looking for a home'}
      </h3>
      <p className="mt-1 text-xs text-ink-soft">
        We compare distance, free space, what each place asked for, and time before it closes. Then we rule out any place that can&apos;t store the food safely or serve it to the people it feeds.
      </p>
      {match ? (
        <div className="mt-2 border-l-[3px] border-leaf bg-leaf/5 py-3 pl-4 pr-3">
          <ScoreBar key={listing.id} score={match.score} />
          <ul className="mt-2 space-y-1 text-sm">
            {match.reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <span aria-hidden className="text-leaf">✓</span>
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="mt-2 text-sm text-ink-soft">{waiting}</p>
      )}
      {others.length > 0 && (
        <>
          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Other places we checked</h4>
          <ul className="mt-1 space-y-1.5 text-sm">
            {others.map((candidate) => (
              <li key={candidate.recipientId} className="rounded-[4px] bg-cream px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{nameOf(candidate.recipientId)}</span>
                  <span className={`text-xs font-semibold ${candidate.eligible ? 'text-ink-soft' : 'text-tomato'}`}>
                    {candidate.eligible ? `${candidate.score}/100` : 'Not a fit'}
                  </span>
                </div>
                <p className={`text-xs ${candidate.eligible ? 'text-ink-soft' : 'text-tomato'}`}>{candidateNote(candidate, match)}</p>
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
      <section className="grid min-h-[260px] place-items-center border-t-[1.5px] border-ink p-6 text-center">
        <div>
          <h3 className="font-display text-xl font-semibold">Every match comes with reasons</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
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
    <section aria-labelledby="detail-heading" className="border-t-[1.5px] border-ink pt-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            {isFollowingLatest ? 'Following the newest post' : 'Selected post'} · posted {formatClock(listing.postedAt)}
          </p>
          <h3 id="detail-heading" className="font-display text-2xl font-semibold leading-tight">
            {donor?.name ?? 'Unknown business'} <span className="text-tomato">→</span> {destination}
          </h3>
          {donor && (
            <p className="text-sm text-ink-soft">
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
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <FoodSummary listing={listing} />
        <MatchExplanation listing={listing} recipients={state.recipients} />
      </div>
    </section>
  );
}
