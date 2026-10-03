import { CATEGORY_LABEL, describeItem, formatClock } from '@/lib/format';
import type { AppState, CandidateResult, Listing, Match, Recipient } from '@/lib/types';
import { dietaryTags, SourceBadge, StatusChip, STORAGE_LABEL, Tag } from './ui';

type Step = { label: string; time: string; isDone: boolean };

function timelineSteps(listing: Listing): Step[] {
  const { match } = listing;
  const posted = { label: 'Posted', time: formatClock(listing.postedAt), isDone: true };
  if (listing.status === 'expired') {
    return [posted, { label: "Couldn't place", time: `after ${formatClock(listing.pickupByMin)}`, isDone: true }];
  }
  const eta = (minutes: number | undefined) => (minutes === undefined ? '—' : `ETA ${formatClock(minutes)}`);
  return [
    posted,
    { label: 'Matched', time: match ? formatClock(match.matchedAt) : '—', isDone: Boolean(match) },
    {
      label: 'Picked up',
      time: listing.pickedUpAt !== null ? formatClock(listing.pickedUpAt) : eta(match?.pickupAt),
      isDone: listing.pickedUpAt !== null,
    },
    {
      label: 'Delivered',
      time: listing.deliveredAt !== null ? formatClock(listing.deliveredAt) : eta(match?.deliverAt),
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
          className={`rounded-xl border px-3 py-2 ${step.isDone ? 'border-leaf/40 bg-leaf/10' : 'border-line bg-cream/60'}`}
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
      <ul className="mt-2 divide-y divide-line rounded-2xl border border-line">
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
        {dietaryTags(draft.dietary).map((tag) => (
          <Tag key={tag} isWarning={tag === 'Contains nuts'}>
            {tag}
          </Tag>
        ))}
        <Tag>Pick up by {formatClock(listing.pickupByMin)}</Tag>
      </div>
      {draft.notes && <p className="mt-2 text-sm text-ink-soft">“{draft.notes}”</p>}
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-semibold">
        <span>Match score</span>
        <span className="tabular-nums">{score}/100</span>
      </div>
      <div className="mt-1 h-2 rounded-full bg-line">
        <div className="h-full rounded-full bg-leaf" style={{ width: `${Math.min(100, score)}%` }} />
      </div>
    </div>
  );
}

function candidateNote(candidate: CandidateResult, match: Match | null): string {
  if (!candidate.eligible) return candidate.blockers.join(' · ');
  if (match && candidate.score > match.score) return 'Could take it, but no driver could get there in time';
  return `Could take it, but ranked lower (${candidate.distanceKm.toFixed(1)} km away)`;
}

function MatchExplanation({ listing, recipients }: { listing: Listing; recipients: Recipient[] }) {
  const { match, candidates } = listing;
  const nameOf = (id: string) => recipients.find((r) => r.id === id)?.name ?? id;
  const others = candidates.filter((c) => c.recipientId !== match?.recipientId);
  const waiting =
    listing.status === 'expired'
      ? 'No food program and driver could make it before the pickup deadline.'
      : 'Waiting for a free driver or a program with room. SecondServe keeps trying as the evening goes on.';
  return (
    <div>
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
        {match ? `Why ${nameOf(match.recipientId)}` : 'Looking for a match'}
      </h3>
      {match ? (
        <div className="mt-2 rounded-2xl border border-leaf/40 bg-leaf/5 p-3">
          <ScoreBar score={match.score} />
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
          <h4 className="mt-4 text-xs font-semibold uppercase tracking-wide text-ink-soft">Also considered</h4>
          <ul className="mt-1 space-y-1.5 text-sm">
            {others.map((candidate) => (
              <li key={candidate.recipientId} className="rounded-xl bg-cream/70 px-3 py-2">
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{nameOf(candidate.recipientId)}</span>
                  <span className="text-xs tabular-nums text-ink-soft">
                    {candidate.eligible ? `score ${candidate.score}` : 'ruled out'}
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

type Props = {
  listing: Listing | null;
  state: AppState;
  isFollowingLatest: boolean;
};

export function ListingDetail({ listing, state, isFollowingLatest }: Props) {
  if (!listing) {
    return (
      <section className="grid min-h-[260px] place-items-center rounded-3xl border border-dashed border-line bg-paper/60 p-6 text-center">
        <div>
          <h2 className="font-display text-xl font-bold">Every match comes with reasons</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-ink-soft">
            When food is posted, you&apos;ll see which food program gets it, who was ruled out and why, and which volunteer drives it over.
          </p>
        </div>
      </section>
    );
  }
  const donor = state.donors.find((d) => d.id === listing.donorId);
  const recipient = state.recipients.find((r) => r.id === listing.match?.recipientId);
  const destination = recipient?.name ?? (listing.status === 'expired' ? "couldn't be placed" : 'finding a match…');
  return (
    <section aria-labelledby="detail-heading" className="rounded-3xl border border-line bg-paper p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ink-soft">
            {isFollowingLatest ? 'Following the latest listing' : 'Selected listing'} · posted {formatClock(listing.postedAt)}
          </p>
          <h2 id="detail-heading" className="font-display text-2xl font-bold leading-tight">
            {donor?.name ?? 'Unknown business'} <span className="text-tomato">→</span> {destination}
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceBadge source={listing.source} />
          <StatusChip status={listing.status} />
        </div>
      </div>
      <Timeline listing={listing} />
      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_1.3fr]">
        <FoodSummary listing={listing} />
        <MatchExplanation listing={listing} recipients={state.recipients} />
      </div>
    </section>
  );
}
