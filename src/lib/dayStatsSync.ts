import type { DayStats } from '../types';
import { apiFetch, isSyncEnabled } from './api';

const storagePrefix = 'week-planner-day-stats-';

function storageKey(username: string) {
  return `${storagePrefix}${username}`;
}

function loadLocal(username: string): DayStats[] {
  try {
    const raw = localStorage.getItem(storageKey(username));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DayStats[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function cacheLocal(username: string, stats: DayStats[]) {
  localStorage.setItem(storageKey(username), JSON.stringify(stats));
}

export async function fetchDayStats(username: string): Promise<DayStats[]> {
  const local = loadLocal(username);
  if (!isSyncEnabled()) return local.sort((a, b) => b.dateKey.localeCompare(a.dateKey));

  try {
    const response = await apiFetch('/api/day-stats');
    if (!response.ok) return local.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    const data = (await response.json()) as { stats: DayStats[] };
    const remote = Array.isArray(data.stats) ? data.stats : [];
    const merged = new Map<string, DayStats>();
    for (const item of local) merged.set(item.dateKey, item);
    for (const item of remote) merged.set(item.dateKey, item);
    const list = [...merged.values()].sort((a, b) => b.dateKey.localeCompare(a.dateKey));
    cacheLocal(username, list);
    return list;
  } catch {
    return local.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }
}

export async function saveDayStats(username: string, stats: DayStats): Promise<void> {
  const local = loadLocal(username);
  const next = [...local.filter((item) => item.dateKey !== stats.dateKey), stats].sort((a, b) =>
    b.dateKey.localeCompare(a.dateKey),
  );
  cacheLocal(username, next);

  if (!isSyncEnabled()) return;

  const response = await apiFetch('/api/day-stats', {
    method: 'PUT',
    body: JSON.stringify({ stats }),
  });

  if (!response.ok) {
    throw new Error('Falha ao salvar estatísticas do dia');
  }
}
