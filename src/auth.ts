import {
  clearAuthToken,
  isSyncEnabled,
  setAuthToken,
} from './lib/api';

export interface User {
  username: string;
  password: string;
  displayName: string;
}

export const USERS: User[] = [
  { username: 'camila', password: '123456', displayName: 'Camila' },
  { username: 'diogo', password: '123456', displayName: 'Diogo' },
  { username: 'matheuzin', password: '123456', displayName: 'Matheuzin' },
];

const SESSION_KEY = 'week-planner-session';

function findUser(username: string): User | undefined {
  const normalized = username.trim().toLowerCase();
  return USERS.find((u) => u.username === normalized);
}

export function validateLogin(username: string, password: string): User | null {
  const user = findUser(username);
  if (!user || user.password !== password) return null;
  return user;
}

export function getSession(): string | null {
  try {
    return localStorage.getItem(SESSION_KEY);
  } catch {
    return null;
  }
}

export function setSession(username: string): void {
  localStorage.setItem(SESSION_KEY, username);
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function getDisplayName(username: string): string {
  return findUser(username)?.displayName ?? username;
}

export async function signIn(
  username: string,
  password: string,
): Promise<{ user: User | null; error?: string }> {
  const user = validateLogin(username, password);
  if (!user) {
    return { user: null, error: 'Login ou senha incorretos.' };
  }

  if (isSyncEnabled()) {
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      if (response.ok) {
        const data = (await response.json()) as { token: string };
        setAuthToken(data.token);
      }
    } catch {
      // Sem API (ex: GitHub Pages) — continua só com localStorage
    }
  }

  setSession(user.username);
  return { user };
}

export async function signOut(): Promise<void> {
  clearSession();
  clearAuthToken();
}

export async function restoreSession(): Promise<string | null> {
  return getSession();
}
