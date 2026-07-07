import postgres from 'postgres';

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const SCHEMA_SQL = `
create table if not exists user_tasks (
  username text primary key,
  tasks jsonb not null default '[]'::jsonb,
  lero_lero jsonb,
  task_timer jsonb,
  updated_at timestamptz not null default now()
);

alter table user_tasks add column if not exists lero_lero jsonb;
alter table user_tasks add column if not exists task_timer jsonb;
alter table user_tasks add column if not exists preferences jsonb;

create table if not exists user_day_stats (
  username text not null,
  date_key text not null,
  stats jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (username, date_key)
);
`;

async function setupDatabase() {
  if (!postgresUrl) {
    console.log('Setup: DATABASE_URL não encontrada, pulando.');
    return;
  }

  console.log('Setup: criando tabela no Neon...');
  const sql = postgres(postgresUrl, { ssl: 'require', max: 1 });
  try {
    await sql.unsafe(SCHEMA_SQL);
    console.log('Setup: banco pronto!');
  } finally {
    await sql.end();
  }
}

setupDatabase().catch((err) => {
  console.error('Setup falhou:', err);
  process.exit(1);
});
