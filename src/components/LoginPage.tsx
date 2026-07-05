import { useState } from 'react';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!username.trim() || !password) {
      setError('Preencha login e senha.');
      return;
    }

    setSubmitting(true);
    const result = await onLogin(username, password);
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error ?? 'Login ou senha incorretos.');
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Planejador da Semana</h1>
        <p className="login-subtitle">Entre para ver suas tarefas</p>

        <form onSubmit={handleSubmit} className="login-form">
          <label className="field-label" htmlFor="login-username">
            Login
          </label>
          <input
            id="login-username"
            type="text"
            className="field-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Seu nome de usuário"
            autoComplete="username"
            autoFocus
            disabled={submitting}
          />

          <label className="field-label" htmlFor="login-password">
            Senha
          </label>
          <input
            id="login-password"
            type="password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Sua senha"
            autoComplete="current-password"
            disabled={submitting}
          />

          {error && <p className="field-error login-error">{error}</p>}

          <button type="submit" className="btn-primary login-btn" disabled={submitting}>
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
}
