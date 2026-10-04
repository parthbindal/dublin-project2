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

// Night-market palette for the illustration (fixed, so the scene looks the same everywhere).
const BUILDING = 'oklch(0.23 0.006 95)';
const BUILDING_EDGE = 'oklch(0.32 0.006 95)';
const LOAF = 'oklch(0.78 0.14 68)';
const LOAF_EDGE = 'oklch(0.5 0.1 55)';
const WARM_LIGHT = 'oklch(0.88 0.13 85)';
const DOOR = 'oklch(0.18 0.006 95)';
const SIGN = 'oklch(0.15 0.006 95)';

function Defs() {
  return (
    <defs>
      <linearGradient id="story-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="oklch(0.16 0.006 95)" />
        <stop offset="0.6" stopColor="oklch(0.25 0.03 60)" />
        <stop offset="1" stopColor="oklch(0.55 0.12 55)" />
      </linearGradient>
      <linearGradient id="story-route" x1="214" y1="0" x2="1000" y2="0" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="var(--orange)" />
        <stop offset="0.5" stopColor="var(--cyan)" />
        <stop offset="1" stopColor="var(--mint)" />
      </linearGradient>
      <linearGradient id="story-awning" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="var(--lime)" />
        <stop offset="1" stopColor="var(--lime)" />
      </linearGradient>
      <linearGradient id="story-beam" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor={WARM_LIGHT} stopOpacity="0.55" />
        <stop offset="1" stopColor={WARM_LIGHT} stopOpacity="0" />
      </linearGradient>
      <radialGradient id="story-sun" cx="0.5" cy="0.5" r="0.5">
        <stop offset="0" stopColor="oklch(0.9 0.13 75)" />
        <stop offset="0.6" stopColor="oklch(0.78 0.17 45)" />
        <stop offset="1" stopColor="oklch(0.7 0.2 20)" stopOpacity="0" />
      </radialGradient>
      <filter id="story-glow" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="5" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  );
}

function Bakery() {
  return (
    <g transform="translate(70 262)">
      <rect x="0" y="40" width="200" height="150" rx="6" fill={BUILDING} stroke={BUILDING_EDGE} strokeWidth="2" />
      <path d="M-10 40 H210 L198 76 H2 Z" fill="url(#story-awning)" />
      {[22, 66, 110, 154].map((x) => (
        <path key={x} d={`M${x} 42 h22 l-2 32 h-18 z`} fill="oklch(1 0 0 / 0.18)" />
      ))}
      <rect x="22" y="2" width="156" height="30" fill={SIGN} stroke="var(--lime)" strokeWidth="1.5" />
      <text x="100" y="22" textAnchor="middle" fill="var(--lime)" fontSize="14" fontWeight="700" letterSpacing="2">
        GOLDEN CRUST
      </text>
      <rect x="18" y="94" width="98" height="70" rx="4" fill={WARM_LIGHT} opacity="0.9" filter="url(#story-glow)" />
      <g className="story-loaves-out" fill={LOAF} stroke={LOAF_EDGE} strokeWidth="1.5">
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
      <rect x="136" y="112" width="44" height="78" rx="3" fill={DOOR} stroke={BUILDING_EDGE} strokeWidth="2" />
      <circle cx="170" cy="152" r="3" fill="var(--orange)" />
    </g>
  );
}

