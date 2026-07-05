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
  completedWeeks: string[];
  groupId?: string;
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
