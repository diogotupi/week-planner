import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';

const USERS = [
  { username: 'camila', password: '123456' },
  { username: 'diogo', password: '123456' },
];

function getSecret(): string {
  return process.env.AUTH_SECRET || 'week-planner-dev-secret';
}

export function signToken(username: string): string {
  const payload = JSON.stringify({
    u: username,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${Buffer.from(payload).toString('base64url')}.${sig}`;
}

export function verifyToken(token: string): string | null {
  const [payloadB64, sig] = token.split('.');
  if (!payloadB64 || !sig) return null;

  const payload = Buffer.from(payloadB64, 'base64url').toString();
  const expected = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  if (sig !== expected) return null;

  const data = JSON.parse(payload) as { u: string; exp: number };
  if (data.exp < Date.now()) return null;
  if (!USERS.some((user) => user.username === data.u)) return null;

  return data.u;
}

export function validateCredentials(username: string, password: string): string | null {
  const normalized = username.trim().toLowerCase();
  const user = USERS.find((u) => u.username === normalized);
  if (!user || user.password !== password) return null;
  return user.username;
}

export function getUsernameFromRequest(req: VercelRequest): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return verifyToken(header.slice(7));
}
