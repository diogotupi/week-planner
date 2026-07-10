import { useMemo, useState } from 'react';
import type { DayOfWeek, Task } from '../types';
import { DAYS } from '../types';
import { formatDuration } from '../utils';

interface RecurringTasksModalProps {
  tasks: Task[];
  onSetDays: (taskId: string, days: DayOfWeek[]) => void;
  onSetWeekly: (taskId: string, weekly: boolean) => void;
  onRemoveDay: (taskId: string) => void;
  onRemoveAll: (taskId: string) => void;
  onClose: () => void;
}

const ALL_DAYS: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
const DAY_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

interface RecurringGroup {
  /** Tarefa representante (menor dia da semana). */
  representative: Task;
  members: Task[];
  days: DayOfWeek[];
}

function getTimeLabel(task: Task): string {
  switch (task.timeMode) {
    case 'duration':
      return task.duration ? `⏱ ${formatDuration(task.duration)}` : '';
    case 'schedule':
      return task.startTime && task.endTime
        ? `🕐 ${task.startTime} – ${task.endTime}`
        : '';
    case 'all-day':
      return '☀️ Dia todo';
  }
}

function buildGroups(tasks: Task[]): RecurringGroup[] {
  const byGroup = new Map<string, Task[]>();
  const singles: Task[] = [];

  for (const task of tasks) {
    if (task.groupId) {
      const list = byGroup.get(task.groupId) ?? [];
      list.push(task);
      byGroup.set(task.groupId, list);
    } else if (task.weekly) {
      singles.push(task);
    }
  }

  const groups: RecurringGroup[] = [];

  for (const members of byGroup.values()) {
    // Grupo de 1 membro só entra se for semanal (ainda é recorrente)
    if (members.length < 2 && !members[0].weekly) continue;
    const sorted = [...members].sort((a, b) => a.day - b.day);
    groups.push({
      representative: sorted[0],
      members: sorted,
      days: sorted.map((m) => m.day),
    });
  }

  for (const task of singles) {
    groups.push({ representative: task, members: [task], days: [task.day] });
  }

  return groups.sort((a, b) =>
    a.representative.text.localeCompare(b.representative.text, 'pt-BR'),
  );
}

export function RecurringTasksModal({
  tasks,
  onSetDays,
  onSetWeekly,
  onRemoveDay,
  onRemoveAll,
  onClose,
}: RecurringTasksModalProps) {
  const groups = useMemo(() => buildGroups(tasks), [tasks]);
  const [confirmingRemoveId, setConfirmingRemoveId] = useState<string | null>(null);

  function toggleDay(group: RecurringGroup, day: DayOfWeek) {
    const has = group.days.includes(day);
    if (has) {
      if (group.days.length === 1) return;
      const member = group.members.find((m) => m.day === day);
      if (member) onRemoveDay(member.id);
    } else {
      onSetDays(group.representative.id, [...group.days, day].sort((a, b) => a - b));
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal recurring-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recurring-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="recurring-title" className="modal-title">
          Tarefas repetidas
        </h2>
        <p className="recurring-lead">
          Tarefas que aparecem em vários dias ou se repetem toda semana. Ajuste os dias,
          o modo semanal, ou exclua.
        </p>

        {groups.length === 0 ? (
          <p className="recurring-empty">
            Nenhuma tarefa repetida ainda. Ao criar uma tarefa, selecione vários dias ou
            marque “Toda semana?” para ela aparecer aqui.
          </p>
        ) : (
          <ul className="recurring-list">
            {groups.map((group) => {
              const task = group.representative;
              const timeLabel = getTimeLabel(task);
              const confirming = confirmingRemoveId === task.id;
              return (
                <li key={task.groupId ?? task.id} className="recurring-card">
                  <div className="recurring-card-top">
                    <div>
                      <p className="recurring-card-title">{task.text}</p>
                      <p className="recurring-card-meta">
                        {timeLabel && <span>{timeLabel}</span>}
                        {task.weekly && (
                          <span className="task-badge">Toda semana</span>
                        )}
                        <span className="recurring-count">
                          {group.days.length}{' '}
                          {group.days.length === 1 ? 'dia' : 'dias'}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div
                    className="day-picker recurring-day-picker"
                    role="group"
                    aria-label={`Dias de ${task.text}`}
                  >
                    {ALL_DAYS.map((day) => {
                      const selected = group.days.includes(day);
                      const isLast = selected && group.days.length === 1;
                      return (
                        <button
                          key={day}
                          type="button"
                          className={`day-pick ${selected ? 'selected' : ''}`}
                          onClick={() => toggleDay(group, day)}
                          aria-pressed={selected}
                          disabled={isLast}
                          title={
                            isLast
                              ? 'A tarefa precisa de pelo menos um dia'
                              : DAYS[day]
                          }
                        >
                          <span className="day-pick-short">{DAY_SHORT[day]}</span>
                          <span className="day-pick-full">{DAYS[day]}</span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="recurring-card-actions">
                    <label className="recurring-weekly-toggle">
                      <input
                        type="checkbox"
                        checked={task.weekly}
                        onChange={(e) => onSetWeekly(task.id, e.target.checked)}
                      />
                      <span>Repetir toda semana</span>
                    </label>

                    {confirming ? (
                      <span className="recurring-confirm">
                        <span>Excluir de todos os dias?</span>
                        <button
                          type="button"
                          className="recurring-confirm-yes"
                          onClick={() => {
                            onRemoveAll(task.id);
                            setConfirmingRemoveId(null);
                          }}
                        >
                          Sim, excluir
                        </button>
                        <button
                          type="button"
                          className="recurring-confirm-no"
                          onClick={() => setConfirmingRemoveId(null)}
                        >
                          Voltar
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="recurring-remove-all"
                        onClick={() => setConfirmingRemoveId(task.id)}
                      >
                        Excluir tudo
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <div className="modal-actions">
          <button type="button" className="btn-primary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
