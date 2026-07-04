import { useState } from 'react';
import type { DayOfWeek, Task, TimeMode } from '../types';
import { DAYS } from '../types';
import { AddTaskModal } from './AddTaskModal';
import { TaskItem } from './TaskItem';

interface NewTask {
  text: string;
  day: DayOfWeek;
  weekly: boolean;
  timeMode: TimeMode;
  duration?: string;
  startTime?: string;
  endTime?: string;
}

interface DayColumnProps {
  day: DayOfWeek;
  tasks: Task[];
  currentWeek: string;
  onAdd: (task: NewTask) => void;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

export function DayColumn({
  day,
  tasks,
  currentWeek,
  onAdd,
  onToggle,
  onRemove,
}: DayColumnProps) {
  const [showModal, setShowModal] = useState(false);
  const isToday = new Date().getDay() === (day === 6 ? 0 : day + 1);

  return (
    <section className={`day-column ${isToday ? 'today' : ''}`}>
      <header className="day-header">
        <h2 className="day-name">{DAYS[day]}</h2>
        {isToday && <span className="today-badge">Hoje</span>}
      </header>

      <div className="day-tasks">
        {tasks.length === 0 ? (
          <p className="empty-day">Nenhuma tarefa ainda</p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              currentWeek={currentWeek}
              onToggle={onToggle}
              onRemove={onRemove}
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
          day={day}
          onClose={() => setShowModal(false)}
          onAdd={onAdd}
        />
      )}
    </section>
  );
}
