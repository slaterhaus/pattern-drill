# Deck Engine + Definitions Flashcards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a headless deck engine (`src/deck-engine/`) and a self-graded definitions flashcard mode built on it, per `docs/superpowers/specs/2026-07-19-deck-engine-definitions-flashcards-design.md`.

**Architecture:** A pure-TypeScript engine (Card/Review/Deck types + `buildSession` scheduler) with no React, storage, or app imports. The app derives a definitions deck from `patterns.json` (three new content fields per pattern), renders it with a new `FlashcardSession` component, and persists reviews in `AppState` v2 (with v1 migration). Existing drill code path untouched.

**Tech Stack:** React 19, TypeScript strict, Vite 6, Vitest 3. No new dependencies.

## Global Constraints

- `src/deck-engine/` must not import from React, `src/` app code, or browser APIs — plain data in, plain data out.
- No new npm dependencies.
- Content rule: definitions/whenToUse/complexity are original wording, never transcribed from books.
- localStorage key stays `pattern-drill-state-v1` (the literal string is a name, not a version claim).
- Every task ends with `npm test` green; Tasks 4–6 also require `npm run build` (runs `tsc --noEmit`).
- Commit messages follow the repo's `feat:`/`fix:`/`content:`/`docs:` convention and end with the Claude co-author trailer.

---

### Task 1: Deck engine — types and `buildSession`

**Files:**
- Create: `src/deck-engine/types.ts`
- Create: `src/deck-engine/session.ts`
- Create: `src/deck-engine/index.ts`
- Test: `src/deck-engine/session.test.ts`

**Interfaces:**
- Consumes: nothing (leaf module).
- Produces: `Card`, `Review`, `Deck`, `Grade` types and `buildSession(deck: Deck, reviews: Review[]): Card[]`, all re-exported from `src/deck-engine/index.ts`. Later tasks import ONLY from `'../deck-engine'`.

- [ ] **Step 1: Write the failing tests**

Create `src/deck-engine/session.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Card, Deck, Review } from './index';
import { buildSession } from './index';

function card(id: string): Card {
  return { id, deckId: 'd', front: id, back: id };
}

function deck(cards: Card[], sessionSize = 3): Deck {
  return { id: 'd', title: 'Test', cards, sessionSize };
}

function review(cardId: string, grade: 'pass' | 'fail', date: string): Review {
  return { cardId, deckId: 'd', grade, date };
}

describe('buildSession', () => {
  it('returns cards in deck order when there is no history', () => {
    const d = deck([card('a'), card('b'), card('c'), card('d')], 3);
    expect(buildSession(d, []).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the whole deck when it is smaller than sessionSize', () => {
    const d = deck([card('a'), card('b')], 10);
    expect(buildSession(d, []).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('puts never-reviewed cards before reviewed ones', () => {
    const d = deck([card('a'), card('b'), card('c')], 3);
    const reviews = [review('a', 'fail', '2026-07-18')];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('orders reviewed cards weakest first by recent pass rate', () => {
    const d = deck([card('a'), card('b'), card('c')], 3);
    const reviews = [
      review('a', 'pass', '2026-07-18'), // a: 100%
      review('b', 'fail', '2026-07-18'), // b: 0%
      review('c', 'pass', '2026-07-18'),
      review('c', 'fail', '2026-07-18'), // c: 50%
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('only counts the most recent 5 reviews per card', () => {
    const d = deck([card('a'), card('b')], 2);
    // a: 3 old fails then 5 recent passes -> 100%. b: one fail -> 0%.
    const reviews = [
      review('a', 'fail', '2026-07-01'),
      review('a', 'fail', '2026-07-02'),
      review('a', 'fail', '2026-07-03'),
      review('a', 'pass', '2026-07-10'),
      review('a', 'pass', '2026-07-11'),
      review('a', 'pass', '2026-07-12'),
      review('a', 'pass', '2026-07-13'),
      review('a', 'pass', '2026-07-14'),
      review('b', 'fail', '2026-07-14'),
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('breaks pass-rate ties by least-recently-reviewed first', () => {
    const d = deck([card('a'), card('b')], 2);
    const reviews = [
      review('a', 'pass', '2026-07-14'),
      review('b', 'pass', '2026-07-10'),
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('ignores reviews belonging to other decks', () => {
    const d = deck([card('a'), card('b')], 2);
    const foreign: Review = { cardId: 'a', deckId: 'other', grade: 'fail', date: '2026-07-14' };
    expect(buildSession(d, [foreign]).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('truncates to sessionSize after ordering', () => {
    const d = deck([card('a'), card('b'), card('c')], 1);
    const reviews = [
      review('a', 'pass', '2026-07-18'),
      review('b', 'fail', '2026-07-18'),
      review('c', 'pass', '2026-07-18'),
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b']);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/deck-engine`
Expected: FAIL — cannot resolve `./index`.

