import { useEffect, useState } from 'react';
import type { DayStats } from '../types';
import { fetchDayStats } from '../lib/dayStatsSync';
import { formatDateLabel, formatElapsedMs } from '../utils';

interface AnalyticsPageProps {
  username: string;
  displayName: string;
  onBack: () => void;
}

function StatLine({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <li>
      <span>{label}</span>
      <strong>{value}</strong>
    </li>
  );
}

function DayStatsCard({ stats }: { stats: DayStats }) {
  const hasActivity =
    stats.leroLeroMs > 0 ||
    stats.tasksCompleted > 0 ||
    stats.tasksEfficient > 0 ||
    stats.tasksOvertime > 0 ||
    stats.tasksCancelled > 0 ||
    stats.tasksNotDone > 0;

  if (!hasActivity) return null;

  return (
    <article className="stats-card">
      <h3 className="stats-card-date">{formatDateLabel(stats.dateKey)}</h3>
      <ul className="stats-card-list">
        {stats.leroLeroMs > 0 && (
          <li>
            <span>Lero lero</span>
            <strong>{formatElapsedMs(stats.leroLeroMs)}</strong>
          </li>
        )}
        <StatLine label="Tarefas concluídas no prazo" value={stats.tasksCompleted} />
        <StatLine label="Tarefas antes do tempo" value={stats.tasksEfficient} />
        <StatLine label="Tarefas que passaram do tempo" value={stats.tasksOvertime} />
        <StatLine label="Marcadas como não deu" value={stats.tasksCancelled} />
        <StatLine label="Não conseguiu fazer" value={stats.tasksNotDone} />
      </ul>
    </article>
  );
}

export function AnalyticsPage({ username, displayName, onBack }: AnalyticsPageProps) {
  const [stats, setStats] = useState<DayStats[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchDayStats(username).then((data) => {
      if (!cancelled) {
        setStats(data);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [username]);

  const visible = stats.filter(
    (item) =>
      item.leroLeroMs > 0 ||
      item.tasksCompleted > 0 ||
      item.tasksEfficient > 0 ||
      item.tasksOvertime > 0 ||
      item.tasksCancelled > 0 ||
      item.tasksNotDone > 0,
  );

  return (
    <div className="analytics-page">
      <header className="analytics-header">
        <div>
          <h1 className="planner-title">Análise dos dias</h1>
          <p className="planner-subtitle">Histórico de {displayName}</p>
        </div>
        <button type="button" className="btn-secondary" onClick={onBack}>
          Voltar ao Tupi Planner
        </button>
      </header>

      {loading ? (
        <p className="analytics-empty">Carregando histórico...</p>
      ) : visible.length === 0 ? (
        <p className="analytics-empty">
          Ainda não há dados salvos. Os resumos aparecem aqui automaticamente à meia-noite.
        </p>
      ) : (
        <div className="stats-grid">
          {visible.map((item) => (
            <DayStatsCard key={item.dateKey} stats={item} />
          ))}
        </div>
      )}
    </div>
  );
}
