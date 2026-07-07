# Tupi Planner

Um planejador semanal simples, minimalista e fácil de usar — pensado para ser claro e acessível.

## Funcionalidades

- **7 dias da semana** — de segunda a domingo
- **Vários dias por tarefa** — ex: Academia em Seg, Qua e Sex
- **Adicionar tarefas** em cada dia com três modos de tempo
- **Toda semana?** — tarefas recorrentes
- **Login** — cada usuário tem suas próprias tarefas
- **Sincronização na nuvem** — tarefas iguais no celular e no computador (via Neon)
- **Checkbox animado** — animação ao marcar tarefa como concluída

### Usuários

| Login  | Senha   |
|--------|---------|
| camila | 123456  |
| diogo  | 123456  |

---

## Deploy no Vercel com sincronização (Neon)

### 1. Importar o projeto

1. Abra **[vercel.com/new](https://vercel.com/new)**
2. Importe **`week-planner`**
3. Branch de produção: **`main`**
4. Deploy

### 2. Conectar o Neon

1. No projeto Vercel → **Storage**
2. **Create Database** → **Neon**
3. Crie ou conecte um banco
4. O Vercel configura `DATABASE_URL` automaticamente

### 3. Adicionar secret de autenticação

1. **Settings → Environment Variables**
2. Adicione:
   - **Name:** `AUTH_SECRET`
   - **Value:** uma string longa e aleatória (ex: `minha-familia-secreta-2026`)
3. Marque Production, Preview e Development

### 4. Redeploy

1. **Deployments** → **⋯** → **Redeploy**

O script de setup cria a tabela automaticamente. Depois acesse a URL do Vercel e entre com `camila` ou `diogo` / `123456`.

---

## Site no GitHub Pages (sem sincronização)

**URL:** https://diogotupi.github.io/week-planner/

Salva só no navegador. Para sync entre aparelhos, use o **Vercel + Neon**.

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env
npm run dev          # frontend
vercel dev           # frontend + API (precisa do Vercel CLI)
```
