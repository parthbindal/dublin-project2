import type { CSSProperties } from 'react';
import { LBS_PER_MEAL, type ImpactTotals } from '@/lib/impact';
import { CountUp, Icon, type IconName } from './ui';

type TileProps = {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  icon: IconName;
  tone: string;
  isFeatured?: boolean;
  className?: string;
};

function Tile({ label, value, unit, hint, icon, tone, isFeatured = false, className = '' }: TileProps) {
  return (
    <div className={`card spot tile-glow flex flex-col justify-between gap-5 overflow-hidden p-5 ${className}`} style={{ '--tone': tone } as CSSProperties}>
      <div className="relative z-10 flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]"
          style={{ color: tone, background: `color-mix(in oklch, ${tone} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${tone} 35%, transparent)` }}
        >
          <Icon name={icon} className="h-4 w-4" />
        </span>
      </div>
      <div className="relative z-10">
        <p
          className={`font-semibold leading-none tracking-[-0.045em] ${isFeatured ? 'text-6xl' : 'text-5xl'}`}
          style={{ color: tone, textShadow: `0 0 32px color-mix(in oklch, ${tone} 45%, transparent)` }}
        >
          <CountUp value={value} />
          {unit && <span className="ml-1 text-xl font-medium tracking-normal text-muted">{unit}</span>}
        </p>
        {hint && <p className="mt-2 text-xs text-faint">{hint}</p>}
      </div>
    </div>
  );
}

export function ImpactStrip({ impact }: { impact: ImpactTotals }) {
  return (
    <section aria-label="Tonight so far" className="grid grid-cols-2 gap-3 md:grid-cols-6">
      <Tile
        label="Food saved"
        value={impact.rescuedLbs}
        unit="lbs"
        hint="Delivered to food banks tonight"
        icon="home"
        tone="var(--mint)"
        isFeatured
        className="col-span-2"
      />
      <Tile label="Meals shared" value={impact.meals} hint={`${LBS_PER_MEAL} lbs of food ≈ 1 meal`} icon="bowl" tone="var(--yellow)" />
      <Tile label="Trips made" value={impact.deliveries} hint="By volunteer drivers" icon="van" tone="var(--cyan)" />
      <Tile label="On the road" value={impact.inTransitLbs} unit="lbs" hint="Moving right now" icon="link" tone="var(--orange)" />
      <Tile label="Too late" value={impact.expiredLbs} unit="lbs" hint="Missed the pickup time. We count these too." icon="alert" tone="var(--pink)" />
    </section>
  );
}
