import type { Strike } from '../types';
import { getStrikeFailMessage } from '../lib/strikeMessages';

interface StrikeFailModalProps {
  strike: Strike;
  dateKey: string;
  onContinue: () => void;
  onReset: () => void;
  onClose: () => void;
}

export function StrikeFailModal({
  strike,
  dateKey,
  onContinue,
  onReset,
  onClose,
}: StrikeFailModalProps) {
  const message = getStrikeFailMessage(strike.id, dateKey);

  return (
    <div className="overtime-overlay" role="dialog" aria-modal="true" aria-labelledby="strike-fail-title">
      <div className="overtime-card strike-prompt-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="strike-fail-title" className="overtime-title">
          Um dia não te define
        </h2>
        <p className="overtime-text strike-prompt-message">{message}</p>
        <p className="strike-prompt-hint">
          Você está no dia <strong>{strike.completedDays}</strong> de{' '}
          <strong>{strike.targetDays}</strong> em “{strike.title}”.
          Quer continuar de onde parou, ou recomeçar do dia 1?
        </p>
        <div className="overtime-actions strike-fail-actions">
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
        <p className="strike-prompt-encourage">
          Sempre que puder, escolha continuar. Um dia só não apaga o caminho.
        </p>
      </div>
    </div>
  );
}
