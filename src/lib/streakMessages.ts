const SUCCESS_MESSAGES = [
  'Mais um dia conquistado. A disciplina se constrói em escolhas pequenas, repetidas todos os dias.',
  'Cumprido. O caráter se forja no silêncio dos dias comuns.',
  'Muito bem. A vitória mora na constância, não no impulso.',
  'Dia vencido. Quem governa a si mesmo já venceu a batalha mais difícil.',
  'Parabéns. Você está se tornando, um dia de cada vez, a pessoa que decidiu ser.',
  'Hoje você escolheu o que importa em vez do que é fácil. É assim que se constrói uma vida.',
];

const FAIL_MESSAGES = [
  'Um dia não define um homem. O que define é o que ele faz depois da queda. Levante-se — o caminho ainda está à sua frente.',
  'A falha é um evento, não uma identidade. Os estoicos sabiam: o que importa não é o que aconteceu, mas o que você faz com isso. Siga.',
  'Você tropeçou. E daí? Até o carvalho mais forte perde folhas. O que importa é a raiz — e a sua ainda está firme. Continue.',
  'Não lamente o dia perdido. Aprenda com ele. A virtude não exige perfeição; exige retorno. Um dia só não o define.',
  'Você caiu. Levante-se sem drama. A disciplina verdadeira não é nunca falhar — é nunca abandonar. O próximo dia te espera.',
  'O passado já foi. Você não pode reescrevê-lo, mas pode escolher o próximo passo. Um dia não é a história toda.',
  'Marco Aurélio escrevia: o obstáculo é o caminho. Use este tropeço como lembrete do porquê você começou — e continue.',
];

const COMPLETION_MESSAGES = [
  'Você chegou ao fim. Não por sorte — por escolha, dia após dia. Isso é caráter.',
  'Missão cumprida. Você provou a si mesmo que consegue. Guarde essa prova para os dias difíceis.',
  'Fim do ciclo. A disciplina venceu o impulso. Quando quiser, o próximo desafio te espera.',
];

function pick<T>(list: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length];
}

export function getStreakSuccessMessage(streakId: string, dateKey: string): string {
  return pick(SUCCESS_MESSAGES, `${streakId}-${dateKey}-ok`);
}

export function getStreakFailMessage(streakId: string, dateKey: string): string {
  return pick(FAIL_MESSAGES, `${streakId}-${dateKey}-fail`);
}

export function getStreakCompletionMessage(streakId: string): string {
  return pick(COMPLETION_MESSAGES, `${streakId}-done`);
}
