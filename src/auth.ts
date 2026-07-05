import { isSupabaseConfigured, supabase } from './lib/supabase';

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
const AUTH_DOMAIN = 'weekplanner.app';

export function toAuthEmail(username: string): string {
  return `${username.trim().toLowerCase()}@${AUTH_DOMAIN}`;
}

export function usernameFromEmail(email: string): string {
  return email.split('@')[0]?.toLowerCase() ?? email;
}

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
  const user = findUser(username);
  if (!user) {
    return { user: null, error: 'Login ou senha incorretos.' };
  }

  if (!isSupabaseConfigured()) {
    if (user.password !== password) {
      return { user: null, error: 'Login ou senha incorretos.' };
    }
    setSession(user.username);
    return { user };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: toAuthEmail(user.username),
    password,
  });

  if (error) {
    return { user: null, error: 'Login ou senha incorretos.' };
  }

  setSession(user.username);
  return { user };
}

export async function signOut(): Promise<void> {
  clearSession();
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
}

export async function restoreSession(): Promise<string | null> {
  if (!isSupabaseConfigured()) {
    return getSession();
  }

  const { data } = await supabase.auth.getSession();
  const email = data.session?.user.email;

  if (!email) {
    clearSession();
    return null;
  }

  const username = usernameFromEmail(email);
  if (!findUser(username)) {
    clearSession();
    await supabase.auth.signOut();
    return null;
  }

  setSession(username);
  return username;
}
