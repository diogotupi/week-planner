import { useState } from 'react';
import type { DayOfWeek, TimeMode } from '../types';
import { DAYS } from '../types';

interface AddTaskModalProps {
  day: DayOfWeek;
  onClose: () => void;
  onAdd: (task: {
    text: string;
    day: DayOfWeek;
    weekly: boolean;
    timeMode: TimeMode;
    duration?: string;
    startTime?: string;
    endTime?: string;
  }) => void;
}

type TimeOption = TimeMode | null;

export function AddTaskModal({ day, onClose, onAdd }: AddTaskModalProps) {
  const [text, setText] = useState('');
  const [weekly, setWeekly] = useState(false);
  const [timeOption, setTimeOption] = useState<TimeOption>(null);
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('30');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const canSubmit =
    text.trim().length > 0 &&
    timeOption !== null &&
    (timeOption !== 'schedule' || startTime < endTime);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || timeOption === null) return;

    onAdd({
      text: text.trim(),
      day,
      weekly,
      timeMode: timeOption,
      duration:
        timeOption === 'duration'
          ? `${durationHours}:${durationMinutes.padStart(2, '0')}`
          : undefined,
      startTime: timeOption === 'schedule' ? startTime : undefined,
      endTime: timeOption === 'schedule' ? endTime : undefined,
    });
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="modal-title"
        aria-modal="true"
      >
        <h2 id="modal-title" className="modal-title">
          Nova tarefa — {DAYS[day]}
        </h2>

        <form onSubmit={handleSubmit} className="modal-form">
          <label className="field-label" htmlFor="task-text">
            O que você precisa fazer?
          </label>
          <input
            id="task-text"
            type="text"
            className="field-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Ex: Ir ao mercado"
            autoFocus
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={weekly}
              onChange={(e) => setWeekly(e.target.checked)}
            />
            <span>Toda semana?</span>
            <span className="optional-tag">Opcional</span>
          </label>

          <p className="section-label">Como vai ser essa tarefa?</p>
          <p className="section-hint">Escolha uma das opções abaixo</p>

          <div className="time-options">
            <button
              type="button"
              className={`time-option ${timeOption === 'duration' ? 'selected' : ''}`}
              onClick={() => setTimeOption('duration')}
            >
              <span className="option-icon">⏱</span>
              <span className="option-title">Definir tempo</span>
              <span className="option-desc">Quanto tempo dedicar, sem horário fixo</span>
            </button>

            {timeOption === 'duration' && (
              <div className="time-detail">
                <label className="field-label" htmlFor="dur-hours">
                  Horas
                </label>
                <select
                  id="dur-hours"
                  className="field-select"
                  value={durationHours}
                  onChange={(e) => setDurationHours(e.target.value)}
                >
                  {Array.from({ length: 13 }, (_, i) => (
                    <option key={i} value={String(i)}>
                      {i}h
                    </option>
                  ))}
                </select>
                <label className="field-label" htmlFor="dur-minutes">
                  Minutos
                </label>
                <select
                  id="dur-minutes"
                  className="field-select"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                >
                  {['00', '15', '30', '45'].map((m) => (
                    <option key={m} value={m}>
                      {m}min
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              className={`time-option ${timeOption === 'schedule' ? 'selected' : ''}`}
              onClick={() => setTimeOption('schedule')}
            >
              <span className="option-icon">🕐</span>
              <span className="option-title">Definir horário</span>
              <span className="option-desc">Início e fim da tarefa</span>
            </button>

            {timeOption === 'schedule' && (
              <div className="time-detail">
                <label className="field-label" htmlFor="start-time">
                  Início
                </label>
                <input
                  id="start-time"
                  type="time"
                  className="field-input"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
                <label className="field-label" htmlFor="end-time">
                  Fim
                </label>
                <input
                  id="end-time"
                  type="time"
                  className="field-input"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
                {startTime >= endTime && (
                  <p className="field-error">O horário de fim deve ser depois do início</p>
                )}
              </div>
            )}

            <button
              type="button"
              className={`time-option ${timeOption === 'all-day' ? 'selected' : ''}`}
              onClick={() => setTimeOption('all-day')}
            >
              <span className="option-icon">☀️</span>
              <span className="option-title">Dia todo</span>
              <span className="option-desc">Dedicar o dia inteiro a essa tarefa</span>
            </button>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit}>
              Adicionar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
