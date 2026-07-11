import type { Streak } from '../types';
import {
  getStreakPromptSubtitle,
  getStreakPromptTitle,
} from '../lib/streakUtils';

interface StreakPendingModalProps {
  streak: Streak;
  dateKey: string;
  todayKey: string;
  onSuccess: () => void;
  onFail: () => void;
}

export function StreakPendingModal({
  streak,
  dateKey,
  todayKey,
  onSuccess,
  onFail,
}: StreakPendingModalProps) {
  return (
    <div
      className="overtime-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-pending-title"
    >
      <div className="overtime-card streak-prompt-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="streak-pending-title" className="overtime-title">
          {getStreakPromptTitle(dateKey, todayKey)}
        </h2>
        <p className="overtime-text streak-prompt-message">{streak.title}</p>
        <p className="streak-prompt-hint">{getStreakPromptSubtitle(dateKey, todayKey)}</p>
        <div className="streak-actions streak-pending-actions">
          <button type="button" className="streak-btn streak-btn-ok" onClick={onSuccess}>
            ✓ Sim, cumpri
          </button>
          <button type="button" className="streak-btn streak-btn-fail" onClick={onFail}>
            Não consegui
          </button>
        </div>
      </div>
    </div>
  );
}
