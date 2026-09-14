# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Korak is a static, offline-capable PWA for learning **Croatian** (from German), despite the repo's own README describing an older German-course version — the shipped app (`index.html` title, `service-worker.js` cache key `korak-v6-*`) is "Korak 6 – Kroatisch lernen". Prompts, UI copy, and grammar hints are in German; the target-language content is Croatian (`hr`).

There is no build step, package manager, or test suite. It's plain HTML/CSS/JS loaded directly by the browser.

## Running locally

Serve the directory with any static file server and open it (a service worker is registered, so `file://` won't behave correctly — use HTTP):

```
python3 -m http.server 8000
```

There is no lint, build, or test command — verify changes by loading the app in a browser and exercising the flow (see `.claude/skills` or the `run` skill if available).

## Deployment

Per `README.md`: files are uploaded directly to the repository root (replacing existing files) and Netlify auto-deploys from there. After deploying, do a full reload so the new service worker activates.

**Cache-busting is manual and load-bearing**: `service-worker.js` precaches a fixed file list under a `CACHE` key like `"korak-v6-2026-07"`. Any change to a cached file (`index.html`, `styles.css`, `app.js`, `course-data.js`, manifest, icons) requires bumping `CACHE` in `service-worker.js`, or returning users will keep getting stale cached assets.

## Architecture

Three files form the app; everything else is styling/assets:

- **`course-data.js`** — sets `window.KORAK_DATA`, the entire course content as one large literal: `{levels: [{id, title, chapters: [{id, title, description, icon, testId, lessons: [...]}]}]}`. Each lesson has `id`, `level`, `chapterId`, `title`, `items: [{hr, de}]` (vocab pairs), optional `grammar` (a short tip string) and `dialogue` (array of `[speaker, line]` pairs). A chapter's test is itself a lesson-shaped entry with `isTest: true` whose `id` matches the chapter's `testId`; its `items` are drawn from the other lessons in that chapter at quiz time rather than authored separately.
- **`app.js`** — all application logic: state/persistence, spaced repetition, screen rendering, and the exercise/session engine. No modules/bundler — everything is top-level functions and DOM queries (`$ = document.querySelector`) executed on script load.
- **`index.html`** — a single-page shell with one `<section class="view">` per screen (`home`, `levels`, `practice`, `profile`, `achievements`, `lesson`, `done`); `app.js` toggles the `.active` class via `show(id)` instead of routing/navigating.

### State & persistence

- All progress lives in `localStorage` under key `korak-v6` (`KEY` in `app.js`), as one JSON blob matching `defaults()`. `load()` migrates forward from older keys (`korak-v5`, `korak-a1-v3`) on first run, including remapping old numeric lesson ids to the current `a1-<chapter>-<n>` id scheme.
- Bump `KEY` (and add the old value to `OLD_KEYS`) if the state shape changes in a way that needs a migration path; otherwise existing users' saves should keep loading under the same key.
- Per-vocab-item SRS state (`state.items[lessonId-itemIndex]`) uses an 8-box Leitner-style scheme (`INTERVALS` in days); `schedule()` advances/resets the box and sets the next `due` timestamp on each answer.

### Lesson/exercise generation

Exercises are generated on the fly from `course-data.js`, not authored — see `makeNormal()`, `makeTest()`, `startReview()`, `startWrongPractice()`, `startRandom()` in `app.js`. Question types: `choice-de` (recognize Croatian → pick German), `input-hr` (translate German → type Croatian), `choice-hr`, `listen` (TTS via `speechSynthesis`, `hr-HR`), and `dialogue` (complete a two-line exchange, distractors drawn from other lessons' `hr` values). Wrong answers get requeued a few positions later in the same session (`retryFor()` in `check()`) rather than immediately repeated.

### Progression/unlocking

Chapters unlock sequentially per level (`chapterUnlocked`: chapter *n* requires the previous chapter's test, `testId`, to be in `state.completed`); lessons unlock sequentially within an unlocked chapter (`lessonUnlocked`). Levels beyond `A1`/`A2` exist in the "locked / in preparation" UI state (see `renderLevels()`) even if present in `course-data.js`.

### Answer checking

`norm()` normalizes both Croatian and German answers for comparison: trims, lowercases with the `"hr"` locale (so this stays correct for Croatian diacritics), and strips a fixed set of punctuation. Extend this set rather than adding ad hoc comparisons if new punctuation needs to be ignored.
