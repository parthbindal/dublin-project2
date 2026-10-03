'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeImpact, toComplianceCsv } from '@/lib/impact';
import { predictSurplus } from '@/lib/prediction';
import { DEFAULT_NETWORK, type Network } from '@/lib/relocate';
import { DEMO_WEEKDAY, HISTORY, HISTORY_WEEKS, SCENARIO, SIM_END, SIM_START } from '@/lib/sampleData';
import { createInitialState, logEvent, postListing, simulateUntil, type NewListingInput } from '@/lib/simulation';
import type { AppState } from '@/lib/types';
import { ActivityLog } from './ActivityLog';
import { AreaPicker } from './AreaPicker';
import { ControlBar } from './Header';
import { EveningSummary, Toasts } from './Highlights';
import { ImpactStrip } from './ImpactStrip';
import { ListingDetail } from './ListingDetail';
import { LiveFeed } from './LiveFeed';
import { PostSurplus } from './PostSurplus';
import { PredictionsPanel } from './PredictionsPanel';
import { ScrollStory } from './ScrollStory';
import { MotionToggle } from './ui';

// Leaflet needs the browser, so the map only renders on the client.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-soft">Unfolding the map…</div>,
});

const TICK_MS = 500;
const SPEEDS = [1, 2, 4] as const; // simulated minutes per tick
const SOURCE_LINK = 'underline decoration-terracotta/60 underline-offset-2 hover:decoration-terracotta';

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Masthead({ onShare }: { onShare: () => void }) {
  return (
    <header className="mx-auto w-full max-w-[1400px] px-5 pt-5 md:px-10">
      <div className="flex items-center justify-between gap-4 border-b-[1.5px] border-ink pb-3">
        <p className="font-display text-2xl font-semibold">
          Second<span className="text-terracotta">Serve</span>
        </p>
        <nav aria-label="Page" className="flex items-center gap-5 text-sm">
          <a href="#live" className="hidden underline-offset-4 hover:underline sm:inline">
            Watch a live evening
          </a>
          <MotionToggle />
          <button type="button" onClick={onShare} className="btn btn-primary !py-1.5 text-sm">
            Share extra food
          </button>
        </nav>
      </div>
      <div className="grid gap-8 pb-4 pt-12 md:grid-cols-[1.5fr_1fr] md:items-end md:pt-20">
        <h1 className="animate-reveal font-display text-[clamp(2.7rem,7.4vw,6.4rem)] font-semibold leading-[0.93] tracking-[-0.02em]">
          Good food deserves a <span className="italic text-terracotta">second</span> serving.
        </h1>
        <div className="max-w-[46ch]">
          <p className="text-lg leading-relaxed">
            When bakeries, grocers and restaurants close for the night, good food is often still on the shelves. SecondServe gets it to the food bank down the
            street before it&apos;s thrown away.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-ink-soft">
            In 2024, 29% of the U.S. food supply went unsold or uneaten (
            <a className={SOURCE_LINK} href="https://refed.org/food-waste/the-problem/" target="_blank" rel="noopener noreferrer">
              ReFED
            </a>
            ), while 47.9 million people lived in households that couldn&apos;t always afford enough food (
            <a className={SOURCE_LINK} href="https://ers.usda.gov/publications/113622" target="_blank" rel="noopener noreferrer">
              USDA
            </a>
            ).
          </p>
          <p className="eyebrow mt-6 flex items-center gap-2">
            Scroll to follow one bakery&apos;s bread <span aria-hidden className="animate-bob">↓</span>
          </p>
        </div>
      </div>
    </header>
  );
}

function MapLegend() {
  const dot = 'inline-block h-3 w-3 rounded-full border-[1.5px] border-paper shadow-[0_0_0_1px_var(--ink)]';
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] space-y-1 rounded-[4px] border-[1.5px] border-ink bg-paper px-3 py-2 text-xs">
      <div className="flex items-center gap-2"><span className={`${dot} bg-terracotta`} />Business with extra food</div>
      <div className="flex items-center gap-2"><span className={`${dot} bg-sage-deep`} />Food bank or shelter</div>
      <div className="flex items-center gap-2"><span className={`${dot} bg-honey`} />Volunteer driver</div>
      <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-dashed border-honey" />Driving to pick up</div>
      <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-dusk" />Delivering</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mx-auto w-full max-w-[1400px] space-y-1.5 border-t-[1.5px] border-ink px-5 py-6 text-xs leading-relaxed text-ink-soft md:px-10">
      <p>
        This is a demo. The businesses, food banks and volunteers are made up. The map, the streets, the road routes and the AI are real.
      </p>
      <p>
        Sources:{' '}
        <a className={SOURCE_LINK} href="https://calrecycle.ca.gov/organics/slcp/foodrecovery/donors/" target="_blank" rel="noopener noreferrer">
          CalRecycle, SB 1383 food donation rules
        </a>
        {' · '}
        <a className={SOURCE_LINK} href="https://www.feedingamerica.org/ways-to-give/faq/about-our-claims" target="_blank" rel="noopener noreferrer">
          Feeding America, about 1.2 lbs of food per meal
        </a>
        {' · '}
        <a
          className={SOURCE_LINK}
          href="https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f"
          target="_blank"
          rel="noopener noreferrer"
        >
          USDA, the 2-hour food safety rule
        </a>
        {' · '}
        <a className={SOURCE_LINK} href="https://refed.org/food-waste/the-problem/" target="_blank" rel="noopener noreferrer">
          ReFED, food waste
        </a>
        {' · '}
        <a className={SOURCE_LINK} href="https://ers.usda.gov/publications/113622" target="_blank" rel="noopener noreferrer">
          USDA ERS, food security in 2024
        </a>
        . Map data ©{' '}
        <a className={SOURCE_LINK} href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">
          OpenStreetMap contributors
        </a>
        . Place search by Nominatim. Road routes by OSRM.
      </p>
      <p>Made with care at Dublin HacX 2026.</p>
    </footer>
  );
}

