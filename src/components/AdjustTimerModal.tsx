import { useState } from 'react';
import { formatMsToTimerInput, formatTotalMinutes, parseTimerInputToMs } from '../utils';

interface AdjustTimerModalProps {
  taskName: string;
  durationMinutes: number;
  currentRemainingMs: number;
  wasFinishedEarly: boolean;
  onSave: (remainingMs: number) => void;
  onClose: () => void;
}

export function AdjustTimerModal({
  taskName,
  durationMinutes,
  currentRemainingMs,
  wasFinishedEarly,
  onSave,
  onClose,
}: AdjustTimerModalProps) {
  const [value, setValue] = useState(() =>
    wasFinishedEarly ? '' : formatMsToTimerInput(currentRemainingMs),
  );
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const remainingMs = parseTimerInputToMs(value);
    if (remainingMs === null) {
      setError('Use o formato horas:minutos (ex: 0:25 ou 1:30)');
      return;
    }
    onSave(remainingMs);
  }

  return (
    <div
      className="overtime-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adjust-timer-title"
      onClick={onClose}
    >
      <div className="overtime-card adjust-timer-card" onClick={(e) => e.stopPropagation()}>
        <h2 id="adjust-timer-title" className="overtime-title">
          Ajustar tempo
        </h2>
        <p className="overtime-text">
          {wasFinishedEarly ? (
            <>
              Você finalizou <strong>{taskName}</strong> antes do tempo. Informe quanto tempo
              ainda restava para retomar o contador.
            </>
          ) : (
            <>
              Corrija o tempo restante de <strong>{taskName}</strong>.
            </>
          )}
        </p>
        <p className="adjust-timer-hint">
          Duração da tarefa: {formatTotalMinutes(durationMinutes)}
        </p>
        <form className="adjust-timer-form" onSubmit={handleSubmit}>
          <label className="adjust-timer-label" htmlFor="adjust-timer-remaining">
            Tempo restante (h:mm)
          </label>
          <input
            id="adjust-timer-remaining"
            className="adjust-timer-input"
            type="text"
            inputMode="numeric"
            placeholder="0:25"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            autoFocus
          />
          {error && (
            <p className="adjust-timer-error" role="alert">
              {error}
            </p>
          )}
          <div className="overtime-actions">
            <button type="button" className="btn-overtime-more" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-overtime-finished">
              Salvar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
