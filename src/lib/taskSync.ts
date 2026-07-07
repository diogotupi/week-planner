import type { DayOfWeek, LeroLeroState, Task, TaskTimerState } from '../types';
import {
  applyMissedMidnightRollovers,
  assignLegacyGroupIds,
  emptyLeroLero,
  emptyTaskTimer,
  getDateKey,
  getWeekKey,
  mergeTaskTimer,
  normalizeLeroLero,
  normalizeTaskTimer,
  pruneTaskTimerForTasks,
} from '../utils';
import { apiFetch, isSyncEnabled } from './api';

const LEGACY_STORAGE_KEY = 'week-planner-tasks';

export interface PlannerData {
  tasks: Task[];
  leroLero: LeroLeroState;
  taskTimer: TaskTimerState;
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

  try {
    const rawTasks = localStorage.getItem(storageKey(username));
    if (rawTasks) tasks = normalizeTasks(JSON.parse(rawTasks));
  } catch {
    tasks = [];
  }

  try {
    const rawLero = localStorage.getItem(leroLeroStorageKey(username));
    if (rawLero) {
      const parsed = JSON.parse(rawLero) as {
        leroLero?: unknown;
        taskTimer?: unknown;
        lastDateKey?: string;
      };
      if (parsed.leroLero) {
        leroLero = normalizeLeroLero(parsed.leroLero, todayKey);
      }
      if (parsed.taskTimer) {
        taskTimer = normalizeTaskTimer(parsed.taskTimer, todayKey);
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
  return { tasks, leroLero, taskTimer };
}

function cacheLocal(username: string, data: PlannerData) {
  localStorage.setItem(storageKey(username), JSON.stringify(data.tasks));
  localStorage.setItem(
    leroLeroStorageKey(username),
    JSON.stringify({
      leroLero: data.leroLero,
      taskTimer: data.taskTimer,
      lastDateKey: data.leroLero.dateKey,
    }),
  );
}

function reconcilePlannerData(
  remoteTasks: Task[],
  remoteLeroLero: unknown,
  remoteTaskTimer: unknown,
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
    const accumulatedMs = Math.max(local.leroLero.accumulatedMs, leroLero.accumulatedMs);
    leroLero = {
      ...leroLero,
      accumulatedMs,
      hasStarted: local.leroLero.hasStarted || leroLero.hasStarted,
      segmentStart: local.leroLero.segmentStart ?? leroLero.segmentStart,
      allDone: local.leroLero.allDone || leroLero.allDone,
    };
  }

  let taskTimer = normalizeTaskTimer(remoteTaskTimer, todayKey);
  if (lastActiveDateKey && lastActiveDateKey !== todayKey) {
    taskTimer = emptyTaskTimer(todayKey);
  } else if (local.taskTimer.dateKey === todayKey) {
    taskTimer = mergeTaskTimer(local.taskTimer, taskTimer);
  }

  taskTimer = pruneTaskTimerForTasks(taskTimer, tasks);

  return { tasks, leroLero, taskTimer };
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
    };

    const remoteTasks = normalizeTasks(data.tasks);
    const reconciled = reconcilePlannerData(
      remoteTasks,
      data.leroLero,
      data.taskTimer,
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
  cacheLocal(username, data);

  if (!isSyncEnabled()) return;

  const response = await apiFetch('/api/tasks', {
    method: 'PUT',
    body: JSON.stringify({
      tasks: data.tasks,
      leroLero: data.leroLero,
      taskTimer: data.taskTimer,
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
  await savePlannerData(username, { tasks, leroLero: local.leroLero, taskTimer: local.taskTimer });
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
