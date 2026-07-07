import { useCallback, useEffect, useMemo, useState } from 'react';
import type { LeroLeroState, Task } from '../types';
import { pullLeroLero } from '../lib/taskSync';
import { isSyncEnabled } from '../lib/api';
import {
  areAllTasksDoneToday,
  computeLeroLeroMs,
  emptyLeroLero,
  getActiveScheduleBlock,
  getDateKey,
  isTaskDoneForDay,
} from '../utils';

interface UseLeroLeroOptions {
  username: string;
  todayTasks: Task[];
  /** Timer running or a task paused — lero lero must not count */
  isTaskBlocking: boolean;
  todayKey: string;
  leroLero: LeroLeroState;
  setLeroLero: React.Dispatch<React.SetStateAction<LeroLeroState>>;
}

function mergeLeroLero(
  local: LeroLeroState,
  remote: LeroLeroState,
  scheduledTasks: Task[],
  isTaskBlocking: boolean,
  ref = new Date(),
): LeroLeroState {
  const localTotal = computeLeroLeroMs(
    local.segmentStart,
    local.accumulatedMs,
    scheduledTasks,
    ref,
  );
  const remoteTotal = computeLeroLeroMs(
    remote.segmentStart,
    remote.accumulatedMs,
    scheduledTasks,
    ref,
  );
  const totalMs = Math.max(localTotal, remoteTotal);
  const hasStarted = local.hasStarted || remote.hasStarted;
  const allDone = local.allDone || remote.allDone;

  if (allDone) {
    return {
      dateKey: local.dateKey,
      accumulatedMs: totalMs,
      segmentStart: null,
      hasStarted,
      allDone: true,
    };
  }

  if (isTaskBlocking) {
    return {
      dateKey: local.dateKey,
      accumulatedMs: totalMs,
      segmentStart: null,
      hasStarted,
      allDone: false,
    };
  }

  return {
    dateKey: local.dateKey,
    accumulatedMs: totalMs,
    segmentStart: ref.getTime(),
    hasStarted,
    allDone: false,
  };
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
  username,
  todayTasks,
  isTaskBlocking,
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
          !isTaskDoneForDay(task),
      ),
    [todayTasks],
  );

  const scheduleBlock = useMemo(
    () => getActiveScheduleBlock(todayTasks, now),
    [todayTasks, now],
  );

  const finalizeDay = useCallback(() => {
    setLeroLero((prev) => {
      const accumulated =
        prev.segmentStart === null
          ? prev.accumulatedMs
          : computeLeroLeroMs(
              prev.segmentStart,
              prev.accumulatedMs,
              scheduledTasks,
              new Date(),
            );
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
        const accumulated =
          prev.segmentStart === null
            ? prev.accumulatedMs
            : computeLeroLeroMs(
                prev.segmentStart,
                prev.accumulatedMs,
                scheduledTasks,
                new Date(),
              );

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

      const accumulated =
        prev.segmentStart === null
          ? prev.accumulatedMs
          : computeLeroLeroMs(
              prev.segmentStart,
              prev.accumulatedMs,
              scheduledTasks,
              new Date(),
            );

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

  useEffect(() => {
    if (!isSyncEnabled() || !hasStarted || allDone) return;

    const syncFromCloud = () => {
      pullLeroLero(username).then((remote) => {
        if (!remote || remote.dateKey !== getDateKey()) return;
        setLeroLero((prev) => mergeLeroLero(prev, remote, scheduledTasks, isTaskBlocking));
      });
    };

    const onFocus = () => syncFromCloud();
    window.addEventListener('focus', onFocus);
    const id = setInterval(syncFromCloud, 10000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(id);
    };
  }, [username, hasStarted, allDone, isTaskBlocking, scheduledTasks, setLeroLero]);

  const elapsedMs = useMemo(() => {
    if (!hasStarted) return 0;
    if (allDone || isTaskBlocking) return accumulatedMs;
    return computeLeroLeroMs(segmentStart, accumulatedMs, scheduledTasks, now);
  }, [
    hasStarted,
    allDone,
    isTaskBlocking,
    segmentStart,
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
