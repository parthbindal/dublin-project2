import { formatClock, WEEKDAYS } from '@/lib/format';
import { Icon } from './ui';

type Props = {
  now: number;
  weekday: number;
  areaName: string;
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

/** The sticky control bar for the live evening: clock, play, speed and actions. */
export function ControlBar({
  now, weekday, areaName, isRunning, isFinished, speed, speeds, onToggleRun, onSpeedChange, onReset, onPost, onExport,
}: Props) {
  const runLabel = isFinished ? 'Evening finished' : isRunning ? 'Pause' : 'Play the evening';
  const liveTone = isRunning ? 'text-mint' : 'text-faint';
  return (
    <div className="glass sticky top-3 z-[700] rounded-[20px] px-3 py-2.5 md:px-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="mr-auto flex min-w-0 items-center gap-3">
          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white/5 ring-1 ring-line-strong ${liveTone}`}>
            {isRunning ? <span className="live-dot" /> : <span className="h-2 w-2 rounded-full bg-current" />}
          </span>
          <div className="min-w-0 leading-tight">
            <p className="font-mono text-2xl font-medium tabular-nums tracking-tight">{formatClock(now)}</p>
            <p className="eyebrow truncate !text-[0.62rem]">
              {isRunning ? 'Live · ' : ''}
              {WEEKDAYS[weekday]} in {areaName}
            </p>
          </div>
        </div>
        <button type="button" onClick={onToggleRun} disabled={isFinished} className="btn btn-play">
          <Icon name={isRunning ? 'pause' : 'play'} className="h-4 w-4" />
          {runLabel}
        </button>
        <div role="group" aria-label="Playback speed" className="flex items-center rounded-full bg-white/5 p-1 ring-1 ring-inset ring-line-strong">
          {speeds.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onSpeedChange(s)}
              aria-pressed={speed === s}
              className={`rounded-full px-2.5 py-1 font-mono text-xs font-medium transition-colors ${
                speed === s ? 'bg-fg text-bg' : 'text-muted hover:text-fg'
              }`}
            >
              {s}×
            </button>
          ))}
        </div>
        <button type="button" onClick={onReset} className="btn btn-glass" title="Start the evening over">
          <Icon name="restart" className="h-4 w-4" />
          <span className="hidden sm:inline">Start over</span>
        </button>
        <button
          type="button"
          onClick={onExport}
          className="btn btn-glass"
          title="A spreadsheet of tonight's donations: who gave, who received, food types and pounds. California's SB 1383 law asks large food businesses to keep records like these."
        >
          <Icon name="download" className="h-4 w-4" />
          <span className="hidden sm:inline">Donation records</span>
        </button>
        <button type="button" onClick={onPost} className="btn btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Share extra food
        </button>
      </div>
    </div>
  );
}
