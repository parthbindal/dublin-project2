'use client';

// "One bakery's evening": a scroll-driven story with a speed limiter.
// Scroll position sets a target; each frame the story eases toward it, but never faster than
// MAX_SPEED story-lengths per second, so a hard fling glides instead of jumping. Only CSS custom
// properties on one element, one SVG transform, and two text nodes change per frame, and the
// loop stops itself once the story has caught up with the scroll position.
import { useEffect, useRef, type RefObject } from 'react';
import { isCalmMotion } from './ui';

const SCENES = 4;
const MAX_SPEED = 0.85; // story progress per second, at most
const FOLLOW_RATE = 9; // how eagerly the story catches up to the scroll position (per second)
const SETTLED = 0.0004;
const MESSAGE = '40 bagels and 12 sourdough loaves, pick up by 7';
const MEALS = 25; // 30 lbs at about 1.2 lbs per meal
const ROAD = 'M 214 452 C 360 452, 420 368, 600 384 S 860 470, 1000 440';

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const sceneProgress = (p: number, scene: number) => clamp01((p - scene / SCENES) * SCENES);

const CAPTIONS = [
  {
    time: '5:30 PM',
    title: 'Closing time at the bakery.',
    body: 'Golden Crust still has 30 pounds of good bread on the shelves. Without a plan, it ends up in the bin.',
  },
  {
    time: '5:35 PM',
    title: 'One sentence is enough.',
    body: 'They type it the way they would text a friend. SecondServe fills in what a food bank needs to know: how much, how to keep it, allergens, and when to pick it up.',
  },
  {
    time: '5:35 PM',
    title: 'A match in under a second.',
    body: 'We look for a place nearby that asked for bread, still has room, and is open late. Ana, a volunteer with a van, is five minutes away.',
  },
  {
    time: '6:02 PM',
    title: 'Dinner instead of the dumpster.',
    body: 'The bread is on the tables at the youth center. Thirty pounds is about 25 meals. Now picture every bakery in town.',
  },
];

const FIELDS = ['30 lbs', 'Room temperature', 'Vegan', 'Allergen: gluten', 'Pick up by 7:00 PM'];

function Bakery() {
  return (
    <g transform="translate(70 262)">
      <rect x="0" y="40" width="200" height="150" rx="3" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
      <path d="M-10 40 H210 L198 76 H2 Z" fill="var(--terracotta)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      {[22, 66, 110, 154].map((x) => (
        <path key={x} d={`M${x} 42 h22 l-2 32 h-18 z`} fill="var(--paper)" opacity="0.8" />
      ))}
      <rect x="22" y="2" width="156" height="30" rx="2" fill="var(--ink)" />
      <text x="100" y="22" textAnchor="middle" fill="var(--paper)" fontSize="14" fontWeight="700" letterSpacing="1.5">
        GOLDEN CRUST
      </text>
      <rect x="18" y="94" width="98" height="70" fill="oklch(0.95 0.07 92)" stroke="var(--ink)" strokeWidth="3" />
      <g className="story-loaves-out" stroke="var(--ink)" strokeWidth="2" fill="oklch(0.77 0.14 70)">
        {[
          [44, 150],
          [72, 150],
          [100, 150],
          [58, 136],
          [86, 136],
        ].map(([cx, cy]) => (
          <ellipse key={`${cx}-${cy}`} cx={cx} cy={cy} rx="14" ry="8" />
        ))}
      </g>
      <rect x="136" y="112" width="44" height="78" fill="var(--linen)" stroke="var(--ink)" strokeWidth="3" />
      <circle cx="170" cy="152" r="3" fill="var(--ink)" />
    </g>
  );
}

function YouthCenter() {
  return (
    <g transform="translate(930 250)">
      <path d="M-12 72 L100 10 L212 72 Z" fill="var(--sage-deep)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M100 60 c-6-7-17-3-17 5 0 8 17 16 17 16 s17-8 17-16 c0-8-11-12-17-5z" fill="var(--terracotta)" />
      <rect x="0" y="72" width="200" height="130" fill="var(--paper)" stroke="var(--ink)" strokeWidth="3" />
      {[22, 128].map((x) => (
        <g key={x}>
          <rect x={x} y="94" width="50" height="40" fill="var(--linen)" stroke="var(--ink)" strokeWidth="3" />
          <rect className="story-window-light" x={x + 1.5} y="95.5" width="47" height="37" fill="var(--honey)" />
        </g>
      ))}
      <g className="story-loaves-in" stroke="var(--ink)" strokeWidth="2" fill="oklch(0.77 0.14 70)">
        <ellipse cx="40" cy="124" rx="9" ry="5" />
        <ellipse cx="56" cy="124" rx="9" ry="5" />
        <ellipse cx="146" cy="124" rx="9" ry="5" />
        <ellipse cx="162" cy="124" rx="9" ry="5" />
      </g>
      <rect x="10" y="150" width="114" height="24" rx="2" fill="var(--ink)" />
      <text x="67" y="167" textAnchor="middle" fill="var(--paper)" fontSize="11" fontWeight="700" letterSpacing="1">
        YOUTH CENTER
      </text>
      <rect x="132" y="140" width="44" height="62" fill="var(--linen)" stroke="var(--ink)" strokeWidth="3" />
    </g>
  );
}

