'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { formatClock, summarizeItems } from '@/lib/format';
import { DEMO_WEEKDAY, SCENARIO, SIM_END, SIM_START } from '@/lib/sampleData';
import { createInitialState, simulateUntil } from '@/lib/simulation';
import type { ListingStatus } from '@/lib/types';
import { isCalmMotion, MotionToggle } from './ui';

const SOURCE_LINK = 'underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-lime';

// The pickup board shows the real result of the demo evening, computed by the same simulation the
// live map runs, so every name and number on it is what you will see when you press play.
const EVENING = simulateUntil(createInitialState(DEMO_WEEKDAY, SIM_START), SIM_END, SCENARIO);
const BOARD = [...EVENING.listings]
  .sort((a, b) => a.postedAt - b.postedAt)
  .map((listing) => ({
    id: listing.id,
    time: formatClock(listing.postedAt),
    from: EVENING.donors.find((d) => d.id === listing.donorId)?.name ?? 'A local business',
    food: summarizeItems(listing.draft.items),
    lbs: listing.totalLbs,
    to: EVENING.recipients.find((r) => r.id === listing.match?.recipientId)?.name ?? 'No match in time',
    finalStatus: listing.status,
  }));

const STAGES = ['Posted', 'Matched', 'In the van', 'Delivered'] as const;
const STEP_MS = 650;
const ROW_OFFSET = 2; // ticks between rows starting
const HOLD_TICKS = 7; // how long the finished board stays up before the evening replays
const LAST_TICK = (BOARD.length - 1) * ROW_OFFSET + STAGES.length - 1 + HOLD_TICKS;

function stageLabel(tick: number, row: number, finalStatus: ListingStatus): string {
  const stage = tick - row * ROW_OFFSET;
  if (stage < 0) return 'Waiting';
  if (finalStatus === 'expired' && stage >= 1) return 'Too late';
  return STAGES[Math.min(stage, STAGES.length - 1)];
}

function usePlayhead(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((prev) => (isCalmMotion() ? LAST_TICK : prev >= LAST_TICK ? 0 : prev + 1));
    }, STEP_MS);
    return () => window.clearInterval(timer);
  }, []);
  return tick;
}

