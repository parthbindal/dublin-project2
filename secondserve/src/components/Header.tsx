import { formatClock, WEEKDAYS } from '@/lib/format';

type Props = {
  now: number;
  weekday: number;
  isRunning: boolean;
  isFinished: boolean;
  speed: number;
  speeds: readonly number[];
  onToggleRun: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onPost: () => void;
  onExport: () => void;
};

const GHOST_BUTTON = 'rounded-full px-3 py-2 text-sm text-paper/85 ring-1 ring-paper/25 transition hover:bg-paper/10';

export function Header({
  now, weekday, isRunning, isFinished, speed, speeds, onToggleRun, onSpeedChange, onReset, onPost, onExport,
}: Props) {
  const runLabel = isFinished ? 'Evening complete' : isRunning ? 'Pause' : '▶ Run the evening';
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-4 rounded-3xl bg-ink px-5 py-4 text-paper shadow-lg md:px-7">
      <div className="mr-auto min-w-[240px]">
        <h1 className="font-display text-3xl font-black tracking-tight md:text-4xl">
          Second<span className="text-mustard">Serve</span>
        </h1>
        <p className="text-sm text-paper/70">Surplus food, matched to people who need it before closing time.</p>
      </div>
      <div className="rounded-2xl bg-paper/10 px-4 py-2 text-center">
        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-paper/60">
          {WEEKDAYS[weekday]} · Tri-Valley, CA
        </div>
        <div className="font-display text-2xl font-bold tabular-nums">{formatClock(now)}</div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onToggleRun}
          disabled={isFinished}
          className="rounded-full bg-mustard px-4 py-2 font-semibold text-ink shadow transition hover:brightness-105 disabled:opacity-60"
        >
          {runLabel}
        </button>
        <label className="flex items-center gap-1.5 text-sm text-paper/80">
          Speed
          <select
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
            className="rounded-full bg-paper/10 px-2 py-1.5 text-paper"
          >
            {speeds.map((s) => (
              <option key={s} value={s} className="text-ink">
                {s}×
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onReset} className={GHOST_BUTTON}>
          Reset
        </button>
        <button
          type="button"
          onClick={onPost}
          className="rounded-full bg-tomato px-4 py-2 font-semibold text-paper shadow transition hover:brightness-110"
        >
          + Post surplus
        </button>
        <button type="button" onClick={onExport} className={GHOST_BUTTON}>
          Export SB 1383 log
        </button>
      </div>
    </header>
  );
}
