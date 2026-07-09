import type { DayOfWeek, DayStats, LeroLeroState, Task, TaskTimerState, WeekViewMode } from './types';

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

export function parseTimeToDate(time: string, ref = new Date()): Date {
  const [h, m] = time.split(':').map(Number);
  const d = new Date(ref);
  d.setHours(h, m, 0, 0);
  return d;
}

export function isWithinSchedule(
  now: Date,
  startTime: string,
  endTime: string,
): boolean {
  const start = parseTimeToDate(startTime, now);
  const end = parseTimeToDate(endTime, now);
  return now >= start && now < end;
}

export function getScheduleOverlapMs(
  rangeStart: number,
  rangeEnd: number,
  startTime: string,
  endTime: string,
  ref: Date,
): number {
  const blockStart = parseTimeToDate(startTime, ref).getTime();
  const blockEnd = parseTimeToDate(endTime, ref).getTime();
  const overlapStart = Math.max(rangeStart, blockStart);
  const overlapEnd = Math.min(rangeEnd, blockEnd);
  return Math.max(0, overlapEnd - overlapStart);
}

export function formatElapsedMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function areAllTasksDoneToday(tasks: Task[], ref = new Date()): boolean {
  return tasks.length > 0 && tasks.every((task) => isTaskDoneForDay(task, ref));
}

export function getActiveScheduleBlock(
  tasks: Task[],
  ref = new Date(),
): { text: string; endTime: string } | null {
  for (const task of tasks) {
    if (task.timeMode !== 'schedule' || !task.startTime || !task.endTime) continue;
    if (isTaskDoneForDay(task, ref)) continue;
    if (isWithinSchedule(ref, task.startTime, task.endTime)) {
      return { text: task.text, endTime: task.endTime };
    }
  }
  return null;
}

function computeSegmentMs(
  segmentStart: number,
  now: number,
  scheduledTasks: Task[],
  ref: Date,
): number {
  let elapsed = now - segmentStart;
  for (const task of scheduledTasks) {
    if (!task.startTime || !task.endTime) continue;
    elapsed -= getScheduleOverlapMs(segmentStart, now, task.startTime, task.endTime, ref);
  }
  return Math.max(0, elapsed);
}

export function computeLeroLeroMs(
  segmentStart: number | null,
  accumulatedMs: number,
  scheduledTasks: Task[],
  ref = new Date(),
): number {
  if (!segmentStart) return accumulatedMs;
  return accumulatedMs + computeSegmentMs(segmentStart, ref.getTime(), scheduledTasks, ref);
}

/** Ignora segmentStart órfão da nuvem (ex.: aba antiga com timestamp de horas atrás). */
export function isCorruptLeroLeroState(state: LeroLeroState, ref = new Date()): boolean {
  if (!state.segmentStart || state.allDone) return false;
  const segmentAge = ref.getTime() - state.segmentStart;
  if (segmentAge < 0) return true;
  // Segmento aberto há muito tempo com pouco acumulado = dado stale de outro dispositivo/aba
  if (segmentAge > 45 * 60 * 1000 && state.accumulatedMs < 5 * 60 * 1000) return true;
  if (segmentAge > 2 * 60 * 60 * 1000 && state.accumulatedMs < segmentAge * 0.4) return true;
  return false;
}

export function getLeroLeroTotalMs(
  state: LeroLeroState,
  scheduledTasks: Task[],
  ref = new Date(),
): number {
  if (isCorruptLeroLeroState(state, ref)) return state.accumulatedMs;
  return computeLeroLeroMs(state.segmentStart, state.accumulatedMs, scheduledTasks, ref);
}

/** Grava total já consolidado para evitar segmentStart stale na nuvem. */
export function snapshotLeroLero(
  state: LeroLeroState,
  scheduledTasks: Task[],
  ref = new Date(),
): LeroLeroState {
  if (!state.hasStarted) return state;
  const total = getLeroLeroTotalMs(state, scheduledTasks, ref);
  const counting = !state.allDone && !state.manuallyPaused && state.segmentStart !== null;
  return {
    ...state,
    accumulatedMs: total,
    segmentStart: counting ? ref.getTime() : null,
    manuallyPaused: Boolean(state.manuallyPaused),
  };
}

