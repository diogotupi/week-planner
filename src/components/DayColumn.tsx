import { useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { DAYS } from '../types';
import type { NewTaskInput, UpdateScope } from '../hooks/useTasks';
import { useWeekViewMode } from '../context/PlannerSettingsContext';
import { formatColumnDate, getDateForDayOfWeek, isDayFrozen, isDayToday } from '../utils';
import { AddTaskModal } from './AddTaskModal';
import { DaySummary } from './DaySummary';
import { TaskItem } from './TaskItem';

export interface DragTarget {
  day: DayOfWeek;
  beforeId: string | null;
}

interface DayColumnProps {
  day: DayOfWeek;
  tasks: Task[];
  allTasks: Task[];
  activeTaskId: string | null;
  remainingMs: number;
  getPausedRemaining: (taskId: string) => number | null;
  isTaskPaused: (taskId: string) => boolean;
  isTaskOvertime: (taskId: string) => boolean;
  draggingTaskId: string | null;
  dragTarget: DragTarget | null;
  onAdd: (task: NewTaskInput) => void;
  onUpdate: (id: string, task: NewTaskInput, scope: UpdateScope) => void;
  onToggle: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onMoveTask: (taskId: string, toDay: DayOfWeek, beforeId: string | null) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onDragTargetChange: (target: DragTarget | null) => void;
  onStartTask: (taskId: string) => void;
  onPauseTask: () => void;
  onFinishEarly: (taskId: string) => void;
  onAdjustTimer: (taskId: string, remainingMs: number) => void;
}

export function DayColumn({
  day,
  tasks,
  allTasks,
  activeTaskId,
  remainingMs,
  getPausedRemaining,
  isTaskPaused,
  isTaskOvertime,
  draggingTaskId,
  dragTarget,
  onAdd,
  onUpdate,
  onToggle,
  onCancel,
  onRemove,
  onMoveTask,
  onDragStart,
  onDragEnd,
  onDragTargetChange,
  onStartTask,
  onPauseTask,
  onFinishEarly,
  onAdjustTimer,
}: DayColumnProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const weekViewMode = useWeekViewMode();
  const isToday = isDayToday(day);
  const columnDate = getDateForDayOfWeek(day, new Date(), weekViewMode);
  const frozen = isDayFrozen(day, new Date(), weekViewMode);
  const isColumnTarget = !frozen && dragTarget?.day === day && dragTarget.beforeId === null;

  function resolveDragTarget(e: React.DragEvent): DragTarget | null {
    if (!draggingTaskId || frozen) return null;

    const container = (e.currentTarget as HTMLElement).closest('.day-tasks');
    if (!container) return null;

    const clientY = e.clientY;

    for (const task of tasks) {
      const el = container.querySelector<HTMLElement>(`[data-task-id="${task.id}"]`);
      if (!el) continue;

      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      if (clientY < mid) {
        return { day, beforeId: task.id };
      }
    }

    return { day, beforeId: null };
  }

  function handleColumnDragOver(e: React.DragEvent) {
    if (!draggingTaskId || frozen) return;
    e.preventDefault();
    const target = resolveDragTarget(e);
    if (target) onDragTargetChange(target);
  }

  function handleColumnDrop(e: React.DragEvent) {
    e.preventDefault();
    if (frozen) {
      onDragEnd();
      return;
    }
    if (draggingTaskId) {
      const beforeId =
        dragTarget?.day === day ? dragTarget.beforeId : resolveDragTarget(e)?.beforeId ?? null;
      onMoveTask(draggingTaskId, day, beforeId);
    }
    onDragEnd();
  }

  function handleTaskDragOver(e: React.DragEvent, _taskId: string) {
    if (!draggingTaskId || frozen) return;
    e.preventDefault();
    e.stopPropagation();
    const target = resolveDragTarget(e);
    if (target) onDragTargetChange(target);
  }

  function handleTaskDrop(e: React.DragEvent) {
    e.preventDefault();
    if (frozen) {
      onDragEnd();
      return;
    }
    if (draggingTaskId) {
      const beforeId =
        dragTarget?.day === day ? dragTarget.beforeId : resolveDragTarget(e)?.beforeId ?? null;
      onMoveTask(draggingTaskId, day, beforeId);
    }
    onDragEnd();
  }

  return (
    <section
      className={`day-column ${isToday ? 'today' : ''} ${frozen ? 'frozen' : ''} ${isColumnTarget ? 'day-column-drag-over' : ''}`}
      data-day={day}
    >
      <header className="day-header">
        <div className="day-header-titles">
          <h2 className="day-name">{DAYS[day]}</h2>
          <span className="day-date" aria-label={`Data: ${columnDate}`}>
            {formatColumnDate(columnDate)}
          </span>
        </div>
        {frozen ? (
          <span className="frozen-badge" title="Este dia já passou e não pode ser alterado">
            Congelado
          </span>
        ) : (
          isToday && <span className="today-badge">Hoje</span>
        )}
      </header>

      <DaySummary tasks={tasks} />

      <div
        className={`day-tasks ${isColumnTarget ? 'day-tasks-drag-over' : ''}`}
        onDragOver={handleColumnDragOver}
        onDrop={handleColumnDrop}
      >
        {tasks.length === 0 ? (
          <p className={`empty-day ${isColumnTarget ? 'empty-day-drag-over' : ''}`}>
            {draggingTaskId ? 'Solte aqui' : 'Nenhuma tarefa ainda'}
          </p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isRunning={activeTaskId === task.id}
              isPaused={isTaskPaused(task.id)}
              isOvertime={isTaskOvertime(task.id)}
              remainingMs={
                activeTaskId === task.id
                  ? remainingMs
                  : getPausedRemaining(task.id) ?? 0
              }
              canStartTimer={activeTaskId !== task.id}
              anotherTaskRunning={activeTaskId !== null && activeTaskId !== task.id}
              isDragging={draggingTaskId === task.id}
              isDragOver={dragTarget?.day === day && dragTarget.beforeId === task.id}
              frozen={frozen}
              onToggle={onToggle}
              onCancel={onCancel}
              onEdit={setEditingTask}
              onRemove={onRemove}
              onStart={() => onStartTask(task.id)}
              onPause={onPauseTask}
              onFinishEarly={() => onFinishEarly(task.id)}
              onAdjustTimer={(remainingMs) => onAdjustTimer(task.id, remainingMs)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={handleTaskDragOver}
              onDrop={(e) => handleTaskDrop(e)}
            />
          ))
        )}
      </div>

      {!frozen && (
        <button
          type="button"
          className="add-btn"
          onClick={() => setShowModal(true)}
        >
          + Adicionar tarefa
        </button>
      )}

      {showModal && !frozen && (
        <AddTaskModal
          initialDay={day}
          onClose={() => setShowModal(false)}
          onAdd={onAdd}
        />
      )}

      {editingTask && !frozen && (
        <AddTaskModal
          task={editingTask}
          allTasks={allTasks}
          onClose={() => setEditingTask(null)}
          onAdd={onAdd}
          onUpdate={onUpdate}
        />
      )}
    </section>
  );
}

