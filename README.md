# Planejador da Semana

Um planejador semanal simples, minimalista e fácil de usar — pensado para ser claro e acessível.

## Funcionalidades

- **7 dias da semana** — de segunda a domingo
- **Vários dias por tarefa** — ex: Academia em Seg, Qua e Sex
- **Adicionar tarefas** em cada dia com três modos de tempo
- **Toda semana?** — tarefas recorrentes
- **Login** — cada usuário tem suas próprias tarefas
- **Sincronização na nuvem** — tarefas iguais no celular e no computador
- **Checkbox animado** — animação ao marcar tarefa como concluída

### Usuários

| Login  | Senha   |
|--------|---------|
| camila | 123456  |
| diogo  | 123456  |

---

## Deploy em 1 clique (recomendado — Vercel + Supabase)

**Você está na rua?** Abra este link no celular, faça login no Vercel e clique em Deploy. O Vercel cria o banco Supabase automaticamente e configura tudo:

**[Deploy no Vercel com Supabase](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdiogotupi%2Fweek-planner&project-name=week-planner&repository-name=week-planner&env=VITE_SUPABASE_URL%2CVITE_SUPABASE_ANON_KEY%2CNEXT_PUBLIC_SUPABASE_URL%2CNEXT_PUBLIC_SUPABASE_ANON_KEY%2CSUPABASE_SERVICE_ROLE_KEY%2CPOSTGRES_URL&stores=%5B%7B%22type%22%3A%22integration%22%2C%22integrationSlug%22%3A%22supabase%22%2C%22productSlug%22%3A%22supabase%22%7D%5D)**

O que acontece automaticamente:
1. Vercel importa o projeto do GitHub
2. Cria um projeto Supabase gratuito e conecta
3. Configura as variáveis de ambiente
4. Faz o deploy e cria a tabela + usuários (`camila` e `diogo`)

Depois do deploy (~2 min), acesse a URL que o Vercel mostrar e faça login. Pronto — sincroniza entre aparelhos.

---

## Site no GitHub Pages (sem sincronização)

**URL:** https://diogotupi.github.io/week-planner/

O GitHub Pages não suporta banco de dados. Para sincronizar entre celular e PC, use o **Vercel** (link acima).

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencha com credenciais do Supabase (opcional)
npm run dev
```
