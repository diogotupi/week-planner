interface OvertimePromptProps {
  taskName: string;
  onFinished: () => void;
  onNeedMoreTime: () => void;
}

export function OvertimePrompt({ taskName, onFinished, onNeedMoreTime }: OvertimePromptProps) {
  return (
    <div className="overtime-overlay" role="dialog" aria-modal="true" aria-labelledby="overtime-title">
      <div className="overtime-card">
        <h2 id="overtime-title" className="overtime-title">
          Tempo esgotado
        </h2>
        <p className="overtime-text">
          O tempo de <strong>{taskName}</strong> acabou. Você finalizou essa tarefa, ou precisa de
          mais tempo nela?
        </p>
        <div className="overtime-actions">
          <button type="button" className="btn-overtime-finished" onClick={onFinished}>
            Finalizei
          </button>
          <button type="button" className="btn-overtime-more" onClick={onNeedMoreTime}>
            Preciso de mais tempo
          </button>
        </div>
      </div>
    </div>
  );
}
