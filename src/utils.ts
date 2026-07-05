import type { Task } from './types';

export function getWeekKey(date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function isTaskVisible(
  weekly: boolean,
  createdWeek: string,
  currentWeek: string,
): boolean {
  return weekly || createdWeek === currentWeek;
}

export function isTaskCompleted(
  completedWeeks: string[],
  currentWeek: string,
): boolean {
  return completedWeeks.includes(currentWeek);
}

export function formatDuration(value: string): string {
  const parts = value.split(':');
  if (parts.length !== 2) return value;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (hours === 0) return `${minutes}min`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export function parseDurationToMinutes(value: string): number {
  const parts = value.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function parseTimeToMinutes(time: string): number {
  const parts = time.split(':');
  if (parts.length !== 2) return 0;
  return parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
}

export function getTaskDurationMinutes(task: Task): number | null {
  switch (task.timeMode) {
    case 'duration':
      return task.duration ? parseDurationToMinutes(task.duration) : null;
    case 'schedule':
      if (!task.startTime || !task.endTime) return null;
      return parseTimeToMinutes(task.endTime) - parseTimeToMinutes(task.startTime);
    case 'all-day':
      return null;
  }
}

export function formatTotalMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return hours === 1 ? '1 hora' : `${hours} horas`;
  if (hours === 1) return `1h${String(minutes).padStart(2, '0')}`;
  return `${hours}h${String(minutes).padStart(2, '0')}`;
}

export function formatFinishTime(
  wakeHour: number,
  wakeMinute: number,
  durationMinutes: number,
): string {
  const total = wakeHour * 60 + wakeMinute + durationMinutes;
  const h = Math.floor(total / 60);
  const m = total % 60;
  if (m === 0) return `${h}h`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

export function formatRemainingMs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
