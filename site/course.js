import { isCorrect, scoreQuiz, readSaved } from './quiz.js';

const STORAGE_KEY = 'it-english-tutor';
const subtopics = [...document.querySelectorAll('.subtopic')];
const lessonIds = subtopics.map(section => section.id);
const questions = [...document.querySelectorAll('.quiz-question')];
const readingProgress = document.querySelector('#reading-progress');
const storageNote = document.querySelector('#storage-note');
let saved = { lessons: [], quiz: null };
try {
  saved = readSaved(localStorage.getItem(STORAGE_KEY), lessonIds, questions.length);
} catch {
  storageNote.hidden = false;
}
const completed = new Set();

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lessons: [...completed], quiz: saved.quiz }));
  } catch {
    storageNote.hidden = false;
  }
}

function markRead(lesson) {
  completed.add(lesson);
  document.querySelector(`[data-read="${lesson}"]`).hidden = false;
  readingProgress.style.setProperty('--read', completed.size / lessonIds.length);
}

saved.lessons.forEach(markRead);
readingProgress.hidden = false;
// Подтема прочитана, когда её конец показался на экране: в конец секции добавляется пустая метка.
const readEnds = new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    readEnds.unobserve(entry.target);
    markRead(entry.target.parentElement.id);
    save();
  }
});
for (const section of subtopics) {
  if (completed.has(section.id)) continue;
  const end = document.createElement('div');
  section.append(end);
  readEnds.observe(end);
}

// Итоговый тест: ответы проверяются только после завершения, затем видны правильные варианты и объяснения.
const quizForm = document.querySelector('#quiz-form');
const quizResult = document.querySelector('#quiz-result');
const quizSkipped = document.querySelector('#quiz-skipped');
const quizSubmit = quizForm.querySelector('[type="submit"]');
const retryButtons = quizForm.querySelectorAll('[data-quiz-retry]');
const fieldsets = questions.map(question => question.querySelector('fieldset'));
let finished = false;
let warned = false;

const chosen = fieldset => [...fieldset.querySelectorAll('input:checked')].map(input => input.value);

function showLast() {
  const last = document.querySelector('#quiz-last');
  last.hidden = !saved.quiz;
  if (saved.quiz) last.textContent = `Последний результат в этом браузере: ${saved.quiz.score} из ${saved.quiz.total}.`;
}

function finish() {
  finished = true;
  const results = fieldsets.map(fieldset => ({ fieldset, correct: fieldset.dataset.answer.split(' '), chosen: chosen(fieldset) }));
  for (const { fieldset, correct, chosen } of results) {
    for (const input of fieldset.querySelectorAll('input')) {
      const answer = correct.includes(input.value);
      const label = input.closest('label');
      label.classList.toggle('is-answer', answer);
      label.classList.toggle('is-miss', input.checked && !answer);
      if (!answer && !input.checked) continue;
      const mark = document.createElement('span');
      mark.className = 'quiz-mark';
      mark.textContent = answer ? (input.checked ? 'Правильный вариант · ваш выбор' : 'Правильный вариант') : 'Ваш выбор · неверно';
      label.append(mark);
    }
    fieldset.disabled = true;
    const feedback = fieldset.nextElementSibling;
    const right = isCorrect(correct, chosen);
    feedback.classList.toggle('is-right', right);
    feedback.querySelector('.quiz-verdict').textContent = right ? 'Верно · 1 балл' : chosen.length ? 'Неверно · 0 баллов' : 'Нет ответа · 0 баллов';
    feedback.hidden = false;
  }
  const score = scoreQuiz(results);
  saved.quiz = { score, total: questions.length };
  save();
  showLast();
  document.querySelector('#quiz-score').textContent = `${score} из ${questions.length}`;
  quizSkipped.hidden = true;
  quizSubmit.hidden = true;
  for (const button of retryButtons) button.hidden = false;
  quizResult.hidden = false;
  quizResult.focus();
}

function retry() {
  finished = false;
  warned = false;
  quizForm.reset();
  for (const mark of quizForm.querySelectorAll('.quiz-mark')) mark.remove();
  for (const label of quizForm.querySelectorAll('label')) label.classList.remove('is-answer', 'is-miss');
  for (const fieldset of fieldsets) fieldset.disabled = false;
  for (const feedback of quizForm.querySelectorAll('.quiz-feedback')) feedback.hidden = true;
  quizResult.hidden = true;
  quizSkipped.hidden = true;
  quizSubmit.hidden = false;
  retryButtons[1].hidden = true;
  fieldsets[0].querySelector('input').focus();
}