export function mergeLeroLeroStates(
  local: LeroLeroState,
  remote: LeroLeroState,
  scheduledTasks: Task[],
  ref = new Date(),
  stillCounting = false,
): LeroLeroState {
  const localTotal = getLeroLeroTotalMs(local, scheduledTasks, ref);
  const remoteTotal = getLeroLeroTotalMs(remote, scheduledTasks, ref);
  const totalMs = Math.max(localTotal, remoteTotal);
  const manuallyPaused = Boolean(local.manuallyPaused || remote.manuallyPaused);

  return {
    dateKey: local.dateKey,
    accumulatedMs: totalMs,
    segmentStart:
      stillCounting && !manuallyPaused && !local.allDone && !remote.allDone
        ? ref.getTime()
        : null,
    hasStarted: local.hasStarted || remote.hasStarted,
    allDone: local.allDone || remote.allDone,
    manuallyPaused,
  };
}

export function getDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function getDayOfWeekForDate(dateKey: string): DayOfWeek {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay();
  return (dow === 0 ? 6 : dow - 1) as DayOfWeek;
}

export function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return getDateKey(date);
}

export function emptyLeroLero(dateKey = getDateKey()): LeroLeroState {
  return {
    dateKey,
    accumulatedMs: 0,
    segmentStart: null,
    hasStarted: false,
    allDone: false,
    manuallyPaused: false,
  };
}

export function normalizeLeroLero(raw: unknown, todayKey = getDateKey()): LeroLeroState {
  if (!raw || typeof raw !== 'object') return emptyLeroLero(todayKey);
  const state = raw as Partial<LeroLeroState>;
  if (state.dateKey !== todayKey) return emptyLeroLero(todayKey);
  return {
    dateKey: todayKey,
    accumulatedMs: typeof state.accumulatedMs === 'number' ? state.accumulatedMs : 0,
    segmentStart: typeof state.segmentStart === 'number' ? state.segmentStart : null,
    hasStarted: Boolean(state.hasStarted),
    allDone: Boolean(state.allDone),
    manuallyPaused: Boolean(state.manuallyPaused),
  };
}

export function emptyTaskTimer(dateKey = getDateKey()): TaskTimerState {
  return { dateKey, active: null, paused: {} };
}

export function normalizeTaskTimer(raw: unknown, todayKey = getDateKey()): TaskTimerState {
  if (!raw || typeof raw !== 'object') return emptyTaskTimer(todayKey);
  const state = raw as Partial<TaskTimerState>;
  if (state.dateKey !== todayKey) return emptyTaskTimer(todayKey);

  const activeRaw =
    state.active &&
    typeof state.active.taskId === 'string' &&
    typeof state.active.endsAt === 'number'
      ? state.active
      : null;

  let active: TaskTimerState['active'] = null;
  if (activeRaw) {
    const inOvertime =
      Boolean(activeRaw.inOvertime) || activeRaw.endsAt <= Date.now();
    active = {
      taskId: activeRaw.taskId,
      endsAt: activeRaw.endsAt,
      inOvertime,
    };
  }

  const paused: Record<string, number> = {};
  if (state.paused && typeof state.paused === 'object') {
    for (const [taskId, remaining] of Object.entries(state.paused)) {
      if (typeof remaining === 'number' && remaining !== 0) {
        paused[taskId] = remaining;
      }
    }
  }

  return { dateKey: todayKey, active, paused };
}

export function pruneTaskTimerForTasks(
  timer: TaskTimerState,
  tasks: Task[],
): TaskTimerState {
  const isRunning = (taskId: string) => {
    const task = tasks.find((item) => item.id === taskId);
    return Boolean(task && !isTaskDoneForDay(task));
  };

  let active = timer.active;
  if (active && !isRunning(active.taskId)) {
    active = null;
  }

  const paused: Record<string, number> = {};
  for (const [taskId, remaining] of Object.entries(timer.paused)) {
    if (isRunning(taskId)) {
      paused[taskId] = remaining;
    }
  }

  if (active === timer.active) {
    const pausedKeys = Object.keys(paused);
    const prevKeys = Object.keys(timer.paused);
    if (
      pausedKeys.length === prevKeys.length &&
      pausedKeys.every((key) => paused[key] === timer.paused[key])
    ) {
      return timer;
    }
  }

  return { ...timer, active, paused };
}

