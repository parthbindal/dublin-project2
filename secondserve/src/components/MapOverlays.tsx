import type { ReactNode } from 'react';
import type { AppState, Listing } from '@/lib/types';

const ON_THE_ROAD = new Set<Listing['status']>(['matched', 'picked-up']);

type HudProps = {
  state: AppState;
  inTransitLbs: number;
  isRunning: boolean;
};

function Readout({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: tone, boxShadow: `0 0 10px ${tone}` }} />
      {children}
    </div>
  );
}

/** Floating readouts on the map: where we are, and what is moving right now. */
export function MapHud({ state, inTransitLbs, isRunning }: HudProps) {
  const waiting = state.listings.filter((l) => l.status === 'open').length;
  const busyDrivers = new Set(state.listings.filter((l) => ON_THE_ROAD.has(l.status)).map((l) => l.match?.driverId)).size;
  return (
    <>
      <div className="glass pointer-events-none absolute left-4 top-4 z-[500] rounded-[16px] px-4 py-2.5">
        <p className="eyebrow flex items-center gap-2">
          {isRunning ? <span className="live-dot text-mint" /> : <span className="h-2 w-2 rounded-full bg-faint" />}
          {isRunning ? 'Live map' : 'Map'}
        </p>
        <p className="mt-0.5 text-sm font-semibold">{state.areaName}</p>
      </div>
      <div className="pointer-events-none absolute right-4 top-4 z-[500] hidden flex-col items-end gap-2 sm:flex">
        <Readout tone="var(--orange)">
          {waiting} {waiting === 1 ? 'post' : 'posts'} looking for a home
        </Readout>
        <Readout tone="var(--yellow)">
          {busyDrivers} of {state.drivers.length} drivers on the road
        </Readout>
        <Readout tone="var(--cyan)">{inTransitLbs} lbs moving now</Readout>
      </div>
    </>
  );
}

const DOT = 'inline-block h-2.5 w-2.5 rounded-full';

export function MapLegend() {
  return (
    <div className="glass pointer-events-none absolute bottom-4 left-4 z-[500] space-y-1.5 rounded-[16px] px-3.5 py-3 text-xs">
      <div className="flex items-center gap-2.5">
        <span className={`${DOT} bg-orange shadow-[0_0_10px_var(--orange)]`} />
        Business with extra food
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`${DOT} bg-mint shadow-[0_0_10px_var(--mint)]`} />
        Food bank or shelter
      </div>
      <div className="flex items-center gap-2.5">
        <span className={`${DOT} bg-yellow shadow-[0_0_10px_var(--yellow)]`} />
        Volunteer driver
      </div>
      <div className="flex items-center gap-2.5">
        <span className="inline-block w-5 border-t-[3px] border-dotted border-yellow" />
        Driving to pick up
      </div>
      <div className="flex items-center gap-2.5">
        <span className="inline-block h-[3px] w-5 rounded-full bg-cyan shadow-[0_0_8px_var(--cyan)]" />
        Delivering
      </div>
      <div className="flex items-center gap-2.5">
        <span className="inline-block h-[3px] w-5 rounded-full bg-mint/60" />
        Delivered
      </div>
    </div>
  );
}
