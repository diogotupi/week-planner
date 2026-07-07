import { useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { DAYS } from '../types';
import type { NewTaskInput, UpdateScope } from '../hooks/useTasks';
import { formatColumnDate, getDateForDayOfWeek, isDayToday } from '../utils';
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
}: DayColumnProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const isToday = isDayToday(day);
  const columnDate = getDateForDayOfWeek(day);
  const isColumnTarget = dragTarget?.day === day && dragTarget.beforeId === null;

  function resolveDragTarget(e: React.DragEvent): DragTarget | null {
    if (!draggingTaskId) return null;

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
    if (!draggingTaskId) return;
    e.preventDefault();
    const target = resolveDragTarget(e);
    if (target) onDragTargetChange(target);
  }

  function handleColumnDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggingTaskId) {
      const beforeId =
        dragTarget?.day === day ? dragTarget.beforeId : resolveDragTarget(e)?.beforeId ?? null;
      onMoveTask(draggingTaskId, day, beforeId);
    }
    onDragEnd();
  }

  function handleTaskDragOver(e: React.DragEvent, _taskId: string) {
    if (!draggingTaskId) return;
    e.preventDefault();
    e.stopPropagation();
    const target = resolveDragTarget(e);
    if (target) onDragTargetChange(target);
  }

  function handleTaskDrop(e: React.DragEvent) {
    e.preventDefault();
    if (draggingTaskId) {
      const beforeId =
        dragTarget?.day === day ? dragTarget.beforeId : resolveDragTarget(e)?.beforeId ?? null;
      onMoveTask(draggingTaskId, day, beforeId);
    }
    onDragEnd();
  }

  return (
    <section
      className={`day-column ${isToday ? 'today' : ''} ${isColumnTarget ? 'day-column-drag-over' : ''}`}
      data-day={day}
    >
      <header className="day-header">
        <div className="day-header-titles">
          <h2 className="day-name">{DAYS[day]}</h2>
          <span className="day-date" aria-label={`Data: ${columnDate}`}>
            {formatColumnDate(columnDate)}
          </span>
        </div>
        {isToday && <span className="today-badge">Hoje</span>}
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
              onToggle={onToggle}
              onCancel={onCancel}
              onEdit={setEditingTask}
              onRemove={onRemove}
              onStart={() => onStartTask(task.id)}
              onPause={onPauseTask}
              onFinishEarly={() => onFinishEarly(task.id)}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={handleTaskDragOver}
              onDrop={(e) => handleTaskDrop(e)}
            />
          ))
        )}
      </div>

      <button
        type="button"
        className="add-btn"
        onClick={() => setShowModal(true)}
      >
        + Adicionar tarefa
      </button>

      {showModal && (
        <AddTaskModal
          initialDay={day}
          onClose={() => setShowModal(false)}
          onAdd={onAdd}
        />
      )}

      {editingTask && (
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
