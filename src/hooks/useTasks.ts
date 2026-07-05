import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTasks, saveTasks } from '../lib/taskSync';
import type { DayOfWeek, Task } from '../types';
import { generateId, getDateForDayOfWeek, getDateKey, getWeekKey } from '../utils';

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
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [todayKey, setTodayKey] = useState(() => getDateKey());
  const currentWeek = getWeekKey();
  const skipSaveRef = useRef(true);

  useEffect(() => {
    let cancelled = false;
    skipSaveRef.current = true;
    setLoading(true);
    setSyncError(null);

    fetchTasks(username).then((loaded) => {
      if (cancelled) return;
      setTasks(loaded);
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

      saveTasks(username, tasks)
        .catch(() => {
          setSyncError('Não foi possível sincronizar. Dados salvos localmente.');
        })
        .finally(() => {
          setSyncing(false);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [tasks, username, loading]);

  useEffect(() => {
    let timerId = 0;

    function scheduleMidnightRefresh() {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(24, 0, 0, 0);
      timerId = window.setTimeout(() => {
        setTodayKey(getDateKey());
      }, midnight.getTime() - now.getTime());
    }

    scheduleMidnightRefresh();
    return () => clearTimeout(timerId);
  }, [todayKey]);

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
        const taskDate = getDateForDayOfWeek(task.day);
        const done = task.completedDates.includes(taskDate);
        return {
          ...task,
          completedDates: done
            ? task.completedDates.filter((d) => d !== taskDate)
            : [...task.completedDates, taskDate],
        };
      }),
    );
  }, []);

  const completeTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) => {
        if (task.id !== id) return task;
        const taskDate = getDateForDayOfWeek(task.day);
        if (task.completedDates.includes(taskDate)) return task;
        return {
          ...task,
          completedDates: [...task.completedDates, taskDate],
        };
      }),
    );
  }, []);

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

  return {
    tasks,
    loading,
    syncing,
    syncError,
    addTasks,
    updateTask,
    toggleTask,
    completeTask,
    removeTask,
    reorderTasks,
    getTasksForDay,
    currentWeek,
    todayKey,
  };
}
