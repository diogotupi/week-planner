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
- **Checkbox animado** — animação ao marcar tarefa como concluída
- **Persistência** — dados salvos automaticamente no navegador

### Usuários de teste

| Login  | Senha   |
|--------|---------|
| camila | 123456  |
| diogo  | 123456  |

## Como usar localmente

```bash
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173) no navegador.

## Site online (GitHub Pages)

**URL:** https://diogotupi.github.io/week-planner/

### Configuração do GitHub Pages

Em https://github.com/diogotupi/week-planner/settings/pages escolha **uma** opção:

**Opção A (recomendada):** Branch `gh-pages` → pasta `/ (root)`

**Opção B:** Branch `main` → pasta `/docs`

> Se estiver em `main` + `/ (root)`, o site não funciona — ele mostra o código-fonte em vez do app.
