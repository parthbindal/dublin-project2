import { LBS_PER_MEAL, type ImpactTotals } from '@/lib/impact';
import { CountUp } from './ui';

type StatProps = {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
};

function Stat({ label, value, unit, hint }: StatProps) {
  return (
    <div className="border-l border-line px-4 py-4">
      <p className="eyebrow">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold leading-none">
        <CountUp value={value} />
        {unit && <span className="text-lg"> {unit}</span>}
      </p>
      {hint && <p className="mt-1 text-[11px] text-ink-soft">{hint}</p>}
    </div>
  );
}

export function ImpactStrip({ impact }: { impact: ImpactTotals }) {
  return (
    <section aria-label="Tonight so far" className="grid grid-cols-2 border-b-[1.5px] border-ink md:grid-cols-[1.35fr_repeat(4,minmax(0,1fr))]">
      <div className="col-span-2 bg-sage-deep px-5 py-4 text-paper md:col-span-1">
        <p className="eyebrow !text-paper/80">Food that found a table</p>
        <p className="mt-1 font-display text-5xl font-semibold leading-none">
          <CountUp value={impact.rescuedLbs} /> <span className="text-2xl">lbs</span>
        </p>
      </div>
      <Stat label="Meals shared" value={impact.meals} hint={`About ${LBS_PER_MEAL} lbs of food is one meal`} />
      <Stat label="Trips made" value={impact.deliveries} />
      <Stat label="On the road" value={impact.inTransitLbs} unit="lbs" />
      <Stat label="Didn't make it in time" value={impact.expiredLbs} unit="lbs" hint="We count these too" />
    </section>
  );
}
