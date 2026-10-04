import type { CSSProperties } from 'react';
import { Icon, MotionToggle, type IconName } from './ui';

const SOURCE_LINK = 'underline decoration-white/25 underline-offset-2 transition-colors hover:text-fg hover:decoration-white/60';

/** One food post, from closing time to dinner, as the live feed shows it. Matches the scroll story below. */
const PREVIEW: Array<{ icon: IconName; tone: string; title: string; detail: string; time: string }> = [
  { icon: 'bread', tone: 'var(--orange)', title: 'Golden Crust Bakery posted extra food', detail: '40 bagels and 12 sourdough loaves · 30 lbs', time: '5:30 PM' },
  { icon: 'sparkle', tone: 'var(--violet)', title: 'Read by AI', detail: 'Vegan · Allergen: gluten · Pick up by 7:00 PM', time: '5:30 PM' },
  { icon: 'link', tone: 'var(--cyan)', title: 'Matched: Northside Youth Center', detail: 'Asked for bakery items · open until 7:00 PM', time: '5:31 PM' },
  { icon: 'van', tone: 'var(--yellow)', title: 'Ana is on the way', detail: 'Volunteer driver · van with a cooler', time: '5:35 PM' },
  { icon: 'check', tone: 'var(--mint)', title: 'Delivered. About 25 meals.', detail: 'Bread on the tables at the youth center', time: '6:02 PM' },
];

function HeroPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[460px] animate-rise [animation-delay:250ms]">
      {/* Orbit rings and a glow behind the feed, for depth. */}
      <div aria-hidden className="absolute left-1/2 top-1/2 -z-10 aspect-square w-[135%] -translate-x-1/2 -translate-y-1/2">
        <div className="orbit absolute inset-0 rounded-full border border-dashed border-white/10" />
        <div className="absolute inset-[14%] rounded-full border border-white/[0.06]" />
        <div className="absolute inset-[26%] rounded-full bg-[radial-gradient(circle,oklch(0.73_0.2_8/0.28),transparent_70%)]" />
      </div>
      <div className="glass rounded-[28px] p-3">
        <div className="flex items-center justify-between px-2 pb-3 pt-1">
          <span className="eyebrow flex items-center gap-2 !text-fg">
            <span className="live-dot text-mint" /> Live in Tri-Valley
          </span>
          <span className="eyebrow">Saturday</span>
        </div>
        <ol className="space-y-2">
          {PREVIEW.map((step, index) => (
            <li
              key={step.title}
              className="notif flex items-center gap-3 rounded-[18px] border border-line bg-white/[0.035] p-3"
              style={{ animationName: `notif-${index}` } as CSSProperties}
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px]"
                style={{ color: step.tone, background: `color-mix(in oklch, ${step.tone} 14%, transparent)`, boxShadow: `inset 0 0 0 1px color-mix(in oklch, ${step.tone} 35%, transparent), 0 0 24px -6px ${step.tone}` }}
              >
                <Icon name={step.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{step.title}</span>
                <span className="block truncate text-xs text-muted">{step.detail}</span>
              </span>
              <span className="shrink-0 font-mono text-[11px] text-faint">{step.time}</span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

const STATS = [
  { value: '29%', label: 'of the U.S. food supply went unsold or uneaten in 2024', source: 'ReFED', href: 'https://refed.org/food-waste/the-problem/' },
  { value: '47.9M', label: "people lived in households that couldn't always afford enough food", source: 'USDA ERS', href: 'https://ers.usda.gov/publications/113622' },
  {
    value: '2 hrs',
    label: 'is the most perishable food should sit out of the fridge (1 hour above 90°F)',
    source: 'USDA FSIS',
    href: 'https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/danger-zone-40f-140f',
  },
];

const BUILT_WITH = ['Azure AI Foundry', 'OpenStreetMap', 'OSRM routing', 'Next.js', 'Leaflet'];

function Nav({ onShare }: { onShare: () => void }) {
  return (
    <header className="relative z-10 mx-auto flex w-full max-w-[1320px] items-center justify-between gap-4 px-5 pt-5 md:px-10">
      <a href="#top" className="flex items-center gap-2.5 font-semibold tracking-tight">
        <span aria-hidden className="grid h-8 w-8 place-items-center rounded-[10px] bg-[image:var(--brand)] text-bg shadow-[0_0_24px_-4px_var(--pink)]">
          <Icon name="bowl" className="h-[18px] w-[18px]" />
        </span>
        <span className="text-lg">SecondServe</span>
      </a>
      <nav aria-label="Page" className="glass hidden items-center gap-1 rounded-full px-1.5 py-1.5 text-sm text-muted md:flex">
        <a href="#story" className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-fg">How it works</a>
        <a href="#live" className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-fg">Live map</a>
        <a href="#sources" className="rounded-full px-3.5 py-1.5 transition-colors hover:bg-white/5 hover:text-fg">Sources</a>
      </nav>
      <div className="flex items-center gap-2">
        <MotionToggle />
        <button type="button" onClick={onShare} className="btn btn-light hidden py-2 text-sm sm:inline-flex">
          Share extra food
        </button>
      </div>
    </header>
  );
}

export function Hero({ onShare }: { onShare: () => void }) {
  return (
    <div id="top" className="relative overflow-hidden">
      <div aria-hidden className="aurora">
        <span />
        <span />
        <span />
      </div>
      <div aria-hidden className="grid-bg absolute inset-0" />
      <Nav onShare={onShare} />
      <section aria-labelledby="hero-heading" className="relative mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-14 px-5 pb-16 pt-14 md:px-10 lg:grid-cols-[1.15fr_1fr] lg:pb-24 lg:pt-20">
        <div>
          <a
            href="#live"
            className="glass animate-rise inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-xs text-muted transition-colors hover:text-fg"
          >
            <span className="rounded-full bg-[image:var(--brand)] px-2 py-0.5 font-semibold text-bg">New</span>
            AI matching for surplus food, live on a real map
            <Icon name="arrow" className="h-3.5 w-3.5" />
          </a>
          <h1
            id="hero-heading"
            className="animate-rise mt-6 text-balance text-[clamp(2.9rem,6.6vw,5.9rem)] font-semibold leading-[0.95] tracking-[-0.045em] [animation-delay:80ms]"
          >
            Good food deserves a <span className="accent text-brand">second serving.</span>
          </h1>
          <p className="animate-rise mt-6 max-w-[52ch] text-lg leading-relaxed text-muted [animation-delay:160ms]">
            When bakeries, grocers and restaurants close for the night, good food is often still on the shelves. SecondServe reads one sentence, finds the right
            food bank, and sends a volunteer driver before it&apos;s thrown away.
          </p>
          <div className="animate-rise mt-8 flex flex-wrap items-center gap-3 [animation-delay:240ms]">
            <a href="#live" className="btn btn-primary !px-6 !py-3 text-base">
              Watch a live evening
              <Icon name="arrow" className="h-4 w-4" />
            </a>
            <a href="#story" className="btn btn-glass !px-6 !py-3 text-base">
              See how it works
            </a>
          </div>
        </div>
        <HeroPreview />
      </section>
      <section aria-label="Why it matters" className="relative mx-auto w-full max-w-[1320px] px-5 pb-16 md:px-10">
        <ul className="grid overflow-hidden rounded-[22px] border border-line bg-white/[0.02] md:grid-cols-3">
          {STATS.map((stat) => (
            <li key={stat.value} className="border-line p-6 md:border-l md:first:border-l-0 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-t-0">
              <p className="text-brand text-5xl font-semibold tracking-[-0.04em]">{stat.value}</p>
              <p className="mt-2 max-w-[34ch] text-sm leading-relaxed text-muted">{stat.label}</p>
              <a className={`mt-2 inline-block font-mono text-[11px] text-faint ${SOURCE_LINK}`} href={stat.href} target="_blank" rel="noopener noreferrer">
                Source: {stat.source}
              </a>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-[0.14em] text-faint">
          <span>Built with</span>
          {BUILT_WITH.map((name) => (
            <span key={name} className="text-muted">
              {name}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