function YouthCenter() {
  return (
    <g transform="translate(930 250)">
      <path d="M-12 72 L100 10 L212 72 Z" fill="oklch(0.27 0.01 95)" stroke="var(--fg)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M100 60 c-6-7-17-3-17 5 0 8 17 16 17 16 s17-8 17-16 c0-8-11-12-17-5z" fill="var(--pink)" filter="url(#story-glow)" />
      <rect x="0" y="72" width="200" height="130" rx="4" fill={BUILDING} stroke={BUILDING_EDGE} strokeWidth="2" />
      {[22, 128].map((x) => (
        <g key={x}>
          <rect x={x} y="94" width="50" height="40" rx="3" fill={DOOR} />
          <rect className="story-window-light" x={x} y="94" width="50" height="40" rx="3" fill={WARM_LIGHT} filter="url(#story-glow)" />
        </g>
      ))}
      <g className="story-loaves-in" fill={LOAF} stroke={LOAF_EDGE} strokeWidth="1.5">
        <ellipse cx="40" cy="124" rx="9" ry="5" />
        <ellipse cx="56" cy="124" rx="9" ry="5" />
        <ellipse cx="146" cy="124" rx="9" ry="5" />
        <ellipse cx="162" cy="124" rx="9" ry="5" />
      </g>
      <rect x="10" y="150" width="114" height="24" fill={SIGN} stroke="var(--fg)" strokeWidth="1.5" />
      <text x="67" y="167" textAnchor="middle" fill="var(--fg)" fontSize="11" fontWeight="700" letterSpacing="1.5">
        YOUTH CENTER
      </text>
      <rect x="132" y="140" width="44" height="62" rx="3" fill={DOOR} stroke={BUILDING_EDGE} strokeWidth="2" />
    </g>
  );
}

function Van() {
  return (
    <g transform="translate(-36 -40)">
      <path d="M72 30 L150 14 L150 48 Z" fill="url(#story-beam)" />
      <path d="M2 10 H48 V40 H2 Z" fill="var(--yellow)" />
      <path d="M48 18 H62 L72 29 V40 H48 Z" fill="var(--yellow)" />
      <path d="M52 21 H61 L67 28 H52 Z" fill="oklch(0.25 0.006 95)" />
      <path d="M25 22 c-3-3-8-1-8 3 0 4 8 8 8 8 s8-4 8-8 c0-4-5-6-8-3z" fill="var(--pink)" />
      <circle cx="16" cy="42" r="7" fill="oklch(0.14 0.006 95)" stroke="oklch(0.4 0.006 95)" strokeWidth="2" />
      <circle cx="58" cy="42" r="7" fill="oklch(0.14 0.006 95)" stroke="oklch(0.4 0.006 95)" strokeWidth="2" />
    </g>
  );
}

const STARS: Array<[number, number, number]> = [
  [80, 60, 1.6], [190, 120, 1.2], [300, 40, 1.8], [420, 95, 1.1], [520, 30, 1.5], [610, 140, 1.2], [700, 70, 1.9],
  [790, 30, 1.2], [860, 110, 1.4], [1040, 50, 1.7], [1120, 120, 1.2], [1160, 30, 1.4], [250, 190, 1], [980, 180, 1.1],
];

