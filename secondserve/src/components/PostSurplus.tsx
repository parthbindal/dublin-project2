'use client';

import { useEffect, useId, useState } from 'react';
import { z } from 'zod';
import { CATEGORY_LABEL, describeItem, formatClock, parseHHMM, round1 } from '@/lib/format';
import { builtinParse, ListingDraftSchema } from '@/lib/parseListing';
import type { NewListingInput } from '@/lib/simulation';
import { STORAGE_TYPES, type Donor, type ListingDraft } from '@/lib/types';
import { DietaryTags, SourceBadge, STORAGE_LABEL } from './ui';

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
    <div className="animate-sheet-in mt-5 rounded-[4px] border border-line bg-linen/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Check the details</h3>
        <SourceBadge source={result.source} />
      </div>
      {result.note && <p className="mt-1 text-xs text-ink-soft">{result.note}</p>}
      <ul className="mt-3 divide-y divide-line rounded-[4px] border border-line bg-paper text-sm">
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
            <span className="mt-1 block text-xs font-semibold text-tomato">That time has already passed (it&apos;s {formatClock(now)}).</span>
          )}
          {pickupMin === null && <span className="mt-1 block text-xs font-normal text-ink-soft">No time given, so we&apos;ll allow 2 hours.</span>}
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <DietaryTags dietary={draft.dietary} />
      </div>
      <p className="mt-2 text-xs text-ink-soft">Allergens are spotted automatically from your description. Please double-check them.</p>
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
          : { source: 'builtin', draft: builtinParse(trimmed), note: "We organized this without AI because the AI's answer didn't come through. Please double-check it." },
      );
    } catch {
      setResult({ source: 'builtin', draft: builtinParse(trimmed), note: "We couldn't reach the AI, so we organized this without it. Please double-check it." });
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
      className="animate-fade-in fixed inset-0 z-[2000] grid place-items-center bg-ink/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="animate-sheet-in max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[6px] border-[1.5px] border-ink bg-paper p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="font-display text-2xl font-bold">
              Share extra food
            </h2>
            <p className="text-sm text-ink-soft">Tell us what&apos;s left, the way you&apos;d text a friend. We&apos;ll turn it into a post a food bank can act on.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-full px-2 text-2xl leading-none text-ink-soft hover:text-ink">
            ×
          </button>
        </div>
        <label className="mt-4 block text-sm font-semibold">
          Your business
          <select value={donorId} onChange={(event) => setDonorId(event.target.value)} className={FIELD}>
            {donors.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.street ? `${d.street}, ` : ''}{d.city})
              </option>
            ))}
          </select>
        </label>
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
              className="rounded-full bg-cream px-3 py-1 font-medium text-ink-soft ring-1 ring-line transition hover:text-ink"
            >
              Try: {example.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleOrganize}
          disabled={isLoading}
          className="btn btn-ink mt-4"
        >
          {isLoading ? (
            <span className="inline-flex items-center gap-2">
              <span aria-hidden className="h-4 w-4 animate-spin rounded-full border-2 border-paper/40 border-t-paper" />
              Organizing…
            </span>
          ) : (
            'Read it for me'
          )}
        </button>
        {error && (
          <p role="alert" className="mt-2 text-sm font-semibold text-tomato">
            {error}
          </p>
        )}
        {result && <DraftEditor result={result} now={now} onChange={updateDraft} />}
        <div className="mt-6 flex justify-end gap-2 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="btn btn-quiet">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => result && onPost({ donorId, draft: result.draft, source: result.source })}
            disabled={!result}
            className="btn btn-primary"
          >
            Share it
          </button>
        </div>
      </div>
    </div>
  );
}