export default function Dashboard() {
  const [network, setNetwork] = useState<Network>(DEFAULT_NETWORK);
  const [state, setState] = useState<AppState>(() => createInitialState(DEMO_WEEKDAY, SIM_START));
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(2);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  const isFinished = state.now >= SIM_END;
  const isRunning = isPlaying && !isFinished;

  useEffect(() => {
    if (!isRunning) return undefined;
    const timer = window.setInterval(() => {
      setState((prev) => simulateUntil(prev, Math.min(SIM_END, prev.now + speed), SCENARIO));
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [isRunning, speed]);

  const impact = useMemo(() => computeImpact(state.listings), [state.listings]);
  const predictions = useMemo(() => predictSurplus(HISTORY, state.weekday, HISTORY_WEEKS), [state.weekday]);
  const selected = state.listings.find((l) => l.id === selectedId) ?? null;
  const shown = selected ?? state.listings[0] ?? null;

  const handlePost = useCallback((input: NewListingInput) => {
    const id = `u${Date.now().toString(36)}`;
    setState((prev) => postListing(prev, { ...input, id }));
    setSelectedId(id);
    setIsPosting(false);
  }, []);

  const handleHeadsUp = useCallback((text: string) => setState((prev) => logEvent(prev, 'predict', text)), []);
  const closePosting = useCallback(() => setIsPosting(false), []);
  const openPosting = useCallback(() => setIsPosting(true), []);

  function startOver(nextNetwork: Network, shouldPlay: boolean) {
    setNetwork(nextNetwork);
    setSelectedId(null);
    setState(createInitialState(DEMO_WEEKDAY, SIM_START, nextNetwork));
    setIsPlaying(shouldPlay);
  }

  function handleExport() {
    const csv = toComplianceCsv(state.listings, state.donors, state.recipients, `Saturday demo, ${state.areaName}`);
    downloadCsv('secondserve-donation-records.csv', csv);
  }

  return (
    <main className="flex min-h-screen flex-col">
      <Masthead onShare={openPosting} />
      <ScrollStory />
      <section id="live" aria-labelledby="live-heading" className="mx-auto w-full max-w-[1400px] scroll-mt-2 px-5 pb-10 md:px-10">
        <div className="grid gap-6 pb-6 pt-10 md:grid-cols-[1.2fr_1fr] md:items-end">
          <div>
            <p className="eyebrow">A whole evening, live</p>
            <h2 id="live-heading" className="mt-2 font-display text-[clamp(2rem,4.6vw,3.7rem)] font-semibold leading-none">
              Tonight in {state.areaName}
            </h2>
            <p className="mt-3 max-w-[54ch] leading-relaxed text-ink-soft">
              Six local food businesses, five food programs and three volunteer drivers. Press play and watch good food find its way to people, one post at a time.
            </p>
          </div>
          <AreaPicker areaName={state.areaName} onChange={(next) => startOver(next, false)} />
        </div>
        <ControlBar
          now={state.now}
          weekday={state.weekday}
          areaName={state.areaName}
          isRunning={isRunning}
          isFinished={isFinished}
          speed={speed}
          speeds={SPEEDS}
          onToggleRun={() => setIsPlaying((prev) => !prev)}
          onSpeedChange={setSpeed}
          onReset={() => startOver(network, false)}
          onPost={openPosting}
          onExport={handleExport}
        />
        <div className="mt-6 space-y-6">
          {isFinished && (
            <EveningSummary impact={impact} areaName={state.areaName} onReplay={() => startOver(network, true)} onExport={handleExport} />
          )}
          <ImpactStrip impact={impact} />
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
            <section aria-label="Map" className="relative h-[480px] overflow-hidden rounded-[6px] border-[1.5px] border-ink lg:h-[580px]">
              <MapView state={state} selectedId={shown?.id ?? null} onSelect={setSelectedId} />
              <MapLegend />
            </section>
            <LiveFeed
              listings={state.listings}
              donors={state.donors}
              recipients={state.recipients}
              selectedId={shown?.id ?? null}
              onSelect={setSelectedId}
            />
          </div>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
            <ListingDetail listing={shown} state={state} isFollowingLatest={selected === null} />
            <div className="flex flex-col gap-8">
              <PredictionsPanel predictions={predictions} donors={state.donors} weekday={state.weekday} onHeadsUp={handleHeadsUp} />
              <ActivityLog events={state.events} />
            </div>
          </div>
        </div>
      </section>
      <Footer />
      <Toasts events={state.events} now={state.now} />
      {isPosting && <PostSurplus donors={state.donors} now={state.now} onClose={closePosting} onPost={handlePost} />}
    </main>
  );
}
