import { useCallback, useEffect, useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { assignLegacyGroupIds, generateId, getDateForDayOfWeek, getDateKey, getWeekKey } from '../utils';

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

function loadTasks(username: string): Task[] {
  try {
    const raw = localStorage.getItem(storageKey(username));
    const tasks = raw ? (JSON.parse(raw) as Task[]) : [];
    return assignSortOrders(assignLegacyGroupIds(tasks.map(migrateTask)));
  } catch {
    return [];
  }
}

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
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(username));
  const [todayKey, setTodayKey] = useState(() => getDateKey());
  const currentWeek = getWeekKey();

  useEffect(() => {
    setTasks(loadTasks(username));
  }, [username]);

  useEffect(() => {
    localStorage.setItem(storageKey(username), JSON.stringify(tasks));
  }, [tasks, username]);

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

  const toggleTask = useCallback(
    (id: string) => {
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
    },
    [],
  );

  const completeTask = useCallback(
    (id: string) => {
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
    },
    [],
  );

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
