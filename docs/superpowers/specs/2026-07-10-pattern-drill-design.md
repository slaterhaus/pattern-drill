# PatternDrill — Design Spec

**Date:** 2026-07-10
**Status:** Approved

## One-liner

A daily 10-problem quiz web app that trains the user to read an algorithmic
problem statement and name the underlying pattern (sliding window, two
pointers, monotonic stack, …) in under 60 seconds.

## Goal & rationale

Interview-prep fundamentals with no deadline — a steady daily habit. The
trained skill is the *recognition decision*, not code recall: read a problem,
identify the pattern, understand the "tell" that signals it. High-rep,
low-friction drills with instant explanatory feedback.

## Core loop (UX)

1. Open app → single **"Start today's session"** button, with current streak
   count displayed.
2. Each round shows:
   - A short original problem statement (3–6 sentences, no code).
   - A 60-second countdown timer.
   - ~5 shuffled pattern choices: 1 correct + 4 plausible distractors drawn
     from confusable patterns (e.g. sliding window vs. two pointers).
3. After answering (or timeout, which counts as incorrect): a feedback screen
   showing:
   - The correct pattern.
   - The **tell** — the phrase/structure in the statement that signals the
     pattern, highlighted in the statement text.
   - Why the tempting wrong answers fail (one line each).
   - Typical time/space complexity for the pattern applied to this problem.
   - Dismissed with one tap/click to advance.
4. After 10 problems: session summary — score, per-pattern breakdown, weakest
   pattern of the day.
5. Completing one session marks the day for the streak. Additional sessions
   the same day are free practice (stats still recorded).

## Content

- `problems.json`, bundled at build time. ~200 original, paraphrased problem
  statements (no LeetCode text copied) across **~20 patterns**:
  two pointers, sliding window, fast/slow pointers, merge intervals, cyclic
  sort, in-place linked-list reversal, BFS, DFS, two heaps,
  subsets/backtracking, modified binary search, top-K heap, K-way merge,
  0/1 knapsack DP, unbounded knapsack DP, topological sort, monotonic stack,
  union-find, trie, greedy.
- ~10 problems per pattern, each tagged easy / medium / hard.
- Problem entry schema:
  - `id` — stable string id
  - `statement` — the problem text
  - `pattern` — canonical pattern id
  - `difficulty` — `easy | medium | hard`
  - `tell` — the recognition cue (substring of or reference into `statement`)
  - `whyNotOthers` — map of distractor pattern id → one-line rebuttal (4 entries)
  - `complexity` — e.g. `"O(n) time / O(k) space"`
- Content is the dominant build cost; author it in batches (~5 patterns at a
  time) to keep quality high.

## Scheduling — weakness-weighted pattern selection ("A+C hybrid")

- **Unit of scheduling is the pattern, not the problem** (anti-memorization).
- Per-pattern stats persisted: attempts, correct, average answer time,
  last-seen date.
- Pattern weight = recent-weighted error rate + staleness bonus:
  - Patterns unseen for 14+ days jump the queue.
  - Never-seen patterns get top priority.
- Within the selected pattern, serve the **least-recently-seen problem**.
- Difficulty ramp per pattern: easy problems until ~80% accuracy at that
  level, then mediums mix in, then hards.
- A session of 10 draws 10 distinct patterns by weight (all 20 patterns are
  always in the pool, so no repeats within a session).

## Progress screen

- Grid of 20 patterns × mastery level, derived from accuracy + speed:
  `learning / solid / mastered`.
- Streak calendar.
- Nothing else (YAGNI — no charts).

## Tech

- **Vite + React + TypeScript.** No backend. No UI framework; hand-rolled CSS.
- Mobile-friendly layout (drilling on phone is a first-class use case).
- All state in `localStorage` under a single key; **Export / Import JSON**
  buttons for backup and device migration.
- Deploy as a static site to GitHub Pages via GitHub Actions.
- Repo: `~/projects/pattern-drill`, new standalone project.

## Architecture / units

- `content/problems.json` — data only.
- `src/lib/scheduler.ts` — pure functions: pattern weighting, problem
  selection, difficulty ramp. No DOM, no storage access.
- `src/lib/storage.ts` — load/save/migrate localStorage state; export/import.
- `src/lib/stats.ts` — pure derivations: mastery levels, streak, summaries.
- React components consume the above; no business logic in components.

## Error handling

- Corrupt/missing localStorage → start fresh, but keep the corrupt blob under
  a `backup-` key rather than destroying it.
- Import of invalid JSON → reject with message, leave current state untouched.
- Timer expiry → recorded as incorrect answer with max time.

## Testing

- **Vitest** unit tests for:
  - Scheduler: weighting math, staleness bonus, never-seen priority,
    least-recently-seen problem choice, difficulty ramp.
  - Storage: serialization round-trip, corrupt-state recovery, import
    validation.
  - Stats: mastery-level thresholds, streak computation across day
    boundaries.
- Content schema test: every problem has a valid pattern id, 4 distinct
  distractor rebuttals, non-empty tell, valid difficulty.
- UI verified manually; no component test suite (personal tool).

## Out of scope

- Accounts, sync, backend of any kind.
- Code-writing/template-recall drills.
- LLM-generated content (may revisit if the bundled set feels memorized).
- Full per-problem SRS (SM-2/FSRS) — rejected in favor of pattern-level
  weakness weighting for even daily load.
