import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUsernameFromRequest } from './_lib/auth.js';
import { getDb } from './_lib/db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const username = getUsernameFromRequest(req);
  if (!username) {
    res.status(401).json({ error: 'Não autorizado.' });
    return;
  }

  const db = getDb();
  if (!db) {
    res.status(503).json({ error: 'Banco de dados não configurado.' });
    return;
  }

  try {
    if (req.method === 'GET') {
      const rows = await db`
        select date_key, stats
        from user_day_stats
        where username = ${username}
        order by date_key desc
      `;

      res.status(200).json({
        stats: rows.map((row) => ({
          ...(row.stats as Record<string, unknown>),
          dateKey: row.date_key,
        })),
      });
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body as { stats?: { dateKey?: string } } | undefined;
      const dateKey = body?.stats?.dateKey;
      if (!dateKey || typeof dateKey !== 'string') {
        res.status(400).json({ error: 'Formato inválido.' });
        return;
      }

      await db`
        insert into user_day_stats (username, date_key, stats, updated_at)
        values (${username}, ${dateKey}, ${db.json(body.stats as import('postgres').JSONValue)}, now())
        on conflict (username, date_key)
        do update set
          stats = excluded.stats,
          updated_at = now()
      `;

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Erro na API de estatísticas:', error);
    res.status(500).json({ error: 'Erro interno.' });
  }
}
