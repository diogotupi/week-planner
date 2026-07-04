export interface User {
  username: string;
  password: string;
  displayName: string;
}

export const USERS: User[] = [
  { username: 'camila', password: '123456', displayName: 'Camila' },
  { username: 'diogo', password: '123456', displayName: 'Diogo' },
];

const SESSION_KEY = 'week-planner-session';

export function validateLogin(username: string, password: string): User | null {
  const normalized = username.trim().toLowerCase();
  return (
    USERS.find(
      (u) => u.username === normalized && u.password === password,
    ) ?? null
  );
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
  return USERS.find((u) => u.username === username)?.displayName ?? username;
}
