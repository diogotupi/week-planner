import type { Streak } from '../types';
import { getStreakFailMessage } from '../lib/streakMessages';

interface StreakFailModalProps {
  streak: Streak;
  dateKey: string;
  onContinue: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function StreakFailModal({
  streak,
  dateKey,
  onContinue,
  onReset,
  onClose,
}: StreakFailModalProps) {
  const message = getStreakFailMessage(streak.id, dateKey);

  return (
    <div className="overtime-overlay" role="dialog" aria-modal="true" aria-labelledby="streak-fail-title">
      <div className="overtime-card streak-prompt-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="streak-fail-title" className="overtime-title">
          Um dia não te define
        </h2>
        <p className="overtime-text streak-prompt-message">{message}</p>
        <p className="streak-prompt-hint">
          Você está no dia <strong>{streak.completedDays}</strong> de{' '}
          <strong>{streak.targetDays}</strong> em “{streak.title}”.
          Quer continuar de onde parou, ou recomeçar do dia 1?
        </p>
        <div className="overtime-actions streak-fail-actions">
          <button
            type="button"
            className="btn-overtime-finished"
            onClick={() => {
              onContinue();
              onClose();
            }}
          >
            Continuar a sequência
          </button>
          <button
            type="button"
            className="btn-overtime-more"
            onClick={() => {
              onReset();
              onClose();
            }}
          >
            Zerar e recomeçar
          </button>
        </div>
        <p className="streak-prompt-encourage">
          Sempre que puder, escolha continuar. Um dia só não apaga o caminho.
        </p>
      </div>
    </div>
  );
}
