import type { UserPreferences, WeekViewMode } from '../types';

interface SettingsModalProps {
  preferences: UserPreferences;
  onChange: (preferences: UserPreferences) => void;
  onClose: () => void;
}

const OPTIONS: {
  value: WeekViewMode;
  title: string;
  description: string;
}[] = [
  {
    value: 'calendar',
    title: 'Semana atual',
    description:
      'Dias que já passaram mostram a data real (ex: segunda 6 de jul) com as tarefas que você fez.',
  },
  {
    value: 'rolling',
    title: 'Sequência para frente',
    description:
      'Dias que já passaram mostram a próxima data (ex: segunda 13 de jul), em branco, e a semana segue a partir de hoje.',
  },
];

export function SettingsModal({ preferences, onChange, onClose }: SettingsModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal settings-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="settings-title" className="modal-title">
          Configurações
        </h2>

        <fieldset className="settings-fieldset">
          <legend className="settings-legend">Como exibir os dias da semana</legend>
          <div className="settings-options">
            {OPTIONS.map((option) => (
              <label key={option.value} className="settings-option">
                <input
                  type="radio"
                  name="weekViewMode"
                  value={option.value}
                  checked={preferences.weekViewMode === option.value}
                  onChange={() => onChange({ weekViewMode: option.value })}
                />
                <span className="settings-option-text">
                  <strong>{option.title}</strong>
                  <span>{option.description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
