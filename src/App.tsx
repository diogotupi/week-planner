import { useState } from 'react';
import { AnalyticsPage } from './components/AnalyticsPage';
import { LoginPage } from './components/LoginPage';
import { WeekPlanner } from './components/WeekPlanner';
import { useAuth } from './hooks/useAuth';
import './index.css';

function App() {
  const { isAuthenticated, user, displayName, login, logout, loading } = useAuth();
  const [view, setView] = useState<'planner' | 'analytics'>('planner');

  if (loading) {
    return (
      <div className="app-loading">
        <p>Carregando...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user || !displayName) {
    return <LoginPage onLogin={login} />;
  }

  if (view === 'analytics') {
    return (
      <AnalyticsPage
        username={user}
        displayName={displayName}
        onBack={() => setView('planner')}
      />
    );
  }

  return (
    <WeekPlanner
      username={user}
      displayName={displayName}
      onLogout={logout}
      onOpenAnalytics={() => setView('analytics')}
    />
  );
}

export default App;
