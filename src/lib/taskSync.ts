import type {
  DayOfWeek,
  LeroLeroState,
  Strike,
  StrikeCheckInResult,
  StrikeStatus,
  Task,
  TaskTimerState,
  UserPreferences,
} from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';
import {
  applyMissedMidnightRollovers,
  assignLegacyGroupIds,
  emptyLeroLero,
  emptyTaskTimer,
  getDateKey,
  getLeroLeroTotalMs,
  getTodayDayOfWeek,
  getWeekKey,
  isTaskDoneForDay,
  mergeLeroLeroStates,
  mergeTaskTimer,
  normalizeLeroLero,
  normalizeTaskTimer,
  pruneTaskTimerForTasks,
  snapshotLeroLero,
} from '../utils';
import { apiFetch, isSyncEnabled } from './api';

const LEGACY_STORAGE_KEY = 'week-planner-tasks';

export interface PlannerData {
  tasks: Task[];
  leroLero: LeroLeroState;
  taskTimer: TaskTimerState;
  preferences: UserPreferences;
  strikes: Strike[];
}

function preferencesStorageKey(username: string) {
  return `week-planner-preferences-${username}`;
}

export function normalizeUserPreferences(raw: unknown): UserPreferences {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_USER_PREFERENCES };
  const state = raw as Partial<UserPreferences>;
  return {
    weekViewMode:
      state.weekViewMode === 'rolling' || state.weekViewMode === 'calendar'
        ? state.weekViewMode
        : DEFAULT_USER_PREFERENCES.weekViewMode,
    leroLeroEnabled:
      typeof state.leroLeroEnabled === 'boolean'
        ? state.leroLeroEnabled
        : DEFAULT_USER_PREFERENCES.leroLeroEnabled,
  };
}

function normalizeStrike(raw: unknown): Strike | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Partial<Strike>;
  if (typeof s.id !== 'string' || typeof s.title !== 'string') return null;
  const targetDays = typeof s.targetDays === 'number' ? Math.max(1, Math.floor(s.targetDays)) : 0;
  if (targetDays < 1) return null;
  const status: StrikeStatus = s.status === 'completed' ? 'completed' : 'active';
  const lastCheckInResult: StrikeCheckInResult | null =
    s.lastCheckInResult === 'success' || s.lastCheckInResult === 'fail'
      ? s.lastCheckInResult
      : null;
  return {
    id: s.id,
    title: s.title.trim() || 'Objetivo',
    targetDays,
    completedDays:
      typeof s.completedDays === 'number' ? Math.max(0, Math.floor(s.completedDays)) : 0,
    status,
    lastCheckInDate: typeof s.lastCheckInDate === 'string' ? s.lastCheckInDate : null,
    lastCheckInResult,
    createdDateKey: typeof s.createdDateKey === 'string' ? s.createdDateKey : getDateKey(),
    completedDateKey: typeof s.completedDateKey === 'string' ? s.completedDateKey : undefined,
  };
}

export function normalizeStrikes(raw: unknown): Strike[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeStrike).filter((s): s is Strike => s !== null);
}

function mergeStrikes(local: Strike[], remote: Strike[]): Strike[] {
  const byId = new Map<string, Strike>();
  for (const strike of remote) byId.set(strike.id, strike);
  for (const strike of local) {
    const existing = byId.get(strike.id);
    if (!existing) {
      byId.set(strike.id, strike);
      continue;
    }
    // Prefer the one with more progress / completed status
    if (strike.status === 'completed' && existing.status !== 'completed') {
      byId.set(strike.id, strike);
    } else if (
      strike.status === existing.status &&
      strike.completedDays > existing.completedDays
    ) {
      byId.set(strike.id, strike);
    } else if (
      strike.lastCheckInDate &&
      (!existing.lastCheckInDate || strike.lastCheckInDate > existing.lastCheckInDate)
    ) {
      byId.set(strike.id, strike);
    }
  }
  return Array.from(byId.values()).sort((a, b) =>
    a.createdDateKey === b.createdDateKey
      ? a.title.localeCompare(b.title, 'pt-BR')
      : a.createdDateKey.localeCompare(b.createdDateKey),
  );
}

function strikesStorageKey(username: string) {
  return `week-planner-strikes-${username}`;
}

function storageKey(username: string) {
  return `week-planner-tasks-${username}`;
}

function leroLeroStorageKey(username: string) {
  return `week-planner-lero-lero-${username}`;
}

function migrateTask(task: Task & { completedWeeks?: string[] }): Task {
  if (task.completedDates) {
    return {
      ...task,
      cancelledDates: task.cancelledDates ?? [],
      incompleteDates: task.incompleteDates ?? [],
      efficientDates: task.efficientDates ?? task.incompleteDates ?? [],
      overtimeDates: task.overtimeDates ?? [],
    };
  }
  const completedDates: string[] = [];
  const legacyWeeks = task.completedWeeks ?? [];

  if (legacyWeeks.includes(getWeekKey())) {
    const today = new Date();
    const todayDay = today.getDay() === 0 ? 6 : (today.getDay() - 1) as DayOfWeek;
    if (task.day === todayDay) {
      completedDates.push(getDateKey(today));
    }
  }

  const { completedWeeks: _, ...rest } = task;
  return { ...rest, completedDates, cancelledDates: [], incompleteDates: [], efficientDates: [] };
}

