import { LBS_PER_MEAL, type ImpactTotals } from '@/lib/impact';
import { CountUp, Icon, type IconName } from './ui';

type TileProps = {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  icon: IconName;
  tone: string;
};

function Tile({ label, value, unit, hint, icon, tone }: TileProps) {
  return (
    <div className={`flex flex-col justify-between gap-3 rounded-[16px] px-4 py-4 ${tone}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] opacity-85">{label}</p>
        <Icon name={icon} className="h-5 w-5 shrink-0 opacity-80" />
      </div>
      <div>
        <p className="font-display text-4xl font-semibold leading-none">
          <CountUp value={value} />
          {unit && <span className="text-xl"> {unit}</span>}
        </p>
        {hint && <p className="mt-1 text-[11px] opacity-80">{hint}</p>}
      </div>
    </div>
  );
}

export function ImpactStrip({ impact }: { impact: ImpactTotals }) {
  return (
    <section aria-label="Tonight so far" className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Tile label="Food saved" value={impact.rescuedLbs} unit="lbs" icon="home" tone="col-span-2 bg-sage-deep text-paper md:col-span-1" />
      <Tile label="Meals shared" value={impact.meals} hint={`About ${LBS_PER_MEAL} lbs of food is one meal`} icon="bowl" tone="bg-honey text-ink" />
      <Tile label="Trips made" value={impact.deliveries} icon="van" tone="bg-dusk text-paper" />
      <Tile label="On the road" value={impact.inTransitLbs} unit="lbs" icon="link" tone="bg-terracotta text-paper" />
      <Tile
        label="Didn't make it"
        value={impact.expiredLbs}
        unit="lbs"
        hint="We count these too"
        icon="alert"
        tone="border-[1.5px] border-line bg-paper text-ink"
      />
    </section>
  );
}
