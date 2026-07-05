import { useCallback, useEffect, useState } from 'react';

interface ActiveTimer {
  taskId: string;
  endsAt: number;
}

export function useTaskTimer(onComplete: (taskId: string) => void) {
  const [timer, setTimer] = useState<ActiveTimer | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!timer) return;

    function tick() {
      const left = timer!.endsAt - Date.now();
      if (left <= 0) {
        const completedId = timer!.taskId;
        setTimer(null);
        setRemainingMs(0);
        onComplete(completedId);
      } else {
        setRemainingMs(left);
      }
    }

    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [timer, onComplete]);

  const startTimer = useCallback((taskId: string, durationMinutes: number) => {
    const totalMs = durationMinutes * 60 * 1000;
    setTimer({ taskId, endsAt: Date.now() + totalMs });
    setRemainingMs(totalMs);
  }, []);

  const stopTimer = useCallback(() => {
    setTimer(null);
    setRemainingMs(0);
  }, []);

  return {
    activeTaskId: timer?.taskId ?? null,
    remainingMs,
    startTimer,
    stopTimer,
  };
}
