import { LBS_PER_MEAL, type ImpactTotals } from '@/lib/impact';
import { CountUp } from './ui';

type CellProps = {
  label: string;
  value: number;
  unit?: string;
  hint: string;
  isLead?: boolean;
  tone?: string;
};

function Cell({ label, value, unit, hint, isLead = false, tone = 'text-fg' }: CellProps) {
  return (
    <div className={`flex flex-col justify-between gap-6 border-line p-5 ${isLead ? 'col-span-2' : ''} [&:not(:first-child)]:border-l`}>
      <p className="label">{label}</p>
      <div>
        <p className={`display leading-none ${isLead ? 'text-[clamp(3.5rem,6vw,5.5rem)]' : 'text-[clamp(2.4rem,3.6vw,3.4rem)]'} ${tone}`}>
          <CountUp value={value} />
          {unit && <span className="label ml-2 !text-sm">{unit}</span>}
        </p>
        <p className="mt-2 text-xs text-faint">{hint}</p>
      </div>
    </div>
  );
}

/** Tonight's scoreboard: one strip, hairline cells, and the number that matters most leads and is widest. */
export function ImpactStrip({ impact }: { impact: ImpactTotals }) {
  return (
    <section aria-label="Tonight so far" className="grid grid-cols-2 border border-line-strong bg-surface lg:grid-cols-6">
      <Cell label="Food saved" value={impact.rescuedLbs} unit="lbs" hint="Delivered to food banks tonight" isLead tone="text-lime" />
      <Cell label="Meals" value={impact.meals} hint={`${LBS_PER_MEAL} lbs of food is about 1 meal`} />
      <Cell label="Trips" value={impact.deliveries} hint="By volunteer drivers" />
      <Cell label="On the road" value={impact.inTransitLbs} unit="lbs" hint="Moving right now" />
      <Cell label="Too late" value={impact.expiredLbs} unit="lbs" hint="Missed the pickup time" tone={impact.expiredLbs > 0 ? 'text-red' : 'text-faint'} />
    </section>
  );
}