- [ ] **Step 3: Implement types, session, and index**

Create `src/deck-engine/types.ts`:

```ts
export type Grade = 'pass' | 'fail';

export interface Card {
  id: string;
  deckId: string;
  /** Opaque to the engine; the host renders it. */
  front: unknown;
  back: unknown;
}

export interface Review {
  cardId: string;
  deckId: string;
  grade: Grade;
  date: string; // YYYY-MM-DD, local timezone
  timeMs?: number;
}

export interface Deck {
  id: string;
  title: string;
  cards: Card[];
  sessionSize: number;
}
```

Create `src/deck-engine/session.ts`:

```ts
import type { Card, Deck, Review } from './types';

const RECENT_WINDOW = 5;

// `reviews` must be in chronological order (oldest first) — the recency
// window and tie-break read the tail of each card's history as most recent.
export function buildSession(deck: Deck, reviews: Review[]): Card[] {
  const byCard = new Map<string, Review[]>();
  for (const r of reviews) {
    if (r.deckId !== deck.id) continue;
    const list = byCard.get(r.cardId) ?? [];
    list.push(r);
    byCard.set(r.cardId, list);
  }

  const unseen = deck.cards.filter((c) => !byCard.has(c.id));
  const seen = deck.cards
    .filter((c) => byCard.has(c.id))
    .map((card) => {
      const history = byCard.get(card.id)!;
      const recent = history.slice(-RECENT_WINDOW);
      const passRate = recent.filter((r) => r.grade === 'pass').length / recent.length;
      return { card, passRate, lastDate: history[history.length - 1].date };
    })
    .sort((a, b) =>
      a.passRate === b.passRate ? a.lastDate.localeCompare(b.lastDate) : a.passRate - b.passRate,
    )
    .map((entry) => entry.card);

  return [...unseen, ...seen].slice(0, deck.sessionSize);
}
```

Create `src/deck-engine/index.ts`:

