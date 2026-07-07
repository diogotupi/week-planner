import { useEffect, useRef, useState } from 'react';
import type { Task } from '../types';
import { useWeekViewMode } from '../context/PlannerSettingsContext';
import {
  formatDuration,
  formatRemainingMs,
  getTaskDurationMinutes,
  isTaskCancelled,
  isTaskCompleted,
  isTaskDayToday,
  isTaskDoneForDay,
  isTaskEfficient,
  isTaskOvertimeDone,
} from '../utils';
import { AdjustTimerModal } from './AdjustTimerModal';

interface TaskItemProps {
  task: Task;
  isRunning: boolean;
  isPaused: boolean;
  isOvertime: boolean;
  remainingMs: number;
  canStartTimer: boolean;
  anotherTaskRunning: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  frozen: boolean;
  onToggle: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
  onFinishEarly: () => void;
  onAdjustTimer: (remainingMs: number) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent) => void;
}

function getTimeLabel(task: Task): string {
  switch (task.timeMode) {
    case 'duration':
      return task.duration ? `⏱ ${formatDuration(task.duration)}` : '';
    case 'schedule':
      return task.startTime && task.endTime
        ? `🕐 ${task.startTime} – ${task.endTime}`
        : '';
    case 'all-day':
      return '☀️ Dia todo';
  }
}

