export type TimeMode = 'duration' | 'schedule' | 'all-day';

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Task {
  id: string;
  text: string;
  day: DayOfWeek;
  weekly: boolean;
  timeMode: TimeMode;
  duration?: string;
  startTime?: string;
  endTime?: string;
  createdWeek: string;
  completedDates: string[];
  cancelledDates?: string[];
  incompleteDates?: string[];
  efficientDates?: string[];
  overtimeDates?: string[];
  groupId?: string;
  sortOrder: number;
}

export const DAYS = [
  'Segunda',
  'Terça',
  'Quarta',
  'Quinta',
  'Sexta',
  'Sábado',
  'Domingo',
] as const;

export interface LeroLeroState {
  dateKey: string;
  accumulatedMs: number;
  segmentStart: number | null;
  hasStarted: boolean;
  allDone: boolean;
}

export interface TaskTimerState {
  dateKey: string;
  active: { taskId: string; endsAt: number; inOvertime: boolean } | null;
  paused: Record<string, number>;
}

export interface DayStats {
  dateKey: string;
  leroLeroMs: number;
  tasksCompleted: number;
  tasksEfficient: number;
  tasksOvertime: number;
  tasksCancelled: number;
  tasksNotDone: number;
}
