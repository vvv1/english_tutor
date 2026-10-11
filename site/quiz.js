// Правила теста и сохранённого прогресса без обращения к странице: их проверяет tests/quiz.test.mjs.

// Балл только за точный набор: без лишних и пропущенных вариантов, без частичных баллов.
export function isCorrect(correct, chosen) {
  return chosen.length === correct.length && correct.every(value => chosen.includes(value));
}

export function scoreQuiz(questions) {
  return questions.filter(({ correct, chosen }) => isCorrect(correct, chosen)).length;
}

// Повреждённые или чужие данные не ломают курс: всё непонятное отбрасывается.
export function readSaved(text, lessonIds, total) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = null;
  }
  const lessons = Array.isArray(data?.lessons) ? data.lessons.filter(id => lessonIds.includes(id)) : [];
  const quiz = data?.quiz;
  const validQuiz = Number.isInteger(quiz?.score) && quiz.score >= 0 && quiz.score <= total && quiz.total === total;
  return {
    lessons: [...new Set(lessons)],
    quiz: validQuiz ? { score: quiz.score, total } : null,
  };
}
