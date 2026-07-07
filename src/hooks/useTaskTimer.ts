import { useCallback, useEffect, useRef, useState } from 'react';
import type { TaskTimerState } from '../types';
import { getDateKey } from '../utils';

interface UseTaskTimerOptions {
  timerState: TaskTimerState;
  setTimerState: React.Dispatch<React.SetStateAction<TaskTimerState>>;
  onOvertime: (taskId: string) => void;
}

export function useTaskTimer({
  timerState,
  setTimerState,
  onOvertime,
}: UseTaskTimerOptions) {
  const { active, paused } = timerState;
  const [remainingMs, setRemainingMs] = useState(0);
  const activeTaskId = active?.taskId ?? null;
  const onOvertimeRef = useRef(onOvertime);
  onOvertimeRef.current = onOvertime;

  const setState = useCallback(
    (updater: (current: TaskTimerState) => TaskTimerState) => {
      setTimerState((current) => {
        const next = updater(current);
        return { ...next, dateKey: getDateKey() };
      });
    },
    [setTimerState],
  );

  useEffect(() => {
    if (!active) {
      setRemainingMs(0);
      return;
    }

    function tick() {
      const left = active!.endsAt - Date.now();
      if (left <= 0 && !active!.inOvertime) {
        setState((current) => {
          if (!current.active || current.active.inOvertime) return current;
          return {
            ...current,
            active: { ...current.active, inOvertime: true },
          };
        });
        setRemainingMs(left);
        onOvertimeRef.current(active!.taskId);
        return;
      }
      setRemainingMs(left);
    }

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [active, setState]);

  const startTimer = useCallback(
    (taskId: string, durationMinutes: number) => {
      const totalMs = durationMinutes * 60 * 1000;
      setState((current) => {
        const nextPaused = { ...current.paused };
        if (current.active && current.active.taskId !== taskId) {
          const left = current.active.endsAt - Date.now();
          nextPaused[current.active.taskId] = left;
        }
        delete nextPaused[taskId];
        setRemainingMs(totalMs);
        return {
          ...current,
          active: { taskId, endsAt: Date.now() + totalMs, inOvertime: false },
          paused: nextPaused,
        };
      });
    },
    [setState],
  );

  const resumeTimer = useCallback(
    (taskId: string) => {
      setState((current) => {
        const remaining = current.paused[taskId];
        if (remaining === undefined) return current;

        const nextPaused = { ...current.paused };
        delete nextPaused[taskId];

        if (current.active && current.active.taskId !== taskId) {
          const left = current.active.endsAt - Date.now();
          nextPaused[current.active.taskId] = left;
        }

        const inOvertime = remaining <= 0;
        setRemainingMs(remaining);
        return {
          ...current,
          active: {
            taskId,
            endsAt: Date.now() + remaining,
            inOvertime,
          },
          paused: nextPaused,
        };
      });
    },
    [setState],
  );

  const pauseTimer = useCallback(() => {
    setState((current) => {
      if (!current.active) return current;
      const left = current.active.endsAt - Date.now();
      setRemainingMs(left);
      return {
        ...current,
        active: null,
        paused: { ...current.paused, [current.active.taskId]: left },
      };
    });
  }, [setState]);

  const clearTimer = useCallback(
    (taskId?: string) => {
      setState((current) => {
        if (!taskId) {
          setRemainingMs(0);
          return { ...current, active: null, paused: {} };
        }

        const nextPaused = { ...current.paused };
        delete nextPaused[taskId];

        if (current.active?.taskId === taskId) {
          setRemainingMs(0);
          return { ...current, active: null, paused: nextPaused };
        }

        return { ...current, paused: nextPaused };
      });
    },
    [setState],
  );

  const adjustTimerRemaining = useCallback(
    (taskId: string, remainingMs: number) => {
      setState((current) => {
        const inOvertime = remainingMs <= 0;

        if (current.active?.taskId === taskId) {
          setRemainingMs(remainingMs);
          return {
            ...current,
            active: {
              taskId,
              endsAt: Date.now() + remainingMs,
              inOvertime,
            },
          };
        }

        return {
          ...current,
          paused: { ...current.paused, [taskId]: remainingMs },
        };
      });
    },
    [setState],
  );

  const getPausedRemaining = useCallback(
    (taskId: string) => (taskId in paused ? paused[taskId] : null),
    [paused],
  );

  const isTaskPaused = useCallback(
    (taskId: string) => taskId in paused,
    [paused],
  );

  const isTaskOvertime = useCallback(
    (taskId: string) => {
      if (active?.taskId === taskId) return active.inOvertime;
      const remaining = paused[taskId];
      return remaining !== undefined && remaining <= 0;
    },
    [active, paused],
  );

  return {
    activeTaskId,
    remainingMs,
    startTimer,
    resumeTimer,
    pauseTimer,
    clearTimer,
    adjustTimerRemaining,
    getPausedRemaining,
    isTaskPaused,
    isTaskOvertime,
  };
}