function assignSortOrders(tasks: Task[]): Task[] {
  if (tasks.every((task) => task.sortOrder !== undefined)) return tasks;

  const dayGroups = new Map<DayOfWeek, Task[]>();
  for (const task of tasks) {
    const list = dayGroups.get(task.day) ?? [];
    list.push(task);
    dayGroups.set(task.day, list);
  }

  const orderMap = new Map<string, number>();
  for (const dayTasks of dayGroups.values()) {
    dayTasks.forEach((task, index) => orderMap.set(task.id, index));
  }

  return tasks.map((task) => ({
    ...task,
    sortOrder: task.sortOrder ?? orderMap.get(task.id) ?? 0,
  }));
}

function normalizeTasks(raw: unknown): Task[] {
  if (!Array.isArray(raw)) return [];
  return assignSortOrders(assignLegacyGroupIds((raw as Task[]).map(migrateTask)));
}

function loadLocalPlannerData(username: string): PlannerData {
  const todayKey = getDateKey();
  let tasks: Task[] = [];
  let leroLero = emptyLeroLero(todayKey);
  let taskTimer = emptyTaskTimer(todayKey);
  let preferences = { ...DEFAULT_USER_PREFERENCES };
  let strikes: Strike[] = [];

  try {
    const rawTasks = localStorage.getItem(storageKey(username));
    if (rawTasks) tasks = normalizeTasks(JSON.parse(rawTasks));
  } catch {
    tasks = [];
  }

  try {
    const rawPrefs = localStorage.getItem(preferencesStorageKey(username));
    if (rawPrefs) preferences = normalizeUserPreferences(JSON.parse(rawPrefs));
  } catch {
    preferences = { ...DEFAULT_USER_PREFERENCES };
  }

  try {
    const rawStrikes = localStorage.getItem(strikesStorageKey(username));
    if (rawStrikes) strikes = normalizeStrikes(JSON.parse(rawStrikes));
  } catch {
    strikes = [];
  }

  try {
    const rawLero = localStorage.getItem(leroLeroStorageKey(username));
    if (rawLero) {
      const parsed = JSON.parse(rawLero) as {
        leroLero?: unknown;
        taskTimer?: unknown;
        preferences?: unknown;
        strikes?: unknown;
        lastDateKey?: string;
      };
      if (parsed.leroLero) {
        leroLero = normalizeLeroLero(parsed.leroLero, todayKey);
      }
      if (parsed.taskTimer) {
        taskTimer = normalizeTaskTimer(parsed.taskTimer, todayKey);
      }
      if (parsed.preferences) {
        preferences = normalizeUserPreferences(parsed.preferences);
      }
      if (parsed.strikes) {
        strikes = normalizeStrikes(parsed.strikes);
      }
      if (parsed.lastDateKey && parsed.lastDateKey !== todayKey) {
        tasks = applyMissedMidnightRollovers(tasks, parsed.lastDateKey, todayKey);
        leroLero = emptyLeroLero(todayKey);
        taskTimer = emptyTaskTimer(todayKey);
      }
    }
  } catch {
    leroLero = emptyLeroLero(todayKey);
    taskTimer = emptyTaskTimer(todayKey);
  }

  if (tasks.length === 0) {
    try {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) tasks = normalizeTasks(JSON.parse(legacy));
    } catch {
      // ignore
    }
  }

  taskTimer = pruneTaskTimerForTasks(taskTimer, tasks);
  return { tasks, leroLero, taskTimer, preferences, strikes };
}

function getTodayScheduledTasks(tasks: Task[]): Task[] {
  const today = getTodayDayOfWeek();
  return tasks.filter(
    (task) =>
      task.day === today &&
      task.timeMode === 'schedule' &&
      task.startTime &&
      task.endTime &&
      !isTaskDoneForDay(task),
  );
}

function cacheLocal(username: string, data: PlannerData) {
  const scheduledTasks = getTodayScheduledTasks(data.tasks);
  const leroLero = snapshotLeroLero(data.leroLero, scheduledTasks);
  const payload = { ...data, leroLero };

  localStorage.setItem(storageKey(username), JSON.stringify(payload.tasks));
  localStorage.setItem(preferencesStorageKey(username), JSON.stringify(payload.preferences));
  localStorage.setItem(strikesStorageKey(username), JSON.stringify(payload.strikes));
  localStorage.setItem(
    leroLeroStorageKey(username),
    JSON.stringify({
      leroLero: payload.leroLero,
      taskTimer: payload.taskTimer,
      preferences: payload.preferences,
      strikes: payload.strikes,
      lastDateKey: payload.leroLero.dateKey,
    }),
  );
}

