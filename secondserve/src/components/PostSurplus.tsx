'use client';

import { useEffect, useId, useState } from 'react';
import { z } from 'zod';
import { CATEGORY_LABEL, describeItem, formatClock, parseHHMM, round1 } from '@/lib/format';
import { builtinParse, ListingDraftSchema } from '@/lib/parseListing';
import type { NewListingInput } from '@/lib/simulation';
import { STORAGE_TYPES, type Donor, type ListingDraft } from '@/lib/types';
import { dietaryTags, DONOR_EMOJI, SourceBadge, STORAGE_LABEL, Tag } from './ui';

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
    label: 'Event leftovers',
    text: 'Leftover from a wedding tonight: 5 trays of vegetable biryani, still hot, and 60 dinner rolls. Need it gone by 10pm.',
  },
  {
    label: 'Grocery overstock',
    text: '3 cases of yogurt and 2 crates of apples close to their sell-by date, fridge needed, before 8:30',
  },
];

const FIELD = 'mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 font-normal';

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
    <div className="mt-5 rounded-2xl border border-line bg-cream/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Check the listing</h3>
        <SourceBadge source={result.source} />
      </div>
      {result.note && <p className="mt-1 text-xs text-ink-soft">{result.note}</p>}
      <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-paper text-sm">
        {draft.items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 px-3 py-2">
            <span>
              {describeItem(item)} <span className="text-ink-soft">· {CATEGORY_LABEL[item.category]}</span>
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
                className="w-20 rounded-lg border border-line px-2 py-1 text-right tabular-nums"
              />{' '}
              lbs
            </span>
          </li>
        ))}
        <li className="flex justify-between px-3 py-2 font-bold">
          <span>Total</span>
          <span className="tabular-nums">{total} lbs</span>
        </li>
      </ul>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold">
          Storage
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
            <span className="mt-1 block text-xs font-semibold text-tomato">That time has passed (it&apos;s {formatClock(now)}).</span>
          )}
          {pickupMin === null && <span className="mt-1 block text-xs font-normal text-ink-soft">No time given, so we&apos;ll allow 2 hours.</span>}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {dietaryTags(draft.dietary).map((tag) => (
          <Tag key={tag} isWarning={tag === 'Contains nuts'}>
            {tag}
          </Tag>
        ))}
      </div>
      {draft.notes && <p className="mt-2 text-sm text-ink-soft">“{draft.notes}”</p>}
    </div>
  );
}

type Props = {
  donors: Donor[];
  now: number;
  onClose: () => void;
  onPost: (input: NewListingInput) => void;
};

export function PostSurplus({ donors, now, onClose, onPost }: Props) {
  const [donorId, setDonorId] = useState(donors[0]?.id ?? '');
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
          : { source: 'builtin', draft: builtinParse(trimmed), note: 'The server reply was unusable, so the built-in parser organized it.' },
      );
    } catch {
      setResult({ source: 'builtin', draft: builtinParse(trimmed), note: "Couldn't reach the server, so the built-in parser organized it." });
    } finally {
      setIsLoading(false);
    }
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
      className="fixed inset-0 z-[2000] grid place-items-center bg-ink/55 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-paper p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-2xl font-bold">
              Post surplus food
            </h2>
            <p className="text-sm text-ink-soft">Describe it like you&apos;d text a friend. AI turns it into a listing food programs can act on.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl leading-none text-ink-soft hover:text-ink">
            ×
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          Business
          <select value={donorId} onChange={(event) => setDonorId(event.target.value)} className={FIELD}>
            {donors.map((d) => (
              <option key={d.id} value={d.id}>
                {DONOR_EMOJI[d.kind]} {d.name} ({d.city})
              </option>
            ))}
          </select>
        </label>
        <label className="mt-3 block text-sm font-semibold">
          What do you have?
          <textarea
            value={text}
            onChange={(event) => handleTextChange(event.target.value)}
            rows={4}
            maxLength={1000}
            autoFocus
            placeholder="e.g. 2 trays of veggie lasagna and 20 rolls, pick up by 9"
            className={FIELD}
          />
        </label>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          {EXAMPLES.map((example) => (
            <button
              key={example.label}
              type="button"
              onClick={() => handleTextChange(example.text)}
              className="rounded-full bg-cream px-3 py-1 font-medium text-ink-soft ring-1 ring-line hover:text-ink"
            >
              Try: {example.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleOrganize}
          disabled={isLoading}
          className="mt-4 rounded-full bg-plum px-5 py-2.5 font-semibold text-paper shadow transition hover:brightness-110 disabled:opacity-60"
        >
          {isLoading ? 'Organizing…' : '✨ Organize with AI'}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-tomato">
            {error}
          </p>
        )}
        {result && <DraftEditor result={result} now={now} onChange={updateDraft} />}
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="rounded-full px-4 py-2 text-sm ring-1 ring-line hover:bg-cream">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => result && onPost({ donorId, draft: result.draft, source: result.source })}
            disabled={!result}
            className="rounded-full bg-tomato px-5 py-2 font-semibold text-paper shadow transition hover:brightness-110 disabled:opacity-50"
          >
            Post and find a match
          </button>
        </div>
      </div>
    </div>
  );
}
