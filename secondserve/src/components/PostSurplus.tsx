'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { z } from 'zod';
import { CATEGORY_LABEL, describeItem, formatClock, parseHHMM, round1 } from '@/lib/format';
import { distanceKm } from '@/lib/geo';
import { builtinParse, ListingDraftSchema } from '@/lib/parseListing';
import { reverseGeocode, searchPlace, type FoundPlace } from '@/lib/places';
import { centerOf } from '@/lib/relocate';
import type { NewListingInput } from '@/lib/simulation';
import { STORAGE_TYPES, type Donor, type DonorKind, type LatLng, type ListingDraft } from '@/lib/types';
import { currentPosition } from './AreaPicker';
import { DietaryTags, Icon, SourceBadge, STORAGE_LABEL } from './ui';

const ParseResponseSchema = z.object({
  source: z.enum(['ai', 'builtin']),
  draft: ListingDraftSchema,
  note: z.string().optional(),
});
type ParsedResult = z.infer<typeof ParseResponseSchema>;

const EXAMPLES = [
  {
    label: 'Bagels and pasta',
    text: 'we have about 30 bagels, 2 big trays of chicken alfredo pasta that need to stay cold, and a box of bananas. pick up before 9pm please',
  },
  {
    label: 'Wedding leftovers',
    text: 'Leftover from a wedding tonight: 5 trays of vegetable biryani, still hot, and 60 dinner rolls. Need it gone by 10pm.',
  },
  {
    label: 'Grocery overstock',
    text: '3 cases of yogurt and 2 crates of apples close to their sell-by date, fridge needed, before 8:30',
  },
];

const FIELD = 'field mt-1 block w-full px-3 py-2 font-normal';

function readError(data: unknown): string {
  const message = (data as { error?: unknown } | null)?.error;
  return typeof message === 'string' ? message : 'Something went wrong. Try again.';
}

type EditorProps = {
  result: ParsedResult;
  now: number;
  onChange: (patch: Partial<ListingDraft>) => void;
};

