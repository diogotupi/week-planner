-- Execute no SQL Editor do Supabase (https://supabase.com/dashboard)

create table if not exists public.user_tasks (
  username text primary key,
  tasks jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_tasks enable row level security;

create policy "Usuários leem suas próprias tarefas"
  on public.user_tasks for select
  using (username = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "Usuários inserem suas próprias tarefas"
  on public.user_tasks for insert
  with check (username = split_part(auth.jwt() ->> 'email', '@', 1));

create policy "Usuários atualizam suas próprias tarefas"
  on public.user_tasks for update
  using (username = split_part(auth.jwt() ->> 'email', '@', 1));

-- Depois de rodar o SQL acima, crie os usuários em:
-- Authentication > Users > Add user
--
-- Email: camila@weekplanner.app  | Senha: 123456
-- Email: diogo@weekplanner.app   | Senha: 123456
--
-- Em Authentication > Providers > Email, desative "Confirm email".
