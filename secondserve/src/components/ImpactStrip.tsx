import { LBS_PER_MEAL, type ImpactTotals } from '@/lib/impact';

type StatProps = {
  label: string;
  value: string | number;
  hint?: string;
};

function Stat({ label, value, hint }: StatProps) {
  return (
    <div className="rounded-2xl border border-line bg-paper px-4 py-3 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-ink-soft">{label}</div>
      <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="text-[11px] text-ink-soft">{hint}</div>}
    </div>
  );
}

export function ImpactStrip({ impact }: { impact: ImpactTotals }) {
  return (
    <section aria-label="Impact tonight" className="grid grid-cols-2 gap-3 md:grid-cols-[1.4fr_repeat(4,minmax(0,1fr))]">
      <div className="col-span-2 rounded-2xl bg-leaf px-5 py-3 text-paper shadow-sm md:col-span-1">
        <div className="text-xs font-semibold uppercase tracking-widest text-paper/80">Food rescued tonight</div>
        <div className="font-display text-4xl font-black tabular-nums">
          {impact.rescuedLbs} <span className="text-2xl font-bold">lbs</span>
        </div>
      </div>
      <Stat label="Meals provided" value={impact.meals} hint={`Estimate: ${LBS_PER_MEAL} lbs = 1 meal`} />
      <Stat label="Deliveries" value={impact.deliveries} />
      <Stat label="On the road now" value={`${impact.inTransitLbs} lbs`} />
      <Stat label="Couldn't place in time" value={`${impact.expiredLbs} lbs`} hint="We count misses too" />
    </section>
  );
}
