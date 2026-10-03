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
  return (
    <div className="sticky top-0 z-[700] -mx-5 border-y-[1.5px] border-ink bg-paper px-5 py-3 md:-mx-10 md:px-10">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="mr-auto flex min-w-0 items-baseline gap-3">
          <span className="font-display text-3xl font-semibold tabular-nums">{formatClock(now)}</span>
          <span className="eyebrow truncate">
            {WEEKDAYS[weekday]} in {areaName}
          </span>
        </div>
        <button
          type="button"
          onClick={onToggleRun}
          disabled={isFinished}
          className={`btn btn-honey ${!isRunning && !isFinished ? 'animate-nudge' : ''}`}
        >
          <Icon name={isRunning ? 'pause' : 'play'} className="h-4 w-4" />
          {runLabel}
        </button>
        <label className="flex items-center gap-1.5 text-sm text-ink-soft">
          Speed
          <select value={speed} onChange={(event) => onSpeedChange(Number(event.target.value))} className="field px-2 py-1.5 text-ink">
            {speeds.map((s) => (
              <option key={s} value={s}>
                {s}×
              </option>
            ))}
          </select>
        </label>
        <button type="button" onClick={onReset} className="btn btn-quiet">
          <Icon name="restart" className="h-4 w-4" />
          Start over
        </button>
        <button type="button" onClick={onPost} className="btn btn-primary">
          <Icon name="plus" className="h-4 w-4" />
          Share extra food
        </button>
        <button
          type="button"
          onClick={onExport}
          className="btn btn-quiet"
          title="A spreadsheet of tonight's donations: who gave, who received, food types and pounds. California's SB 1383 law asks large food businesses to keep records like these."
        >
          <Icon name="download" className="h-4 w-4" />
          Donation records
        </button>
      </div>
    </div>
  );
}