```ts
export type { Card, Deck, Grade, Review } from './types';
export { buildSession } from './session';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- src/deck-engine`
Expected: 8 tests PASS.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: all suites PASS (existing tests unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/deck-engine
git commit -m "feat: headless deck engine (types + weakest-first buildSession)"
```

---

### Task 2: Definition content fields on all 20 patterns

**Files:**
- Modify: `src/types.ts` (the `PatternInfo` interface, lines 90–96)
- Modify: `src/content/patterns.test.ts`
- Modify: `src/content/patterns.json` (all 20 entries)

**Interfaces:**
- Consumes: nothing new.
- Produces: `PatternInfo` gains `definition: string`, `whenToUse: string[]`, `complexity: string`. Every `patterns.json` entry has all three populated. Task 3 reads these fields.

- [ ] **Step 1: Extend `PatternInfo` in `src/types.ts`**

Replace the existing `PatternInfo` interface with:

```ts
export interface PatternInfo {
  pattern: PatternId;
  /** Original, language-neutral template — never book-transcribed. */
  pseudocode: string;
  /** 2-3 plain-English sentences: what the pattern is. Original wording. */
  definition: string;
  /** 2-4 short tells that signal the pattern. */
  whenToUse: string[];
  /** One line, typical time/space. */
  complexity: string;
  /** 1-3 entries; real chapter/section numbers only. */
  references: PatternReference[];
}
```

- [ ] **Step 2: Extend the failing content test**

In `src/content/patterns.test.ts`, add inside the `for (const p of patterns)` loop of the `'every entry matches the schema'` test:

```ts
expect(p.definition.trim().length, p.pattern).toBeGreaterThan(80);
expect(p.definition.trim().length, p.pattern).toBeLessThan(500);
expect(p.whenToUse.length, p.pattern).toBeGreaterThanOrEqual(2);
expect(p.whenToUse.length, p.pattern).toBeLessThanOrEqual(4);
for (const w of p.whenToUse) {
  expect(w.trim().length, p.pattern).toBeGreaterThan(10);
}
expect(p.complexity, p.pattern).toContain('O(');
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test -- src/content/patterns.test.ts`
Expected: FAIL — `definition` is undefined for every entry.

- [ ] **Step 4: Author the three fields for all 20 patterns in `patterns.json`**

Add `definition`, `whenToUse`, and `complexity` to every entry, placed after `pseudocode`. Rules: original wording; definition is 2–3 sentences of plain English (what it is and why it wins); `whenToUse` entries are the tells a word problem gives off; `complexity` states typical time/space with Big-O. Two complete exemplars to match in register and depth:

For `sliding-window`:

```json
"definition": "Maintains a contiguous run of elements over an array or string, growing one end and shrinking the other so each element enters and leaves at most once. It replaces re-scanning every candidate range with a single linear pass that updates the window's bookkeeping incrementally.",
"whenToUse": [
  "longest / shortest / best contiguous subarray or substring",
  "a constraint on the window's contents: sum, distinct count, character frequency",
  "fixed width k, or grow-then-shrink-until-valid phrasing"
],
"complexity": "O(n) time; O(1) to O(k) space for window bookkeeping"
```

For `union-find`:

```json
"definition": "A forest of parent pointers that tracks which items belong to the same group, merging two groups by linking their roots. With path compression and union by rank, membership checks and merges run in effectively constant time, so connectivity can be answered incrementally as pairs arrive.",
"whenToUse": [
  "are these two items in the same component / group / network?",
  "pairs or edges stream in and groups merge over time",
  "cycle detection in an undirected graph, or Kruskal-style MST building"
],
"complexity": "O(α(n)) amortized per operation; O(n) space"
```

Write the remaining 18 (`two-pointers`, `fast-slow-pointers`, `merge-intervals`, `cyclic-sort`, `linked-list-reversal`, `bfs`, `dfs`, `two-heaps`, `backtracking`, `modified-binary-search`, `top-k-heap`, `k-way-merge`, `knapsack-01`, `knapsack-unbounded`, `topological-sort`, `monotonic-stack`, `trie`, `greedy`) at the same depth. The schema test is the acceptance gate.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS, including the extended schema test for all 20 entries.

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/content/patterns.test.ts src/content/patterns.json
git commit -m "content: definition, when-to-use, and complexity fields for all 20 patterns"
```

---

### Task 3: Definitions deck builder

**Files:**
- Create: `src/lib/definitionsDeck.ts`
- Test: `src/lib/definitionsDeck.test.ts`

**Interfaces:**
- Consumes: `Card`, `Deck` from `'../deck-engine'`; `PatternInfo`, `PatternId` from `'../types'`; `patterns.json` (with Task 2 fields).
- Produces (used by Tasks 5–6):
  - `DEFINITIONS_DECK_ID = 'definitions'`
  - `interface DefinitionBack { definition: string; whenToUse: string[]; complexity: string }`
  - `buildDefinitionsDeck(): Deck` — card ids `def-<patternId>`, `front` = `PatternId`, `back` = `DefinitionBack`, `sessionSize` 10.
  - `cardPattern(cardId: string): PatternId` — inverse of the card-id scheme.

- [ ] **Step 1: Write the failing test**

Create `src/lib/definitionsDeck.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PATTERNS } from '../types';
import type { DefinitionBack } from './definitionsDeck';
import { buildDefinitionsDeck, cardPattern, DEFINITIONS_DECK_ID } from './definitionsDeck';

describe('buildDefinitionsDeck', () => {
  const deck = buildDefinitionsDeck();

  it('has one card per pattern with sessionSize 10', () => {
    expect(deck.id).toBe(DEFINITIONS_DECK_ID);
    expect(deck.cards).toHaveLength(PATTERNS.length);
    expect(deck.sessionSize).toBe(10);
  });

  it('round-trips pattern ids through card ids', () => {
    for (const card of deck.cards) {
      expect(PATTERNS).toContain(cardPattern(card.id));
      expect(card.deckId).toBe(DEFINITIONS_DECK_ID);
    }
    expect(new Set(deck.cards.map((c) => c.id)).size).toBe(PATTERNS.length);
  });

  it('carries definition content on every back', () => {
    for (const card of deck.cards) {
      const back = card.back as DefinitionBack;
      expect(back.definition.length).toBeGreaterThan(0);
      expect(back.whenToUse.length).toBeGreaterThan(0);
      expect(back.complexity.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/lib/definitionsDeck.test.ts`
Expected: FAIL — cannot resolve `./definitionsDeck`.

- [ ] **Step 3: Implement**

Create `src/lib/definitionsDeck.ts`:

```ts
import patternsData from '../content/patterns.json';
import type { Card, Deck } from '../deck-engine';
import type { PatternId, PatternInfo } from '../types';

export const DEFINITIONS_DECK_ID = 'definitions';
const CARD_PREFIX = 'def-';

export interface DefinitionBack {
  definition: string;
  whenToUse: string[];
  complexity: string;
}

const patterns = patternsData as unknown as PatternInfo[];

export function buildDefinitionsDeck(): Deck {
  const cards: Card[] = patterns.map((p) => ({
    id: `${CARD_PREFIX}${p.pattern}`,
    deckId: DEFINITIONS_DECK_ID,
    front: p.pattern,
    back: { definition: p.definition, whenToUse: p.whenToUse, complexity: p.complexity },
  }));
  return { id: DEFINITIONS_DECK_ID, title: 'Definitions', cards, sessionSize: 10 };
}

export function cardPattern(cardId: string): PatternId {
  return cardId.slice(CARD_PREFIX.length) as PatternId;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/definitionsDeck.ts src/lib/definitionsDeck.test.ts
git commit -m "feat: definitions deck derived from patterns.json"
```

---

### Task 4: AppState v2 with reviews + storage migration

**Files:**
- Modify: `src/types.ts` (the `AppState` interface)
- Modify: `src/lib/storage.ts`
- Modify: `src/App.tsx` (the `completeSession` state literal only)
- Test: `src/lib/storage.test.ts` (add cases)

**Interfaces:**
- Consumes: `Review` from `'../deck-engine'`.
- Produces (used by Tasks 5–6): `AppState` is now `{ version: 2; attempts: Attempt[]; sessionDates: string[]; reviews: Review[] }`. `loadState`/`importState` transparently migrate stored v1 shapes to v2. `freshState()` returns the v2 shape.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/storage.test.ts` (follow the file's existing fake-KV pattern for constructing a store):

```ts
it('migrates stored v1 state to v2 with empty reviews', () => {
  const v1 = {
    version: 1,
    attempts: [
      { problemId: 'bfs-01', pattern: 'bfs', correct: true, timeMs: 1200, date: '2026-07-01' },
    ],
    sessionDates: ['2026-07-01'],
  };
  const store = fakeStore({ [STORAGE_KEY]: JSON.stringify(v1) });
  const state = loadState(store);
  expect(state.version).toBe(2);
  expect(state.attempts).toEqual(v1.attempts);
  expect(state.sessionDates).toEqual(v1.sessionDates);
  expect(state.reviews).toEqual([]);
});

it('round-trips v2 state with reviews', () => {
  const store = fakeStore({});
  const state = freshState();
  state.reviews.push({ cardId: 'def-bfs', deckId: 'definitions', grade: 'pass', date: '2026-07-19' });
  saveState(state, store);
  expect(loadState(store)).toEqual(state);
});

it('imports a v1 backup and migrates it', () => {
  const v1 = { version: 1, attempts: [], sessionDates: ['2026-07-01'] };
  const state = importState(JSON.stringify(v1));
  expect(state.version).toBe(2);
  expect(state.reviews).toEqual([]);
});
```

(If the existing tests build stores differently — e.g. an inline object literal per test — match that instead of a `fakeStore` helper.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- src/lib/storage.test.ts`
Expected: new cases FAIL (v1 state currently loads as-is; `reviews` missing).

- [ ] **Step 3: Update `AppState` in `src/types.ts`**

```ts
import type { Review } from './deck-engine';

export interface AppState {
  version: 2;
  attempts: Attempt[];
  /** Dates with at least one completed session (streak source). */
  sessionDates: string[];
  /** Flashcard review history, chronological (oldest first). */
  reviews: Review[];
}
```

(Place the import at the top of `types.ts` with the existing imports; it is type-only, so the engine stays dependency-free in the other direction.)

- [ ] **Step 4: Update `src/lib/storage.ts`**

Rename the current validator to `isValidStateV1` (change its `version` check target type to a local `V1State` alias: `Omit<AppState, 'version' | 'reviews'> & { version: 1 }`), then add:

```ts
function isValidReview(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.cardId === 'string' &&
    typeof r.deckId === 'string' &&
    (r.grade === 'pass' || r.grade === 'fail') &&
    typeof r.date === 'string' &&
    (r.timeMs === undefined || typeof r.timeMs === 'number')
  );
}

function isValidState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 2) return false;
  if (!Array.isArray(v.reviews) || !v.reviews.every(isValidReview)) return false;
  return isValidStateV1({ ...v, version: 1 } as unknown);
}

function migrate(value: unknown): AppState | null {
  if (isValidState(value)) return value;
  if (isValidStateV1(value)) return { ...value, version: 2, reviews: [] };
  return null;
}
```

`freshState()` returns `{ version: 2, attempts: [], sessionDates: [], reviews: [] }`. In `loadState`, replace the `isValidState` check with `migrate`: a `null` result throws to the existing backup-and-fresh fallback. In `importState`, same: `migrate` result or throw `new Error('Invalid PatternDrill backup')`. `STORAGE_KEY` is unchanged.

- [ ] **Step 5: Fix the `completeSession` literal in `src/App.tsx`**

The object passed to `replaceState` currently hardcodes `version: 1` and omits reviews. Change to:

```ts
replaceState({
  version: 2,
  attempts: [ /* unchanged spread */ ],
  sessionDates: /* unchanged */,
  reviews: state.reviews,
});
```

- [ ] **Step 6: Run tests and build**

Run: `npm test` then `npm run build`
Expected: all PASS; typecheck clean (the compiler will catch any other v1 literals).

- [ ] **Step 7: Commit**

```bash
git add src/types.ts src/lib/storage.ts src/lib/storage.test.ts src/App.tsx
git commit -m "feat: AppState v2 with flashcard reviews and v1 migration"
```

---

### Task 5: FlashcardSession + FlashcardSummary components

**Files:**
- Create: `src/components/FlashcardSession.tsx`
- Create: `src/components/FlashcardSummary.tsx`
- Modify: `src/styles.css` (append flashcard styles)

**Interfaces:**
- Consumes: `Card`, `Grade`, `Review` from `'../deck-engine'`; `DefinitionBack`, `cardPattern` from `'../lib/definitionsDeck'`; `PATTERN_NAMES`, `PatternId` from `'../types'`.
- Produces (used by Task 6):
  - `FlashcardSession` props: `{ cards: Card[]; today: string; onComplete: (reviews: Review[]) => void }`
  - `FlashcardSummary` props: `{ reviews: Review[]; onDone: () => void }`

- [ ] **Step 1: Create `src/components/FlashcardSession.tsx`**

```tsx
import { useState } from 'react';
import type { Card, Grade, Review } from '../deck-engine';
import type { DefinitionBack } from '../lib/definitionsDeck';
import type { PatternId } from '../types';
import { PATTERN_NAMES } from '../types';

interface FlashcardSessionProps {
  cards: Card[];
  today: string;
  onComplete: (reviews: Review[]) => void;
}

export default function FlashcardSession({ cards, today, onComplete }: FlashcardSessionProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const card = cards[index];
  const back = card.back as DefinitionBack;

  function grade(g: Grade) {
    const next = [
      ...reviews,
      { cardId: card.id, deckId: card.deckId, grade: g, date: today, timeMs: Date.now() - startedAt },
    ];
    if (index + 1 >= cards.length) {
      onComplete(next);
      return;
    }
    setReviews(next);
    setIndex(index + 1);
    setFlipped(false);
    setStartedAt(Date.now());
  }

  return (
    <main className="screen flashcard">
      <header className="round-header">
        <span>
          {index + 1} / {cards.length}
        </span>
      </header>
      <h2>{PATTERN_NAMES[card.front as PatternId]}</h2>
      {flipped ? (
        <>
          <p className="definition">{back.definition}</p>
          <ul className="when-to-use">
            {back.whenToUse.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="complexity">{back.complexity}</p>
          <div className="grade-row">
            <button className="primary" onClick={() => grade('pass')}>
              Got it
            </button>
            <button onClick={() => grade('fail')}>Missed it</button>
          </div>
        </>
      ) : (
        <button className="primary" onClick={() => setFlipped(true)}>
          Reveal
        </button>
      )}
    </main>
  );
}
```

- [ ] **Step 2: Create `src/components/FlashcardSummary.tsx`**

```tsx
import type { Review } from '../deck-engine';
import { cardPattern } from '../lib/definitionsDeck';
import { PATTERN_NAMES } from '../types';

interface FlashcardSummaryProps {
  reviews: Review[];
  onDone: () => void;
}

export default function FlashcardSummary({ reviews, onDone }: FlashcardSummaryProps) {
  const passed = reviews.filter((r) => r.grade === 'pass').length;
  const missed = [
    ...new Set(reviews.filter((r) => r.grade === 'fail').map((r) => PATTERN_NAMES[cardPattern(r.cardId)])),
  ];

  return (
    <main className="screen summary">
      <h1>
        {passed} / {reviews.length}
      </h1>
      <ul className="result-list">
        {reviews.map((r, i) => (
          <li key={i} className={r.grade === 'pass' ? 'correct' : 'incorrect'}>
            {r.grade === 'pass' ? '✓' : '✗'} {PATTERN_NAMES[cardPattern(r.cardId)]}
          </li>
        ))}
      </ul>
      {missed.length > 0 && <p className="weakest">Review next: {missed.join(', ')}</p>}
      <button className="primary" onClick={onDone}>
        Done
      </button>
    </main>
  );
}
```

- [ ] **Step 3: Append flashcard styles to `src/styles.css`**

```css
.flashcard h2 {
  text-align: center;
  margin: 2rem 0 1rem;
}

.flashcard .definition {
  line-height: 1.5;
}

.when-to-use {
  padding-left: 1.25rem;
}

.when-to-use li {
  margin-bottom: 0.35rem;
}

.grade-row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.5rem;
}

.grade-row button {
  flex: 1;
}
```

(Existing `.screen`, `.round-header`, `.complexity`, `.result-list`, `.weakest`, and `button.primary` rules are reused as-is.)

- [ ] **Step 4: Typecheck**

Run: `npm run build`
Expected: PASS — components compile; nothing renders them yet (that's Task 6).

- [ ] **Step 5: Commit**

```bash
git add src/components/FlashcardSession.tsx src/components/FlashcardSummary.tsx src/styles.css
git commit -m "feat: flashcard session and summary components"
```

---

### Task 6: Wire flashcards into App and Home; verify end-to-end

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/components/Home.tsx`
- Modify: `README.md` (one line in the features/usage section)

**Interfaces:**
- Consumes: everything produced by Tasks 1–5.
- Produces: user-visible "Definitions" mode.

- [ ] **Step 1: Wire `src/App.tsx`**

Add imports:

```ts
import FlashcardSession from './components/FlashcardSession';
import FlashcardSummary from './components/FlashcardSummary';
import type { Card, Review } from './deck-engine';
import { buildSession as buildDeckSession } from './deck-engine';
import { buildDefinitionsDeck } from './lib/definitionsDeck';
```

Extend the `View` union:

```ts
| { kind: 'flashcards'; cards: Card[]; startedOn: string }
| { kind: 'flashcard-summary'; reviews: Review[] }
```

Add alongside `startSession`/`completeSession`:

```ts
function startFlashcards() {
  const today = todayStr();
  setView({
    kind: 'flashcards',
    cards: buildDeckSession(buildDefinitionsDeck(), state.reviews),
    startedOn: today,
  });
}

function completeFlashcards(newReviews: Review[], today: string) {
  replaceState({
    ...state,
    reviews: [...state.reviews, ...newReviews],
    sessionDates: state.sessionDates.includes(today)
      ? state.sessionDates
      : [...state.sessionDates, today],
  });
  setView({ kind: 'flashcard-summary', reviews: newReviews });
}
```

Add switch cases:

```tsx
case 'flashcards':
  return (
    <FlashcardSession
      cards={view.cards}
      today={view.startedOn}
      onComplete={(reviews) => completeFlashcards(reviews, view.startedOn)}
    />
  );
case 'flashcard-summary':
  return <FlashcardSummary reviews={view.reviews} onDone={() => setView({ kind: 'home' })} />;
```

Pass `onStartFlashcards={startFlashcards}` to `<Home … />`.

- [ ] **Step 2: Add the Home button**

In `src/components/Home.tsx`, add `onStartFlashcards: () => void` to `HomeProps` and destructure it. Below the primary drill button, above the Progress button:

```tsx
<button onClick={onStartFlashcards}>Definitions</button>
```

- [ ] **Step 3: Run tests and build**

Run: `npm test && npm run build`
Expected: all PASS.

- [ ] **Step 4: Manual verification (spec success criteria)**

Run: `npm run dev`, then in the browser:

1. Home shows the Definitions button; start it; 20-pattern deck serves 10 cards, front shows the pattern name, Reveal flips, Got it/Missed it advances.
2. Finish the session: summary shows pass count and missed patterns; streak on Home reflects today.
3. Reload mid-session: state intact (session progress is intentionally not persisted; stored history uncorrupted).
4. Start a second definitions session: previously missed cards come first (weakest-first working).
5. Run a normal drill session end to end: identical to before.
6. DevTools → Application → localStorage: single `pattern-drill-state-v1` key, `version: 2`, `reviews` populated.

- [ ] **Step 5: Update README**

Add one line to the feature list describing the Definitions flashcard mode (self-graded name → definition cards, weakest-first).

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/components/Home.tsx README.md
git commit -m "feat: wire definitions flashcard mode into app shell and home"
```

---

## Plan self-review notes

- Spec coverage: engine (T1), content (T2), deck derivation (T3), state v2 + migration + import (T4), UI (T5), wiring/streak/manual criteria (T6). Progress screen intentionally untouched (spec: out of scope).
- Type consistency: `buildSession(deck, reviews)` (engine) is aliased to `buildDeckSession` in `App.tsx` to avoid colliding with the scheduler's `buildSession` import.
- `types.ts` importing a type from `deck-engine` is one-directional and type-only; the engine imports nothing back.