quizForm.addEventListener('submit', event => {
  event.preventDefault();
  if (finished) return;
  const skipped = fieldsets.map((fieldset, index) => chosen(fieldset).length ? 0 : index + 1).filter(Boolean);
  if (skipped.length && !warned) {
    warned = true;
    const links = skipped.flatMap((number, index) => {
      const link = document.createElement('a');
      link.href = `#question-${number}`;
      link.textContent = number;
      return index ? [', ', link] : [link];
    });
    quizSkipped.replaceChildren(`Без ответа ${skipped.length === 1 ? 'вопрос' : 'вопросы'} `, ...links,
      '. Пропущенный вопрос засчитывается как неверный. Ответьте или нажмите «Завершить тест» ещё раз.');
    quizSkipped.hidden = false;
    return;
  }
  finish();
});
for (const button of retryButtons) button.addEventListener('click', retry);

showLast();
quizForm.hidden = false;

const page = document.documentElement;

// Двигаем только видимые иллюстрации, сохраняя статическую схему без JavaScript.
const illustrations = new IntersectionObserver(entries => {
  for (const entry of entries) {
    entry.target.closest('.course-art').classList.toggle('is-visible', entry.isIntersecting);
  }
  scheduleScenes();
});
for (const figure of document.querySelectorAll('.course-art')) {
  illustrations.observe(figure.querySelector('.art-panel') || figure);
}
// Пара «ошибка → исправление» анимируется, только когда обе её фразы целиком на экране:
// так зачёркивание и подсветка идут вместе, даже если на узком экране фразы далеко друг от друга.
const pairs = [...document.querySelectorAll('.review-hunk, .compare')];
const shown = new Set();
const pairMarks = new IntersectionObserver(entries => {
  for (const entry of entries) shown[entry.isIntersecting ? 'add' : 'delete'](entry.target);
  for (const pair of pairs) pair.classList.toggle('is-visible', [...pair.querySelectorAll('mark')].every(mark => shown.has(mark)));
}, { threshold: 1 });
for (const pair of pairs) for (const mark of pair.querySelectorAll('mark')) pairMarks.observe(mark);
page.classList.toggle('motion-background', document.hidden);
document.addEventListener('visibilitychange', () => {
  page.classList.toggle('motion-background', document.hidden);
  scheduleScenes();
});
page.classList.add('motion-ready');

const sceneMedia = matchMedia('(min-width: 64rem) and (min-height: 40rem) and (prefers-reduced-motion: no-preference)');
const scenes = [...document.querySelectorAll('.scroll-scene')].map(figure => ({
  figure,
  steps: [...figure.querySelectorAll('.scene-step')],
  continuous: figure.classList.contains('continuous-scene'),
}));
let sceneFrame = 0;
let lastScrollY = scrollY;
let lastScrollTime = 0;
let scrollSpeed = 0;

// Только целые этапы: промежуточные кадры проигрывает CSS-переход, а не прокрутка.
// Чем быстрее прокрутка, тем короче переход, чтобы анимация не отставала от текста.
function setFrame(figure, property, stage) {
  if (figure.style.getPropertyValue(property) === String(stage)) return;
  figure.style.setProperty('--playback', Math.max(0.15, Math.min(1, 1.5 / scrollSpeed)).toFixed(2));
  figure.style.setProperty(property, String(stage));
}

function setScene({ figure, steps }, progress, wide, bleed) {
  const stage = Math.round(progress);
  setFrame(figure, '--scene-progress', stage);
  figure.dataset.stage = String(stage);
  steps.forEach((step, index) => step.classList.toggle('is-current', index === stage));
  figure.style.setProperty('--bleed-left', `${bleed.left}px`);
  figure.style.setProperty('--bleed-right', `${bleed.right}px`);
  setWide(figure, wide);
}

// Широкая сцена ниже, чем узкая. Если верх сцены выше экрана, на время перехода прокрутка в каждом кадре
// держит на месте низ сцены, иначе всё под ней поедет на разницу высот (scroll anchoring здесь не срабатывает).
const holds = new Map();

function setWide(figure, wide) {
  if (figure.classList.contains('is-wide') === wide) return;
  const top = figure.getBoundingClientRect().top;
  figure.classList.toggle('is-wide', wide);
  if (top >= 0) return;
  const running = holds.has(figure);
  holds.set(figure, performance.now() + 700);
  if (running) return;
  let bottom = figure.getBoundingClientRect().bottom + scrollY;
  const hold = now => {
    const next = figure.getBoundingClientRect().bottom + scrollY;
    if (next !== bottom) scrollBy(0, next - bottom);
    bottom = next;
    if (now < holds.get(figure)) requestAnimationFrame(hold);
    else holds.delete(figure);
  };
  requestAnimationFrame(hold);
}

