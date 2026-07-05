import { useCallback } from 'react';
import type { DayOfWeek } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { DayColumn } from './DayColumn';

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

interface WeekPlannerProps {
  username: string;
  displayName: string;
  onLogout: () => void;
}

export function WeekPlanner({ username, displayName, onLogout }: WeekPlannerProps) {
  const { addTasks, updateTask, toggleTask, completeTask, removeTask, getTasksForDay, tasks, currentWeek } =
    useTasks(username);

  const handleTimerComplete = useCallback(
    (taskId: string) => {
      completeTask(taskId);
    },
    [completeTask],
  );

  const { activeTaskId, remainingMs, startTimer, stopTimer } =
    useTaskTimer(handleTimerComplete);

  function handleToggle(id: string) {
    if (activeTaskId === id) stopTimer();
    toggleTask(id);
  }

  function handleRemove(id: string) {
    if (activeTaskId === id) stopTimer();
    removeTask(id);
  }

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
              allTasks={tasks}
              currentWeek={currentWeek}
              activeTaskId={activeTaskId}
              remainingMs={remainingMs}
              onAdd={addTasks}
              onUpdate={updateTask}
              onToggle={handleToggle}
              onRemove={handleRemove}
              onStartTask={startTimer}
              onStopTask={stopTimer}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