export function mergeTaskTimer(local: TaskTimerState, remote: TaskTimerState): TaskTimerState {
  const todayKey = getDateKey();
  if (local.dateKey !== todayKey && remote.dateKey === todayKey) return remote;
  if (remote.dateKey !== todayKey && local.dateKey === todayKey) return local;
  if (local.dateKey !== todayKey && remote.dateKey !== todayKey) {
    return emptyTaskTimer(todayKey);
  }

  let active: TaskTimerState['active'] = remote.active ?? local.active;
  if (local.active && remote.active) {
    if (local.active.taskId === remote.active.taskId) {
      const picked =
        local.active.endsAt < remote.active.endsAt ? local.active : remote.active;
      active = {
        ...picked,
        inOvertime:
          Boolean(local.active.inOvertime) ||
          Boolean(remote.active.inOvertime) ||
          picked.endsAt <= Date.now(),
      };
    } else {
      active = {
        ...remote.active,
        inOvertime: Boolean(remote.active.inOvertime) || remote.active.endsAt <= Date.now(),
      };
    }
  } else if (active) {
    active = {
      ...active,
      inOvertime: Boolean(active.inOvertime) || active.endsAt <= Date.now(),
    };
  }

  const paused = { ...local.paused };
  for (const [taskId, remaining] of Object.entries(remote.paused)) {
    if (paused[taskId] === undefined) {
      paused[taskId] = remaining;
    } else {
      paused[taskId] = Math.min(paused[taskId], remaining);
    }
  }

  return { dateKey: todayKey, active, paused };
}

export function applyMidnightRolloverForDate(tasks: Task[], dateKey: string): Task[] {
  const day = getDayOfWeekForDate(dateKey);
  return tasks.map((task) => {
    if (task.day !== day) return task;
    if (task.completedDates.includes(dateKey)) return task;
    if ((task.cancelledDates ?? []).includes(dateKey)) return task;
    if ((task.efficientDates ?? task.incompleteDates ?? []).includes(dateKey)) return task;
    if ((task.overtimeDates ?? []).includes(dateKey)) return task;
    return {
      ...task,
      cancelledDates: [...(task.cancelledDates ?? []), dateKey],
    };
  });
}

export function applyMissedMidnightRollovers(
  tasks: Task[],
  lastActiveDateKey: string | null | undefined,
  todayKey = getDateKey(),
): Task[] {
  if (!lastActiveDateKey || lastActiveDateKey >= todayKey) return tasks;
  let result = tasks;
  let current = lastActiveDateKey;
  while (current < todayKey) {
    result = applyMidnightRolloverForDate(result, current);
    current = nextDateKey(current);
  }
  return result;
}

export function getDateForDayOfWeek(
  day: DayOfWeek,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): string {
  if (mode === 'rolling') {
    const todayDow = getTodayDayOfWeek(ref);
    const base = new Date(ref);
    base.setHours(0, 0, 0, 0);

    if (day < todayDow) {
      const target = new Date(base);
      target.setDate(base.getDate() + (7 - (todayDow - day)));
      return getDateKey(target);
    }

    const target = new Date(base);
    target.setDate(base.getDate() + (day - todayDow));
    return getDateKey(target);
  }

  const monday = new Date(ref);
  const dow = monday.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  monday.setDate(monday.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  const target = new Date(monday);
  target.setDate(monday.getDate() + day);
  return getDateKey(target);
}

export function getTodayDayOfWeek(ref = new Date()): DayOfWeek {
  const dow = ref.getDay();
  return (dow === 0 ? 6 : dow - 1) as DayOfWeek;
}

const MONTHS_SHORT = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez',
] as const;

export function formatColumnDate(dateKey: string): string {
  const [, month, day] = dateKey.split('-');
  return `${Number(day)} de ${MONTHS_SHORT[Number(month) - 1]}`;
}

export function isDayToday(day: DayOfWeek, ref = new Date()): boolean {
  return getTodayDayOfWeek(ref) === day;
}

/** Coluna com data anterior a hoje — somente leitura */
export function isDayFrozen(
  day: DayOfWeek,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  return getDateForDayOfWeek(day, ref, mode) < getDateKey(ref);
}

export function isTaskCompleted(
  completedDates: string[],
  taskDay: DayOfWeek,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  const taskDate = getDateForDayOfWeek(taskDay, ref, mode);
  return completedDates.includes(taskDate);
}

export function isTaskCancelled(
  task: Task,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  const taskDate = getDateForDayOfWeek(task.day, ref, mode);
  return (task.cancelledDates ?? []).includes(taskDate);
}

export function isTaskEfficient(
  task: Task,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  const taskDate = getDateForDayOfWeek(task.day, ref, mode);
  return (task.efficientDates ?? task.incompleteDates ?? []).includes(taskDate);
}

