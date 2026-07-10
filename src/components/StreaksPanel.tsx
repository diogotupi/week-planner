import { useState } from 'react';
import type { Streak } from '../types';
import { AddStreakModal } from './AddStreakModal';
import { StreakFailModal } from './StreakFailModal';
import { StreakSuccessModal } from './StreakSuccessModal';

interface StreaksPanelProps {
  streaks: Streak[];
  todayKey: string;
  onAdd: (title: string, targetDays: number) => void;
  onSuccess: (id: string) => void;
  onFail: (id: string, reset: boolean) => void;
  onRemove: (id: string) => void;
}

type PromptState =
  | { type: 'success'; streak: Streak; completed: boolean }
  | { type: 'fail'; streak: Streak }
  | null;

export function StreaksPanel({
  streaks,
  todayKey,
  onAdd,
  onSuccess,
  onFail,
  onRemove,
}: StreaksPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [prompt, setPrompt] = useState<PromptState>(null);

  const active = streaks.filter((s) => s.status === 'active');
  const completed = streaks.filter((s) => s.status === 'completed');

  function handleSuccess(streak: Streak) {
    const nextDays = streak.completedDays + 1;
    const willComplete = nextDays >= streak.targetDays;
    onSuccess(streak.id);
    setPrompt({
      type: 'success',
      streak: {
        ...streak,
        completedDays: nextDays,
        status: willComplete ? 'completed' : 'active',
      },
      completed: willComplete,
    });
  }

  function handleFailClick(streak: Streak) {
    setPrompt({ type: 'fail', streak });
  }

  function checkedInToday(streak: Streak): boolean {
    return streak.lastCheckInDate === todayKey;
  }

  return (
    <section className="streaks-panel" aria-label="Streaks">
      <div className="streaks-header">
        <div>
          <h2 className="streaks-title">Streaks</h2>
          <p className="streaks-subtitle">Objetivos diários. Marque no fim do dia.</p>
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
            const doneToday = checkedInToday(streak);
            const progress = Math.min(100, (streak.completedDays / streak.targetDays) * 100);
            return (
              <li key={streak.id} className="streak-card">
                <div className="streak-card-top">
                  <div>
                    <p className="streak-card-title">{streak.title}</p>
                    <p className="streak-card-progress">
                      Dia {streak.completedDays} de {streak.targetDays}
                      {doneToday && streak.lastCheckInResult === 'success' && (
                        <span className="streak-today-ok"> · cumprido hoje</span>
                      )}
                      {doneToday && streak.lastCheckInResult === 'fail' && (
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
                {!doneToday && (
                  <div className="streak-actions">
                    <button
                      type="button"
                      className="streak-btn streak-btn-ok"
                      onClick={() => handleSuccess(streak)}
                    >
                      ✓ Cumpri hoje
                    </button>
                    <button
                      type="button"
                      className="streak-btn streak-btn-fail"
                      onClick={() => handleFailClick(streak)}
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

      {prompt?.type === 'success' && (
        <StreakSuccessModal
          streak={prompt.streak}
          dateKey={todayKey}
          completed={prompt.completed}
          onClose={() => setPrompt(null)}
        />
      )}

      {prompt?.type === 'fail' && (
        <StreakFailModal
          streak={prompt.streak}
          dateKey={todayKey}
          onContinue={() => onFail(prompt.streak.id, false)}
          onReset={() => onFail(prompt.streak.id, true)}
          onClose={() => setPrompt(null)}
        />
      )}
    </section>
  );
}
