import { LoginPage } from './components/LoginPage';
import { WeekPlanner } from './components/WeekPlanner';
import { useAuth } from './hooks/useAuth';
import './index.css';

function App() {
  const { isAuthenticated, user, displayName, login, logout } = useAuth();

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
