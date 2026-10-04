'use client';

import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Dietary, DonorKind, DraftSource, EventKind, ListingStatus, Storage } from '@/lib/types';

// Line icons on a 24px grid, drawn for this app instead of emoji.
const ICON_PATHS = {
  bread: 'M5 14.5C5 10 8.1 7 12 7s7 3 7 7.5V17a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z M9 10.5l1.2 2.6 M12 9.8v2.8 M15 10.5l-1.2 2.6',
  basket: 'M3.5 10h17l-1.6 8.2A2 2 0 0 1 17 20H7a2 2 0 0 1-1.9-1.8z M8 10l3-5.5 M16 10l-3-5.5 M9.5 14v2.5 M14.5 14v2.5',
  bowl: 'M3.5 11.5h17 M5 11.5a7 7 0 0 0 14 0 M9 20h6 M10 4.5c0 1.3 1.2 1.7 1.2 3 M13.5 4.5c0 1.3 1.2 1.7 1.2 3',
  cup: 'M5 9.5h11v4.5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z M16 10.5h1.5a2.5 2.5 0 0 1 0 5H16 M8.5 4.5c0 1 1 1.5 1 2.5 M12 4.5c0 1 1 1.5 1 2.5',
  box: 'M4 9.5h16V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M4 9.5L6 5h12l2 4.5 M10 13.5h4',
  school: 'M4 20V10.5L12 5l8 5.5V20 M9.5 20v-4.5h5V20 M3 20h18 M12 9.5v2',
  home: 'M4 20v-9l8-6 8 6v9z M12 16.8s-3.3-1.9-3.3-4a1.8 1.8 0 0 1 3.3-1 1.8 1.8 0 0 1 3.3 1c0 2.1-3.3 4-3.3 4z',
  van: 'M2.5 7h11.5v9H2.5z M14 10h3.8l3.2 3.2V16H14 M6.5 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z M17 18.5a1.6 1.6 0 1 0 0-3.2 1.6 1.6 0 0 0 0 3.2z',
  car: 'M5 15l1.6-4.6A2 2 0 0 1 8.5 9h7a2 2 0 0 1 1.9 1.4L19 15 M4 15h16v3H4z M7.5 18v1.5 M16.5 18v1.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 8.5v4.5 M12 16.6v.4 M10.3 4.3L3 17.3A2 2 0 0 0 4.7 20.3h14.6a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z',
  link: 'M9.5 14.5l5-5 M8 11l-2 2a3.5 3.5 0 0 0 5 5l2-2 M16 13l2-2a3.5 3.5 0 0 0-5-5l-2 2',
  bell: 'M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
  play: 'M8 5.5v13l10.5-6.5z',
  pause: 'M8.5 5.5v13 M15.5 5.5v13',
  download: 'M12 4v11 M7.5 10.5L12 15l4.5-4.5 M5 19.5h14',
  locate: 'M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z M12 12.3a2.3 2.3 0 1 0 0-4.6 2.3 2.3 0 0 0 0 4.6z',
  plus: 'M12 5v14 M5 12h14',
  restart: 'M4.5 12a7.5 7.5 0 1 0 2.2-5.3 M4.5 4.5v3.7h3.7',
  sparkle: 'M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9z M18.5 15.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z',
  search: 'M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13z M15.5 15.5L20 20',
  arrow: 'M5 12h14 M13.5 6.5L19 12l-5.5 5.5',
  pin: 'M12 21s6.5-5.6 6.5-11a6.5 6.5 0 0 0-13 0c0 5.4 6.5 11 6.5 11z',
} as const;

export type IconName = keyof typeof ICON_PATHS;

export function Icon({ name, className = 'h-5 w-5' }: { name: IconName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={ICON_PATHS[name]} />
    </svg>
  );
}

/** The same icon as an HTML string, for Leaflet map pins. */
export function iconMarkup(name: IconName): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${ICON_PATHS[name]}"/></svg>`;
}

export const DONOR_ICON: Record<DonorKind, IconName> = {
  bakery: 'bread',
  grocery: 'basket',
  restaurant: 'bowl',
  cafe: 'cup',
  caterer: 'box',
  cafeteria: 'school',
};

export const EVENT_ICON: Record<EventKind, IconName> = {
  post: 'box',
  match: 'link',
  pickup: 'van',
  deliver: 'check',
  expire: 'alert',
  predict: 'bell',
};

export const STORAGE_LABEL: Record<Storage, string> = {
  'shelf-stable': 'Room temperature',
  refrigerated: 'Keep cold',
  hot: 'Hot food',
};

const STATUS_STYLE: Record<ListingStatus, { label: string; className: string }> = {
  open: { label: 'Looking for a home', className: 'text-fg' },
  matched: { label: 'Driver on the way', className: 'text-fg' },
  'picked-up': { label: 'In the van', className: 'text-lime' },
  delivered: { label: 'Delivered', className: 'text-lime' },
  expired: { label: "Didn't make it", className: 'text-red' },
};

