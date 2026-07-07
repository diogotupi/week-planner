import type { Task } from '../types';
import { useWeekViewMode } from '../context/PlannerSettingsContext';
import {
  formatFinishTime,
  formatTotalMinutes,
  getTaskDurationMinutes,
  isTaskDoneForDay,
} from '../utils';

const WAKE_HOURS = [7, 8, 9];

interface DaySummaryProps {
  tasks: Task[];
}

export function DaySummary({ tasks }: DaySummaryProps) {
  const weekViewMode = useWeekViewMode();
  const pendingTasks = tasks.filter((task) => !isTaskDoneForDay(task, new Date(), weekViewMode));

  const totalMinutes = pendingTasks.reduce((sum, task) => {
    const minutes = getTaskDurationMinutes(task);
    return sum + (minutes ?? 0);
  }, 0);

  if (totalMinutes === 0) return null;

  return (
    <div className="day-summary">
      <p className="day-summary-total">{formatTotalMinutes(totalMinutes)} de tarefas</p>
      <ul className="day-summary-wake">
        {WAKE_HOURS.map((hour) => (
          <li key={hour} className="day-summary-wake-item">
            Acordando {hour}h → termina ~{formatFinishTime(hour, 0, totalMinutes)}
          </li>
        ))}
      </ul>
    </div>
  );
}
