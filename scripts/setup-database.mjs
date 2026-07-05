import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const url = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const USERS = [
  { email: 'camila@weekplanner.app', password: '123456' },
  { email: 'diogo@weekplanner.app', password: '123456' },
];

const SCHEMA_SQL = `
create table if not exists public.user_tasks (
  username text primary key,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_tasks enable row level security;

drop policy if exists "read own" on public.user_tasks;
drop policy if exists "insert own" on public.user_tasks;
drop policy if exists "update own" on public.user_tasks;

create policy "read own"
  on public.user_tasks for select
  using (username = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "insert own"
  on public.user_tasks for insert
  with check (username = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "update own"
  on public.user_tasks for update
  using (username = split_part(auth.jwt() ->> 'email', '@', 1));
`;

async function setupDatabase() {
  if (!url || !serviceRoleKey || !postgresUrl) {
    console.log('Setup: variáveis do Supabase não encontradas, pulando.');
    return;
  }

  console.log('Setup: criando tabela e políticas...');
  const sql = postgres(postgresUrl, { ssl: 'require', max: 1 });
  try {
    await sql.unsafe(SCHEMA_SQL);
  } finally {
    await sql.end();
  }

  console.log('Setup: criando usuários...');
  const admin = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  for (const user of USERS) {
    const { data: existing } = await admin.auth.admin.listUsers();
    const found = existing?.users?.find((u) => u.email === user.email);

    if (found) {
      await admin.auth.admin.updateUserById(found.id, {
        password: user.password,
        email_confirm: true,
      });
      console.log(`Setup: usuário ${user.email} atualizado`);
    } else {
      const { error } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });
      if (error) {
        console.error(`Setup: erro ao criar ${user.email}:`, error.message);
      } else {
        console.log(`Setup: usuário ${user.email} criado`);
      }
    }
  }

  console.log('Setup: banco pronto!');
}

setupDatabase().catch((err) => {
  console.error('Setup falhou:', err);
  process.exit(1);
});
