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

/** calendar = semana atual com histórico; rolling = dias passados mostram a próxima data */
export type WeekViewMode = 'calendar' | 'rolling';

export interface UserPreferences {
  weekViewMode: WeekViewMode;
  /** Quando false, o lero lero fica oculto e não conta. */
  leroLeroEnabled: boolean;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  weekViewMode: 'calendar',
  leroLeroEnabled: true,
};

export type StreakStatus = 'active' | 'completed';

export type StreakCheckInResult = 'success' | 'fail';

export interface Streak {
  id: string;
  title: string;
  targetDays: number;
  /** Dias cumpridos na tentativa atual. */
  completedDays: number;
  status: StreakStatus;
  /** Última data em que houve check-in (sucesso ou falha). */
  lastCheckInDate: string | null;
  lastCheckInResult: StreakCheckInResult | null;
  /** Horário do último check-in (para detectar marcação após meia-noite). */
  lastCheckInAt?: number;
  /** Datas em que houve check-in de sucesso na tentativa atual. */
  successDates?: string[];
  createdDateKey: string;
  completedDateKey?: string;
}

export interface LeroLeroState {
  dateKey: string;
  accumulatedMs: number;
  segmentStart: number | null;
  hasStarted: boolean;
  allDone: boolean;
  /** Usuário pausou o lero lero manualmente — não retoma sozinho. */
  manuallyPaused?: boolean;
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
