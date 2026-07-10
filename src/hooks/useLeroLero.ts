import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LeroLeroState, Task, WeekViewMode } from '../types';
import {
  areAllTasksDoneToday,
  emptyLeroLero,
  getActiveScheduleBlock,
  getLeroLeroTotalMs,
  isTaskDoneForDay,
} from '../utils';

interface UseLeroLeroOptions {
  username: string;
  todayTasks: Task[];
  /** Timer actively running — lero lero must not count */
  isTaskBlocking: boolean;
  weekViewMode: WeekViewMode;
  todayKey: string;
  leroLero: LeroLeroState;
  setLeroLero: React.Dispatch<React.SetStateAction<LeroLeroState>>;
  enabled?: boolean;
}

function beginLeroLeroSegment(prev: LeroLeroState, todayKey: string): LeroLeroState {
  if (prev.allDone || prev.manuallyPaused) return prev;

  if (prev.segmentStart !== null) {
    return { ...prev, dateKey: todayKey, hasStarted: true };
  }

  return {
    ...prev,
    dateKey: todayKey,
    hasStarted: true,
    allDone: false,
    manuallyPaused: false,
    segmentStart: Date.now(),
  };
}

export function useLeroLero({
  todayTasks,
  isTaskBlocking,
  weekViewMode,
  todayKey,
  leroLero,
  setLeroLero,
  enabled = true,
}: UseLeroLeroOptions) {
  const { accumulatedMs, segmentStart, hasStarted, allDone, manuallyPaused } = leroLero;
  const [now, setNow] = useState(() => new Date());

  const scheduledTasks = useMemo(
    () =>
      todayTasks.filter(
        (task) =>
          task.timeMode === 'schedule' &&
          task.startTime &&
          task.endTime &&
          !isTaskDoneForDay(task, new Date(), weekViewMode),
      ),
    [todayTasks, weekViewMode],
  );

  const scheduleBlock = useMemo(
    () => getActiveScheduleBlock(todayTasks, now),
    [todayTasks, now],
  );

  const finalizeDay = useCallback(() => {
    setLeroLero((prev) => {
      const accumulated = getLeroLeroTotalMs(prev, scheduledTasks, new Date());
      return {
        ...prev,
        accumulatedMs: accumulated,
        segmentStart: null,
        allDone: true,
        manuallyPaused: false,
      };
    });
  }, [scheduledTasks, setLeroLero]);

  const onTaskCompleted = useCallback(
    (isLastTask = false) => {
      if (!enabled) return;
      setLeroLero((prev) => {
        const accumulated = getLeroLeroTotalMs(prev, scheduledTasks, new Date());

        if (isLastTask || areAllTasksDoneToday(todayTasks)) {
          return {
            ...prev,
            dateKey: todayKey,
            hasStarted: true,
            accumulatedMs: accumulated,
            segmentStart: null,
            allDone: true,
            manuallyPaused: false,
          };
        }

        if (prev.manuallyPaused) {
          return {
            ...prev,
            dateKey: todayKey,
            hasStarted: true,
            allDone: false,
            accumulatedMs: accumulated,
            segmentStart: null,
            manuallyPaused: true,
          };
        }

        return {
          ...prev,
          dateKey: todayKey,
          hasStarted: true,
          allDone: false,
          accumulatedMs: accumulated,
          segmentStart: Date.now(),
          manuallyPaused: false,
        };
      });
    },
    [enabled, todayTasks, scheduledTasks, todayKey, setLeroLero],
  );

  const onTaskRunning = useCallback(() => {
    if (!enabled) return;
    setLeroLero((prev) => {
      if (prev.allDone) return prev;

      const accumulated = getLeroLeroTotalMs(prev, scheduledTasks, new Date());

      return {
        ...prev,
        dateKey: todayKey,
        hasStarted: true,
        accumulatedMs: accumulated,
        segmentStart: null,
      };
    });
  }, [enabled, scheduledTasks, todayKey, setLeroLero]);

  const onTaskNotRunning = useCallback(() => {
    if (!enabled) return;
    setLeroLero((prev) => beginLeroLeroSegment(prev, todayKey));
  }, [enabled, todayKey, setLeroLero]);

  const pause = useCallback(() => {
    if (!enabled) return;
    setLeroLero((prev) => {
      if (prev.allDone || !prev.hasStarted) return prev;
      const accumulated = getLeroLeroTotalMs(prev, scheduledTasks, new Date());
      return {
        ...prev,
        dateKey: todayKey,
        accumulatedMs: accumulated,
        segmentStart: null,
        manuallyPaused: true,
      };
    });
  }, [enabled, scheduledTasks, todayKey, setLeroLero]);

  const resume = useCallback(() => {
    if (!enabled) return;
    setLeroLero((prev) => {
      if (prev.allDone || !prev.hasStarted) return prev;
      if (isTaskBlocking) {
        return { ...prev, dateKey: todayKey, manuallyPaused: false, segmentStart: null };
      }
      if (getActiveScheduleBlock(todayTasks, new Date()) !== null) {
        return { ...prev, dateKey: todayKey, manuallyPaused: false, segmentStart: null };
      }
      return {
        ...prev,
        dateKey: todayKey,
        hasStarted: true,
        allDone: false,
        manuallyPaused: false,
        segmentStart: Date.now(),
      };
    });
  }, [enabled, isTaskBlocking, todayTasks, todayKey, setLeroLero]);

  const reset = useCallback(() => {
    if (!enabled) return;
    setLeroLero({
      dateKey: todayKey,
      accumulatedMs: 0,
      segmentStart: null,
      hasStarted: true,
      allDone: false,
      manuallyPaused: true,
    });
  }, [enabled, todayKey, setLeroLero]);

  useEffect(() => {
    if (leroLero.dateKey === todayKey) return;
    setLeroLero(emptyLeroLero(todayKey));
  }, [todayKey, leroLero.dateKey, setLeroLero]);

  // Safety net: between tasks we must have an active segment; cloud sync can wipe it.
  useEffect(() => {
    if (
      !enabled ||
      !hasStarted ||
      allDone ||
      isTaskBlocking ||
      manuallyPaused ||
      segmentStart !== null
    ) {
      return;
    }
    if (getActiveScheduleBlock(todayTasks, new Date()) !== null) return;
    setLeroLero((prev) => beginLeroLeroSegment(prev, todayKey));
  }, [
    enabled,
    hasStarted,
    allDone,
    isTaskBlocking,
    manuallyPaused,
    segmentStart,
    todayTasks,
    todayKey,
    setLeroLero,
  ]);

  useEffect(() => {
    if (!enabled || !hasStarted || allDone || isTaskBlocking || manuallyPaused) return;

    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, [enabled, hasStarted, allDone, isTaskBlocking, manuallyPaused]);

  useEffect(() => {
    if (!enabled) return;
    if (hasStarted && !allDone && areAllTasksDoneToday(todayTasks)) {
      finalizeDay();
    }
  }, [enabled, todayTasks, hasStarted, allDone, finalizeDay]);

  const elapsedMs = useMemo(() => {
    if (!enabled || !hasStarted) return 0;
    if (allDone || isTaskBlocking || manuallyPaused) return accumulatedMs;
    return getLeroLeroTotalMs(leroLero, scheduledTasks, now);
  }, [
    enabled,
    hasStarted,
    allDone,
    isTaskBlocking,
    manuallyPaused,
    leroLero,
    accumulatedMs,
    scheduledTasks,
    now,
  ]);

  const isCounting =
    enabled &&
    hasStarted &&
    !allDone &&
    !isTaskBlocking &&
    !manuallyPaused &&
    scheduleBlock === null &&
    segmentStart !== null;

  const isPausedBySchedule =
    enabled &&
    hasStarted &&
    !allDone &&
    !isTaskBlocking &&
    !manuallyPaused &&
    scheduleBlock !== null;

  const isManuallyPaused = enabled && hasStarted && !allDone && Boolean(manuallyPaused);
  const isVisible = enabled && hasStarted;
  const canTogglePause = enabled && hasStarted && !allDone;

  return {
    elapsedMs,
    isVisible,
    isCounting,
    isPausedBySchedule,
    isManuallyPaused,
    isFinished: allDone,
    canTogglePause,
    pauseReason: scheduleBlock,
    onTaskCompleted,
    onTaskRunning,
    onTaskNotRunning,
    pause,
    resume,
    reset,
  };
}