function Scenery({ routeRef }: { routeRef: RefObject<SVGPathElement | null> }) {
  return (
    <>
      <rect width="1200" height="560" fill="url(#story-sky)" />
      <rect className="story-night" width="1200" height="560" fill="oklch(0.12 0.006 95)" />
      <g className="story-stars" fill="white">
        {STARS.map(([cx, cy, r]) => (
          <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />
        ))}
      </g>
      <circle className="story-sun" cx="930" cy="190" r="90" fill="url(#story-sun)" />
      <path d="M0 330 C 180 280, 320 300, 460 320 S 760 270, 900 300 S 1120 290, 1200 300 V 560 H 0 Z" fill="oklch(0.21 0.008 95)" />
      <path d="M0 410 C 220 380, 420 400, 640 395 S 1000 380, 1200 400 V 560 H 0 Z" fill="oklch(0.17 0.005 95)" />
      <path d={ROAD} stroke="oklch(0.24 0.006 95)" strokeWidth="30" fill="none" strokeLinecap="round" />
      <path d={ROAD} stroke="oklch(1 0 0 / 0.18)" strokeWidth="2" strokeDasharray="14 14" fill="none" />
      <path ref={routeRef} d={ROAD} stroke="url(#story-route)" strokeWidth="6" fill="none" strokeLinecap="round" filter="url(#story-glow)" />
      {[
        [330, 372, 22],
        [520, 352, 28],
        [760, 348, 24],
        [880, 384, 18],
      ].map(([cx, cy, r]) => (
        <g key={cx}>
          <rect x={cx - 3} y={cy} width="6" height={r + 10} fill="oklch(0.22 0.006 95)" />
          <circle cx={cx} cy={cy} r={r} fill="oklch(0.27 0.012 95)" />
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
    <section ref={sectionRef} id="story" aria-label="One bakery's evening" className="relative h-[360vh]">
      <div ref={stageRef} data-scene="0" className="story-stage sticky top-0 flex h-[100svh] flex-col justify-center overflow-hidden">
        <div className="mx-auto grid w-full max-w-[1320px] grid-cols-1 items-center gap-8 px-5 md:grid-cols-[minmax(0,0.8fr)_minmax(0,2fr)] md:px-10">
          <ol className="relative h-[230px] md:h-[300px]">
            {CAPTIONS.map((caption, index) => (
              <li key={caption.title} data-index={index} className="story-caption">
                <p className="eyebrow">
                  02 / {caption.time} <span className="text-lime">· {index + 1} of 4</span>
                </p>
                <h2 className="display mt-3 text-[clamp(1.9rem,3.3vw,3rem)] leading-[1.02]">{caption.title}</h2>
                <p className="mt-4 max-w-[38ch] text-[1.02rem] leading-relaxed text-muted">{caption.body}</p>
              </li>
            ))}
          </ol>
          <div className="relative aspect-[1200/560] w-full overflow-hidden border border-line-strong">
            <svg viewBox="0 0 1200 560" className="absolute inset-0 h-full w-full" aria-hidden="true">
              <Defs />
              <Scenery routeRef={routeRef} />
              <Bakery />
              <YouthCenter />
              <g ref={vanRef} className="story-van">
                <Van />
              </g>
            </svg>
            <div className="story-phone story-card absolute left-[34%] top-[7%] w-[32%] min-w-[190px] p-3 text-[clamp(0.62rem,1vw,0.85rem)]">
              <p className="eyebrow !text-[0.6rem]">Golden Crust Bakery</p>
              <p className="mt-1.5 rounded-[12px_12px_12px_3px] bg-white/[0.07] px-2.5 py-1.5 leading-snug">
                <span ref={typedRef} />
                <span aria-hidden className="story-caret" />
              </p>
              <ul className="mt-2 flex flex-wrap gap-1">
                {FIELDS.map((field) => (
                  <li key={field} className="story-field bg-violet/15 px-2 py-0.5 font-semibold text-violet ring-1 ring-inset ring-violet/35">
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            <div className="story-match story-card absolute left-[58%] top-[10%] max-w-[30%] px-3 py-2 text-[clamp(0.6rem,0.95vw,0.82rem)] ring-1 ring-cyan/40">
              <p className="font-semibold text-cyan">Matched: Northside Youth Center</p>
              <p className="text-muted">Asked for bakery items · open until 7:00 PM</p>
            </div>
            <div className="story-meals story-card absolute right-[3%] top-[8%] px-4 py-3 ring-1 ring-mint/40">
              <p className="text-fresh text-[clamp(1.5rem,3.2vw,2.8rem)] font-semibold leading-none tracking-[-0.04em]">
                <span ref={mealsRef}>0</span> meals
              </p>
              <p className="mt-1 text-[clamp(0.58rem,0.85vw,0.75rem)] text-muted">from 30 lbs of bread</p>
            </div>
          </div>
        </div>
        <div aria-hidden className="absolute right-3 top-1/2 h-40 w-[3px] -translate-y-1/2 overflow-hidden bg-white/10 md:right-5">
          <div className="story-rail-fill h-full w-full origin-top bg-lime" />
        </div>
      </div>
    </section>
  );
}
