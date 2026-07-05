import postgres from 'postgres';

const postgresUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;

const SCHEMA_SQL = `
create table if not exists user_tasks (
  username text primary key,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
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
