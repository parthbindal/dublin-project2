import type { ReactNode } from 'react';
import type { Dietary, DonorKind, DraftSource, ListingStatus, Storage } from '@/lib/types';

export const DONOR_EMOJI: Record<DonorKind, string> = {
  bakery: '🥖',
  grocery: '🛒',
  restaurant: '🍜',
  cafe: '☕',
  caterer: '🍱',
  cafeteria: '🏫',
};

export const STORAGE_LABEL: Record<Storage, string> = {
  'shelf-stable': 'Shelf-stable',
  refrigerated: 'Keep cold',
  hot: 'Hot food',
};

const STATUS_STYLE: Record<ListingStatus, { label: string; className: string }> = {
  open: { label: 'Finding a match', className: 'bg-tomato/15 text-tomato ring-tomato/30' },
  matched: { label: 'Driver on the way', className: 'bg-sky/15 text-sky ring-sky/30' },
  'picked-up': { label: 'Picked up', className: 'bg-mustard/20 text-[#8a5a00] ring-mustard/40' },
  delivered: { label: 'Delivered', className: 'bg-leaf/15 text-leaf ring-leaf/30' },
  expired: { label: "Couldn't place", className: 'bg-ink/10 text-ink-soft ring-ink/20' },
};

const SOURCE_STYLE: Record<DraftSource, { label: string; className: string }> = {
  ai: { label: '✨ Organized by AI', className: 'bg-plum/10 text-plum ring-plum/30' },
  builtin: { label: 'Built-in parser', className: 'bg-ink/5 text-ink-soft ring-ink/15' },
  sample: { label: 'Sample listing', className: 'bg-ink/5 text-ink-soft ring-ink/15' },
};

const CHIP = 'inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';

export function StatusChip({ status }: { status: ListingStatus }) {
  const style = STATUS_STYLE[status];
  return <span className={`${CHIP} ${style.className}`}>{style.label}</span>;
}

export function SourceBadge({ source }: { source: DraftSource }) {
  const style = SOURCE_STYLE[source];
  return <span className={`${CHIP} ${style.className}`}>{style.label}</span>;
}

export function dietaryTags(dietary: Dietary): string[] {
  const base = dietary.vegan ? 'Vegan' : dietary.vegetarian ? 'Vegetarian' : 'Contains meat';
  return [
    base,
    ...(dietary.containsNuts ? ['Contains nuts'] : []),
    ...(dietary.containsDairy ? ['Contains dairy'] : []),
    ...(dietary.containsGluten ? ['Contains gluten'] : []),
  ];
}

export function Tag({ children, isWarning = false }: { children: ReactNode; isWarning?: boolean }) {
  const tone = isWarning ? 'bg-tomato/10 text-tomato' : 'bg-cream text-ink-soft';
  return <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${tone}`}>{children}</span>;
}
