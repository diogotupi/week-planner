import { useState } from 'react';
import type { Strike } from '../types';
import { AddStrikeModal } from './AddStrikeModal';
import { StrikeFailModal } from './StrikeFailModal';
import { StrikeSuccessModal } from './StrikeSuccessModal';

interface StrikesPanelProps {
  strikes: Strike[];
  todayKey: string;
  onAdd: (title: string, targetDays: number) => void;
  onSuccess: (id: string) => void;
  onFail: (id: string, reset: boolean) => void;
  onRemove: (id: string) => void;
}

type PromptState =
  | { type: 'success'; strike: Strike; completed: boolean }
  | { type: 'fail'; strike: Strike }
  | null;

export function StrikesPanel({
  strikes,
  todayKey,
  onAdd,
  onSuccess,
  onFail,
  onRemove,
}: StrikesPanelProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [prompt, setPrompt] = useState<PromptState>(null);

  const active = strikes.filter((s) => s.status === 'active');
  const completed = strikes.filter((s) => s.status === 'completed');

  function handleSuccess(strike: Strike) {
    const nextDays = strike.completedDays + 1;
    const willComplete = nextDays >= strike.targetDays;
    onSuccess(strike.id);
    setPrompt({
      type: 'success',
      strike: {
        ...strike,
        completedDays: nextDays,
        status: willComplete ? 'completed' : 'active',
      },
      completed: willComplete,
    });
  }

  function handleFailClick(strike: Strike) {
    setPrompt({ type: 'fail', strike });
  }

  function checkedInToday(strike: Strike): boolean {
    return strike.lastCheckInDate === todayKey;
  }

  return (
    <section className="strikes-panel" aria-label="Strikes">
      <div className="strikes-header">
        <div>
          <h2 className="strikes-title">Strikes</h2>
          <p className="strikes-subtitle">Objetivos diários. Marque no fim do dia.</p>
        </div>
        <button type="button" className="btn-secondary strikes-add-btn" onClick={() => setShowAdd(true)}>
          + Novo strike
        </button>
      </div>

      {active.length === 0 && completed.length === 0 ? (
        <p className="strikes-empty">
          Nenhum strike ainda. Crie um objetivo — 30 dias sem doce, 100 sem Instagram, o que
          fizer sentido pra você.
        </p>
      ) : (
        <ul className="strikes-list">
          {active.map((strike) => {
            const doneToday = checkedInToday(strike);
            const progress = Math.min(100, (strike.completedDays / strike.targetDays) * 100);
            return (
              <li key={strike.id} className="strike-card">
                <div className="strike-card-top">
                  <div>
                    <p className="strike-card-title">{strike.title}</p>
                    <p className="strike-card-progress">
                      Dia {strike.completedDays} de {strike.targetDays}
                      {doneToday && strike.lastCheckInResult === 'success' && (
                        <span className="strike-today-ok"> · cumprido hoje</span>
                      )}
                      {doneToday && strike.lastCheckInResult === 'fail' && (
                        <span className="strike-today-fail"> · marcado hoje</span>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="strike-remove"
                    onClick={() => {
                      if (window.confirm('Remover este strike?')) onRemove(strike.id);
                    }}
                    aria-label="Remover strike"
                    title="Remover"
                  >
                    ×
                  </button>
                </div>
                <div className="strike-bar" aria-hidden="true">
                  <div className="strike-bar-fill" style={{ width: `${progress}%` }} />
                </div>
                {!doneToday && (
                  <div className="strike-actions">
                    <button
                      type="button"
                      className="strike-btn strike-btn-ok"
                      onClick={() => handleSuccess(strike)}
                    >
                      ✓ Cumpri hoje
                    </button>
                    <button
                      type="button"
                      className="strike-btn strike-btn-fail"
                      onClick={() => handleFailClick(strike)}
                    >
                      Não consegui
                    </button>
                  </div>
                )}
              </li>
            );
          })}

          {completed.map((strike) => (
            <li key={strike.id} className="strike-card strike-card-done">
              <div className="strike-card-top">
                <div>
                  <p className="strike-card-title">{strike.title}</p>
                  <p className="strike-card-progress">
                    Concluído · {strike.targetDays} dias
                  </p>
                </div>
                <button
                  type="button"
                  className="strike-remove"
                  onClick={() => {
                    if (window.confirm('Remover este strike?')) onRemove(strike.id);
                  }}
                  aria-label="Remover strike"
                  title="Remover"
                >
                  ×
                </button>
              </div>
              <p className="strike-done-note">
                Quando quiser tentar de novo ou outro objetivo, adicione um novo strike.
              </p>
            </li>
          ))}
        </ul>
      )}

      {showAdd && <AddStrikeModal onAdd={onAdd} onClose={() => setShowAdd(false)} />}

      {prompt?.type === 'success' && (
        <StrikeSuccessModal
          strike={prompt.strike}
          dateKey={todayKey}
          completed={prompt.completed}
          onClose={() => setPrompt(null)}
        />
      )}

      {prompt?.type === 'fail' && (
        <StrikeFailModal
          strike={prompt.strike}
          dateKey={todayKey}
          onContinue={() => onFail(prompt.strike.id, false)}
          onReset={() => onFail(prompt.strike.id, true)}
          onClose={() => setPrompt(null)}
        />
      )}
    </section>
  );
}
