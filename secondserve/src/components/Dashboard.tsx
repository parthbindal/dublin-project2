'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { computeImpact, toComplianceCsv } from '@/lib/impact';
import { predictSurplus } from '@/lib/prediction';
import { DEFAULT_NETWORK, type Network } from '@/lib/relocate';
import { DEMO_WEEKDAY, HISTORY, HISTORY_WEEKS, SCENARIO, SIM_END, SIM_START } from '@/lib/sampleData';
import { addDonor, createInitialState, logEvent, postListing, simulateUntil, type NewListingInput } from '@/lib/simulation';
import type { AppState, Donor } from '@/lib/types';
import { ActivityLog } from './ActivityLog';
import { AreaPicker } from './AreaPicker';
import { ControlBar } from './Header';
import { Hero } from './Hero';
import { EveningSummary, Toasts } from './Highlights';
import { ImpactStrip } from './ImpactStrip';
import { ListingDetail } from './ListingDetail';
import { LiveFeed } from './LiveFeed';
import { MapBar, MapLegend } from './MapOverlays';
import { PostSurplus } from './PostSurplus';
import { PredictionsPanel } from './PredictionsPanel';
import { ScrollStory } from './ScrollStory';

// Leaflet needs the browser, so the map only renders on the client.
const MapView = dynamic(() => import('./MapView'), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center font-mono text-xs uppercase tracking-[0.14em] text-faint">Unfolding the map…</div>,
});

const TICK_MS = 500;
const SPEEDS = [1, 2, 4] as const; // simulated minutes per tick
const SOURCE_LINK = 'text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-fg hover:decoration-lime';

function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Footer() {
  return (
    <footer id="sources" className="mx-auto w-full max-w-[1320px] scroll-mt-6 border-t border-line px-5 py-10 text-xs leading-relaxed text-faint md:px-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-fg">
          SecondServe<span className="text-lime">.</span>
        </p>
        <p>Made with care at Dublin HacX 2026. Built with Azure AI Foundry, OpenStreetMap, OSRM, Next.js and Leaflet.</p>
      </div>
      <p className="mt-4">This is a demo. The businesses, food banks and volunteers are made up. The map, the streets, the road routes and the AI are real.</p>
      <p className="mt-2">
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

  const handlePost = useCallback((input: NewListingInput, newDonor?: Donor) => {
    const id = `u${Date.now().toString(36)}`;
    if (newDonor) {
      // Keep the visitor's business on the map even after "Start over".
      setNetwork((prev) => ({ ...prev, donors: [...prev.donors, newDonor] }));
    }
    setState((prev) => postListing(newDonor ? addDonor(prev, newDonor) : prev, { ...input, id }));
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
      <Hero onShare={openPosting} />
      <ScrollStory />
      <section id="live" aria-labelledby="live-heading" className="relative scroll-mt-2 pb-16">
        <div className="relative mx-auto w-full max-w-[1320px] px-5 md:px-10">
          <p className="label flex flex-wrap justify-between gap-2 border-b border-line pb-3 pt-16">
            <span>03 / Live demo</span>
            <span>A whole Saturday evening, simulated on real streets</span>
          </p>
          <div className="grid grid-cols-1 gap-x-10 gap-y-8 pb-10 pt-10 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7">
              <h2 id="live-heading" className="display text-balance text-[clamp(2.4rem,5vw,4.6rem)] leading-[0.95]">
                Tonight in <span className="text-lime">{state.areaName}</span>
              </h2>
              <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
                Six local food businesses, five food programs and three volunteer drivers. Press play and watch good food find its way to people, one post at a
                time.
              </p>
            </div>
            <div className="lg:col-span-5">
              <AreaPicker areaName={state.areaName} onChange={(next) => startOver(next, false)} />
            </div>
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
          <div className="mt-6 space-y-4">
            {isFinished && (
              <EveningSummary impact={impact} areaName={state.areaName} onReplay={() => startOver(network, true)} onExport={handleExport} />
            )}
            <ImpactStrip impact={impact} />
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(340px,1fr)]">
              <section aria-label="Map" className="map-frame h-[520px] lg:h-[640px]">
                <MapBar state={state} inTransitLbs={impact.inTransitLbs} isRunning={isRunning} />
                <div className="map-inner">
                  <MapView state={state} selectedId={shown?.id ?? null} onSelect={setSelectedId} />
                  <div className="map-vignette" />
                  <MapLegend />
                </div>
              </section>
              <LiveFeed
                listings={state.listings}
                donors={state.donors}
                recipients={state.recipients}
                selectedId={shown?.id ?? null}
                onSelect={setSelectedId}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.75fr)_minmax(340px,1fr)]">
              <ListingDetail listing={shown} state={state} isFollowingLatest={selected === null} />
              <div className="flex flex-col gap-4">
                <PredictionsPanel predictions={predictions} donors={state.donors} weekday={state.weekday} onHeadsUp={handleHeadsUp} />
                <ActivityLog events={state.events} />
              </div>
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
