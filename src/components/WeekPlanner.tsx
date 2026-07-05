import type { DayOfWeek } from '../types';
import { useTasks } from '../hooks/useTasks';
import { DayColumn } from './DayColumn';

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

interface WeekPlannerProps {
  username: string;
  displayName: string;
  onLogout: () => void;
}

export function WeekPlanner({ username, displayName, onLogout }: WeekPlannerProps) {
  const { addTasks, updateTask, toggleTask, removeTask, getTasksForDay, currentWeek } =
    useTasks(username);

  return (
    <div className="planner">
      <header className="planner-header">
        <div className="planner-top">
          <div>
            <h1 className="planner-title">Planejador da Semana</h1>
            <p className="planner-subtitle">
              Olá, {displayName}! Organize suas tarefas de segunda a domingo.
            </p>
          </div>
          <button type="button" className="btn-logout" onClick={onLogout}>
            Sair
          </button>
        </div>
      </header>

      <div className="days-grid-wrapper">
        <div className="days-grid">
          {ALL_DAYS.map((day) => (
            <DayColumn
              key={day}
              day={day}
              tasks={getTasksForDay(day)}
              currentWeek={currentWeek}
              onAdd={addTasks}
              onUpdate={updateTask}
              onToggle={toggleTask}
              onRemove={removeTask}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
