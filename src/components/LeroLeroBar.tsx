import { formatElapsedMs } from '../utils';

interface LeroLeroBarProps {
  elapsedMs: number;
  isCounting: boolean;
  isPausedBySchedule: boolean;
  isFinished: boolean;
  pauseReason: { text: string; endTime: string } | null;
}

export function LeroLeroBar({
  elapsedMs,
  isCounting,
  isPausedBySchedule,
  isFinished,
  pauseReason,
}: LeroLeroBarProps) {
  let status = 'entre tarefas';
  if (isFinished) {
    status = `total à toa hoje`;
  } else if (isPausedBySchedule && pauseReason) {
    status = `pausado — ${pauseReason.text} (até ${pauseReason.endTime})`;
  } else if (!isCounting && elapsedMs > 0) {
    status = 'pausado';
  }

  return (
    <div
      className={`lero-lero ${isCounting ? 'lero-lero-active' : ''} ${isFinished ? 'lero-lero-done' : ''}`}
      aria-live="polite"
    >
      <span className="lero-lero-label">Lero lero</span>
      <span className="lero-lero-time">{formatElapsedMs(elapsedMs)}</span>
      <span className="lero-lero-status">{status}</span>
    </div>
  );
}
