import type { Strike } from '../types';
import {
  getStrikeCompletionMessage,
  getStrikeSuccessMessage,
} from '../lib/strikeMessages';

interface StrikeSuccessModalProps {
  strike: Strike;
  dateKey: string;
  completed: boolean;
  onClose: () => void;
}

export function StrikeSuccessModal({
  strike,
  dateKey,
  completed,
  onClose,
}: StrikeSuccessModalProps) {
  if (completed) {
    return (
      <div
        className="overtime-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="strike-done-title"
        onClick={onClose}
      >
        <div className="overtime-card strike-prompt-card" onClick={(e) => e.stopPropagation()}>
          <h2 id="strike-done-title" className="overtime-title">
            Missão cumprida
          </h2>
          <p className="overtime-text strike-prompt-message">
            {getStrikeCompletionMessage(strike.id)}
          </p>
          <div className="strike-result-stats">
            <p>
              <strong>{strike.title}</strong>
            </p>
            <p>
              {strike.targetDays} dias · 100% cumpridos
            </p>
          </div>
          <p className="strike-prompt-hint">
            Quando estiver pronto para tentar de novo — ou começar outro objetivo — é só
            adicionar um novo strike.
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
      aria-labelledby="strike-ok-title"
      onClick={onClose}
    >
      <div className="overtime-card strike-prompt-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="strike-ok-title" className="overtime-title">
          Parabéns
        </h2>
        <p className="overtime-text strike-prompt-message">
          {getStrikeSuccessMessage(strike.id, dateKey)}
        </p>
        <p className="strike-prompt-hint">
          Dia <strong>{strike.completedDays}</strong> de <strong>{strike.targetDays}</strong> —{' '}
          {strike.title}
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