function Van() {
  return (
    <g transform="translate(-36 -40)">
      <path d="M2 10 H48 V40 H2 Z" fill="var(--honey)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M48 18 H62 L72 29 V40 H48 Z" fill="var(--honey)" stroke="var(--ink)" strokeWidth="3" strokeLinejoin="round" />
      <path d="M52 21 H61 L67 28 H52 Z" fill="var(--paper)" />
      <path d="M25 22 c-3-3-8-1-8 3 0 4 8 8 8 8 s8-4 8-8 c0-4-5-6-8-3z" fill="var(--terracotta)" />
      <circle cx="16" cy="42" r="7" fill="var(--ink)" />
      <circle cx="58" cy="42" r="7" fill="var(--ink)" />
    </g>
  );
}

function Scenery({ routeRef }: { routeRef: RefObject<SVGPathElement | null> }) {
  return (
    <>
      <rect width="1200" height="560" fill="var(--sky)" />
      <rect className="story-dusk" width="1200" height="560" fill="oklch(0.72 0.15 25)" />
      <circle className="story-sun" cx="930" cy="150" r="58" fill="var(--honey)" />
      <path d="M0 330 C 180 280, 320 300, 460 320 S 760 270, 900 300 S 1120 290, 1200 300 V 560 H 0 Z" fill="oklch(0.85 0.11 140)" />
      <path d="M0 410 C 220 380, 420 400, 640 395 S 1000 380, 1200 400 V 560 H 0 Z" fill="oklch(0.93 0.07 110)" />
      <path d={ROAD} stroke="oklch(0.78 0.015 260)" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d={ROAD} stroke="var(--paper)" strokeWidth="2.5" strokeDasharray="14 14" fill="none" />
      <path ref={routeRef} d={ROAD} stroke="var(--terracotta)" strokeWidth="6" fill="none" strokeLinecap="round" />
      {[
        [330, 372, 22],
        [520, 352, 28],
        [760, 348, 24],
        [880, 384, 18],
      ].map(([cx, cy, r]) => (
        <g key={cx}>
          <rect x={cx - 3} y={cy} width="6" height={r + 10} fill="var(--ink-soft)" />
          <circle cx={cx} cy={cy} r={r} fill="oklch(0.66 0.16 148)" stroke="var(--ink)" strokeWidth="2.5" />
        </g>
      ))}
    </>
  );
}