function reconcilePlannerData(
  remoteTasks: Task[],
  remoteLeroLero: unknown,
  remoteTaskTimer: unknown,
  remotePreferences: unknown,
  remoteStrikes: unknown,
  local: PlannerData,
): PlannerData {
  const todayKey = getDateKey();
  const remoteDateKey =
    remoteLeroLero && typeof remoteLeroLero === 'object'
      ? (remoteLeroLero as LeroLeroState).dateKey
      : null;

  let tasks = remoteTasks.length > 0 ? remoteTasks : local.tasks;
  const lastActiveDateKey = remoteDateKey ?? local.leroLero.dateKey;

  if (lastActiveDateKey && lastActiveDateKey !== todayKey) {
    tasks = applyMissedMidnightRollovers(tasks, lastActiveDateKey, todayKey);
  }

  let leroLero = normalizeLeroLero(remoteLeroLero, todayKey);
  if (lastActiveDateKey && lastActiveDateKey !== todayKey) {
    leroLero = emptyLeroLero(todayKey);
  } else if (local.leroLero.dateKey === todayKey && local.leroLero.hasStarted) {
    const scheduledTasks = getTodayScheduledTasks(tasks);
    const localTotal = getLeroLeroTotalMs(local.leroLero, scheduledTasks);
    const remoteTotal = getLeroLeroTotalMs(leroLero, scheduledTasks);
    const remoteLooksHealed =
      leroLero.segmentStart === null &&
      remoteTotal > 0 &&
      localTotal > remoteTotal + 15 * 60 * 1000;

    leroLero = remoteLooksHealed
      ? leroLero
      : mergeLeroLeroStates(local.leroLero, leroLero, scheduledTasks);
  }

  let taskTimer = normalizeTaskTimer(remoteTaskTimer, todayKey);
  if (lastActiveDateKey && lastActiveDateKey !== todayKey) {
    taskTimer = emptyTaskTimer(todayKey);
  } else if (local.taskTimer.dateKey === todayKey) {
    taskTimer = mergeTaskTimer(local.taskTimer, taskTimer);
  }

  taskTimer = pruneTaskTimerForTasks(taskTimer, tasks);

  const preferences = normalizeUserPreferences(remotePreferences ?? local.preferences);
  const strikes = mergeStrikes(local.strikes, normalizeStrikes(remoteStrikes));

  return { tasks, leroLero, taskTimer, preferences, strikes };
}

export async function fetchPlannerData(username: string): Promise<PlannerData> {
  const local = loadLocalPlannerData(username);

  if (!isSyncEnabled()) {
    return local;
  }

  try {
    const response = await apiFetch('/api/tasks');
    if (!response.ok) {
      console.error('Erro ao carregar dados:', response.status);
      return local;
    }

    const data = (await response.json()) as {
      tasks: unknown;
      leroLero: unknown;
      taskTimer: unknown;
      preferences: unknown;
      strikes: unknown;
    };

    const remoteTasks = normalizeTasks(data.tasks);
    const reconciled = reconcilePlannerData(
      remoteTasks,
      data.leroLero,
      data.taskTimer,
      data.preferences,
      data.strikes,
      local,
    );

    if (remoteTasks.length === 0 && local.tasks.length > 0) {
      await savePlannerData(username, local);
      return local;
    }

    cacheLocal(username, reconciled);
    return reconciled;
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    return local;
  }
}

export async function savePlannerData(username: string, data: PlannerData): Promise<void> {
  const scheduledTasks = getTodayScheduledTasks(data.tasks);
  const payload: PlannerData = {
    ...data,
    leroLero: snapshotLeroLero(data.leroLero, scheduledTasks),
  };

  cacheLocal(username, payload);

  if (!isSyncEnabled()) return;

  const response = await apiFetch('/api/tasks', {
    method: 'PUT',
    body: JSON.stringify({
      tasks: payload.tasks,
      leroLero: payload.leroLero,
      taskTimer: payload.taskTimer,
      preferences: payload.preferences,
      strikes: payload.strikes,
    }),
  });

  if (!response.ok) {
    console.error('Erro ao salvar dados:', response.status);
    throw new Error('Falha ao sincronizar');
  }
}

export async function fetchTasks(username: string): Promise<Task[]> {
  const data = await fetchPlannerData(username);
  return data.tasks;
}

export async function saveTasks(username: string, tasks: Task[]): Promise<void> {
  const local = loadLocalPlannerData(username);
  await savePlannerData(username, {
    tasks,
    leroLero: local.leroLero,
    taskTimer: local.taskTimer,
    preferences: local.preferences,
    strikes: local.strikes,
  });
}

export async function pullLeroLero(_username: string): Promise<LeroLeroState | null> {
  if (!isSyncEnabled()) return null;

  try {
    const response = await apiFetch('/api/tasks');
    if (!response.ok) return null;
    const data = (await response.json()) as { leroLero: unknown };
    const todayKey = getDateKey();
    const state = normalizeLeroLero(data.leroLero, todayKey);
    if (!state.hasStarted) return null;
    return state;
  } catch {
    return null;
  }
}
