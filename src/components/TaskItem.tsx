import { useEffect, useRef, useState } from 'react';
import type { Task } from '../types';
import {
  formatDuration,
  formatRemainingMs,
  getTaskDurationMinutes,
  isTaskCompleted,
} from '../utils';

interface TaskItemProps {
  task: Task;
  currentWeek: string;
  isRunning: boolean;
  remainingMs: number;
  canStartTimer: boolean;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
  onStart: (id: string) => void;
  onStop: () => void;
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
  currentWeek,
  isRunning,
  remainingMs,
  canStartTimer,
  onToggle,
  onEdit,
  onRemove,
  onStart,
  onStop,
}: TaskItemProps) {
  const [animating, setAnimating] = useState(false);
  const wasRunning = useRef(false);
  const completed = isTaskCompleted(task.completedWeeks, currentWeek);
  const timeLabel = getTimeLabel(task);
  const hasDuration = task.timeMode === 'duration' && getTaskDurationMinutes(task) !== null;

  useEffect(() => {
    if (isRunning) {
      wasRunning.current = true;
      return;
    }

    if (wasRunning.current && completed) {
      setAnimating(true);
      wasRunning.current = false;
      const timeout = setTimeout(() => setAnimating(false), 700);
      return () => clearTimeout(timeout);
    }

    wasRunning.current = false;
  }, [isRunning, completed]);

  function handleToggle() {
    if (!completed) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 700);
    }
    onToggle(task.id);
  }

  function handleStart(e: React.MouseEvent) {
    e.stopPropagation();
    onStart(task.id);
  }

  function handleStop(e: React.MouseEvent) {
    e.stopPropagation();
    onStop();
  }

  return (
    <div
      className={`task-item ${completed ? 'completed' : ''} ${animating ? 'celebrate' : ''} ${isRunning ? 'running' : ''}`}
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
        className={`task-checkbox ${completed ? 'checked' : ''}`}
        onClick={handleToggle}
        aria-label={completed ? 'Desmarcar tarefa' : 'Marcar tarefa como concluída'}
        aria-pressed={completed}
      >
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
        {(timeLabel || task.weekly || isRunning) && (
          <div className="task-meta">
            {isRunning ? (
              <span className="task-time task-time-running">
                ⏳ {formatRemainingMs(remainingMs)} restantes
              </span>
            ) : (
              timeLabel && <span className="task-time">{timeLabel}</span>
            )}
            {task.weekly && <span className="task-badge">Toda semana</span>}
          </div>
        )}
      </div>

      <div className="task-actions">
        {hasDuration && !completed && (
          isRunning ? (
            <button
              type="button"
              className="task-stop"
              onClick={handleStop}
              aria-label="Parar timer"
              title="Parar"
            >
              ■
            </button>
          ) : (
            <button
              type="button"
              className="task-start"
              onClick={handleStart}
              disabled={!canStartTimer}
              aria-label="Iniciar tarefa"
              title={canStartTimer ? 'Iniciar' : 'Outra tarefa em andamento'}
            >
              ▶
            </button>
          )
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
