# Planejador da Semana

Um planejador semanal simples, minimalista e fácil de usar — pensado para ser claro e acessível.

## Funcionalidades

- **7 dias da semana** — de segunda a domingo
- **Vários dias por tarefa** — ex: Academia em Seg, Qua e Sex
- **Adicionar tarefas** em cada dia com três modos de tempo:
  - **Definir tempo** — duração sem horário fixo (ex: 1h30)
  - **Definir horário** — início e fim da tarefa
  - **Dia todo** — dedica o dia inteiro
- **Toda semana?** — tarefas recorrentes que aparecem toda semana no mesmo dia
- **Login** — cada usuário tem suas próprias tarefas
- **Sincronização na nuvem** — tarefas sincronizadas entre celular e computador via Supabase
- **Checkbox animado** — animação ao marcar tarefa como concluída

### Usuários

| Login  | Senha   |
|--------|---------|
| camila | 123456  |
| diogo  | 123456  |

## Como usar localmente

```bash
npm install
cp .env.example .env   # preencha com as credenciais do Supabase
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

## Configurar sincronização (Supabase)

A sincronização usa [Supabase](https://supabase.com) (grátis). Faça isso uma vez:

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um projeto gratuito
2. Em **Project Settings → API**, copie:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public key** → `VITE_SUPABASE_ANON_KEY`

### 2. Criar tabela no banco

No **SQL Editor** do Supabase, execute o conteúdo de [`supabase/schema.sql`](supabase/schema.sql).

### 3. Criar usuários

Em **Authentication → Users → Add user**, crie:

| Email | Senha |
|-------|-------|
| `camila@weekplanner.app` | `123456` |
| `diogo@weekplanner.app` | `123456` |

Em **Authentication → Providers → Email**, desative **Confirm email**.

### 4. Configurar variáveis

**Local:** copie `.env.example` para `.env` e preencha as chaves.

**GitHub Pages:** em **Settings → Secrets and variables → Actions**, adicione:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Depois disso, cada login sincroniza as tarefas automaticamente entre aparelhos.

## Site online (GitHub Pages)

**URL:** https://diogotupi.github.io/week-planner/

### Configuração do Pages

1. Abra: **https://github.com/diogotupi/week-planner/settings/pages**
2. Em **Branch**, use **`gh-pages`**
3. Pasta: **`/ (root)`**
4. Salve e aguarde ~1 minuto
