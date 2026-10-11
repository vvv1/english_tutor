# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**IT English Tutor** — a Russian-language English grammar course, a sibling of `F:\AI\pycharmprojects\sql_learning_site` ("SQL Optimization Tutor"): same Bauhaus design, one-page scrollytelling concept, stack, and quiz/progress logic; different subject. Communicate with the user in Russian. UI, explanations, and quiz text are in Russian; English examples stay in English and are marked `lang="en"`.

Decisions agreed with the user on 2026-10-11:
- Audience: B1–B2 learners working in IT/analytics; examples come from builds, releases, data, postmortems (fictional).
- First version: one topic, **Conditionals**, + a 9-question quiz. More topics will follow, one at a time.
- 2026-10-11 concept change: there are no "lessons" and no introduction. The course is made of topics; a topic is split into subtopics (Conditionals → Zero, First, Second, Third, Mixed), and read marks are per subtopic.
- No analogue of the reference's PostgreSQL/Greenplum switch.
- The project name «IT English Tutor» was chosen by Claude and can be changed.

Not done yet: Git repo, GitHub repository/Pages URL, README. Dark mode was out of scope in the reference; confirm with the user before adding it. A basic narrow-screen layout (≤48rem: one column, TOC above the course) was added with the user's approval on 2026-10-12.

## Architecture

- Static HTML/CSS, vanilla JS with native ES modules, inline SVG. No framework, no third-party libraries, no build step. Only `site/` is deployed (`.github/workflows/pages.yml` runs the scoring test, then publishes `site/`). All paths are relative so the site works under `/<repository>/`.
- `site/index.html` is the home page: hero + grid of `.topic-card` links (one per topic, `course.html#<topic-id>`), no JS. `site/course.html` holds all course content: cover → topics → quiz; its brand name and the hero button «Вернуться на главную» link back to `./`. Sticky TOC: topic entry with a nested `.toc-sub` list of subtopics carrying read marks (`data-read`); a subtopic is marked read automatically when its end scrolls into view (`course.js` appends an empty sentinel to each `.subtopic`). There are no «Далее» buttons and no animation pause button (removed 2026-10-12 at the user's request); because of that, nothing may animate on its own for more than a few seconds — no infinite loops. A shared `<symbol id="topic-symbol-N">` at the top of `<body>` is reused in the TOC, topic heading, and quiz.
- Topic structure: `<section class="topic">` with heading + thesis (h2) → pinned scroll scene (overview of all subtopics, 5 `.scene-step`s) → summary table → nested `<section class="subtopic">`s. Subtopic: `.subtopic-heading` (number, h3, thesis) → formula + examples → «Ошибка → Верно» pairs (`.compare`, h4) → `.lesson-limit` (where the rule doesn't apply) → `<details>` extras. The TOC highlighter observes `#course > *` and `.subtopic`.
- Scenes: `course.js` sets `data-stage` (0–4) on `.scroll-scene` from scroll position; CSS does the rest. In the Conditionals scene, elements with `data-at="…"` show only at listed stages, and chips move via `--col` set per stage. Markup ships `data-stage="4"`, which is the static state for no-JS, `prefers-reduced-motion`, small/low windows, and pause — every step's text must make sense without motion. While a scene's top is above ¼ of the screen and its bottom below ¾ (40px hysteresis), it gets `.is-wide`: negative margins (`--bleed-left/right`, measured by JS) widen it to the screen edges, the sidebar fades out via `:has(.is-wide)`, and caption text scales with `--scene-zoom`. The wide scene is shorter, and scroll anchoring doesn't work on this page, so when the scene's top is above the viewport `setWide` runs a rAF loop for the transition that `scrollBy`s to keep the scene's bottom in place.
- Page transitions (2026-10-12, modelled on exoape.com's "page sliding over page"): cross-document View Transitions, CSS only, at the end of `styles.css` (`@view-transition`, `page-leave`/`page-enter`), off under `prefers-reduced-motion`. They apply to every navigation between the two pages, back/forward included; browsers without support simply navigate. Don't animate the course page's own content on arrival with `transform`: it would throw off the scroll to the `#topic` anchor.
- Quiz: each question's `.quiz-meta` links to its subtopic. `fieldset[data-answer="a c"]` holds the correct set; one point only for an exact set. Rules live DOM-free in `site/quiz.js` (`isCorrect`, `scoreQuiz`, `readSaved`); DOM wiring in `site/course.js`. Answers are visible in client code — self-assessment, not an exam.
- Progress: `localStorage` key `it-english-tutor` (`{ lessons, quiz: { score, total } }`; `lessons` holds read subtopic ids despite the name); `readSaved` drops anything malformed, and storage errors must not break the page.
- Adding a topic: new `<section class="topic">` with its subtopics, TOC entry + `.toc-sub` with `data-read`, topic symbol, quiz questions linked to subtopics, a `.topic-card` on the home page (with its own copy of the symbol); update counts on both pages in the hero/sidebar/quiz texts. Copy scene patterns from the reference's `site/index.html`/`styles.css` (and its `DESIGN.md` for motion rules; skip its pause toggle and «Далее») before inventing new ones.

## Commands (from repo root)

```powershell
py -3 -m http.server 8000 --bind 127.0.0.1 --directory site   # preview; ES modules need HTTP, not file://
node --test tests/quiz.test.mjs                                # scoring + saved-progress parsing (also run in CI)
```

There is no browser test suite in the repo yet. Playwright is not installed in the project; a copy exists in the npx cache (`%LOCALAPPDATA%\npm-cache\_npx\*\node_modules\playwright-core`, use the one whose Chromium revision is in `%LOCALAPPDATA%\ms-playwright`) for ad-hoc checks.
