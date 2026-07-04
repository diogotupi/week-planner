import { useCallback, useEffect, useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { generateId, getWeekKey } from '../utils';

const STORAGE_KEY = 'week-planner-tasks';

function loadTasks(): Task[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  } catch {
    return [];
  }
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(loadTasks);
  const currentWeek = getWeekKey();

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  }, [tasks]);

  const addTask = useCallback(
    (task: Omit<Task, 'id' | 'createdWeek' | 'completedWeeks'>) => {
      setTasks((prev) => [
        ...prev,
        {
          ...task,
          id: generateId(),
          createdWeek: currentWeek,
          completedWeeks: [],
        },
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

  const getTasksForDay = useCallback(
    (day: DayOfWeek) =>
      tasks.filter(
        (t) =>
          t.day === day &&
          (t.weekly || t.createdWeek === currentWeek),
      ),
    [tasks, currentWeek],
  );

  return { tasks, addTask, toggleTask, removeTask, getTasksForDay, currentWeek };
}
