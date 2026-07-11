import type { Streak } from '../types';
import { formatDateLabel, nextDateKey, prevDateKey } from '../utils';

/** Até 6h da manhã, check-in novo conta para o dia pendente (geralmente ontem). */
export const LATE_NIGHT_GRACE_HOUR = 6;

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

export function isLateNightHour(now = new Date()): boolean {
  return now.getHours() < LATE_NIGHT_GRACE_HOUR;
}

/** Resolve a data efetiva do check-in (madrugada → dia pendente). */
export function resolveCheckInDate(
  streak: Streak,
  todayKey: string,
  requestedDate: string,
  now = new Date(),
): string {
  if (requestedDate !== todayKey || !isLateNightHour(now)) return requestedDate;
  const pending = getPendingCheckInDate(streak, todayKey);
  return pending ?? requestedDate;
}

/**
 * Corrige check-ins gravados em "hoje" quando na verdade eram de ontem
 * (ex.: marcou depois da meia-noite sem querer).
 */
export function repairMisassignedTodayCheckIn(
  streak: Streak,
  todayKey: string,
  _now = new Date(),
): Streak {
  if (streak.status !== 'active') return streak;
  if (streak.lastCheckInDate !== todayKey || streak.lastCheckInResult !== 'success') return streak;
  if (streak.completedDays < 1) return streak;

  const yesterday = prevDateKey(todayKey);
  if (yesterday < streak.createdDateKey) return streak;

  const priorStreak: Streak = {
    ...streak,
    completedDays: streak.completedDays - 1,
    lastCheckInDate: inferPriorLastCheckInDate(streak, todayKey),
    lastCheckInResult: streak.completedDays <= 1 ? null : 'success',
  };
  const pendingBeforeToday = getPendingCheckInDate(priorStreak, todayKey);
  if (!pendingBeforeToday) return streak;

  const lateNightCheckIn =
    typeof streak.lastCheckInAt === 'number' && isLateNightHour(new Date(streak.lastCheckInAt));

  // Dados antigos sem horário: corrige o caso comum (dia 2 marcado em "hoje" de manhã).
  const legacyMidnightMistake =
    streak.lastCheckInAt === undefined &&
    streak.completedDays === 2 &&
    pendingBeforeToday === yesterday;

  if (!lateNightCheckIn && !legacyMidnightMistake) return streak;

  const successDates = appendSuccessDate(streak.successDates, pendingBeforeToday);
  return {
    ...streak,
    lastCheckInDate: pendingBeforeToday,
    successDates,
  };
}

export function repairStreaks(streaks: Streak[], todayKey: string, now = new Date()): Streak[] {
  return streaks.map((streak) => repairMisassignedTodayCheckIn(streak, todayKey, now));
}

export function reassignTodayCheckInToYesterday(streak: Streak, todayKey: string): Streak | null {
  if (streak.status !== 'active') return null;
  if (streak.lastCheckInDate !== todayKey || streak.lastCheckInResult !== 'success') return null;

  const yesterday = prevDateKey(todayKey);
  if (yesterday < streak.createdDateKey) return null;

  const priorStreak: Streak = {
    ...streak,
    completedDays: streak.completedDays - 1,
    lastCheckInDate: inferPriorLastCheckInDate(streak, todayKey),
    lastCheckInResult: streak.completedDays <= 1 ? null : 'success',
  };
  const pending = getPendingCheckInDate(priorStreak, todayKey);
  if (!pending) return null;

  return {
    ...streak,
    lastCheckInDate: pending,
    successDates: appendSuccessDate(
      (streak.successDates ?? []).filter((date) => date !== todayKey),
      pending,
    ),
  };
}

function inferPriorLastCheckInDate(streak: Streak, todayKey: string): string | null {
  const knownDates = streak.successDates?.filter((date) => date !== todayKey) ?? [];
  if (knownDates.length > 0) return knownDates[knownDates.length - 1];
  if (streak.completedDays <= 1) return null;

  const yesterday = prevDateKey(todayKey);
  for (let cursor = prevDateKey(yesterday); cursor >= streak.createdDateKey; cursor = prevDateKey(cursor)) {
    const testPrior: Streak = {
      ...streak,
      completedDays: streak.completedDays - 1,
      lastCheckInDate: cursor,
      lastCheckInResult: 'success',
    };
    if (getPendingCheckInDate(testPrior, todayKey) === yesterday) {
      return cursor;
    }
  }
  return null;
}

function appendSuccessDate(existing: string[] | undefined, dateKey: string): string[] {
  const dates = existing ?? [];
  if (dates.includes(dateKey)) return dates;
  return [...dates, dateKey];
}

export function getStreakCheckInLabel(streak: Streak, todayKey: string): string | null {
  if (streak.lastCheckInResult !== 'success' || !streak.lastCheckInDate) return null;
  if (streak.lastCheckInDate === todayKey) return 'cumprido hoje';
  if (streak.lastCheckInDate === prevDateKey(todayKey)) return 'cumprido ontem';
  return `cumprido em ${formatDateLabel(streak.lastCheckInDate)}`;
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
