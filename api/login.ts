import type { VercelRequest, VercelResponse } from '@vercel/node';
import { signToken, validateCredentials } from './_lib/auth';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const body = req.body as { username?: string; password?: string } | undefined;
  const username = body?.username ?? '';
  const password = body?.password ?? '';

  const validUser = validateCredentials(username, password);
  if (!validUser) {
    res.status(401).json({ error: 'Login ou senha incorretos.' });
    return;
  }

  res.status(200).json({ token: signToken(validUser), username: validUser });
}