const SOURCE_STYLE: Record<DraftSource, { label: string; className: string; isAi: boolean }> = {
  ai: { label: 'Read by AI', className: 'text-fg ring-1 ring-inset ring-line-strong px-2 py-0.5', isAi: true },
  builtin: { label: 'Read without AI', className: 'text-muted ring-1 ring-inset ring-line-strong px-2 py-0.5', isAi: false },
  sample: { label: 'Demo post', className: 'text-muted ring-1 ring-inset ring-line-strong px-2 py-0.5', isAi: false },
};

const CHIP = 'label inline-flex items-center gap-1.5 whitespace-nowrap !text-[0.72rem]';

/** The `key` replays a quick fade whenever the status changes. */
export function StatusChip({ status }: { status: ListingStatus }) {
  const style = STATUS_STYLE[status];
  return (
    <span key={status} className={`${CHIP} animate-chip-in ${style.className}`}>
      <span aria-hidden className="h-1.5 w-1.5 bg-current" />
      {style.label}
    </span>
  );
}

export function SourceBadge({ source }: { source: DraftSource }) {
  const style = SOURCE_STYLE[source];
  return (
    <span className={`${CHIP} ${style.className}`}>
      {style.label}
    </span>
  );
}

export function Tag({ children, isWarning = false }: { children: ReactNode; isWarning?: boolean }) {
  const tone = isWarning ? 'text-red ring-red/50' : 'text-muted ring-line-strong';
  return <span className={`inline-flex px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}>{children}</span>;
}

export function dietLabel(dietary: Dietary): string {
  if (dietary.vegan) return 'Vegan';
  return dietary.vegetarian ? 'Vegetarian' : 'Has meat or fish';
}

export function allergenList(dietary: Dietary): string[] {
  return [
    dietary.containsNuts ? 'nuts' : null,
    dietary.containsDairy ? 'dairy' : null,
    dietary.containsGluten ? 'gluten' : null,
  ].filter((item): item is string => item !== null);
}

export function DietaryTags({ dietary }: { dietary: Dietary }) {
  const allergens = allergenList(dietary);
  return (
    <>
      <Tag>{dietLabel(dietary)}</Tag>
      {allergens.length > 0 && <Tag isWarning>Allergens: {allergens.join(', ')}</Tag>}
    </>
  );
}

// ---------- Motion preference (full or calm), stored on <html data-motion> ----------

const MOTION_KEY = 'secondserve.motion';
const MOTION_EVENT = 'secondserve-motion';

export function isCalmMotion(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.motion === 'calm';
}

function subscribeMotion(onChange: () => void) {
  window.addEventListener(MOTION_EVENT, onChange);
  return () => window.removeEventListener(MOTION_EVENT, onChange);
}

export function MotionToggle() {
  const isCalm = useSyncExternalStore(subscribeMotion, isCalmMotion, () => false);
  function handleToggle() {
    const next = isCalm ? 'full' : 'calm';
    document.documentElement.dataset.motion = next;
    try {
      window.localStorage.setItem(MOTION_KEY, next);
    } catch {
      // Storage can be blocked in private browsing. The choice still applies for this visit.
    }
    window.dispatchEvent(new Event(MOTION_EVENT));
  }
  return (
    <button
      type="button"
      onClick={handleToggle}
      aria-pressed={!isCalm}
      title="Calm motion turns off animations, for anyone who prefers less movement on screen."
      className="btn btn-glass label px-3 py-2 !text-[0.7rem]"
    >
      <span aria-hidden className={`h-1.5 w-1.5 ${isCalm ? 'bg-faint' : 'bg-lime'}`} />
      Motion: {isCalm ? 'calm' : 'full'}
    </button>
  );
}

const COUNT_MS = 700;

/** A number that counts smoothly to its new value. Shows the final value right away for reduced motion. */
export function CountUp({ value, startFrom }: { value: number; startFrom?: number }) {
  const [shown, setShown] = useState(startFrom ?? value);
  const shownRef = useRef(startFrom ?? value);
  const decimals = Number.isInteger(value) ? 0 : 1;

  useEffect(() => {
    const from = shownRef.current;
    if (from === value) return undefined;
    const duration = isCalmMotion() ? 0 : COUNT_MS;
    const start = performance.now();
    let frame = 0;
    const step = (time: number) => {
      const progress = duration === 0 ? 1 : Math.min(1, (time - start) / duration);
      const eased = 1 - (1 - progress) ** 3;
      shownRef.current = from + (value - from) * eased;
      setShown(shownRef.current);
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  const format = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return (
    <>
      <span aria-hidden className="tabular-nums">
        {format(shown)}
      </span>
      <span className="sr-only">{format(value)}</span>
    </>
  );
}
