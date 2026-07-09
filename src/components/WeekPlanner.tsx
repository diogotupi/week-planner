import { useCallback, useEffect, useRef, useState } from 'react';
import { isSyncEnabled } from '../lib/api';
import type { DayOfWeek } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { useLeroLero } from '../hooks/useLeroLero';
import { PlannerSettingsProvider } from '../context/PlannerSettingsContext';
import { DayColumn, type DragTarget } from './DayColumn';
import { LeroLeroBar } from './LeroLeroBar';
import { OvertimePrompt } from './OvertimePrompt';
import { SettingsModal } from './SettingsModal';
import {
  playTaskFinishedSound,
  playTaskNotificationSound,
  unlockTaskSounds,
} from '../lib/taskSounds';
import {
  getTodayDayOfWeek,
  getTaskDurationMinutes,
  isDayFrozen,
  isTaskCancelled,
  isTaskDoneForDay,
  isTaskEfficient,
} from '../utils';
const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];

interface WeekPlannerProps {
  username: string;
  displayName: string;
  onLogout: () => void | Promise<void>;
  onOpenAnalytics: () => void;
}

export function WeekPlanner({
  username,
  displayName,
  onLogout,
  onOpenAnalytics,
}: WeekPlannerProps) {
  const {
    addTasks,
    updateTask,
    toggleTask,
    cancelTask,
    completeTaskEfficient,
    completeTaskOvertime,
    resetTaskCompletionForToday,
    removeTask,
    moveTask,
    getTasksForDay,
    tasks,
    leroLero,
    setLeroLero,
    taskTimer,
    setTaskTimer,
    todayKey,
    loading,
    syncing,
    syncError,
    preferences,
    setPreferences,
    weekViewMode,
  } = useTasks(username);

  const [overtimePromptTaskId, setOvertimePromptTaskId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const todayDay = getTodayDayOfWeek();
  const todayTasks = getTasksForDay(todayDay);
  const onLeroLeroTaskCompletedRef = useRef<(isLastTask?: boolean) => void>(() => {});

  function willFinishLastTask(taskId: string): boolean {
    return todayTasks.every(
      (task) => task.id === taskId || isTaskDoneForDay(task, new Date(), weekViewMode),
    );
  }

  const handleOvertime = useCallback((taskId: string) => {
    unlockTaskSounds();
    playTaskNotificationSound();
    setOvertimePromptTaskId(taskId);
  }, []);

  const {
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
  } = useTaskTimer({
    timerState: taskTimer,
    setTimerState: setTaskTimer,
    onOvertime: handleOvertime,
  });

  const isTaskBlocking = activeTaskId !== null;

  const leroLeroControls = useLeroLero({
    username,
    todayTasks,
    isTaskBlocking,
    weekViewMode,
    todayKey,
    leroLero,
    setLeroLero,
  });
  onLeroLeroTaskCompletedRef.current = leroLeroControls.onTaskCompleted;

  useEffect(() => {
    function unlock() {
      unlockTaskSounds();
    }

    document.addEventListener('pointerdown', unlock);
    document.addEventListener('keydown', unlock);
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);

  function finishTaskAfterOvertime(taskId: string) {
    unlockTaskSounds();
    playTaskFinishedSound();
    clearTimer(taskId);
    completeTaskOvertime(taskId);
    setOvertimePromptTaskId(null);
    onLeroLeroTaskCompletedRef.current(willFinishLastTask(taskId));
  }

  function isTaskOnFrozenDay(taskId: string): boolean {
    const task = tasks.find((item) => item.id === taskId);
    return task ? isDayFrozen(task.day, new Date(), weekViewMode) : false;
  }

  function handleMoveTask(taskId: string, toDay: DayOfWeek, beforeId: string | null) {
    if (isTaskOnFrozenDay(taskId) || isDayFrozen(toDay, new Date(), weekViewMode)) return;
    moveTask(taskId, toDay, beforeId);
  }

  function handleStartTask(taskId: string) {
    if (isTaskOnFrozenDay(taskId)) return;
    unlockTaskSounds();
    const pausedMs = getPausedRemaining(taskId);
    leroLeroControls.onTaskRunning();
    if (pausedMs !== null) {
      resumeTimer(taskId);
      return;
    }

    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    const durationMinutes = getTaskDurationMinutes(task);
    if (durationMinutes === null || durationMinutes <= 0) return;
    startTimer(taskId, durationMinutes);
  }

  function handlePauseTask() {
    unlockTaskSounds();
    pauseTimer();
    leroLeroControls.onTaskNotRunning();
  }

  function handleFinishEarly(taskId: string) {
    if (isTaskOnFrozenDay(taskId)) return;
    if (isTaskOvertime(taskId)) {
      finishTaskAfterOvertime(taskId);
      return;
    }
    unlockTaskSounds();
    playTaskFinishedSound();
    clearTimer(taskId);
    completeTaskEfficient(taskId);
    onLeroLeroTaskCompletedRef.current(willFinishLastTask(taskId));
  }

  function handleAdjustTimer(taskId: string, remainingMs: number) {
    if (isTaskOnFrozenDay(taskId)) return;
    const task = tasks.find((item) => item.id === taskId);
    if (!task || getTaskDurationMinutes(task) === null) return;

    const wasEfficient = isTaskEfficient(task, new Date(), weekViewMode);
    if (wasEfficient || isTaskDoneForDay(task, new Date(), weekViewMode)) {
      resetTaskCompletionForToday(taskId);
    }

    adjustTimerRemaining(taskId, remainingMs);

    if (activeTaskId === taskId) {
      leroLeroControls.onTaskRunning();
    } else if (activeTaskId === null) {
      leroLeroControls.onTaskNotRunning();
    }
  }

  const daysGridRef = useRef<HTMLDivElement>(null);
  const hasScrolledToToday = useRef(false);

  useEffect(() => {
    if (loading || hasScrolledToToday.current) return;

    const todayDay = getTodayDayOfWeek();
    const todayColumn = daysGridRef.current?.querySelector(
      `[data-day="${todayDay}"]`,
    );
    if (!todayColumn) return;

    hasScrolledToToday.current = true;
    todayColumn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [loading]);

  function handleToggle(id: string) {
    if (isTaskOnFrozenDay(id)) return;
    const task = tasks.find((item) => item.id === id);
    const wasDone = task ? isTaskDoneForDay(task, new Date(), weekViewMode) : false;

    if (task && !wasDone && isTaskOvertime(id)) {
      finishTaskAfterOvertime(id);
      return;
    }

    const finishingWithTimeLeft =
      !wasDone &&
      task &&
      getTaskDurationMinutes(task) !== null &&
      (activeTaskId === id ||
        (isTaskPaused(id) && (getPausedRemaining(id) ?? 0) > 0));

    if (finishingWithTimeLeft) {
      handleFinishEarly(id);
      return;
    }

    if (activeTaskId === id) clearTimer(id);

    if (task && !wasDone) {
      unlockTaskSounds();
      playTaskFinishedSound();
    }
    toggleTask(id);
    if (task && !wasDone) {
      onLeroLeroTaskCompletedRef.current(willFinishLastTask(id));
    }
  }

  function handleCancel(id: string) {
    if (isTaskOnFrozenDay(id)) return;
    if (activeTaskId === id || isTaskPaused(id)) clearTimer(id);
    const task = tasks.find((item) => item.id === id);
    const wasCancelled = task ? isTaskCancelled(task, new Date(), weekViewMode) : false;
    const wasDone = task ? isTaskDoneForDay(task, new Date(), weekViewMode) : false;
    cancelTask(id);
    if (task && wasCancelled && activeTaskId === null) {
      leroLeroControls.onTaskNotRunning();
    } else if (task && !wasDone) {
      onLeroLeroTaskCompletedRef.current(willFinishLastTask(id));
    }
  }

  function handleRemove(id: string) {
    if (isTaskOnFrozenDay(id)) return;
    if (activeTaskId === id || isTaskPaused(id)) clearTimer(id);
    removeTask(id);
  }

  const overtimeTask = overtimePromptTaskId
    ? tasks.find((task) => task.id === overtimePromptTaskId)
    : null;

  if (loading) {
    return (
      <div className="app-loading">
        <p>Carregando suas tarefas...</p>
      </div>
    );
  }

  return (
    <PlannerSettingsProvider weekViewMode={weekViewMode}>
    <div className="planner">
      <header className="planner-header">
        <div className="planner-top">
          <div>
            <h1 className="planner-title">Tupi Planner</h1>
            <p className="planner-subtitle">
              Olá, {displayName}! Organize suas tarefas de segunda a domingo.
            </p>
            {isSyncEnabled() && (
              <p className="sync-status" aria-live="polite">
                {syncing && 'Sincronizando...'}
                {!syncing && !syncError && 'Sincronizado na nuvem'}
                {syncError}
              </p>
            )}
          </div>
          <div className="planner-header-actions">
            <button type="button" className="btn-secondary" onClick={() => setShowSettings(true)}>
              Configurações
            </button>
            <button type="button" className="btn-secondary" onClick={onOpenAnalytics}>
              Análise
            </button>
            <button type="button" className="btn-logout" onClick={() => void onLogout()}>
              Sair
            </button>
          </div>
        </div>
        {leroLeroControls.isVisible && (
          <LeroLeroBar
            elapsedMs={leroLeroControls.elapsedMs}
            isCounting={leroLeroControls.isCounting}
            isPausedBySchedule={leroLeroControls.isPausedBySchedule}
            isManuallyPaused={leroLeroControls.isManuallyPaused}
            isFinished={leroLeroControls.isFinished}
            canTogglePause={leroLeroControls.canTogglePause}
            pauseReason={leroLeroControls.pauseReason}
            onPause={leroLeroControls.pause}
            onResume={leroLeroControls.resume}
            onReset={leroLeroControls.reset}
          />
        )}
      </header>

      <div className="days-grid-wrapper" ref={daysGridRef}>
        <div className="days-grid">
          {ALL_DAYS.map((day) => (
            <DayColumn
              key={day}
              day={day}
              tasks={getTasksForDay(day)}
              allTasks={tasks}
              activeTaskId={activeTaskId}
              remainingMs={remainingMs}
              getPausedRemaining={getPausedRemaining}
              isTaskPaused={isTaskPaused}
              isTaskOvertime={isTaskOvertime}
              draggingTaskId={draggingTaskId}
              dragTarget={dragTarget}
              onAdd={addTasks}
              onUpdate={updateTask}
              onToggle={handleToggle}
              onCancel={handleCancel}
              onRemove={handleRemove}
              onMoveTask={handleMoveTask}
              onDragStart={setDraggingTaskId}
              onDragEnd={() => {
                setDraggingTaskId(null);
                setDragTarget(null);
              }}
              onDragTargetChange={setDragTarget}
              onStartTask={handleStartTask}
              onPauseTask={handlePauseTask}
              onFinishEarly={handleFinishEarly}
              onAdjustTimer={handleAdjustTimer}
            />
          ))}
        </div>
      </div>

      {overtimeTask && (
        <OvertimePrompt
          taskName={overtimeTask.text}
          onFinished={() => finishTaskAfterOvertime(overtimeTask.id)}
          onNeedMoreTime={() => setOvertimePromptTaskId(null)}
        />
      )}

      {username === 'camila' && (
        <footer className="planner-footer">te amo, meu suflezinho de amora ❤️</footer>
      )}

      {showSettings && (
        <SettingsModal
          preferences={preferences}
          onChange={setPreferences}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
    </PlannerSettingsProvider>
  );
}
