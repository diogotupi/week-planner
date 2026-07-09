import { formatElapsedMs } from '../utils';

interface LeroLeroBarProps {
  elapsedMs: number;
  isCounting: boolean;
  isPausedBySchedule: boolean;
  isManuallyPaused: boolean;
  isFinished: boolean;
  canTogglePause: boolean;
  pauseReason: { text: string; endTime: string } | null;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
}

export function LeroLeroBar({
  elapsedMs,
  isCounting,
  isPausedBySchedule,
  isManuallyPaused,
  isFinished,
  canTogglePause,
  pauseReason,
  onPause,
  onResume,
  onReset,
}: LeroLeroBarProps) {
  let status = 'entre tarefas';
  if (isFinished) {
    status = `total à toa hoje`;
  } else if (isManuallyPaused) {
    status = 'pausado';
  } else if (isPausedBySchedule && pauseReason) {
    status = `pausado — ${pauseReason.text} (até ${pauseReason.endTime})`;
  } else if (!isCounting && elapsedMs > 0) {
    status = 'pausado';
  }

  function handleReset() {
    if (!window.confirm('Zerar o lero lero de hoje?')) return;
    onReset();
  }

  return (
    <div
      className={`lero-lero ${isCounting ? 'lero-lero-active' : ''} ${isFinished ? 'lero-lero-done' : ''}`}
      aria-live="polite"
    >
      <span className="lero-lero-label">Lero lero</span>
      <span className="lero-lero-time">{formatElapsedMs(elapsedMs)}</span>
      <span className="lero-lero-status">{status}</span>

      <div className="lero-lero-actions">
        {canTogglePause && (
          <button
            type="button"
            className="lero-lero-btn"
            onClick={isCounting ? onPause : onResume}
            aria-label={isCounting ? 'Pausar lero lero' : 'Retomar lero lero'}
            title={isCounting ? 'Pausar' : 'Retomar'}
          >
            {isCounting ? '⏸' : '▶'}
          </button>
        )}
        <button
          type="button"
          className="lero-lero-btn lero-lero-btn-reset"
          onClick={handleReset}
          aria-label="Zerar lero lero"
          title="Zerar"
        >
          ↺
        </button>
      </div>
    </div>
  );
}
