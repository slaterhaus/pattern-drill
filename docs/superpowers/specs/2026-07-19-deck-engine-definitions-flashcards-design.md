# Deck Engine + Definitions Flashcards — Design

**Date:** 2026-07-19
**Status:** Approved

## Goal

Add a second drill mode to pattern-drill: self-graded flashcards for pattern
definitions (front: pattern name; back: definition, when-to-use tells,
complexity). Build it on a small headless "deck engine" that future decks
(pseudocode→pattern identification, system design) can reuse, and that can
eventually be extracted and published to NPM.

## Decisions made during brainstorming

- **Card format:** name → definition, self-graded flip (Anki style). Not
  multiple choice — that overlaps with the existing drill.
- **Card back:** definition (2–3 sentences) + when-to-use tells + complexity.
  Pseudocode stays on the existing reference card, one tap away.
- **Progress:** flashcard reviews are a separate track from drill mastery.
  They get their own stored history and weakest-first ordering. A completed
  flashcard session counts toward the daily streak.
- **Architecture:** generic deck engine (approach C) rather than a one-off
  mode, because two more decks are already planned.
- **Packaging:** headless folder in-app (`src/deck-engine/`), not a workspace
  package. Hard rule: no imports from app code, no React, no storage. NPM
  extraction later is mechanical because the boundary exists from day one.

## Scope

**In:** deck engine core; definitions deck content for all 20 patterns;
flashcard session UI; state v2 with migration; streak credit.

**Out (future work):** pseudocode→pattern deck; system-design deck; NPM
extraction; re-basing the existing word-problem drill onto the engine;
Progress-screen display of the flashcard track.

The existing drill's scheduler and code path are untouched.

## Deck engine (`src/deck-engine/`)

Pure TypeScript over plain data. Four concepts:

```ts
interface Card {
  id: string;
  deckId: string;
  front: unknown; // opaque to the engine; host renders
  back: unknown;
}

interface Review {
  cardId: string;
  deckId: string;
  grade: 'pass' | 'fail'; // binary for now; type may widen later
  date: string;           // YYYY-MM-DD, local timezone (matches Attempt.date)
  timeMs?: number;
}

interface Deck {
  id: string;
  title: string;
  cards: Card[];
  sessionSize: number;
}

function buildSession(deck: Deck, reviews: Review[]): Card[];
```

`buildSession` ordering:

1. Never-reviewed cards first (in deck order).
2. Then weakest first: lowest pass rate over that card's most recent 5
   reviews.
3. Ties broken by least-recently-reviewed.
4. Returns at most `sessionSize` cards.

The engine does not persist anything and does not know how a grade was
produced (self-grade here; timed multiple-choice for future decks). Hosts own
storage and interaction.

## App integration

### Content

Three new required fields on each `patterns.json` entry (alongside existing
`pseudocode` and `references`):

- `definition`: 2–3 plain-English sentences — what the pattern is.
- `whenToUse`: 2–4 short bullet strings — the tells that signal it.
- `complexity`: one line, typical time/space.

Same authorship rule as pseudocode: original wording, never book-transcribed.
`PatternInfo` in `types.ts` gains the three fields.

The definitions deck is derived from `patterns.json` at load time: one card
per pattern, `front` = pattern id (UI renders the display name), `back` =
`{ definition, whenToUse, complexity }`. `sessionSize` = 10.

### UI

- **Home:** second button, "Definitions", next to the existing drill button.
- **`FlashcardSession.tsx`** (new component): shows card front (pattern
  name); tap/click flips to the back; "Got it" / "Missed it" buttons record
  pass/fail and advance. No timer. Progress indicator (card N of M) matches
  the drill session's style.
- **Session end:** reuse the Summary layout with pass/miss counts; missed
  cards listed by pattern name.

### State

`AppState` bumps to version 2:

```ts
interface AppState {
  version: 2;
  attempts: Attempt[];
  sessionDates: string[];
  reviews: Review[]; // new
}
```

Migration: v1 state loads unchanged with `reviews: []` and `version: 2`.
Completing a flashcard session (all cards graded) appends today to
`sessionDates` exactly as a drill session does.

Storage keeps its existing single-key localStorage approach; `reviews` rides
along in the same object.

## Error handling

- Migration handles v1 → v2; unknown/corrupt state falls back to fresh state
  (existing behavior, unchanged).
- Content completeness is enforced by tests, not runtime checks.

## Testing

- **Engine** (heaviest — it is the future package):
  - `buildSession`: never-seen first, weakest-first ordering, recent-5
    window, tie-break by recency, `sessionSize` truncation, empty review
    history, deck smaller than `sessionSize`.
- **App:**
  - Storage: v1 → v2 migration preserves attempts/sessionDates and adds
    empty `reviews`.
  - Content: every pattern has non-empty `definition`, `whenToUse` (2–4
    entries), `complexity`.
- No component tests, matching the current repo convention.

## Success criteria

- `npm test` passes with the new engine and content tests.
- `npm run build` passes (typecheck + Vite).
- Manual: complete a definitions session end-to-end; streak increments;
  reloading mid-progress doesn't corrupt state; drill mode behaves exactly
  as before.
