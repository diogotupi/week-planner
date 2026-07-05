import type { DayOfWeek, Task } from '../types';
import { assignLegacyGroupIds, getDateKey, getWeekKey } from '../utils';
import { isSupabaseConfigured, supabase } from './supabase';

const LEGACY_STORAGE_KEY = 'week-planner-tasks';

function storageKey(username: string) {
  return `week-planner-tasks-${username}`;
}

function migrateTask(task: Task & { completedWeeks?: string[] }): Task {
  if (task.completedDates) return task;

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
  return { ...rest, completedDates };
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

function loadLocalTasks(username: string): Task[] {
  try {
    const raw = localStorage.getItem(storageKey(username));
    return raw ? normalizeTasks(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function loadLegacyTasks(): Task[] {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? normalizeTasks(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

function cacheLocal(username: string, tasks: Task[]) {
  localStorage.setItem(storageKey(username), JSON.stringify(tasks));
}

function pickLocalSource(username: string): Task[] {
  const userTasks = loadLocalTasks(username);
  if (userTasks.length > 0) return userTasks;
  return loadLegacyTasks();
}

export async function fetchTasks(username: string): Promise<Task[]> {
  const local = pickLocalSource(username);

  if (!isSupabaseConfigured()) {
    return local;
  }

  const { data, error } = await supabase
    .from('user_tasks')
    .select('tasks, updated_at')
    .eq('username', username)
    .maybeSingle();

  if (error) {
    console.error('Erro ao carregar tarefas:', error.message);
    return local;
  }

  if (!data) {
    if (local.length > 0) {
      await saveTasks(username, local);
      return local;
    }
    return [];
  }

  const remote = normalizeTasks(data.tasks);

  if (remote.length === 0 && local.length > 0) {
    await saveTasks(username, local);
    return local;
  }

  cacheLocal(username, remote);
  return remote;
}

export async function saveTasks(username: string, tasks: Task[]): Promise<void> {
  cacheLocal(username, tasks);

  if (!isSupabaseConfigured()) return;

  const { error } = await supabase.from('user_tasks').upsert(
    {
      username,
      tasks,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'username' },
  );

  if (error) {
    console.error('Erro ao salvar tarefas:', error.message);
    throw error;
  }
}
