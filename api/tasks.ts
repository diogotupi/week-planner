import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getUsernameFromRequest } from './_lib/auth';
import { getDb } from './_lib/db';

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
        select tasks, updated_at
        from user_tasks
        where username = ${username}
        limit 1
      `;

      const row = rows[0];
      res.status(200).json({
        tasks: row?.tasks ?? [],
        updatedAt: row?.updated_at ?? null,
      });
      return;
    }

    if (req.method === 'PUT') {
      const body = req.body as { tasks?: unknown } | undefined;
      if (!Array.isArray(body?.tasks)) {
        res.status(400).json({ error: 'Formato inválido.' });
        return;
      }

      await db`
        insert into user_tasks (username, tasks, updated_at)
        values (${username}, ${db.json(body.tasks)}, now())
        on conflict (username)
        do update set tasks = excluded.tasks, updated_at = now()
      `;

      res.status(200).json({ ok: true });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Erro na API de tarefas:', error);
    res.status(500).json({ error: 'Erro interno.' });
  }
}
