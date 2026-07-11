import { useEffect, useState } from 'react';
import type { Streak } from '../types';
import {
  getNextCheckInDate,
  getPendingCheckInDate,
  getStreakCheckInLabel,
} from '../lib/streakUtils';
import { formatDateLabel } from '../utils';
import { AddStreakModal } from './AddStreakModal';
import { StreakFailModal } from './StreakFailModal';
import { StreakPendingModal } from './StreakPendingModal';
import { StreakSuccessModal } from './StreakSuccessModal';

interface StreaksPanelProps {
  streaks: Streak[];
  todayKey: string;
  onAdd: (title: string, targetDays: number) => void;
  onSuccess: (id: string, dateKey: string) => void;
  onFail: (id: string, dateKey: string, reset: boolean) => void;
  onReassignToday: (id: string) => void;
  onRemove: (id: string) => void;
}

type PromptState =
  | { type: 'pending'; streak: Streak; dateKey: string }
  | { type: 'success'; streak: Streak; dateKey: string; completed: boolean }
  | { type: 'fail'; streak: Streak; dateKey: string }
  | null;

function findNextPending(
  active: Streak[],
  todayKey: string,
): { streak: Streak; dateKey: string } | null {
  for (const streak of active) {
    const dateKey = getPendingCheckInDate(streak, todayKey);
    if (dateKey) return { streak, dateKey };
  }
  return null;
}

export function StreaksPanel({
  streaks,
  todayKey,
  onAdd,
  onSuccess,
  onFail,
  onReassignToday,
  onRemove,
}: StreaksPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [prompt, setPrompt] = useState<PromptState>(null);

  const active = streaks.filter((s) => s.status === 'active');
  const completed = streaks.filter((s) => s.status === 'completed');

  useEffect(() => {
    if (prompt !== null || showAdd) return;
    const next = findNextPending(active, todayKey);
    if (next) {
      setPrompt({ type: 'pending', streak: next.streak, dateKey: next.dateKey });
    }
  }, [active, todayKey, prompt, showAdd]);

  function handleSuccess(streak: Streak, dateKey: string) {
    const nextDays = streak.completedDays + 1;
    const willComplete = nextDays >= streak.targetDays;
    onSuccess(streak.id, dateKey);
    setPrompt({
      type: 'success',
      streak: {
        ...streak,
        completedDays: nextDays,
        status: willComplete ? 'completed' : 'active',
      },
      dateKey,
      completed: willComplete,
    });
  }

  function handleFailClick(streak: Streak, dateKey: string) {
    setPrompt({ type: 'fail', streak, dateKey });
  }

  return (
    <section className="streaks-panel" aria-label="Streaks">
      <div className="streaks-header">
        <div>
          <h2 className="streaks-title">Streaks</h2>
          <p className="streaks-subtitle">
            Objetivos diários. À meia-noite perguntamos se cumpriu o dia anterior.
          </p>
        </div>
        <button type="button" className="btn-secondary streaks-add-btn" onClick={() => setShowAdd(true)}>
          + Nova streak
        </button>
      </div>

      {active.length === 0 && completed.length === 0 ? (
        <p className="streaks-empty">
          Nenhuma streak ainda. Crie um objetivo — 30 dias sem doce, 100 sem Instagram, o que
          fizer sentido pra você.
        </p>
      ) : (
        <ul className="streaks-list">
          {active.map((streak) => {
            const pendingDate = getPendingCheckInDate(streak, todayKey);
            const checkInDate = getNextCheckInDate(streak, todayKey);
            const checkInLabel = getStreakCheckInLabel(streak, todayKey);
            const markedTodayByMistake =
              streak.lastCheckInDate === todayKey &&
              streak.lastCheckInResult === 'success' &&
              checkInDate === null;
            const progress = Math.min(100, (streak.completedDays / streak.targetDays) * 100);
            return (
              <li key={streak.id} className="streak-card">
                <div className="streak-card-top">
                  <div>
                    <p className="streak-card-title">{streak.title}</p>
                    <p className="streak-card-progress">
                      Dia {streak.completedDays} de {streak.targetDays}
                      {pendingDate && (
                        <span className="streak-today-fail">
                          {' '}
                          · pendente: {formatDateLabel(pendingDate)}
                        </span>
                      )}
                      {checkInLabel && (
                        <span className="streak-today-ok"> · {checkInLabel}</span>
                      )}
                      {streak.lastCheckInResult === 'fail' && streak.lastCheckInDate === todayKey && (
                        <span className="streak-today-fail"> · marcado hoje</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="streak-remove"
                    onClick={() => {
                      if (window.confirm('Remover esta streak?')) onRemove(streak.id);
                    }}
                    aria-label="Remover streak"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
                <div className="streak-bar" aria-hidden="true">
                  <div className="streak-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                {markedTodayByMistake && (
                  <button
                    type="button"
                    className="streak-btn streak-btn-fail streak-reassign-btn"
                    onClick={() => onReassignToday(streak.id)}
                  >
                    Marquei ontem por engano
                  </button>
                )}
                {checkInDate && (
                  <div className="streak-actions">
                    <button
                      type="button"
                      className="streak-btn streak-btn-ok"
                      onClick={() => handleSuccess(streak, checkInDate)}
                    >
                      ✓ Cumpri {checkInDate === todayKey ? 'hoje' : formatDateLabel(checkInDate)}
                    </button>
                    <button
                      type="button"
                      className="streak-btn streak-btn-fail"
                      onClick={() => handleFailClick(streak, checkInDate)}
                    >
                      Não consegui
                    </button>
                  </div>
                )}
              </li>
            );
          })}

          {completed.map((streak) => (
            <li key={streak.id} className="streak-card streak-card-done">
              <div className="streak-card-top">
                <div>
                  <p className="streak-card-title">{streak.title}</p>
                  <p className="streak-card-progress">
                    Concluída · {streak.targetDays} dias
                  </p>
                </div>
                <button
                  type="button"
                  className="streak-remove"
                  onClick={() => {
                    if (window.confirm('Remover esta streak?')) onRemove(streak.id);
                  }}
                  aria-label="Remover streak"
                  title="Remover"
                >
                  ×
                </button>
              </div>
              <p className="streak-done-note">
                Quando quiser tentar de novo ou outro objetivo, adicione uma nova streak.
              </p>
            </li>
          ))}
        </ul>
      )}

      {showAdd && <AddStreakModal onAdd={onAdd} onClose={() => setShowAdd(false)} />}

      {prompt?.type === 'pending' && (
        <StreakPendingModal
          streak={prompt.streak}
          dateKey={prompt.dateKey}
          todayKey={todayKey}
          onSuccess={() => handleSuccess(prompt.streak, prompt.dateKey)}
          onFail={() => handleFailClick(prompt.streak, prompt.dateKey)}
        />
      )}

      {prompt?.type === 'success' && (
        <StreakSuccessModal
          streak={prompt.streak}
          dateKey={prompt.dateKey}
          completed={prompt.completed}
          onClose={() => setPrompt(null)}
        />
      )}

      {prompt?.type === 'fail' && (
        <StreakFailModal
          streak={prompt.streak}
          dateKey={prompt.dateKey}
          onContinue={() => onFail(prompt.streak.id, prompt.dateKey, false)}
          onReset={() => onFail(prompt.streak.id, prompt.dateKey, true)}
          onClose={() => setPrompt(null)}
        />
      )}
    </section>
  );
}
