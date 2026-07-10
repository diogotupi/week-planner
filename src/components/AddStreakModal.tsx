import { useState } from 'react';

interface AddStreakModalProps {
  onAdd: (title: string, targetDays: number) => void;
  onClose: () => void;
}

export function AddStreakModal({ onAdd, onClose }: AddStreakModalProps) {
  const [title, setTitle] = useState('');
  const [days, setDays] = useState('30');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    const targetDays = parseInt(days, 10);
    if (!trimmed) {
      setError('Escreva o objetivo.');
      return;
    }
    if (!Number.isFinite(targetDays) || targetDays < 1 || targetDays > 3650) {
      setError('Informe um número de dias entre 1 e 3650.');
      return;
    }
    onAdd(trimmed, targetDays);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-streak-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="add-streak-title" className="modal-title">
          Nova streak
        </h2>
        <p className="streak-modal-lead">
          Defina um objetivo diário. No fim de cada dia, marque se conseguiu cumprir.
        </p>
        <form className="modal-form" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="streak-title">
            Objetivo
          </label>
          <input
            id="streak-title"
            className="field-input"
            type="text"
            placeholder="Ex: 100 dias sem abrir o Instagram"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError(null);
            }}
            autoFocus
          />

          <label className="field-label" htmlFor="streak-days">
            Quantos dias?
          </label>
          <input
            id="streak-days"
            className="field-input"
            type="number"
            min={1}
            max={3650}
            value={days}
            onChange={(e) => {
              setDays(e.target.value);
              setError(null);
            }}
          />

          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Começar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
