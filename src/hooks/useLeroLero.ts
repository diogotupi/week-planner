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
}

function beginLeroLeroSegment(prev: LeroLeroState, todayKey: string): LeroLeroState {
  if (prev.allDone) return prev;

  if (prev.segmentStart !== null) {
    return { ...prev, dateKey: todayKey, hasStarted: true };
  }

  return {
    ...prev,
    dateKey: todayKey,
    hasStarted: true,
    allDone: false,
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
}: UseLeroLeroOptions) {
  const { accumulatedMs, segmentStart, hasStarted, allDone } = leroLero;
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
      };
    });
  }, [scheduledTasks, setLeroLero]);

  const onTaskCompleted = useCallback(
    (isLastTask = false) => {
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
          };
        }

        return {
          ...prev,
          dateKey: todayKey,
          hasStarted: true,
          allDone: false,
          accumulatedMs: accumulated,
          segmentStart: Date.now(),
        };
      });
    },
    [todayTasks, scheduledTasks, todayKey, setLeroLero],
  );

  const onTaskRunning = useCallback(() => {
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
  }, [scheduledTasks, todayKey, setLeroLero]);

  const onTaskNotRunning = useCallback(() => {
    setLeroLero((prev) => beginLeroLeroSegment(prev, todayKey));
  }, [todayKey, setLeroLero]);

  useEffect(() => {
    if (leroLero.dateKey === todayKey) return;
    setLeroLero(emptyLeroLero(todayKey));
  }, [todayKey, leroLero.dateKey, setLeroLero]);

  // Safety net: between tasks we must have an active segment; cloud sync can wipe it.
  useEffect(() => {
    if (!hasStarted || allDone || isTaskBlocking || segmentStart !== null) return;
    if (getActiveScheduleBlock(todayTasks, new Date()) !== null) return;
    setLeroLero((prev) => beginLeroLeroSegment(prev, todayKey));
  }, [
    hasStarted,
    allDone,
    isTaskBlocking,
    segmentStart,
    todayTasks,
    todayKey,
    setLeroLero,
  ]);

  useEffect(() => {
    if (!hasStarted || allDone || isTaskBlocking) return;

    const id = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(id);
  }, [hasStarted, allDone, isTaskBlocking]);

  useEffect(() => {
    if (hasStarted && !allDone && areAllTasksDoneToday(todayTasks)) {
      finalizeDay();
    }
  }, [todayTasks, hasStarted, allDone, finalizeDay]);

  const elapsedMs = useMemo(() => {
    if (!hasStarted) return 0;
    if (allDone || isTaskBlocking) return accumulatedMs;
    return getLeroLeroTotalMs(leroLero, scheduledTasks, now);
  }, [
    hasStarted,
    allDone,
    isTaskBlocking,
    leroLero,
    accumulatedMs,
    scheduledTasks,
    now,
  ]);

  const isCounting =
    hasStarted &&
    !allDone &&
    !isTaskBlocking &&
    scheduleBlock === null &&
    segmentStart !== null;

  const isPausedBySchedule =
    hasStarted && !allDone && !isTaskBlocking && scheduleBlock !== null;

  const isVisible = hasStarted;

  return {
    elapsedMs,
    isVisible,
    isCounting,
    isPausedBySchedule,
    isFinished: allDone,
    pauseReason: scheduleBlock,
    onTaskCompleted,
    onTaskRunning,
    onTaskNotRunning,
  };
}