export function ScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef<SVGPathElement>(null);
  const vanRef = useRef<SVGGElement>(null);
  const typedRef = useRef<HTMLSpanElement>(null);
  const mealsRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    const route = routeRef.current;
    const van = vanRef.current;
    const typed = typedRef.current;
    const meals = mealsRef.current;
    if (!section || !stage || !route || !van || !typed || !meals) return undefined;

    const routeLength = route.getTotalLength();
    route.style.strokeDasharray = String(routeLength);
    let shown = 0;
    let target = 0;
    let lastTime = 0;
    let frame = 0;
    let scene = -1;
    let typedCount = -1;
    let mealCount = -1;

    const measure = () => {
      const rect = section.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      target = travel > 0 ? clamp01(-rect.top / travel) : 0;
    };

    const draw = (p: number) => {
      const s = [0, 1, 2, 3].map((i) => sceneProgress(p, i));
      stage.style.setProperty('--p', p.toFixed(4));
      s.forEach((value, i) => stage.style.setProperty(`--s${i}`, value.toFixed(4)));
      const nextScene = Math.min(SCENES - 1, Math.floor(p * SCENES));
      if (nextScene !== scene) {
        scene = nextScene;
        stage.dataset.scene = String(scene);
      }
      const count = Math.round(clamp01(s[1] / 0.55) * MESSAGE.length);
      if (count !== typedCount) {
        typedCount = count;
        typed.textContent = MESSAGE.slice(0, count);
      }
      route.style.strokeDashoffset = String(routeLength * (1 - clamp01(s[2] / 0.75)));
      const drive = s[3] > 0 ? 1 : clamp01((s[2] - 0.2) / 0.8);
      const point = route.getPointAtLength(routeLength * drive);
      const ahead = route.getPointAtLength(Math.min(routeLength, routeLength * drive + 2));
      const angle = drive >= 1 ? 0 : (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI;
      van.setAttribute('transform', `translate(${point.x.toFixed(1)} ${point.y.toFixed(1)}) rotate(${angle.toFixed(1)})`);
      const nextMeals = Math.round(clamp01(s[3] / 0.6) * MEALS);
      if (nextMeals !== mealCount) {
        mealCount = nextMeals;
        meals.textContent = String(mealCount);
      }
    };

    const tick = (now: number) => {
      const dt = lastTime ? Math.min(0.05, (now - lastTime) / 1000) : 1 / 60;
      lastTime = now;
      const gap = target - shown;
      if (isCalmMotion() || Math.abs(gap) < SETTLED) {
        shown = target;
        draw(shown);
        frame = 0;
        lastTime = 0;
        return;
      }
      const eased = gap * (1 - Math.exp(-FOLLOW_RATE * dt));
      const limit = MAX_SPEED * dt; // the speed limiter
      shown += Math.max(-limit, Math.min(limit, eased));
      draw(shown);
      frame = requestAnimationFrame(tick);
    };

    const wake = () => {
      measure();
      if (!frame) frame = requestAnimationFrame(tick);
    };

    measure();
    shown = target;
    draw(shown);
    window.addEventListener('scroll', wake, { passive: true });
    window.addEventListener('resize', wake);
    return () => {
      window.removeEventListener('scroll', wake);
      window.removeEventListener('resize', wake);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <section ref={sectionRef} aria-label="One bakery's evening" className="relative h-[360vh]">
      <div ref={stageRef} data-scene="0" className="story-stage sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1400px] items-center gap-6 px-5 md:grid-cols-[minmax(0,0.85fr)_minmax(0,2fr)] md:px-10">
          <ol className="relative h-[220px] md:h-[300px]">
            {CAPTIONS.map((caption, index) => (
              <li key={caption.title} data-index={index} className="story-caption">
                <p className="eyebrow">
                  {caption.time} <span className="text-terracotta-deep">· {index + 1} of 4</span>
                </p>
                <h2 className="mt-2 font-display text-[clamp(1.8rem,3.4vw,3rem)] font-semibold leading-[1.02]">{caption.title}</h2>
                <p className="mt-3 max-w-[38ch] text-[1.02rem] leading-relaxed text-ink-soft">{caption.body}</p>
              </li>
            ))}
          </ol>
          <div className="relative aspect-[1200/560] w-full overflow-hidden rounded-[16px] border-[1.5px] border-ink">
            <svg viewBox="0 0 1200 560" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <Scenery routeRef={routeRef} />
              <Bakery />
              <YouthCenter />
              <g ref={vanRef} className="story-van">
                <Van />
              </g>
            </svg>
            <div className="story-phone absolute left-[34%] top-[7%] w-[32%] min-w-[190px] rounded-[16px] border-[1.5px] border-ink bg-paper p-3 text-[clamp(0.62rem,1vw,0.85rem)]">
              <p className="eyebrow !text-[0.62rem]">Golden Crust Bakery</p>
              <p className="mt-1.5 rounded-[10px_10px_10px_2px] bg-linen px-2.5 py-1.5 leading-snug">
                <span ref={typedRef} />
                <span aria-hidden className="story-caret" />
              </p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {FIELDS.map((field) => (
                  <li key={field} className="story-field rounded-full border border-line px-2 py-0.5 font-semibold">
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            <div className="story-match absolute left-[58%] top-[10%] max-w-[30%] rounded-[16px] bg-ink px-3 py-2 text-[clamp(0.6rem,0.95vw,0.82rem)] text-paper">
              <p className="font-semibold">Matched: Northside Youth Center</p>
              <p className="text-paper/75">Asked for bakery items · open until 7:00 PM</p>
            </div>
            <div className="story-meals absolute right-[3%] top-[8%] rounded-[16px] bg-sage-deep px-3 py-2 text-paper">
              <p className="font-display text-[clamp(1.4rem,3vw,2.6rem)] font-bold leading-none">
                <span ref={mealsRef}>0</span> meals
              </p>
              <p className="text-[clamp(0.58rem,0.85vw,0.75rem)] text-paper/80">from 30 lbs of bread</p>
            </div>
          </div>
        </div>
        <div aria-hidden className="story-rail absolute right-3 top-1/2 h-40 w-[3px] -translate-y-1/2 overflow-hidden rounded-full bg-line md:right-5">
          <div className="story-rail-fill h-full w-full origin-top bg-terracotta" />
        </div>
      </div>
    </section>
  );
}
