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

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
