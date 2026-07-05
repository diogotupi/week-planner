import { useCallback, useEffect, useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { generateId, getWeekKey } from '../utils';

function storageKey(username: string) {
  return `week-planner-tasks-${username}`;
}

function loadTasks(username: string): Task[] {
  try {
    const raw = localStorage.getItem(storageKey(username));
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

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
      const base = {
        text: input.text,
        weekly: input.weekly,
        timeMode: input.timeMode,
        duration: input.duration,
        startTime: input.startTime,
        endTime: input.endTime,
        createdWeek: currentWeek,
        completedWeeks: [] as string[],
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

  const removeTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const updateTask = useCallback((id: string, input: NewTaskInput) => {
    const day = input.days[0];
    if (day === undefined) return;

    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              text: input.text,
              day,
              weekly: input.weekly,
              timeMode: input.timeMode,
              duration: input.duration,
              startTime: input.startTime,
              endTime: input.endTime,
            }
          : task,
      ),
    );
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

  return { tasks, addTasks, updateTask, toggleTask, removeTask, getTasksForDay, currentWeek };
}
