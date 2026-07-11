import type { Streak } from '../types';
import { formatDateLabel, nextDateKey, prevDateKey } from '../utils';

/** Primeiro dia sem check-in entre o último registro e hoje (exclusive). */
export function getPendingCheckInDate(streak: Streak, todayKey: string): string | null {
  if (streak.status !== 'active') return null;

  let cursor = streak.lastCheckInDate ?? streak.createdDateKey;
  if (streak.lastCheckInDate) {
    cursor = nextDateKey(streak.lastCheckInDate);
  }

  while (cursor < todayKey) {
    return cursor;
  }
  return null;
}

export function canCheckInToday(streak: Streak, todayKey: string): boolean {
  if (streak.status !== 'active') return false;
  if (getPendingCheckInDate(streak, todayKey) !== null) return false;
  return streak.lastCheckInDate !== todayKey;
}

/** Data do próximo check-in disponível (pendente ou hoje). */
export function getNextCheckInDate(streak: Streak, todayKey: string): string | null {
  const pending = getPendingCheckInDate(streak, todayKey);
  if (pending) return pending;
  if (canCheckInToday(streak, todayKey)) return todayKey;
  return null;
}

export function getStreakPromptTitle(dateKey: string, todayKey: string): string {
  if (dateKey === prevDateKey(todayKey) || dateKey === todayKey) return 'Conseguiu hoje?';
  return `Conseguiu em ${formatDateLabel(dateKey)}?`;
}

export function getStreakPromptSubtitle(dateKey: string, todayKey: string): string {
  if (dateKey === prevDateKey(todayKey)) {
    return `${formatDateLabel(dateKey)} — marque antes de seguir pro próximo dia.`;
  }
  if (dateKey === todayKey) {
    return 'Marque antes de dormir, ou respondemos à meia-noite.';
  }
  return `${formatDateLabel(dateKey)} — você ainda não tinha marcado este dia.`;
}
