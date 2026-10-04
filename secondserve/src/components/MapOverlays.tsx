import type { AppState, Listing } from '@/lib/types';

const ON_THE_ROAD = new Set<Listing['status']>(['matched', 'picked-up']);

type BarProps = {
  state: AppState;
  inTransitLbs: number;
  isRunning: boolean;
};

/** The title bar above the map: where we are, and what is moving right now. */
export function MapBar({ state, inTransitLbs, isRunning }: BarProps) {
  const waiting = state.listings.filter((l) => l.status === 'open').length;
  const busyDrivers = new Set(state.listings.filter((l) => ON_THE_ROAD.has(l.status)).map((l) => l.match?.driverId)).size;
  const readouts = [
    { label: 'Looking for a home', value: String(waiting) },
    { label: 'Drivers out', value: `${busyDrivers}/${state.drivers.length}` },
    { label: 'Lbs moving', value: String(inTransitLbs) },
  ];
  return (
    <div className="flex flex-wrap items-stretch justify-between border-b border-line-strong">
      <p className="label flex items-center gap-2.5 px-4 py-3 !text-fg">
        {isRunning ? <span className="live-dot text-lime" /> : <span className="inline-block h-2 w-2 bg-faint" />}
        {isRunning ? 'Live map' : 'Map'} · {state.areaName}
      </p>
      <dl className="hidden sm:flex">
        {readouts.map((item) => (
          <div key={item.label} className="flex items-baseline gap-2 border-l border-line px-4 py-3">
            <dt className="label">{item.label}</dt>
            <dd className="font-mono text-sm font-semibold text-lime">{item.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const KEY_ROW = 'flex items-center gap-2.5';

export function MapLegend() {
  return (
    <div className="pointer-events-none absolute bottom-4 left-4 z-[500] space-y-1.5 border border-line-strong bg-bg px-3.5 py-3 text-xs">
      <div className={KEY_ROW}>
        <span className="inline-block h-3 w-3 rounded-full bg-lime" />
        Business with extra food
      </div>
      <div className={KEY_ROW}>
        <span className="inline-block h-3 w-3 bg-fg" />
        Food bank or shelter
      </div>
      <div className={KEY_ROW}>
        <span className="inline-block h-3 w-3 rounded-full border-2 border-lime" />
        Volunteer driver
      </div>
      <div className={KEY_ROW}>
        <span className="inline-block w-5 border-t-2 border-dotted border-fg" />
        Driving to pick up
      </div>
      <div className={KEY_ROW}>
        <span className="inline-block h-[3px] w-5 bg-lime" />
        Delivering
      </div>
      <div className={KEY_ROW}>
        <span className="inline-block h-[3px] w-5 bg-fg/35" />
        Delivered
      </div>
    </div>
  );
}
