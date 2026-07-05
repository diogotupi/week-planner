import { useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { DAYS } from '../types';
import type { NewTaskInput, UpdateScope } from '../hooks/useTasks';
import { getTaskDurationMinutes } from '../utils';
import { AddTaskModal } from './AddTaskModal';
import { DaySummary } from './DaySummary';
import { TaskItem } from './TaskItem';

interface DayColumnProps {
  day: DayOfWeek;
  tasks: Task[];
  allTasks: Task[];
  activeTaskId: string | null;
  remainingMs: number;
  onAdd: (task: NewTaskInput) => void;
  onUpdate: (id: string, task: NewTaskInput, scope: UpdateScope) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (day: DayOfWeek, orderedIds: string[]) => void;
  onStartTask: (id: string, durationMinutes: number) => void;
  onStopTask: () => void;
}

export function DayColumn({
  day,
  tasks,
  allTasks,
  activeTaskId,
  remainingMs,
  onAdd,
  onUpdate,
  onToggle,
  onRemove,
  onReorder,
  onStartTask,
  onStopTask,
}: DayColumnProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const isToday = new Date().getDay() === (day === 6 ? 0 : day + 1);

  function handleStart(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const durationMinutes = getTaskDurationMinutes(task);
    if (durationMinutes === null || durationMinutes <= 0) return;

    onStartTask(taskId, durationMinutes);
  }

  function moveTask(fromId: string, toId: string) {
    if (fromId === toId) return;

    const ids = tasks.map((task) => task.id);
    const fromIndex = ids.indexOf(fromId);
    const toIndex = ids.indexOf(toId);
    if (fromIndex === -1 || toIndex === -1) return;

    const nextIds = [...ids];
    const [moved] = nextIds.splice(fromIndex, 1);
    nextIds.splice(toIndex, 0, moved);
    onReorder(day, nextIds);
  }

  function handleDragStart(taskId: string) {
    setDraggingId(taskId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

  function handleDragOver(e: React.DragEvent, taskId: string) {
    e.preventDefault();
    if (draggingId && draggingId !== taskId) {
      setDragOverId(taskId);
    }
  }

  function handleDrop(taskId: string) {
    if (draggingId) {
      moveTask(draggingId, taskId);
    }
    handleDragEnd();
  }

  return (
    <section className={`day-column ${isToday ? 'today' : ''}`}>
      <header className="day-header">
        <h2 className="day-name">{DAYS[day]}</h2>
        {isToday && <span className="today-badge">Hoje</span>}
      </header>

      <DaySummary tasks={tasks} />

      <div
        className="day-tasks"
        onDragOver={(e) => e.preventDefault()}
        onDrop={() => handleDragEnd()}
      >
        {tasks.length === 0 ? (
          <p className="empty-day">Nenhuma tarefa ainda</p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isRunning={activeTaskId === task.id}
              remainingMs={activeTaskId === task.id ? remainingMs : 0}
              canStartTimer={activeTaskId === null}
              isDragging={draggingId === task.id}
              isDragOver={dragOverId === task.id}
              onToggle={onToggle}
              onEdit={setEditingTask}
              onRemove={onRemove}
              onStart={handleStart}
              onStop={onStopTask}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
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
