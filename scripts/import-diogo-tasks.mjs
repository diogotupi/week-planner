const API = 'https://week-planner-dusky.vercel.app';
const TODAY = '2026-07-06';
const WEEK = '2026-W27';

function id() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function task(day, sortOrder, text, opts = {}) {
  const {
    weekly = false,
    duration,
    startTime,
    endTime,
    completed = false,
  } = opts;

  const timeMode = startTime && endTime ? 'schedule' : 'duration';

  return {
    id: id(),
    text,
    day,
    weekly,
    timeMode,
    ...(duration ? { duration } : {}),
    ...(startTime ? { startTime } : {}),
    ...(endTime ? { endTime } : {}),
    createdWeek: WEEK,
    completedDates: completed ? [TODAY] : [],
    sortOrder,
  };
}

const tasks = [
  // Segunda
  task(0, 0, 'Café da Manhã', { weekly: true, duration: '1:30' }),
  task(0, 1, 'KTL', { duration: '1:20' }),
  task(0, 2, 'Almoço + Filme ou Praia', { weekly: true, duration: '1:30' }),
  task(0, 3, 'Academia', { weekly: true, duration: '2:00' }),
  task(0, 4, 'Meditação', { weekly: true, duration: '0:30' }),
  task(0, 5, 'Minhas Músicas', { weekly: true, duration: '1:00' }),
  task(0, 6, 'Formação Psi', { weekly: true, duration: '1:30' }),
  task(0, 7, 'Pequenas Coisas', { weekly: true, duration: '0:30' }),

  // Terça
  task(1, 0, 'Café da Manhã', { weekly: true, duration: '1:30' }),
  task(1, 1, 'Almoço + Filme ou Praia', { weekly: true, duration: '1:30' }),
  task(1, 2, 'Academia', { weekly: true, duration: '2:00' }),
  task(1, 3, 'Meditação', { weekly: true, duration: '0:30' }),
  task(1, 4, 'Minhas Músicas', { weekly: true, duration: '1:00' }),
  task(1, 5, 'Formação Psi', { weekly: true, duration: '1:30' }),
  task(1, 6, 'Fernando', { startTime: '12:00', endTime: '17:00' }),
  task(1, 7, 'Cash Stack', { duration: '1:00' }),

  // Quarta
  task(2, 0, 'Café da Manhã', { weekly: true, duration: '1:30' }),
  task(2, 1, 'Almoço + Filme ou Praia', { weekly: true, duration: '1:30' }),
  task(2, 2, 'Academia', { weekly: true, duration: '2:00' }),
  task(2, 3, 'Meditação', { weekly: true, duration: '0:30' }),
  task(2, 4, 'Minhas Músicas', { weekly: true, duration: '1:00' }),
  task(2, 5, 'Formação Psi', { weekly: true, duration: '1:30' }),
  task(2, 6, 'Pequenas Coisas', { weekly: true, duration: '0:30' }),
  task(2, 7, 'Homenagem', { duration: '1:00' }),

  // Quinta
  task(3, 0, 'Café da Manhã', { weekly: true, duration: '1:30' }),
  task(3, 1, 'Almoço + Filme ou Praia', { weekly: true, duration: '1:30' }),
  task(3, 2, 'Academia', { weekly: true, duration: '2:00' }),
  task(3, 3, 'Meditação', { weekly: true, duration: '0:30' }),
  task(3, 4, 'Minhas Músicas', { weekly: true, duration: '1:00' }),
  task(3, 5, 'Formação Psi', { weekly: true, duration: '1:30' }),
  task(3, 6, 'Pequenas Coisas', { weekly: true, duration: '0:30' }),
  task(3, 7, 'Destinados', { weekly: true, duration: '1:00' }),

  // Sexta
  task(4, 0, 'Café da Manhã', { weekly: true, duration: '1:30' }),
  task(4, 1, 'Almoço + Filme ou Praia', { weekly: true, duration: '1:30' }),
  task(4, 2, 'Academia', { weekly: true, duration: '2:00' }),
  task(4, 3, 'Meditação', { weekly: true, duration: '0:30' }),
  task(4, 4, 'Minhas Músicas', { weekly: true, duration: '1:00' }),
  task(4, 5, 'Formação Psi', { weekly: true, duration: '1:30' }),
  task(4, 6, 'Pequenas Coisas', { weekly: true, duration: '0:30' }),
  task(4, 7, 'Destinados', { weekly: true, duration: '1:00' }),

  // Sábado
  task(5, 0, 'Café da Manhã', { weekly: true, duration: '1:30' }),
  task(5, 1, 'Academia', { weekly: true, duration: '2:00' }),
  task(5, 2, 'Meditação', { weekly: true, duration: '0:30' }),
  task(5, 3, 'Minhas Músicas', { weekly: true, duration: '1:00' }),
  task(5, 4, 'Formação Psi', { weekly: true, duration: '1:30' }),
  task(5, 5, 'Pequenas Coisas', { weekly: true, duration: '0:30' }),
  task(5, 6, 'Destinados', { weekly: true, duration: '1:00' }),

  // Domingo (concluídas no print)
  task(6, 0, 'Café da Manhã', { weekly: true, duration: '1:30', completed: true }),
  task(6, 1, 'Meditação', { weekly: true, duration: '0:30', completed: true }),
  task(6, 2, 'Minhas Músicas', { weekly: true, duration: '1:00', completed: true }),
  task(6, 3, 'Formação Psi', { weekly: true, duration: '1:30', completed: true }),
  task(6, 4, 'Pequenas Coisas', { weekly: true, duration: '0:30', completed: true }),
  task(6, 5, 'Destinados', { weekly: true, duration: '1:00', completed: true }),
];

const loginRes = await fetch(`${API}/api/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'diogo', password: '123456' }),
});

if (!loginRes.ok) {
  console.error('Login falhou:', await loginRes.text());
  process.exit(1);
}

const { token } = await loginRes.json();

const saveRes = await fetch(`${API}/api/tasks`, {
  method: 'PUT',
  headers: {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ tasks }),
});

if (!saveRes.ok) {
  console.error('Salvar falhou:', await saveRes.text());
  process.exit(1);
}

console.log(`Importadas ${tasks.length} tarefas para diogo.`);
