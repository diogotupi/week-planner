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

## Deploy no Vercel com sincronização (recomendado)

Como o repositório `week-planner` **já existe** no GitHub, não use o link de "clone". Importe o repo existente:

### Passo a passo no celular

1. Abra: **[vercel.com/new](https://vercel.com/new)**
2. Na lista, encontre **`week-planner`** e clique em **Import**
3. Em **Production Branch**, troque de `gh-pages` para **`main`**
4. Antes de deployar, clique em **Storage** ou **Integrations** e adicione **Supabase**
5. Clique em **Deploy** e aguarde ~2 min

O script de setup cria automaticamente a tabela e os usuários `camila` / `diogo`.

Depois acesse a URL que o Vercel mostrar e faça login.

---

## Site no GitHub Pages (sem sincronização)

**URL:** https://diogotupi.github.io/week-planner/

O GitHub Pages não suporta banco de dados. Para sincronizar entre celular e PC, use o **Vercel** (passos acima).

---

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencha com credenciais do Supabase (opcional)
npm run dev
```
