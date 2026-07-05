import { useCallback, useEffect, useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { assignLegacyGroupIds, generateId, getWeekKey } from '../utils';

function storageKey(username: string) {
  return `week-planner-tasks-${username}`;
}

function loadTasks(username: string): Task[] {
  try {
    const raw = localStorage.getItem(storageKey(username));
    const tasks = raw ? (JSON.parse(raw) as Task[]) : [];
    return assignLegacyGroupIds(tasks);
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
  const currentWeek = getWeekKey();

  useEffect(() => {
    setTasks(loadTasks(username));
  }, [username]);

  useEffect(() => {
    localStorage.setItem(storageKey(username), JSON.stringify(tasks));
  }, [tasks, username]);

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
        completedWeeks: [] as string[],
        ...(groupId ? { groupId } : {}),
      };

      setTasks((prev) => [
        ...prev,
        ...input.days.map((day) => ({
          ...base,
          id: generateId(),
          day,
        })),
      ]);
    },
    [currentWeek],
  );

  const toggleTask = useCallback(
    (id: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          const done = task.completedWeeks.includes(currentWeek);
          return {
            ...task,
            completedWeeks: done
              ? task.completedWeeks.filter((w) => w !== currentWeek)
              : [...task.completedWeeks, currentWeek],
          };
        }),
      );
    },
    [currentWeek],
  );

  const completeTask = useCallback(
    (id: string) => {
      setTasks((prev) =>
        prev.map((task) => {
          if (task.id !== id) return task;
          if (task.completedWeeks.includes(currentWeek)) return task;
          return {
            ...task,
            completedWeeks: [...task.completedWeeks, currentWeek],
          };
        }),
      );
    },
    [currentWeek],
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
          ? { ...item, ...sharedFields, day, groupId: task.groupId ? undefined : item.groupId }
          : item,
      );
    });
  }, []);

  const getTasksForDay = useCallback(
    (day: DayOfWeek) =>
      tasks.filter(
        (t) =>
          t.day === day &&
          (t.weekly || t.createdWeek === currentWeek),
      ),
    [tasks, currentWeek],
  );

  return { tasks, addTasks, updateTask, toggleTask, completeTask, removeTask, getTasksForDay, currentWeek };
}
