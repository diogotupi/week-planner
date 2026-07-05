import { useState } from 'react';
import type { Task } from '../types';
import { formatDuration, isTaskCompleted } from '../utils';

interface TaskItemProps {
  task: Task;
  currentWeek: string;
  onToggle: (id: string) => void;
  onEdit: (task: Task) => void;
  onRemove: (id: string) => void;
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

export function TaskItem({ task, currentWeek, onToggle, onEdit, onRemove }: TaskItemProps) {
  const [animating, setAnimating] = useState(false);
  const completed = isTaskCompleted(task.completedWeeks, currentWeek);

  function handleToggle() {
    if (!completed) {
      setAnimating(true);
      setTimeout(() => setAnimating(false), 700);
    }
    onToggle(task.id);
  }

  return (
    <div className={`task-item ${completed ? 'completed' : ''} ${animating ? 'celebrate' : ''}`}>
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
        <p className="task-time">{getTimeLabel(task)}</p>
        {task.weekly && <span className="task-badge">Toda semana</span>}
      </div>

      <div className="task-actions">
        <button
          type="button"
          className="task-edit"
          onClick={() => onEdit(task)}
          aria-label="Editar tarefa"
          title="Editar"
        >
          ✎
        </button>

        <button
          type="button"
          className="task-remove"
          onClick={() => onRemove(task.id)}
          aria-label="Remover tarefa"
          title="Remover"
        >
          ×
        </button>
      </div>
    </div>
  );
}
