import { LoginPage } from './components/LoginPage';
import { WeekPlanner } from './components/WeekPlanner';
import { useAuth } from './hooks/useAuth';
import './index.css';

function App() {
  const { isAuthenticated, user, displayName, login, logout, loading } = useAuth();

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

  return (
    <WeekPlanner
      username={user}
      displayName={displayName}
      onLogout={logout}
    />
  );
}

export default App;
