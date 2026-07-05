import { useState } from 'react';
import type { DayOfWeek, Task, TimeMode } from '../types';
import { DAYS } from '../types';
import type { NewTaskInput, UpdateScope } from '../hooks/useTasks';
import { getTasksInGroup } from '../utils';

interface AddTaskModalProps {
  initialDay?: DayOfWeek;
  task?: Task;
  allTasks?: Task[];
  onClose: () => void;
  onAdd: (task: NewTaskInput) => void;
  onUpdate?: (id: string, task: NewTaskInput, scope: UpdateScope) => void;
}

type TimeOption = TimeMode | null;

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function parseDuration(duration?: string) {
  const [hours = '0', minutes = '30'] = (duration ?? '0:30').split(':');
  return { hours, minutes: minutes.padStart(2, '0') };
}

export function AddTaskModal({
  initialDay,
  task,
  allTasks = [],
  onClose,
  onAdd,
  onUpdate,
}: AddTaskModalProps) {
  const isEditing = task !== undefined;
  const parsedDuration = parseDuration(task?.duration);
  const siblings = task ? getTasksInGroup(task, allTasks) : [];
  const hasSiblings = siblings.length > 1;

  const [text, setText] = useState(task?.text ?? '');
  const [selectedDays, setSelectedDays] = useState<Set<DayOfWeek>>(
    () => new Set(task ? [task.day] : initialDay !== undefined ? [initialDay] : []),
  );
  const [weekly, setWeekly] = useState(task?.weekly ?? false);
  const [timeOption, setTimeOption] = useState<TimeOption>(task?.timeMode ?? null);
  const [durationHours, setDurationHours] = useState(parsedDuration.hours);
  const [durationMinutes, setDurationMinutes] = useState(parsedDuration.minutes);
  const [startTime, setStartTime] = useState(task?.startTime ?? '09:00');
  const [endTime, setEndTime] = useState(task?.endTime ?? '10:00');
  const [showScopeChoice, setShowScopeChoice] = useState(false);
  const [pendingInput, setPendingInput] = useState<NewTaskInput | null>(null);

  function toggleDay(day: DayOfWeek) {
    if (isEditing) {
      setSelectedDays(new Set([day]));
      return;
    }

    setSelectedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  const canSubmit =
    text.trim().length > 0 &&
    selectedDays.size > 0 &&
    timeOption !== null &&
    (timeOption !== 'schedule' || startTime < endTime);

  function buildInput(): NewTaskInput {
    return {
      text: text.trim(),
      days: Array.from(selectedDays).sort((a, b) => a - b),
      weekly,
      timeMode: timeOption!,
      duration:
        timeOption === 'duration'
          ? `${durationHours}:${durationMinutes.padStart(2, '0')}`
          : undefined,
      startTime: timeOption === 'schedule' ? startTime : undefined,
      endTime: timeOption === 'schedule' ? endTime : undefined,
    };
  }

  function applyUpdate(scope: UpdateScope) {
    if (!task || !onUpdate || !pendingInput) return;
    onUpdate(task.id, pendingInput, scope);
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || timeOption === null) return;

    const input = buildInput();

    if (isEditing && task && onUpdate) {
      if (hasSiblings) {
        setPendingInput(input);
        setShowScopeChoice(true);
        return;
      }
      onUpdate(task.id, input, 'single');
    } else {
      onAdd(input);
    }
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
          {showScopeChoice ? 'Onde aplicar?' : isEditing ? 'Editar tarefa' : 'Nova tarefa'}
        </h2>

        {showScopeChoice ? (
          <div className="scope-choice">
            <p className="scope-choice-text">
              Esta tarefa aparece em <strong>{siblings.length} dias</strong> da semana.
              Deseja alterar apenas neste dia ou em todos?
            </p>
            {hasSiblings && (
              <p className="scope-choice-hint">
                Ao escolher &quot;Todos os dias&quot;, o dia de cada tarefa não muda — só o
                conteúdo (nome, tempo, horário etc.).
              </p>
            )}
            <div className="scope-choice-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={() => applyUpdate('single')}
              >
                Apenas este dia
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => applyUpdate('all')}
              >
                Todos os dias ({siblings.length})
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setShowScopeChoice(false);
                  setPendingInput(null);
                }}
              >
                Voltar
              </button>
            </div>
          </div>
        ) : (
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
            placeholder="Ex: Academia"
            autoFocus
          />

          <p className="section-label">{isEditing ? 'Qual dia?' : 'Quais dias?'}</p>
          <p className="section-hint">
            {isEditing
              ? hasSiblings
                ? 'Só muda se escolher "Apenas este dia" ao salvar'
                : 'Selecione o dia desta tarefa'
              : 'Selecione um ou mais dias'}
          </p>

          <div className="day-picker" role="group" aria-label="Selecionar dias">
            {ALL_DAYS.map((day) => (
              <button
                key={day}
                type="button"
                className={`day-pick ${selectedDays.has(day) ? 'selected' : ''}`}
                onClick={() => toggleDay(day)}
                aria-pressed={selectedDays.has(day)}
                title={DAYS[day]}
              >
                <span className="day-pick-short">{DAY_SHORT[day]}</span>
                <span className="day-pick-full">{DAYS[day]}</span>
              </button>
            ))}
          </div>

          {selectedDays.size === 0 && (
            <p className="field-error">Selecione pelo menos um dia</p>
          )}

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
              {isEditing ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
        )}
      </div>
    </div>
  );
}
