import type { DayOfWeek } from '../types';
import { useTasks } from '../hooks/useTasks';
import { DayColumn } from './DayColumn';

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

export function WeekPlanner() {
  const { addTask, toggleTask, removeTask, getTasksForDay, currentWeek } =
    useTasks();

  return (
    <div className="planner">
      <header className="planner-header">
        <h1 className="planner-title">Planejador da Semana</h1>
        <p className="planner-subtitle">
          Organize suas tarefas de segunda a domingo
        </p>
      </header>

      <div className="days-grid">
        {ALL_DAYS.map((day) => (
          <DayColumn
            key={day}
            day={day}
            tasks={getTasksForDay(day)}
            currentWeek={currentWeek}
            onAdd={addTask}
            onToggle={toggleTask}
            onRemove={removeTask}
          />
        ))}
      </div>
    </div>
  );
}
