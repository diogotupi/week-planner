const SUCCESS_MESSAGES = [
  'Mais um dia conquistado. A disciplina é feita de escolhas pequenas e repetidas.',
  'Você cumpriu. O caráter se forja no silêncio dos dias comuns.',
  'Bom. Continue — a vitória mora na constância, não no impulso.',
  'Dia cumprido. Quem se governa a si mesmo já venceu metade da guerra.',
  'Parabéns. Cada dia firme é um tijolo na pessoa que você quer ser.',
];

const FAIL_MESSAGES = [
  'Um dia não define um homem. O que define é o que ele faz depois da queda. Levante-se — o caminho ainda está à sua frente.',
  'A falha é um evento, não uma identidade. Os estoicos sabiam: o que importa não é o que aconteceu, mas o julgamento que você faz disso. Siga.',
  'Você tropeçou. E daí? Até o carvalho mais forte perde folhas. O que importa é a raiz — e a sua ainda está firme. Continue.',
  'Não chore o dia perdido. Use-o. A virtude não exige perfeição; exige retorno. Um dia só não o define.',
  'Caíste. Levante-se sem drama. A disciplina verdadeira não é nunca falhar — é nunca abandonar. O próximo dia te espera.',
  'O passado já foi. Você não pode reescrevê-lo, mas pode escolher o próximo passo. Um dia não é a história toda.',
];

const COMPLETION_MESSAGES = [
  'Você chegou ao fim. Não por sorte — por escolha, dia após dia. Isso é caráter.',
  'Missão cumprida. Você provou a si mesmo que consegue. Guarde essa prova.',
  'Fim do ciclo. A disciplina venceu o impulso. Quando quiser, o próximo desafio te espera.',
];

function pick<T>(list: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return list[hash % list.length];
}

export function getStrikeSuccessMessage(strikeId: string, dateKey: string): string {
  return pick(SUCCESS_MESSAGES, `${strikeId}-${dateKey}-ok`);
}

export function getStrikeFailMessage(strikeId: string, dateKey: string): string {
  return pick(FAIL_MESSAGES, `${strikeId}-${dateKey}-fail`);
}

export function getStrikeCompletionMessage(strikeId: string): string {
  return pick(COMPLETION_MESSAGES, `${strikeId}-done`);
}