function PickupBoard() {
  const tick = usePlayhead();
  return (
    <figure className="border border-line-strong bg-surface" aria-label="Tonight's pickups in the demo evening">
      <figcaption className="flex items-center justify-between border-b border-line-strong px-4 py-3">
        <span className="label flex items-center gap-2 !text-fg">
          <span className="live-dot text-lime" /> Tonight&apos;s pickups
        </span>
        <span className="label">Saturday · Tri-Valley, CA</span>
      </figcaption>
      <div className="label grid grid-cols-[3.6rem_minmax(0,1fr)_3rem_6.2rem] gap-x-4 border-b border-line px-4 py-2 sm:grid-cols-[3.6rem_minmax(0,1.1fr)_minmax(0,1fr)_3rem_6.2rem]">
        <span>Time</span>
        <span>From</span>
        <span className="hidden sm:block">To</span>
        <span className="text-right">Lbs</span>
        <span>Status</span>
      </div>
      <ol>
        {BOARD.map((row, index) => {
          const label = stageLabel(tick, index, row.finalStatus);
          const isDone = label === 'Delivered';
          const isMoving = label === 'In the van' || label === 'Matched';
          const tone = label === 'Too late' ? 'text-red' : isDone || isMoving ? 'text-lime' : label === 'Waiting' ? 'text-faint' : 'text-fg';
          return (
            <li
              key={row.id}
              className="board-row grid grid-cols-[3.6rem_minmax(0,1fr)_3rem_6.2rem] items-baseline gap-x-4 border-b border-line px-4 py-3 last:border-b-0 sm:grid-cols-[3.6rem_minmax(0,1.1fr)_minmax(0,1fr)_3rem_6.2rem]"
              style={{ animationDelay: `${300 + index * 90}ms` } as CSSProperties}
            >
              <span className="font-mono text-sm text-muted">{row.time}</span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{row.from}</span>
                <span className="block truncate text-xs text-faint">{row.food}</span>
              </span>
              <span className="hidden min-w-0 truncate text-sm text-muted sm:block">{row.to}</span>
              <span className="font-mono text-right text-sm">{row.lbs}</span>
              <span className={`label overflow-hidden !text-[0.8rem] ${tone}`}>
                <span key={label} className="flip">
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </figure>
  );
}

const FACTS = [
  {
    value: '47.9M',
    label: "people in the U.S. lived in households that couldn't always afford enough food in 2024.",
    source: 'USDA ERS',
    href: 'https://ers.usda.gov/publications/113622',
  },
  {
    value: '2 hrs',
    label: 'is the most perishable food should sit out of the fridge, or 1 hour above 90°F.',
    source: 'USDA FSIS',
    href: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f',
  },
];

function Nav({ onShare }: { onShare: () => void }) {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-5 py-4 md:px-10">
        <a href="#top" className="display text-xl">
          SecondServe<span className="text-lime">.</span>
        </a>
        <nav aria-label="Page" className="label hidden items-center gap-8 md:flex">
          <a href="#story" className="transition-colors hover:text-lime">How it works</a>
          <a href="#live" className="transition-colors hover:text-lime">Live map</a>
          <a href="#sources" className="transition-colors hover:text-lime">Sources</a>
        </nav>
        <div className="flex items-center gap-2">
          <MotionToggle />
          <button type="button" onClick={onShare} className="btn btn-primary hidden py-2 text-sm sm:inline-flex">
            Share extra food
          </button>
        </div>
      </div>
    </header>
  );
}

export function Hero({ onShare }: { onShare: () => void }) {
  return (
    <div id="top">
      <Nav onShare={onShare} />
      <section aria-labelledby="hero-heading" className="mx-auto w-full max-w-[1320px] px-5 pb-16 pt-8 md:px-10 lg:pb-24">
        <p className="label flex flex-wrap justify-between gap-2 border-b border-line pb-3">
          <span>01 / Surplus food, matched live</span>
          <span>Dublin HacX 2026 · San Ramon, California</span>
        </p>
        <h1 id="hero-heading" className="display mt-10 text-[clamp(2.7rem,5.6vw,5.8rem)] leading-[0.95]">
          <span className="line-mask">
            <span>Good food deserves a</span>
          </span>
          <span className="line-mask">
            <span className="text-lime" style={{ animationDelay: '110ms' }}>
              second serving.
            </span>
          </span>
        </h1>
        <div className="mt-10 grid grid-cols-1 gap-x-10 gap-y-12 lg:grid-cols-12">
          <div className="animate-fade-in lg:col-span-4 [animation-delay:350ms]">
            <p className="max-w-[40ch] text-lg leading-relaxed text-muted">
              When bakeries, grocers and restaurants close for the night, good food is often still on the shelves. A business types one sentence. SecondServe
              finds the food bank that can use it and a volunteer driver who can get there in time.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#live" className="btn btn-primary px-6 py-3 text-base">
                Watch a live evening
              </a>
              <a href="#story" className="btn btn-glass px-6 py-3 text-base">
                How it works
              </a>
            </div>
          </div>
          <div className="lg:col-span-8">
            <PickupBoard />
          </div>
        </div>
      </section>
      <section aria-label="Why it matters" className="border-y border-line">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 px-5 md:px-10 lg:grid-cols-12">
          <div className="border-line py-10 lg:col-span-5 lg:border-r lg:pr-10">
            <p className="display text-[clamp(4.5rem,10vw,9rem)] leading-[0.85] text-lime">29%</p>
            <p className="mt-5 max-w-[34ch] text-lg leading-relaxed">of the U.S. food supply went unsold or uneaten in 2024.</p>
            <a className={`label mt-3 inline-block ${SOURCE_LINK}`} href="https://refed.org/food-waste/the-problem/" target="_blank" rel="noopener noreferrer">
              Source: ReFED
            </a>
          </div>
          <ul className="divide-y divide-line lg:col-span-7 lg:pl-10">
            {FACTS.map((fact) => (
              <li key={fact.value} className="grid grid-cols-1 items-baseline gap-x-8 gap-y-2 py-8 sm:grid-cols-[11rem_minmax(0,1fr)]">
                <p className="display text-5xl">{fact.value}</p>
                <div>
                  <p className="max-w-[46ch] leading-relaxed text-muted">{fact.label}</p>
                  <a className={`label mt-2 inline-block ${SOURCE_LINK}`} href={fact.href} target="_blank" rel="noopener noreferrer">
                    Source: {fact.source}
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