export function isTaskOvertimeDone(
  task: Task,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  const taskDate = getDateForDayOfWeek(task.day, ref, mode);
  return (task.overtimeDates ?? []).includes(taskDate);
}

export function isTaskDoneForDay(
  task: Task,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  return (
    isTaskCompleted(task.completedDates, task.day, ref, mode) ||
    isTaskCancelled(task, ref, mode) ||
    isTaskEfficient(task, ref, mode) ||
    isTaskOvertimeDone(task, ref, mode)
  );
}

export function isTaskDayToday(
  taskDay: DayOfWeek,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): boolean {
  return getDateKey(ref) === getDateForDayOfWeek(taskDay, ref, mode);
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
  const overtime = ms < 0;
  const totalSeconds = Math.ceil(Math.abs(ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const body =
    minutes === 0 ? `${seconds}s` : `${minutes}:${String(seconds).padStart(2, '0')}`;
  return overtime ? `+${body} extra` : body;
}

/** Formato HH:MM para input de ajuste de timer (horas:minutos). */
export function formatMsToTimerInput(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

export function parseTimerInputToMs(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(':');
  if (parts.length !== 2) return null;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || minutes < 0 || minutes >= 60) {
    return null;
  }
  return (hours * 60 + minutes) * 60 * 1000;
}

export function formatDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

export function getDateKeyForDay(
  day: DayOfWeek,
  ref = new Date(),
  mode: WeekViewMode = 'calendar',
): string {
  return getDateForDayOfWeek(day, ref, mode);
}

export function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function buildDayStats(
  tasks: Task[],
  leroLero: LeroLeroState,
  dateKey: string,
): DayStats {
  const day = getDayOfWeekForDate(dateKey);
  const dayTasks = tasks.filter((task) => task.day === day);

  let tasksCompleted = 0;
  let tasksEfficient = 0;
  let tasksOvertime = 0;
  let tasksCancelled = 0;
  let tasksNotDone = 0;

  for (const task of dayTasks) {
    if ((task.efficientDates ?? task.incompleteDates ?? []).includes(dateKey)) {
      tasksEfficient++;
    } else if ((task.overtimeDates ?? []).includes(dateKey)) {
      tasksOvertime++;
    } else if (task.completedDates.includes(dateKey)) {
      tasksCompleted++;
    } else if ((task.cancelledDates ?? []).includes(dateKey)) {
      tasksCancelled++;
    } else {
      const ref = dateFromKey(dateKey);
      ref.setHours(12, 0, 0, 0);
      if (!isTaskDoneForDay(task, ref)) {
        tasksNotDone++;
      }
    }
  }

  const leroLeroMs =
    leroLero.dateKey === dateKey
      ? getLeroLeroTotalMs(
          leroLero,
          dayTasks.filter(
            (t) =>
              t.timeMode === 'schedule' && t.startTime && t.endTime && !isTaskDoneForDay(t),
          ),
          dateFromKey(dateKey),
        )
      : 0;

  return {
    dateKey,
    leroLeroMs,
    tasksCompleted,
    tasksEfficient,
    tasksOvertime,
    tasksCancelled,
    tasksNotDone,
  };
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function legacyGroupKey(task: Task): string {
  return [
    task.text,
    task.createdWeek,
    String(task.weekly),
    task.timeMode,
    task.duration ?? '',
    task.startTime ?? '',
    task.endTime ?? '',
  ].join('|');
}

export function assignLegacyGroupIds(tasks: Task[]): Task[] {
  const clusters = new Map<string, Task[]>();

  for (const task of tasks) {
    if (task.groupId) continue;
    const key = legacyGroupKey(task);
    const group = clusters.get(key) ?? [];
    group.push(task);
    clusters.set(key, group);
  }

  const newGroupIds = new Map<string, string>();
  for (const [key, members] of clusters) {
    if (members.length > 1) {
      newGroupIds.set(key, generateId());
    }
  }

  if (newGroupIds.size === 0) return tasks;

  return tasks.map((task) => {
    if (task.groupId) return task;
    const groupId = newGroupIds.get(legacyGroupKey(task));
    return groupId ? { ...task, groupId } : task;
  });
}

export function getTasksInGroup(task: Task, allTasks: Task[]): Task[] {
  if (!task.groupId) return [task];
  return allTasks.filter((item) => item.groupId === task.groupId);
}