export function TaskItem({
  task,
  isRunning,
  isPaused,
  isOvertime,
  remainingMs,
  canStartTimer,
  anotherTaskRunning,
  isDragging,
  isDragOver,
  frozen,
  onToggle,
  onCancel,
  onEdit,
  onRemove,
  onStart,
  onPause,
  onFinishEarly,
  onAdjustTimer,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TaskItemProps) {
  const weekViewMode = useWeekViewMode();
  const [animating, setAnimating] = useState(false);
  const [showAdjustTimer, setShowAdjustTimer] = useState(false);
  const wasRunning = useRef(false);
  const wasEfficient = useRef(false);
  const wasOvertimeDone = useRef(false);
  const completed = isTaskCompleted(task.completedDates, task.day, new Date(), weekViewMode);
  const efficient = isTaskEfficient(task, new Date(), weekViewMode);
  const overtimeDone = isTaskOvertimeDone(task, new Date(), weekViewMode);
  const checked = completed || efficient || overtimeDone;
  const cancelled = isTaskCancelled(task, new Date(), weekViewMode);
  const done = isTaskDoneForDay(task, new Date(), weekViewMode);
  const isToday = isTaskDayToday(task.day, new Date(), weekViewMode);
  const timeLabel = getTimeLabel(task);
  const hasDuration = task.timeMode === 'duration' && getTaskDurationMinutes(task) !== null;
  const durationMinutes = getTaskDurationMinutes(task) ?? 0;
  const timerActive = isRunning || isPaused;
  const canAdjustTimer =
    hasDuration && isToday && !frozen && (timerActive || efficient);

  useEffect(() => {
    if (isRunning) {
      wasRunning.current = true;
      return;
    }

    if (wasRunning.current && (completed || efficient || overtimeDone)) {
      setAnimating(true);
      wasRunning.current = false;
      const timeout = setTimeout(() => setAnimating(false), 700);
      return () => clearTimeout(timeout);
    }

    wasRunning.current = false;
  }, [isRunning, completed, efficient, overtimeDone]);

  useEffect(() => {
    if (overtimeDone && !wasOvertimeDone.current) {
      setAnimating(true);
      const timeout = setTimeout(() => setAnimating(false), 700);
      wasOvertimeDone.current = overtimeDone;
      return () => clearTimeout(timeout);
    }
    wasOvertimeDone.current = overtimeDone;
  }, [overtimeDone]);

  useEffect(() => {
    if (efficient && !wasEfficient.current) {
      setAnimating(true);
      const timeout = setTimeout(() => setAnimating(false), 700);
      wasEfficient.current = efficient;
      return () => clearTimeout(timeout);
    }
    wasEfficient.current = efficient;
  }, [efficient]);

  function handleToggle() {
    if (frozen) return;
    if (cancelled) {
      onCancel(task.id);
      return;
    }
    if (!checked) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 700);
    }
    onToggle(task.id);
  }

  const stateClass = cancelled
    ? 'cancelled'
    : efficient
      ? 'efficient'
      : overtimeDone
        ? 'overtime-done'
        : completed
          ? 'completed'
          : '';

  return (
    <div
      data-task-id={task.id}
      className={`task-item ${stateClass} ${frozen ? 'frozen' : ''} ${animating ? 'celebrate' : ''} ${isRunning ? 'running' : ''} ${isRunning && isOvertime ? 'overtime' : ''} ${isPaused ? 'paused' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={(e) => onDragOver(e, task.id)}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop(e);
      }}
    >
      {animating && (
        <div className="confetti" aria-hidden="true">
          {Array.from({ length: 8 }, (_, i) => (
            <span key={i} className={`confetti-piece c${i}`} />
          ))}
        </div>
      )}

      <button
        type="button"
        className="task-drag-handle"
        draggable={!frozen}
        onDragStart={(e) => {
          if (frozen) {
            e.preventDefault();
            return;
          }
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', task.id);
          requestAnimationFrame(() => onDragStart(task.id));
        }}
        onDragEnd={onDragEnd}
        aria-label={
          frozen
            ? 'Dia congelado — não é possível arrastar'
            : 'Arrastar para outro dia ou reordenar'
        }
        title={
          frozen
            ? 'Dia congelado'
            : 'Arrastar para outro dia ou reordenar'
        }
        disabled={frozen}
      >
        ⠿
      </button>

      <button
        type="button"
        className={`task-checkbox ${checked ? 'checked' : ''} ${efficient ? 'efficient-check' : ''} ${overtimeDone ? 'overtime-check' : ''} ${cancelled ? 'cancelled-check' : ''}`}
        onClick={handleToggle}
        aria-label={
          cancelled
            ? 'Desfazer cancelamento'
            : efficient || overtimeDone || completed
              ? 'Desmarcar tarefa'
              : 'Marcar tarefa como concluída'
        }
        aria-pressed={done && !cancelled}
        disabled={frozen}
      >
        {cancelled ? (
          <span className="cancel-icon" aria-hidden="true">
            /
          </span>
        ) : (
          <svg viewBox="0 0 24 24" className="check-icon" aria-hidden="true">
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
              className="check-path"
            />
          </svg>
        )}
      </button>

      <div
        className={`task-content ${frozen ? 'task-content-readonly' : ''}`}
        onClick={() => {
          if (!frozen) onEdit(task);
        }}
        onKeyDown={(e) => {
          if (frozen) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit(task);
          }
        }}
        role={frozen ? undefined : 'button'}
        tabIndex={frozen ? undefined : 0}
        title={frozen ? 'Dia congelado' : 'Editar tarefa'}
      >
        <p className="task-text">{task.text}</p>
        {(timeLabel || task.weekly || timerActive || cancelled || efficient || overtimeDone) && (
          <div className="task-meta">
            {timerActive ? (
              <button
                type="button"
                className={`task-time task-time-button ${isRunning ? (isOvertime ? 'task-time-overtime' : 'task-time-running') : 'task-time-paused'}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowAdjustTimer(true);
                }}
                title="Ajustar tempo restante"
              >
                {isRunning ? (isOvertime ? '⏰' : '⏳') : '⏸'}{' '}
                {formatRemainingMs(remainingMs)}
                {isOvertime ? '' : ' restantes'}
              </button>
            ) : (
              timeLabel && <span className="task-time">{timeLabel}</span>
            )}
            {efficient && (
              <>
                <span className="task-badge task-badge-efficient">Eficiente ⚡</span>
                <span className="task-praise">Mandou bem! Fez em menos tempo.</span>
                {canAdjustTimer && (
                  <button
                    type="button"
                    className="task-adjust-time"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAdjustTimer(true);
                    }}
                  >
                    Ajustar tempo
                  </button>
                )}
              </>
            )}
            {overtimeDone && (
              <>
                <span className="task-badge task-badge-overtime">Passou do tempo</span>
                <span className="task-praise">Concluiu depois do prazo — tudo bem!</span>
              </>
            )}
            {cancelled && <span className="task-badge task-badge-cancelled">Não deu</span>}
            {task.weekly && <span className="task-badge">Toda semana</span>}
          </div>
        )}
      </div>

      {!frozen && (
      <div className="task-actions">
        {isToday && (!done || cancelled) && (
          <button
            type="button"
            className={`task-cancel ${cancelled ? 'task-cancel-active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onCancel(task.id);
            }}
            aria-label={cancelled ? 'Desfazer cancelamento' : 'Não deu tempo hoje'}
            title={cancelled ? 'Desfazer cancelamento' : 'Não deu tempo hoje'}
          >
            ⊘
          </button>
        )}

        {hasDuration && !done && (
          <>
            {isRunning ? (
              <>
                {!isOvertime && (
                  <button
                    type="button"
                    className="task-pause"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPause();
                    }}
                    aria-label="Pausar tarefa"
                    title="Pausar"
                  >
                    ⏸
                  </button>
                )}
                <button
                  type="button"
                  className="task-finish-early"
                  onClick={(e) => {
                    e.stopPropagation();
                    onFinishEarly();
                  }}
                  aria-label={isOvertime ? 'Finalizar tarefa' : 'Finalizar antes do tempo'}
                  title={isOvertime ? 'Finalizar tarefa' : 'Finalizar antes do tempo ⚡'}
                >
                  ✓
                </button>
              </>
            ) : (
              <button
                type="button"
                className="task-start"
                onClick={(e) => {
                  e.stopPropagation();
                  onStart();
                }}
                disabled={!canStartTimer}
                aria-label={isPaused ? 'Continuar tarefa' : 'Iniciar tarefa'}
                title={
                  isPaused
                    ? 'Continuar'
                    : anotherTaskRunning
                      ? 'Iniciar (pausa a tarefa atual)'
                      : 'Iniciar'
                }
              >
                ▶
              </button>
            )}
          </>
        )}

        <button
          type="button"
          className="task-edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(task);
          }}
          aria-label="Editar tarefa"
          title="Editar"
        >
          ✎
        </button>

        <button
          type="button"
          className="task-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(task.id);
          }}
          aria-label="Remover tarefa"
          title="Remover"
        >
          ×
        </button>
      </div>
      )}

      {showAdjustTimer && canAdjustTimer && (
        <AdjustTimerModal
          taskName={task.text}
          durationMinutes={durationMinutes}
          currentRemainingMs={
            timerActive
              ? remainingMs
              : efficient
                ? durationMinutes * 60 * 1000
                : 0
          }
          wasFinishedEarly={efficient}
          onSave={(remainingMs) => {
            onAdjustTimer(remainingMs);
            setShowAdjustTimer(false);
          }}
          onClose={() => setShowAdjustTimer(false)}
        />
      )}
    </div>
  );
}
