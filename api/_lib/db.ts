import postgres from 'postgres';

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  const url = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!url) return null;

  if (!sql) {
    sql = postgres(url, { ssl: 'require', max: 1 });
  }

  return sql;
}
