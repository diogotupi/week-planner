import { useEffect, useRef, useState } from 'react';
import type { Task } from '../types';
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
  onToggle: (id: string) => void;
  onCancel: (id: string) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
  onStart: () => void;
  onPause: () => void;
  onFinishEarly: () => void;
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
  onToggle,
  onCancel,
  onEdit,
  onRemove,
  onStart,
  onPause,
  onFinishEarly,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: TaskItemProps) {
  const [animating, setAnimating] = useState(false);
  const wasRunning = useRef(false);
  const wasEfficient = useRef(false);
  const wasOvertimeDone = useRef(false);
  const completed = isTaskCompleted(task.completedDates, task.day);
  const efficient = isTaskEfficient(task);
  const overtimeDone = isTaskOvertimeDone(task);
  const checked = completed || efficient || overtimeDone;
  const cancelled = isTaskCancelled(task);
  const done = isTaskDoneForDay(task);
  const isToday = isTaskDayToday(task.day);
  const timeLabel = getTimeLabel(task);
  const hasDuration = task.timeMode === 'duration' && getTaskDurationMinutes(task) !== null;
  const timerActive = isRunning || isPaused;

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
      className={`task-item ${stateClass} ${animating ? 'celebrate' : ''} ${isRunning ? 'running' : ''} ${isRunning && isOvertime ? 'overtime' : ''} ${isPaused ? 'paused' : ''} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
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
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', task.id);
          // Defer state so the browser keeps the drag alive before .dragging styles apply
          requestAnimationFrame(() => onDragStart(task.id));
        }}
        onDragEnd={onDragEnd}
        aria-label="Arrastar para outro dia ou reordenar"
        title="Arrastar para outro dia ou reordenar"
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
        disabled={false}
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
        className="task-content"
        onClick={() => onEdit(task)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onEdit(task);
          }
        }}
        role="button"
        tabIndex={0}
        title="Editar tarefa"
      >
        <p className="task-text">{task.text}</p>
        {(timeLabel || task.weekly || timerActive || cancelled || efficient || overtimeDone) && (
          <div className="task-meta">
            {timerActive ? (
              <span
                className={`task-time ${isRunning ? (isOvertime ? 'task-time-overtime' : 'task-time-running') : 'task-time-paused'}`}
              >
                {isRunning ? (isOvertime ? '⏰' : '⏳') : '⏸'}{' '}
                {formatRemainingMs(remainingMs)}
                {isOvertime ? '' : ' restantes'}
              </span>
            ) : (
              timeLabel && <span className="task-time">{timeLabel}</span>
            )}
            {task.weekly && <span className="task-badge">Toda semana</span>}
            {cancelled && <span className="task-badge task-badge-cancelled">Não deu</span>}
            {efficient && (
              <>
                <span className="task-badge task-badge-efficient">Eficiente ⚡</span>
                <span className="task-praise">Mandou bem! Fez em menos tempo.</span>
              </>
            )}
            {overtimeDone && (
              <>
                <span className="task-badge task-badge-overtime">Passou do tempo</span>
                <span className="task-praise">Concluiu depois do prazo — tudo bem!</span>
              </>
            )}
          </div>
        )}
      </div>

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
    </div>
  );
}