function DraftEditor({ result, now, onChange }: EditorProps) {
  const { draft } = result;
  const pickupMin = parseHHMM(draft.pickupBy);
  const total = round1(draft.items.reduce((sum, item) => sum + item.estimatedLbs, 0));
  const setLbs = (index: number, lbs: number) =>
    onChange({ items: draft.items.map((item, i) => (i === index ? { ...item, estimatedLbs: lbs } : item)) });
  return (
    <div className="animate-sheet-in mt-5 rounded-[18px] bg-white/[0.03] p-4 ring-1 ring-inset ring-line">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Check the details</h3>
        <SourceBadge source={result.source} />
      </div>
      {result.note && <p className="mt-1 text-xs text-muted">{result.note}</p>}
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[14px] bg-white/[0.03] text-sm ring-1 ring-inset ring-line">
        {draft.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <span>
              {describeItem(item)} <span className="text-muted">· {CATEGORY_LABEL[item.category]}</span>
            </span>
            <span className="shrink-0">
              <input
                type="number"
                min={0.1}
                step={0.5}
                value={item.estimatedLbs}
                onChange={(event) => {
                  const lbs = Number(event.target.value);
                  if (Number.isFinite(lbs) && lbs > 0) setLbs(index, lbs);
                }}
                aria-label={`Weight of ${item.name} in pounds`}
                className="field w-20 px-2 py-1 text-right tabular-nums"
              />{' '}
              lbs
            </span>
          </li>
        ))}
        <li className="flex justify-between px-3 py-2 font-bold">
          <span>Total (estimated)</span>
          <span className="tabular-nums">{total} lbs</span>
        </li>
      </ul>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          How it should be kept
          <select
            value={draft.storage}
            onChange={(event) => {
              const storage = STORAGE_TYPES.find((s) => s === event.target.value);
              if (storage) onChange({ storage });
            }}
            className={FIELD}
          >
            {STORAGE_TYPES.map((s) => (
              <option key={s} value={s}>
                {STORAGE_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm font-semibold">
          Pick up by
          <input
            type="time"
            value={draft.pickupBy ?? ''}
            onChange={(event) => onChange({ pickupBy: event.target.value || null })}
            className={FIELD}
          />
          {pickupMin !== null && pickupMin <= now && (
            <span className="mt-1 block text-xs font-semibold text-red">That time has already passed (it&apos;s {formatClock(now)}).</span>
          )}
          {pickupMin === null && <span className="mt-1 block text-xs font-normal text-muted">No time given, so we&apos;ll allow 2 hours.</span>}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <DietaryTags dietary={draft.dietary} />
      </div>
      <p className="mt-2 text-xs text-muted">Allergens are spotted automatically from your description. Please double-check them.</p>
      {draft.notes && <p className="mt-2 text-sm text-muted">“{draft.notes}”</p>}
    </div>
  );
}

// ---------- Adding your own business ----------

const NEW_BUSINESS = '__new';
const FAR_KM = 40; // farther than this from the demo's food banks, a match is unlikely
const LOOKUP_TIMEOUT_MS = 10000;

const KIND_OPTIONS: Array<[DonorKind, string]> = [
  ['restaurant', 'Restaurant'],
  ['bakery', 'Bakery'],
  ['grocery', 'Grocery store'],
  ['cafe', 'Café'],
  ['caterer', 'Caterer'],
  ['cafeteria', 'School or office cafeteria'],
];

type NewBusiness = {
  name: string;
  kind: DonorKind;
  location: LatLng | null;
  city: string;
  label: string;
};

const EMPTY_BUSINESS: NewBusiness = { name: '', kind: 'restaurant', location: null, city: '', label: '' };

type NewBusinessProps = {
  value: NewBusiness;
  near: LatLng;
  onChange: (next: NewBusiness) => void;
};

function NewBusinessFields({ value, near, onChange }: NewBusinessProps) {
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<{ isError: boolean; text: string } | null>(null);
  const [isFinding, setIsFinding] = useState(false);

  async function locate(find: () => Promise<FoundPlace | null>, notFound: string) {
    setIsFinding(true);
    setStatus({ isError: false, text: 'Looking it up…' });
    try {
      const found = await find();
      if (!found) {
        setStatus({ isError: true, text: notFound });
        return;
      }
      onChange({ ...value, location: found.center, city: found.areaName.split(',')[0].trim(), label: found.label });
      const km = distanceKm(found.center, near);
      setStatus(
        km > FAR_KM
          ? {
              isError: true,
              text: `Found ${found.label}, but it's about ${Math.round(km)} km from this demo's food banks. Move the demo to your town first with "Try it in your own town" so we can find a match.`,
            }
          : { isError: false, text: `Found it: ${found.label}` },
      );
    } catch (error: unknown) {
      setStatus({ isError: true, text: error instanceof Error ? error.message : 'Something went wrong. Try again.' });
    } finally {
      setIsFinding(false);
    }
  }

  function handleFind() {
    const query = address.trim();
    if (query.length < 3) {
      setStatus({ isError: true, text: 'Type a street address or place name.' });
      return;
    }
    void locate(() => searchPlace(query, AbortSignal.timeout(LOOKUP_TIMEOUT_MS), near), `We couldn't find "${query}". Try adding the city.`);
  }

  function handleUseHere() {
    void locate(
      async () => reverseGeocode(await currentPosition(), AbortSignal.timeout(LOOKUP_TIMEOUT_MS)),
      "We couldn't name where you are. Try typing the address instead.",
    );
  }

  return (
    <div className="animate-sheet-in mt-3 grid gap-3 rounded-[18px] bg-white/[0.03] p-4 ring-1 ring-inset ring-line sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Business name
        <input
          value={value.name}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          maxLength={60}
          placeholder="For example: Rosa's Panaderia"
          className={FIELD}
        />
      </label>
      <label className="text-sm font-semibold">
        What kind of place
        <select
          value={value.kind}
          onChange={(event) => {
            const kind = KIND_OPTIONS.find(([k]) => k === event.target.value)?.[0];
            if (kind) onChange({ ...value, kind });
          }}
          className={FIELD}
        >
          {KIND_OPTIONS.map(([kind, label]) => (
            <option key={kind} value={kind}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <div className="sm:col-span-2">
        <label htmlFor="business-address" className="text-sm font-semibold">
          Where is it?
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id="business-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                handleFind();
              }
            }}
            maxLength={160}
            placeholder="Street address, like 123 Main St, Dublin, CA"
            className="field min-w-0 flex-1 px-3 py-2"
          />
          <button type="button" onClick={handleFind} disabled={isFinding} className="btn btn-light shrink-0">
            {isFinding ? 'Finding…' : 'Find it'}
          </button>
        </div>
        <button
          type="button"
          onClick={handleUseHere}
          disabled={isFinding}
          className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-cyan underline-offset-4 hover:underline disabled:opacity-60"
        >
          <Icon name="locate" className="h-4 w-4" />
          Use where I am now
        </button>
        {status && (
          <p role="status" className={`mt-2 text-sm ${status.isError ? 'font-semibold text-red' : 'text-mint'}`}>
            {status.text}
          </p>
        )}
      </div>
    </div>
  );
}

type Props = {
  donors: Donor[];
  now: number;
  onClose: () => void;
  onPost: (input: NewListingInput, newDonor?: Donor) => void;
};

export function PostSurplus({ donors, now, onClose, onPost }: Props) {
  const [donorId, setDonorId] = useState(donors[0]?.id ?? '');
  const [newBusiness, setNewBusiness] = useState<NewBusiness>(EMPTY_BUSINESS);
  const near = useMemo(() => centerOf(donors.map((d) => d.location)), [donors]);
  const isNewBusiness = donorId === NEW_BUSINESS;
  const isBusinessReady = !isNewBusiness || (newBusiness.name.trim().length >= 2 && newBusiness.location !== null);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ParsedResult | null>(null);
  const titleId = useId();

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  async function handleOrganize() {
    const trimmed = text.trim();
    if (!trimmed) {
      setError('Describe the food first.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: trimmed }),
      });
      const data: unknown = await response.json().catch(() => null);
      if (response.status === 400) {
        setError(readError(data));
        return;
      }
      const parsed = ParseResponseSchema.safeParse(data);
      setResult(
        parsed.success
          ? parsed.data
          : { source: 'builtin', draft: builtinParse(trimmed), note: "We organized this without AI because the AI's answer didn't come through. Please double-check it." },
      );
    } catch {
      setResult({ source: 'builtin', draft: builtinParse(trimmed), note: "We couldn't reach the AI, so we organized this without it. Please double-check it." });
    } finally {
      setIsLoading(false);
    }
  }

  function handleShare() {
    if (!result) return;
    const input = { draft: result.draft, source: result.source };
    if (!isNewBusiness) {
      onPost({ donorId, ...input });
      return;
    }
    if (!newBusiness.location) return;
    const donor: Donor = {
      id: `d-own-${Date.now().toString(36)}`,
      name: newBusiness.name.trim(),
      kind: newBusiness.kind,
      city: newBusiness.city || 'Your town',
      location: newBusiness.location,
    };
    onPost({ donorId: donor.id, ...input }, donor);
  }

  function handleTextChange(value: string) {
    setText(value);
    setResult(null);
    setError(null);
  }

  const updateDraft = (patch: Partial<ListingDraft>) =>
    setResult((prev) => (prev ? { ...prev, draft: { ...prev.draft, ...patch } } : prev));

  return (
    <div
      className="animate-fade-in fixed inset-0 z-[2000] grid place-items-center bg-bg/70 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="card animate-sheet-in max-h-[92vh] w-full max-w-2xl overflow-y-auto !rounded-[26px] p-6 shadow-[0_40px_120px_-30px_oklch(0.73_0.17_295/0.45)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-2xl font-semibold tracking-[-0.03em]">
              Share extra food
            </h2>
            <p className="text-sm text-muted">Tell us what&apos;s left, the way you&apos;d text a friend. We&apos;ll turn it into a post a food bank can act on.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl leading-none text-muted hover:text-fg">
            ×
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          Your business
          <select value={donorId} onChange={(event) => setDonorId(event.target.value)} className={FIELD}>
            <option value={NEW_BUSINESS}>+ Add your own business</option>
            {donors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.street ? `${d.street}, ` : ''}{d.city})
              </option>
            ))}
          </select>
        </label>
        {!isNewBusiness && (
          <button
            type="button"
            onClick={() => setDonorId(NEW_BUSINESS)}
            className="mt-1.5 text-sm font-semibold text-cyan underline-offset-4 hover:underline"
          >
            Not on the list? Add your business
          </button>
        )}
        {isNewBusiness && <NewBusinessFields value={newBusiness} near={near} onChange={setNewBusiness} />}
        <label className="mt-3 block text-sm font-semibold">
          What food do you have?
          <textarea
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            rows={4}
            maxLength={1000}
            autoFocus
            placeholder="For example: 2 trays of veggie lasagna and 20 rolls, pick up by 9"
            className={FIELD}
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => handleTextChange(example.text)}
              className="rounded-full bg-white/[0.04] px-3 py-1 font-medium text-muted ring-1 ring-line-strong transition hover:bg-white/10 hover:text-fg"
            >
              Try: {example.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleOrganize}
          disabled={isLoading}
          className="btn btn-ai mt-4"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-bg/30 border-t-bg" />
              Organizing…
            </span>
          ) : (
            <>
              <Icon name="sparkle" className="h-4 w-4" />
              Read it for me
            </>
          )}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-red">
            {error}
          </p>
        )}
        {result && <DraftEditor result={result} now={now} onChange={updateDraft} />}
        <div className="mt-6 flex flex-wrap items-center justify-end gap-2 border-t border-line pt-4">
          {isNewBusiness && !isBusinessReady && (
            <p className="mr-auto text-xs text-muted">Add your business name and find its address to share.</p>
          )}
          <button type="button" onClick={onClose} className="btn btn-glass">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={!result || !isBusinessReady}
            className="btn btn-primary"
          >
            Share it
          </button>
        </div>
      </div>
    </div>
  );
}
