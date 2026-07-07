import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchPlannerData, savePlannerData } from '../lib/taskSync';
import { saveDayStats } from '../lib/dayStatsSync';
import type { DayOfWeek, LeroLeroState, Task, TaskTimerState, UserPreferences } from '../types';
import { DEFAULT_USER_PREFERENCES } from '../types';
import {
  applyMidnightRolloverForDate,
  buildDayStats,
  emptyLeroLero,
  emptyTaskTimer,
  generateId,
  getDateForDayOfWeek,
  getDateKey,
  getWeekKey,
  pruneTaskTimerForTasks,
} from '../utils';

export type UpdateScope = 'single' | 'all';

export interface NewTaskInput {
  text: string;
  days: DayOfWeek[];
  weekly: boolean;
  timeMode: Task['timeMode'];
  duration?: string;
  startTime?: string;
  endTime?: string;
}

export function useTasks(username: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [leroLero, setLeroLero] = useState<LeroLeroState>(() => emptyLeroLero());
  const [taskTimer, setTaskTimer] = useState<TaskTimerState>(() => emptyTaskTimer());
  const [preferences, setPreferences] = useState<UserPreferences>(() => ({
    ...DEFAULT_USER_PREFERENCES,
  }));
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState(() => getDateKey());
  const currentWeek = getWeekKey();
  const weekViewMode = preferences.weekViewMode;
  const skipSaveRef = useRef(true);
  const todayKeyRef = useRef(todayKey);
  const leroLeroRef = useRef(leroLero);

  useEffect(() => {
    leroLeroRef.current = leroLero;
  }, [leroLero]);

  useEffect(() => {
    todayKeyRef.current = todayKey;
  }, [todayKey]);

  useEffect(() => {
    let cancelled = false;
    skipSaveRef.current = true;
    setLoading(true);
    setSyncError(null);

    fetchPlannerData(username).then((data) => {
      if (cancelled) return;
      setTasks(data.tasks);
      setLeroLero(data.leroLero);
      setTaskTimer(pruneTaskTimerForTasks(data.taskTimer, data.tasks));
      setPreferences(data.preferences);
      setTodayKey(getDateKey());
      setLoading(false);
      skipSaveRef.current = false;
    });

    return () => {
      cancelled = true;
    };
  }, [username]);

  useEffect(() => {
    if (skipSaveRef.current || loading) return;

    const timer = window.setTimeout(() => {
      setSyncing(true);
      setSyncError(null);

      savePlannerData(username, { tasks, leroLero, taskTimer, preferences })
        .catch(() => {
          setSyncError('Não foi possível sincronizar. Dados salvos localmente.');
        })
        .finally(() => {
          setSyncing(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [tasks, leroLero, taskTimer, preferences, username, loading]);

  useEffect(() => {
    let timerId = 0;

    function handleMidnight() {
      const endingDayKey = todayKeyRef.current;

      setTasks((prev) => {
        const stats = buildDayStats(prev, leroLeroRef.current, endingDayKey);
        void saveDayStats(username, stats);
        return applyMidnightRolloverForDate(prev, endingDayKey);
      });
      setLeroLero(emptyLeroLero(getDateKey()));
      setTaskTimer(emptyTaskTimer(getDateKey()));
      setTodayKey(getDateKey());
    }

    function scheduleMidnightRefresh() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timerId = window.setTimeout(() => {
        handleMidnight();
        scheduleMidnightRefresh();
      }, midnight.getTime() - now.getTime());
    }

    scheduleMidnightRefresh();
    return () => clearTimeout(timerId);
  }, []);

  const addTasks = useCallback(
    (input: NewTaskInput) => {
      const groupId = input.days.length > 1 ? generateId() : undefined;
      const base = {
        text: input.text,
        weekly: input.weekly,
        timeMode: input.timeMode,
        duration: input.duration,
        startTime: input.startTime,
        endTime: input.endTime,
        createdWeek: currentWeek,
        completedDates: [] as string[],
        cancelledDates: [] as string[],
        incompleteDates: [] as string[],
        efficientDates: [] as string[],
        overtimeDates: [] as string[],
        ...(groupId ? { groupId } : {}),
      };

      setTasks((prev) => {
        const newTasks = input.days.map((day) => {
          const dayTasks = prev.filter((task) => task.day === day);
          const maxOrder = dayTasks.reduce(
            (max, task) => Math.max(max, task.sortOrder ?? 0),
            -1,
          );

          return {
            ...base,
            id: generateId(),
            day,
            sortOrder: maxOrder + 1,
          };
        });

        return [...prev, ...newTasks];
      });
    },
    [currentWeek],
  );

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day, new Date(), weekViewMode);
        const done = task.completedDates.includes(taskDate);
        const efficient = (task.efficientDates ?? task.incompleteDates ?? []).includes(taskDate);
        const overtime = (task.overtimeDates ?? []).includes(taskDate);
        if (done || efficient || overtime) {
          return {
            ...task,
            completedDates: task.completedDates.filter((d) => d !== taskDate),
            efficientDates: (task.efficientDates ?? []).filter((d) => d !== taskDate),
            overtimeDates: (task.overtimeDates ?? []).filter((d) => d !== taskDate),
            incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
          };
        }
        return {
          ...task,
          completedDates: [...task.completedDates, taskDate],
          cancelledDates: (task.cancelledDates ?? []).filter((d) => d !== taskDate),
          efficientDates: (task.efficientDates ?? []).filter((d) => d !== taskDate),
          overtimeDates: (task.overtimeDates ?? []).filter((d) => d !== taskDate),
          incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
        };
      }),
    );
  }, [weekViewMode]);

  const cancelTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day, new Date(), weekViewMode);
        const cancelled = (task.cancelledDates ?? []).includes(taskDate);
        if (cancelled) {
          return {
            ...task,
            cancelledDates: (task.cancelledDates ?? []).filter((d) => d !== taskDate),
          };
        }
        return {
          ...task,
          cancelledDates: [...(task.cancelledDates ?? []), taskDate],
          completedDates: task.completedDates.filter((d) => d !== taskDate),
          efficientDates: (task.efficientDates ?? []).filter((d) => d !== taskDate),
          overtimeDates: (task.overtimeDates ?? []).filter((d) => d !== taskDate),
          incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
        };
      }),
    );
  }, [weekViewMode]);

  const completeTaskEfficient = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day, new Date(), weekViewMode);
        if ((task.efficientDates ?? task.incompleteDates ?? []).includes(taskDate)) return task;
        return {
          ...task,
          efficientDates: [...(task.efficientDates ?? []), taskDate],
          cancelledDates: (task.cancelledDates ?? []).filter((d) => d !== taskDate),
          completedDates: task.completedDates.filter((d) => d !== taskDate),
          incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
          overtimeDates: (task.overtimeDates ?? []).filter((d) => d !== taskDate),
        };
      }),
    );
  }, [weekViewMode]);

  const completeTaskOvertime = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day, new Date(), weekViewMode);
        if ((task.overtimeDates ?? []).includes(taskDate)) return task;
        return {
          ...task,
          overtimeDates: [...(task.overtimeDates ?? []), taskDate],
          cancelledDates: (task.cancelledDates ?? []).filter((d) => d !== taskDate),
          completedDates: task.completedDates.filter((d) => d !== taskDate),
          efficientDates: (task.efficientDates ?? []).filter((d) => d !== taskDate),
          incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
        };
      }),
    );
  }, []);

  const resetTaskCompletionForToday = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day, new Date(), weekViewMode);
        return {
          ...task,
          completedDates: task.completedDates.filter((d) => d !== taskDate),
          efficientDates: (task.efficientDates ?? []).filter((d) => d !== taskDate),
          overtimeDates: (task.overtimeDates ?? []).filter((d) => d !== taskDate),
          incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
        };
      }),
    );
  }, [weekViewMode]);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day, new Date(), weekViewMode);
        if (task.completedDates.includes(taskDate)) return task;
        return {
          ...task,
          completedDates: [...task.completedDates, taskDate],
          cancelledDates: (task.cancelledDates ?? []).filter((d) => d !== taskDate),
          efficientDates: (task.efficientDates ?? []).filter((d) => d !== taskDate),
          overtimeDates: (task.overtimeDates ?? []).filter((d) => d !== taskDate),
          incompleteDates: (task.incompleteDates ?? []).filter((d) => d !== taskDate),
        };
      }),
    );
  }, [weekViewMode]);

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTask = useCallback((id: string, input: NewTaskInput, scope: UpdateScope = 'single') => {
    const day = input.days[0];
    if (day === undefined) return;

    const sharedFields = {
      text: input.text,
      weekly: input.weekly,
      timeMode: input.timeMode,
      duration: input.duration,
      startTime: input.startTime,
      endTime: input.endTime,
    };

    setTasks((prev) => {
      const task = prev.find((item) => item.id === id);
      if (!task) return prev;

      if (scope === 'all' && task.groupId) {
        return prev.map((item) =>
          item.groupId === task.groupId ? { ...item, ...sharedFields } : item,
        );
      }

      return prev.map((item) =>
        item.id === id
          ? {
              ...item,
              ...sharedFields,
              day,
              groupId: task.groupId ? undefined : item.groupId,
              sortOrder: (() => {
                if (day === task.day) return item.sortOrder;
                const dayTasks = prev.filter((t) => t.day === day && t.id !== id);
                return dayTasks.reduce((max, t) => Math.max(max, t.sortOrder ?? 0), -1) + 1;
              })(),
            }
          : item,
      );
    });
  }, []);

  const reorderTasks = useCallback((day: DayOfWeek, orderedIds: string[]) => {
    const orderMap = new Map(orderedIds.map((id, index) => [id, index]));
    setTasks((prev) =>
      prev.map((task) =>
        task.day === day && orderMap.has(task.id)
          ? { ...task, sortOrder: orderMap.get(task.id)! }
          : task,
      ),
    );
  }, []);

  const moveTask = useCallback(
    (taskId: string, toDay: DayOfWeek, beforeId: string | null) => {
      setTasks((prev) => {
        const task = prev.find((item) => item.id === taskId);
        if (!task) return prev;
        if (beforeId === taskId) return prev;

        const destTasks = prev
          .filter((item) => item.day === toDay && item.id !== taskId)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        let insertAt =
          beforeId === null ? destTasks.length : destTasks.findIndex((item) => item.id === beforeId);
        if (insertAt < 0) insertAt = destTasks.length;

        const orderedIds = destTasks.map((item) => item.id);
        orderedIds.splice(insertAt, 0, taskId);

        const orderMap = new Map(orderedIds.map((id, index) => [id, index]));

        return prev.map((item) => {
          if (item.id === taskId) {
            return {
              ...item,
              day: toDay,
              groupId: item.day === toDay ? item.groupId : undefined,
              sortOrder: orderMap.get(item.id)!,
            };
          }
          if (item.day === toDay && orderMap.has(item.id)) {
            return { ...item, sortOrder: orderMap.get(item.id)! };
          }
          return item;
        });
      });
    },
    [],
  );

  const getTasksForDay = useCallback(
    (day: DayOfWeek) =>
      tasks
        .filter(
          (t) =>
            t.day === day &&
            (t.weekly || t.createdWeek === currentWeek),
        )
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks, currentWeek],
  );

  useEffect(() => {
    setTaskTimer((prev) => pruneTaskTimerForTasks(prev, tasks));
  }, [tasks]);

  return {
    tasks,
    leroLero,
    setLeroLero,
    taskTimer,
    setTaskTimer,
    loading,
    syncing,
    syncError,
    addTasks,
    updateTask,
    toggleTask,
    cancelTask,
    completeTask,
    completeTaskEfficient,
    completeTaskOvertime,
    resetTaskCompletionForToday,
    removeTask,
    reorderTasks,
    moveTask,
    getTasksForDay,
    preferences,
    setPreferences,
    weekViewMode,
    currentWeek,
    todayKey,
  };
}
