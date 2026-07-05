import { useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { DAYS } from '../types';
import type { NewTaskInput } from '../hooks/useTasks';
import { getTaskDurationMinutes } from '../utils';
import { AddTaskModal } from './AddTaskModal';
import { DaySummary } from './DaySummary';
import { TaskItem } from './TaskItem';

interface DayColumnProps {
  day: DayOfWeek;
  tasks: Task[];
  currentWeek: string;
  activeTaskId: string | null;
  remainingMs: number;
  onAdd: (task: NewTaskInput) => void;
  onUpdate: (id: string, task: NewTaskInput) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onStartTask: (id: string, durationMinutes: number) => void;
  onStopTask: () => void;
}

export function DayColumn({
  day,
  tasks,
  currentWeek,
  activeTaskId,
  remainingMs,
  onAdd,
  onUpdate,
  onToggle,
  onRemove,
  onStartTask,
  onStopTask,
}: DayColumnProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const isToday = new Date().getDay() === (day === 6 ? 0 : day + 1);

  function handleStart(taskId: string) {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;

    const durationMinutes = getTaskDurationMinutes(task);
    if (durationMinutes === null || durationMinutes <= 0) return;

    onStartTask(taskId, durationMinutes);
  }

  return (
    <section className={`day-column ${isToday ? 'today' : ''}`}>
      <header className="day-header">
        <h2 className="day-name">{DAYS[day]}</h2>
        {isToday && <span className="today-badge">Hoje</span>}
      </header>

      <DaySummary tasks={tasks} currentWeek={currentWeek} />

      <div className="day-tasks">
        {tasks.length === 0 ? (
          <p className="empty-day">Nenhuma tarefa ainda</p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              currentWeek={currentWeek}
              isRunning={activeTaskId === task.id}
              remainingMs={activeTaskId === task.id ? remainingMs : 0}
              canStartTimer={activeTaskId === null}
              onToggle={onToggle}
              onEdit={setEditingTask}
              onRemove={onRemove}
              onStart={handleStart}
              onStop={onStopTask}
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
          onClose={() => setEditingTask(null)}
          onAdd={onAdd}
          onUpdate={onUpdate}
        />
      )}
    </section>
  );
}
