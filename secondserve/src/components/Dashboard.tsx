'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeImpact, toComplianceCsv } from '@/lib/impact';
import { predictSurplus } from '@/lib/prediction';
import { DEMO_WEEKDAY, HISTORY, HISTORY_WEEKS, SCENARIO, SIM_END, SIM_START } from '@/lib/sampleData';
import { createInitialState, logEvent, postListing, simulateUntil, type NewListingInput } from '@/lib/simulation';
import type { AppState } from '@/lib/types';
import { ActivityLog } from './ActivityLog';
import { Header } from './Header';
import { ImpactStrip } from './ImpactStrip';
import { ListingDetail } from './ListingDetail';
import { LiveFeed } from './LiveFeed';
import { PostSurplus } from './PostSurplus';
import { PredictionsPanel } from './PredictionsPanel';

// Leaflet needs the browser, so the map only renders on the client.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-ink-soft">Loading map…</div>,
});

const TICK_MS = 500;
const SPEEDS = [1, 2, 4] as const; // simulated minutes per tick

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 z-[500] space-y-1 rounded-2xl bg-paper/95 px-3 py-2 text-xs shadow-md ring-1 ring-line">
      <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-tomato" />Business with surplus</div>
      <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-leaf" />Food program</div>
      <div className="flex items-center gap-2"><span className="inline-block h-3 w-3 rounded-full bg-mustard" />Volunteer driver</div>
      <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-dashed border-mustard" />Driving to pickup</div>
      <div className="flex items-center gap-2"><span className="inline-block w-5 border-t-2 border-sky" />Delivering</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="space-y-1 pb-6 text-xs text-ink-soft">
      <p>All businesses, food programs and volunteers shown are fictional sample data for this demo.</p>
      <p>
        Sources:{' '}
        <a className="underline" href="https://calrecycle.ca.gov/organics/slcp/" target="_blank" rel="noopener noreferrer">
          CalRecycle, SB 1383 organic waste and edible food recovery
        </a>
        {' · '}
        <a className="underline" href="https://www.feedingamerica.org/ways-to-give/faq/about-our-claims" target="_blank" rel="noopener noreferrer">
          Feeding America, 1.2 lbs per meal
        </a>
        . Map © OpenStreetMap contributors. Routes by OSRM.
      </p>
      <p>Built at Dublin HacX 2026.</p>
    </footer>
  );
}

export default function Dashboard() {
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

  function handleReset() {
    setIsPlaying(false);
    setSelectedId(null);
    setState(createInitialState(DEMO_WEEKDAY, SIM_START));
  }

  function handleExport() {
    downloadCsv('secondserve-sb1383-log.csv', toComplianceCsv(state.listings, state.donors, state.recipients, 'Saturday (demo)'));
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-[1500px] flex-col gap-4 px-4 py-4 lg:px-6">
      <Header
        now={state.now}
        weekday={state.weekday}
        isRunning={isRunning}
        isFinished={isFinished}
        speed={speed}
        speeds={SPEEDS}
        onToggleRun={() => setIsPlaying((prev) => !prev)}
        onSpeedChange={setSpeed}
        onReset={handleReset}
        onPost={() => setIsPosting(true)}
        onExport={handleExport}
      />
      <ImpactStrip impact={impact} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <section aria-label="Map" className="relative h-[460px] overflow-hidden rounded-3xl border border-line bg-paper shadow-sm lg:h-[560px]">
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
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]">
        <ListingDetail listing={shown} state={state} isFollowingLatest={selected === null} />
        <div className="flex flex-col gap-4">
          <PredictionsPanel predictions={predictions} donors={state.donors} weekday={state.weekday} onHeadsUp={handleHeadsUp} />
          <ActivityLog events={state.events} />
        </div>
      </div>
      <Footer />
      {isPosting && <PostSurplus donors={state.donors} now={state.now} onClose={closePosting} onPost={handlePost} />}
    </div>
  );
}
