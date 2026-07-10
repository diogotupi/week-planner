import type { Streak } from '../types';
import {
  getStreakCompletionMessage,
  getStreakSuccessMessage,
} from '../lib/streakMessages';

interface StreakSuccessModalProps {
  streak: Streak;
  dateKey: string;
  completed: boolean;
  onClose: () => void;
}

export function StreakSuccessModal({
  streak,
  dateKey,
  completed,
  onClose,
}: StreakSuccessModalProps) {
  if (completed) {
    return (
      <div
        className="overtime-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="streak-done-title"
        onClick={onClose}
      >
        <div className="overtime-card streak-prompt-card" onClick={(e) => e.stopPropagation()}>
          <h2 id="streak-done-title" className="overtime-title">
            Missão cumprida
          </h2>
          <p className="overtime-text streak-prompt-message">
            {getStreakCompletionMessage(streak.id)}
          </p>
          <div className="streak-result-stats">
            <p>
              <strong>{streak.title}</strong>
            </p>
            <p>
              {streak.targetDays} dias · 100% cumpridos
            </p>
          </div>
          <p className="streak-prompt-hint">
            Quando estiver pronto para tentar de novo — ou começar outro objetivo — é só
            adicionar uma nova streak.
          </p>
          <div className="overtime-actions">
            <button type="button" className="btn-overtime-finished" onClick={onClose}>
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overtime-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="streak-ok-title"
      onClick={onClose}
    >
      <div className="overtime-card streak-prompt-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="streak-ok-title" className="overtime-title">
          Parabéns
        </h2>
        <p className="overtime-text streak-prompt-message">
          {getStreakSuccessMessage(streak.id, dateKey)}
        </p>
        <p className="streak-prompt-hint">
          Dia <strong>{streak.completedDays}</strong> de <strong>{streak.targetDays}</strong> —{' '}
          {streak.title}
        </p>
        <div className="overtime-actions">
          <button type="button" className="btn-overtime-finished" onClick={onClose}>
            Seguir em frente
          </button>
        </div>
      </div>
    </div>
  );
}