function scheduleScenes() {
  if (sceneFrame || document.hidden || !sceneMedia.matches) return;
  sceneFrame = requestAnimationFrame(updateScenes);
}

function updateScenes() {
  sceneFrame = 0;
  if (document.hidden || !sceneMedia.matches) return;

  // Сначала читаем геометрию всех видимых сцен, затем меняем только их кадры.
  const updates = scenes.filter(({ figure }) => figure.classList.contains('is-visible')).map(scene => {
    const { figure, steps, continuous } = scene;
    // Центры шагов прижимаются к участку, где картинка закреплена: первый и последний кадры
    // держатся чуть дольше закрепления, поэтому вокруг текста не нужны пустые поля.
    const area = figure.getBoundingClientRect();
    const centers = steps.map(step => {
      const bounds = step.getBoundingClientRect();
      return Math.max(area.top + innerHeight * 0.6,
        Math.min(area.bottom - innerHeight * 0.6, bounds.top + bounds.height / 2));
    });
    let progress = 0;
    for (let index = 1; index < centers.length; index++) {
      const boundary = (centers[index - 1] + centers[index]) / 2;
      const distance = Math.max(1, centers[index] - centers[index - 1]);
      const blend = Math.max(0, Math.min(1, continuous
        ? (innerHeight / 2 - centers[index - 1] - distance * 0.1) / (distance * 0.8)
        : (innerHeight / 2 - boundary + 60) / 120));
      progress = index - 1 + blend;
      if (blend < 1) break;
    }
    // Пока сцена занимает экран, она расширена до его краёв, а оглавление спрятано; в начале и в конце —
    // одинаковый переход: верх сцены поднимается к четверти экрана, низ — к трём четвертям.
    // Отступы до краёв меряем по родителю: его ширина от расширения не меняется.
    // Запас против дребезга: за кадр перехода край сцены может сдвинуться на пару пикселей через порог.
    const column = figure.parentElement.getBoundingClientRect();
    const margin = figure.classList.contains('is-wide') ? 0 : 40;
    const wide = area.top < innerHeight / 4 - margin && area.bottom > innerHeight * 3 / 4 + margin;
    return { scene, progress, wide, bleed: { left: column.left, right: page.clientWidth - column.right } };
  });
  for (const { figure } of scenes) if (!figure.classList.contains('is-visible')) setWide(figure, false);
  for (const { scene, progress, wide, bleed } of updates) setScene(scene, progress, wide, bleed);
}

// Оглавление отмечает последнюю главу, начавшуюся выше линии на трети экрана
// (в промежутке между главами — предыдущую), и прокручивает только себя.
const sidebar = document.querySelector('.course-sidebar');
const tocLinks = new Map([...document.querySelectorAll('.toc a')].map(link => [link.hash.slice(1), link]));
const tocSections = [...tocLinks.keys()].map(id => document.getElementById(id));
const quietScroll = matchMedia('(prefers-reduced-motion: reduce)');
const chapters = new IntersectionObserver(() => {
  const line = innerHeight * 0.34;
  const section = tocSections.findLast(item => item.getBoundingClientRect().top < line);
  for (const link of tocLinks.values()) link.removeAttribute('aria-current');
  if (!section) return;
  const link = tocLinks.get(section.id);
  link.setAttribute('aria-current', 'location');
  const box = link.getBoundingClientRect();
  const view = sidebar.getBoundingClientRect();
  // Отступ как у scroll-padding оглавления: пункт не прилипает к краю.
  const offset = box.top < view.top + 12 ? box.top - view.top - 12 : Math.max(0, box.bottom - view.bottom + 12);
  if (offset) sidebar.scrollBy({ top: offset, behavior: quietScroll.matches ? 'instant' : 'smooth' });
}, { rootMargin: '-33% 0px -66% 0px' });
// Следим и за переходами между главами и подтемами: прыжок из одного промежутка в другой тоже обновляет отметку.
for (const block of document.querySelectorAll('#course > *, .subtopic')) chapters.observe(block);

sceneMedia.addEventListener('change', scheduleScenes);
addEventListener('scroll', event => {
  // Скорость в пикселях за миллисекунду; сглаживание гасит рывки колеса, пауза сбрасывает её.
  const elapsed = event.timeStamp - lastScrollTime;
  const speed = Math.abs(scrollY - lastScrollY) / Math.max(elapsed, 1);
  scrollSpeed = elapsed > 200 ? speed : scrollSpeed * 0.6 + speed * 0.4;
  lastScrollY = scrollY;
  lastScrollTime = event.timeStamp;
  scheduleScenes();
}, { passive: true });
addEventListener('resize', scheduleScenes);
scheduleScenes();
