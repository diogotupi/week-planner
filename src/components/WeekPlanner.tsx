import { useCallback, useEffect, useRef, useState } from 'react';
import { isSyncEnabled } from '../lib/api';
import type { DayOfWeek } from '../types';
import { useTasks } from '../hooks/useTasks';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { useLeroLero } from '../hooks/useLeroLero';
import { DayColumn, type DragTarget } from './DayColumn';
import { LeroLeroBar } from './LeroLeroBar';
import { OvertimePrompt } from './OvertimePrompt';
import {
  playTaskFinishedSound,
  playTaskNotificationSound,
  unlockTaskSounds,
} from '../lib/taskSounds';
import {
  getTodayDayOfWeek,
  getTaskDurationMinutes,
  isTaskCancelled,
  isTaskDoneForDay,
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
  } = useTasks(username);

  const [overtimePromptTaskId, setOvertimePromptTaskId] = useState<string | null>(null);
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragTarget, setDragTarget] = useState<DragTarget | null>(null);
  const todayDay = getTodayDayOfWeek();
  const todayTasks = getTasksForDay(todayDay);
  const onLeroLeroTaskCompletedRef = useRef<(isLastTask?: boolean) => void>(() => {});

  function willFinishLastTask(taskId: string): boolean {
    return todayTasks.every(
      (task) => task.id === taskId || isTaskDoneForDay(task),
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
    getPausedRemaining,
    isTaskPaused,
    isTaskOvertime,
  } = useTaskTimer({
    timerState: taskTimer,
    setTimerState: setTaskTimer,
    onOvertime: handleOvertime,
  });

  const isTaskBlocking =
    activeTaskId !== null || todayTasks.some((task) => isTaskPaused(task.id));

  const leroLeroControls = useLeroLero({
    username,
    todayTasks,
    isTaskBlocking,
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

  function handleStartTask(taskId: string) {
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
  }

  function handleFinishEarly(taskId: string) {
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
    const task = tasks.find((item) => item.id === id);
    const wasDone = task ? isTaskDoneForDay(task) : false;

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
    if (activeTaskId === id || isTaskPaused(id)) clearTimer(id);
    const task = tasks.find((item) => item.id === id);
    const wasCancelled = task ? isTaskCancelled(task) : false;
    const wasDone = task ? isTaskDoneForDay(task) : false;
    cancelTask(id);
    if (task && wasCancelled && activeTaskId === null) {
      leroLeroControls.onTaskNotRunning();
    } else if (task && !wasDone) {
      onLeroLeroTaskCompletedRef.current(willFinishLastTask(id));
    }
  }

  function handleRemove(id: string) {
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
            isFinished={leroLeroControls.isFinished}
            pauseReason={leroLeroControls.pauseReason}
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
              onMoveTask={moveTask}
              onDragStart={setDraggingTaskId}
              onDragEnd={() => {
                setDraggingTaskId(null);
                setDragTarget(null);
              }}
              onDragTargetChange={setDragTarget}
              onStartTask={handleStartTask}
              onPauseTask={handlePauseTask}
              onFinishEarly={handleFinishEarly}
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
    </div>
  );
}
