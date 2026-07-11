# PatternDrill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static web app that drills pattern recognition: read a short algorithm problem statement, name the pattern within 60 seconds, get explanatory feedback.

**Architecture:** Vite + React + TypeScript SPA with zero backend. Pure-function business logic (`scheduler`, `stats`, `storage`) lives in `src/lib/` with Vitest coverage; React components in `src/components/` contain no business logic. All content is a bundled `src/content/problems.json`; all user state is one localStorage key with export/import.

**Tech Stack:** Vite, React 19, TypeScript (strict), Vitest. No other runtime dependencies.

**Spec:** `docs/superpowers/specs/2026-07-10-pattern-drill-design.md`

## Global Constraints

- Runtime dependencies: `react`, `react-dom` ONLY. No UI framework, no router, no state library.
- All CSS hand-rolled in `src/styles.css`, mobile-first.
- localStorage key: `pattern-drill-state-v1`. Corrupt-state backups: `pattern-drill-backup-<timestamp>`.
- Tunables (exact values): session size **10**, round timer **60s**, staleness threshold **14 days**, recent-error window **last 10 attempts**, difficulty ramp **≥3 attempts and ≥80% accuracy** to unlock the next difficulty.
- Exactly **20 patterns** (canonical ids in Task 1), exactly **10 problems per pattern** (4 easy, 4 medium, 2 hard).
- Problem statements are **original paraphrases** — never copy LeetCode text. Statements must not contain the name of their own pattern.
- Dates are local-timezone `YYYY-MM-DD` strings everywhere.
- Vite `base: '/pattern-drill/'` (GitHub Pages project site).
- Every commit message follows conventional commits (`feat:`, `test:`, `content:`, `chore:`, `ci:`).

---

### Task 1: Project scaffold, types, pattern registry

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `.gitignore`
- Create: `src/main.tsx`, `src/App.tsx` (placeholder), `src/styles.css` (placeholder)
- Create: `src/types.ts`
- Test: `src/types.test.ts`

**Interfaces:**
- Produces: `PATTERNS: readonly PatternId[]` (20 ids), `PATTERN_NAMES: Record<PatternId, string>`, types `PatternId`, `Difficulty`, `Problem`, `Attempt`, `AppState`, `RoundResult`. Every later task imports from `src/types.ts`.

- [ ] **Step 1: Write scaffold files**

`.gitignore`:

```
node_modules
dist
```

`package.json`:

```json
{
  "name": "pattern-drill",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "~5.7.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0"
  }
}
```

`vite.config.ts`:

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/pattern-drill/',
});
```

`tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "types": ["vite/client"],
    "noEmit": true
  },
  "include": ["src"]
}
```

`index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PatternDrill</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`src/main.tsx`:

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`src/App.tsx` (placeholder — replaced in Task 13):

```tsx
export default function App() {
  return <h1>PatternDrill</h1>;
}
```

`src/styles.css` (placeholder — replaced in Task 13):

```css
body {
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 2: Write `src/types.ts`**

```ts
export type Difficulty = 'easy' | 'medium' | 'hard';

export const PATTERNS = [
  'two-pointers',
  'sliding-window',
  'fast-slow-pointers',
  'merge-intervals',
  'cyclic-sort',
  'linked-list-reversal',
  'bfs',
  'dfs',
  'two-heaps',
  'backtracking',
  'modified-binary-search',
  'top-k-heap',
  'k-way-merge',
  'knapsack-01',
  'knapsack-unbounded',
  'topological-sort',
  'monotonic-stack',
  'union-find',
  'trie',
  'greedy',
] as const;

export type PatternId = (typeof PATTERNS)[number];

export const PATTERN_NAMES: Record<PatternId, string> = {
  'two-pointers': 'Two Pointers',
  'sliding-window': 'Sliding Window',
  'fast-slow-pointers': 'Fast & Slow Pointers',
  'merge-intervals': 'Merge Intervals',
  'cyclic-sort': 'Cyclic Sort',
  'linked-list-reversal': 'In-place Linked List Reversal',
  bfs: 'Breadth-First Search',
  dfs: 'Depth-First Search',
  'two-heaps': 'Two Heaps',
  backtracking: 'Subsets / Backtracking',
  'modified-binary-search': 'Modified Binary Search',
  'top-k-heap': 'Top-K Elements (Heap)',
  'k-way-merge': 'K-way Merge',
  'knapsack-01': '0/1 Knapsack (DP)',
  'knapsack-unbounded': 'Unbounded Knapsack (DP)',
  'topological-sort': 'Topological Sort',
  'monotonic-stack': 'Monotonic Stack',
  'union-find': 'Union-Find',
  trie: 'Trie',
  greedy: 'Greedy',
};

export interface Problem {
  id: string;
  statement: string;
  pattern: PatternId;
  difficulty: Difficulty;
  /** Verbatim substring of `statement` that signals the pattern. */
  tell: string;
  /** Exactly 4 entries: distractor pattern -> one-line rebuttal. */
  whyNotOthers: Partial<Record<PatternId, string>>;
  complexity: string;
}

export interface Attempt {
  problemId: string;
  pattern: PatternId;
  correct: boolean;
  timeMs: number;
  date: string; // YYYY-MM-DD, local timezone
}

export interface AppState {
  version: 1;
  attempts: Attempt[];
  /** Dates with at least one completed session (streak source). */
  sessionDates: string[];
}

export interface RoundResult {
  problem: Problem;
  chosen: PatternId | null; // null = timer expired
  correct: boolean;
  timeMs: number;
}
```

- [ ] **Step 3: Write the failing test** — `src/types.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { PATTERNS, PATTERN_NAMES } from './types';

describe('pattern registry', () => {
  it('defines 20 patterns, each with a display name', () => {
    expect(PATTERNS).toHaveLength(20);
    expect(new Set(PATTERNS).size).toBe(20);
    for (const p of PATTERNS) {
      expect(PATTERN_NAMES[p].length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 4: Install and run**

Run: `cd /Users/thomasslater/projects/pattern-drill && npm install && npm test`
Expected: 1 test file, 1 test PASS. (The test was written against already-written types, so it passes immediately — the "fail" state here is `npm install` not yet run.)

- [ ] **Step 5: Verify the app builds**

Run: `npm run build`
Expected: `tsc` clean, Vite emits `dist/`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite/React/TS app with pattern registry"
```

---

### Task 2: Content schema test + content batch 1 (patterns 1–5)

**Files:**
- Create: `src/content/problems.json`
- Test: `src/content/content.test.ts`

**Interfaces:**
- Consumes: `Problem`, `PATTERNS`, `PATTERN_NAMES` from `src/types.ts`.
- Produces: `src/content/problems.json` — a JSON array of `Problem` objects. Tasks 3–5 append to it; Task 13 imports it.

**Content authoring rules (apply to every batch task):**
- 10 problems per pattern: 4 easy, 4 medium, 2 hard.
- `id` = `<pattern-id>-<NN>` (e.g. `sliding-window-01` … `sliding-window-10`).
- `statement`: 3–6 sentences, > 120 chars, plain prose, no code, an **original paraphrase** of a classic problem shape (model coverage on NeetCode 150 / Grokking-style problems, but write fresh text). Never name the technique in the statement.
- `tell`: verbatim substring of `statement` — the phrase a trained eye keys on.
- `whyNotOthers`: exactly 4 entries. Choose the 4 patterns a reasonable solver would actually confuse with this problem (vary them across the pattern's 10 problems). Each rebuttal is one concrete sentence (> 20 chars), not "this doesn't apply".
- `complexity`: the standard solution's cost, containing `O(`.

**Pattern tells for this batch:**
| Pattern | Typical tell |
|---|---|
| two-pointers | sorted input; find a pair/triplet meeting a target; converge from both ends |
| sliding-window | longest/shortest/max **contiguous** subarray or substring satisfying a constraint |
| fast-slow-pointers | detect a cycle; find the middle/entry point of a linked sequence |
| merge-intervals | overlapping ranges; free/busy scheduling; insert or merge spans |
| cyclic-sort | array of numbers in range 1..n; find missing/duplicate with O(1) extra space |

- [ ] **Step 1: Write the failing test** — `src/content/content.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Problem } from '../types';
import { PATTERNS, PATTERN_NAMES } from '../types';
import problemsData from './problems.json';

const problems = problemsData as unknown as Problem[];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

describe('problems.json', () => {
  it('has at least one problem', () => {
    expect(problems.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = problems.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every problem matches the schema', () => {
    for (const p of problems) {
      expect(PATTERNS, p.id).toContain(p.pattern);
      expect(DIFFICULTIES, p.id).toContain(p.difficulty);
      expect(p.statement.length, p.id).toBeGreaterThan(120);
      expect(p.statement, p.id).toContain(p.tell);
      expect(
        p.statement.toLowerCase(),
        `${p.id}: statement leaks its own pattern name`,
      ).not.toContain(PATTERN_NAMES[p.pattern].toLowerCase());
      const distractors = Object.keys(p.whyNotOthers);
      expect(distractors, p.id).toHaveLength(4);
      for (const d of distractors) {
        expect(PATTERNS, p.id).toContain(d);
        expect(d, p.id).not.toBe(p.pattern);
        expect((p.whyNotOthers as Record<string, string>)[d].length, p.id).toBeGreaterThan(20);
      }
      expect(p.complexity, p.id).toContain('O(');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — cannot resolve `./problems.json` (file does not exist).

- [ ] **Step 3: Author `src/content/problems.json`** — a JSON array with 50 problems (10 each for `two-pointers`, `sliding-window`, `fast-slow-pointers`, `merge-intervals`, `cyclic-sort`), following the authoring rules above. First entry, verbatim, as the style anchor:

```json
[
  {
    "id": "sliding-window-01",
    "statement": "You are given an array of positive integers and a number k. Find the maximum sum of any contiguous run of exactly k elements. The array can be very large, so recomputing each candidate sum from scratch will be too slow.",
    "pattern": "sliding-window",
    "difficulty": "easy",
    "tell": "maximum sum of any contiguous run of exactly k elements",
    "whyNotOthers": {
      "two-pointers": "Nothing is sorted and no pair is sought; a fixed-width range slides over the array instead of two ends converging.",
      "top-k-heap": "k is the width of the run, not a count of largest elements to rank with a heap.",
      "knapsack-01": "There is no take-or-skip choice per element; the chosen elements must be contiguous.",
      "greedy": "No local exchange argument exists; the answer comes from mechanically scanning every window."
    },
    "complexity": "O(n) time / O(1) space"
  }
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — all content tests green with 50 problems.

- [ ] **Step 5: Commit**

```bash
git add src/content
git commit -m "content: add schema test and batch 1 (arrays & intervals patterns)"
```

---

### Task 3: Content batch 2 (patterns 6–10)

**Files:**
- Modify: `src/content/problems.json` (append 50 entries)

**Interfaces:**
- Consumes: the authoring rules and schema test from Task 2 (rules repeated below).

**Content authoring rules:** identical to Task 2 — 10 per pattern (4 easy / 4 medium / 2 hard), ids `<pattern-id>-<NN>`, original 3–6 sentence statements > 120 chars that never name their own technique, `tell` a verbatim substring, exactly 4 confusable-pattern rebuttals > 20 chars each, `complexity` containing `O(`.

**Pattern tells for this batch:**
| Pattern | Typical tell |
|---|---|
| linked-list-reversal | reverse a linked list or a sublist of it in place, O(1) extra space |
| bfs | minimum moves/steps in an unweighted graph or grid; level-by-level processing |
| dfs | explore all regions/paths; count islands; exhaust a tree or graph by recursion |
| two-heaps | running median; balance two halves of a stream |
| backtracking | enumerate all subsets/permutations/combinations; build candidates and undo |

Style anchor for this batch (append entries in the same shape):

```json
{
  "id": "bfs-01",
  "statement": "You are given a grid of open cells and walls, a starting cell, and an exit cell. Each move goes one cell up, down, left, or right through open cells. Return the minimum number of moves needed to reach the exit, or -1 if it cannot be reached.",
  "pattern": "bfs",
  "difficulty": "easy",
  "tell": "minimum number of moves needed to reach the exit",
  "whyNotOthers": {
    "dfs": "Depth-first exploration finds a path but not necessarily the shortest one in an unweighted grid.",
    "backtracking": "One optimal distance is needed, not an enumeration of every possible route.",
    "greedy": "Always stepping toward the exit can walk into dead ends; no local choice is provably safe.",
    "union-find": "Connectivity answers whether the exit is reachable, not in how few moves."
  },
  "complexity": "O(rows × cols) time / O(rows × cols) space"
}
```

- [ ] **Step 1: Append 50 problems** for `linked-list-reversal`, `bfs`, `dfs`, `two-heaps`, `backtracking` to `src/content/problems.json`.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS — schema tests green with 100 problems.

- [ ] **Step 3: Commit**

```bash
git add src/content/problems.json
git commit -m "content: add batch 2 (lists, graphs, heaps, backtracking)"
```

---

### Task 4: Content batch 3 (patterns 11–15)

**Files:**
- Modify: `src/content/problems.json` (append 50 entries)

**Interfaces:**
- Consumes: the authoring rules and schema test from Task 2 (rules repeated below).

**Content authoring rules:** identical to Task 2 — 10 per pattern (4 easy / 4 medium / 2 hard), ids `<pattern-id>-<NN>`, original 3–6 sentence statements > 120 chars that never name their own technique, `tell` a verbatim substring, exactly 4 confusable-pattern rebuttals > 20 chars each, `complexity` containing `O(`.

**Pattern tells for this batch:**
| Pattern | Typical tell |
|---|---|
| modified-binary-search | sorted or rotated-sorted input; find a boundary/first-true index in sub-linear time |
| top-k-heap | k largest/smallest/most frequent elements; stream where only the best k matter |
| k-way-merge | combine k already-sorted lists/streams into one ordered result |
| knapsack-01 | items each usable once, a capacity limit, maximize/count value |
| knapsack-unbounded | unlimited copies of each item; coin change; rod cutting |

Style anchor for this batch:

```json
{
  "id": "modified-binary-search-01",
  "statement": "A sorted array of distinct integers was rotated at an unknown pivot, so it consists of two sorted halves joined together. Given a target value, return its index in better than linear time, or -1 if the target is absent.",
  "pattern": "modified-binary-search",
  "difficulty": "medium",
  "tell": "rotated at an unknown pivot",
  "whyNotOthers": {
    "two-pointers": "No pair or triplet is sought; a single target is located by repeatedly halving an ordered search space.",
    "sliding-window": "There is no contiguous-range property to optimize; the array is probed, not scanned.",
    "k-way-merge": "There is one array, not several sorted sources to combine.",
    "trie": "The data is numeric and ordered; no prefix structure over strings is involved."
  },
  "complexity": "O(log n) time / O(1) space"
}
```

- [ ] **Step 1: Append 50 problems** for `modified-binary-search`, `top-k-heap`, `k-way-merge`, `knapsack-01`, `knapsack-unbounded` to `src/content/problems.json`.

- [ ] **Step 2: Run tests**

Run: `npm test`
Expected: PASS — schema tests green with 150 problems.

- [ ] **Step 3: Commit**

```bash
git add src/content/problems.json
git commit -m "content: add batch 3 (search, heaps, knapsack DP)"
```

---

### Task 5: Content batch 4 (patterns 16–20) + full-coverage test

**Files:**
- Modify: `src/content/problems.json` (append 50 entries)
- Modify: `src/content/content.test.ts` (add coverage test)

**Interfaces:**
- Consumes: the authoring rules and schema test from Task 2 (rules repeated below).
- Produces: the complete 200-problem content set that Task 13 ships.

**Content authoring rules:** identical to Task 2 — 10 per pattern (4 easy / 4 medium / 2 hard), ids `<pattern-id>-<NN>`, original 3–6 sentence statements > 120 chars that never name their own technique, `tell` a verbatim substring, exactly 4 confusable-pattern rebuttals > 20 chars each, `complexity` containing `O(`.

**Pattern tells for this batch:**
| Pattern | Typical tell |
|---|---|
| topological-sort | tasks with prerequisites; find a valid order or detect an impossible ordering |
| monotonic-stack | next greater/smaller element; spans; largest rectangle under constraints |
| union-find | dynamic connectivity; merging groups/accounts; redundant connection |
| trie | word dictionary; prefix search/autocomplete; many string lookups sharing prefixes |
| greedy | interval scheduling; provably safe local choice; maximize count of non-overlapping picks |

Style anchor for this batch:

```json
{
  "id": "monotonic-stack-01",
  "statement": "You are given the recorded temperature for each day of a season. For every day, determine how many days you would have to wait until a strictly warmer day arrives, or 0 if no warmer day ever comes. Comparing every pair of days is too slow for the input size.",
  "pattern": "monotonic-stack",
  "difficulty": "easy",
  "tell": "how many days you would have to wait until a strictly warmer day",
  "whyNotOthers": {
    "sliding-window": "No contiguous range is optimized; each day waits on an unboundedly distant future event.",
    "two-pointers": "The answer depends on the next greater element ahead of each position, not a converging index pair.",
    "top-k-heap": "No ranking of the k warmest days is requested.",
    "modified-binary-search": "The temperatures are unsorted, so there is no ordered search space to halve."
  },
  "complexity": "O(n) time / O(n) space"
}
```

- [ ] **Step 1: Write the failing coverage test** — append to the `describe` block in `src/content/content.test.ts`:

```ts
  it('has exactly 10 problems per pattern (4 easy, 4 medium, 2 hard)', () => {
    for (const pattern of PATTERNS) {
      const ofPattern = problems.filter((p) => p.pattern === pattern);
      expect(ofPattern, pattern).toHaveLength(10);
      expect(ofPattern.filter((p) => p.difficulty === 'easy'), pattern).toHaveLength(4);
      expect(ofPattern.filter((p) => p.difficulty === 'medium'), pattern).toHaveLength(4);
      expect(ofPattern.filter((p) => p.difficulty === 'hard'), pattern).toHaveLength(2);
    }
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `topological-sort` (etc.) have 0 problems.

- [ ] **Step 3: Append 50 problems** for `topological-sort`, `monotonic-stack`, `union-find`, `trie`, `greedy`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS — 200 problems, coverage test green. (If earlier batches missed the 4/4/2 split, fix them now.)

- [ ] **Step 5: Commit**

```bash
git add src/content
git commit -m "content: add batch 4 and enforce full 20x10 coverage"
```

---

### Task 6: Scheduler — pattern scoring and session pattern selection

**Files:**
- Create: `src/lib/scheduler.ts`
- Test: `src/lib/scheduler.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `PatternId`, `PATTERNS` from `src/types.ts`.
- Produces:
  - `SESSION_SIZE = 10`
  - `patternScore(attempts: Attempt[], pattern: PatternId, today: string, rand: () => number): number`
  - `selectSessionPatterns(attempts: Attempt[], today: string, rand?: () => number): PatternId[]`
  - `daysBetween(earlier: string, later: string): number`

**Scoring tiers (exact):** never-seen → `4 + jitter`; last seen ≥ 14 days ago → `2 + errorRate + jitter`; otherwise → `errorRate + daysSince/14 + jitter`, where `errorRate` = fraction wrong of the pattern's **last 10** attempts and `jitter = rand() * 0.01`. Tiers cannot overlap (fresh < 2 ≤ stale < 4 ≤ never-seen).

- [ ] **Step 1: Write the failing tests** — `src/lib/scheduler.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Attempt } from '../types';
import { PATTERNS } from '../types';
import { patternScore, selectSessionPatterns } from './scheduler';

const rand = () => 0;

function attempt(overrides: Partial<Attempt>): Attempt {
  return {
    problemId: 'p1',
    pattern: 'bfs',
    correct: true,
    timeMs: 10_000,
    date: '2026-07-01',
    ...overrides,
  };
}

describe('patternScore', () => {
  it('gives never-seen patterns the top tier (>= 4)', () => {
    expect(patternScore([], 'bfs', '2026-07-10', rand)).toBeGreaterThanOrEqual(4);
  });

  it('gives stale patterns (14+ days unseen) the middle tier [2, 4)', () => {
    const attempts = [attempt({ date: '2026-06-01' })];
    const score = patternScore(attempts, 'bfs', '2026-07-10', rand);
    expect(score).toBeGreaterThanOrEqual(2);
    expect(score).toBeLessThan(4);
  });

  it('scores fresh patterns below 2, higher when error rate is higher', () => {
    const good = [attempt({ correct: true, date: '2026-07-09' })];
    const bad = [attempt({ correct: false, date: '2026-07-09' })];
    expect(patternScore(good, 'bfs', '2026-07-10', rand)).toBeLessThan(2);
    expect(patternScore(bad, 'bfs', '2026-07-10', rand)).toBeLessThan(2);
    expect(patternScore(bad, 'bfs', '2026-07-10', rand)).toBeGreaterThan(
      patternScore(good, 'bfs', '2026-07-10', rand),
    );
  });

  it('counts only the last 10 attempts toward error rate', () => {
    const attempts = [
      ...Array.from({ length: 10 }, () => attempt({ correct: false, date: '2026-07-09' })),
      ...Array.from({ length: 10 }, () => attempt({ correct: true, date: '2026-07-09' })),
    ];
    expect(patternScore(attempts, 'bfs', '2026-07-10', rand)).toBeLessThan(1);
  });
});

describe('selectSessionPatterns', () => {
  it('returns 10 distinct patterns', () => {
    const patterns = selectSessionPatterns([], '2026-07-10', rand);
    expect(patterns).toHaveLength(10);
    expect(new Set(patterns).size).toBe(10);
  });

  it('puts the weakest pattern first when all are equally fresh', () => {
    const attempts: Attempt[] = PATTERNS.map((p) =>
      attempt({ pattern: p, correct: p !== 'bfs', date: '2026-07-09' }),
    );
    expect(selectSessionPatterns(attempts, '2026-07-10', rand)[0]).toBe('bfs');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- scheduler`
Expected: FAIL — `./scheduler` does not exist.

- [ ] **Step 3: Implement** — `src/lib/scheduler.ts`:

```ts
import type { Attempt, PatternId } from '../types';
import { PATTERNS } from '../types';

export const SESSION_SIZE = 10;
const RECENT_WINDOW = 10;
const STALE_DAYS = 14;

export function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);
}

export function patternScore(
  attempts: Attempt[],
  pattern: PatternId,
  today: string,
  rand: () => number,
): number {
  const past = attempts.filter((a) => a.pattern === pattern);
  const jitter = rand() * 0.01;
  if (past.length === 0) return 4 + jitter;
  const recent = past.slice(-RECENT_WINDOW);
  const errorRate = recent.filter((a) => !a.correct).length / recent.length;
  const daysSince = daysBetween(past[past.length - 1].date, today);
  if (daysSince >= STALE_DAYS) return 2 + errorRate + jitter;
  return errorRate + daysSince / STALE_DAYS + jitter;
}

export function selectSessionPatterns(
  attempts: Attempt[],
  today: string,
  rand: () => number = Math.random,
): PatternId[] {
  return [...PATTERNS]
    .map((pattern) => ({ pattern, score: patternScore(attempts, pattern, today, rand) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SESSION_SIZE)
    .map((entry) => entry.pattern);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: weakness-weighted pattern scoring and session selection"
```

---

### Task 7: Scheduler — difficulty ramp, problem selection, session build, answer options

**Files:**
- Modify: `src/lib/scheduler.ts`
- Modify: `src/lib/scheduler.test.ts`

**Interfaces:**
- Consumes: Task 6 exports; `Problem`, `Difficulty` from `src/types.ts`.
- Produces:
  - `eligibleDifficulties(attempts: Attempt[], pattern: PatternId, problems: Problem[]): Difficulty[]`
  - `selectProblem(attempts: Attempt[], pattern: PatternId, problems: Problem[]): Problem`
  - `buildSession(attempts: Attempt[], problems: Problem[], today: string, rand?: () => number): Problem[]`
  - `answerOptions(problem: Problem, rand?: () => number): PatternId[]` — correct pattern + 4 distractors, shuffled.

- [ ] **Step 1: Write the failing tests** — append to `src/lib/scheduler.test.ts` (also add `Problem` to the type import and the new functions to the scheduler import):

```ts
function problem(overrides: Partial<Problem>): Problem {
  return {
    id: 'p1',
    statement: 'statement text',
    pattern: 'bfs',
    difficulty: 'easy',
    tell: 'statement text',
    whyNotOthers: { dfs: 'a', 'two-pointers': 'b', greedy: 'c', trie: 'd' },
    complexity: 'O(n)',
    ...overrides,
  };
}

describe('eligibleDifficulties', () => {
  const problems = [
    problem({ id: 'e1', difficulty: 'easy' }),
    problem({ id: 'm1', difficulty: 'medium' }),
    problem({ id: 'h1', difficulty: 'hard' }),
  ];

  it('starts with easy only', () => {
    expect(eligibleDifficulties([], 'bfs', problems)).toEqual(['easy']);
  });

  it('unlocks medium after 3+ easy attempts at 80%+ accuracy', () => {
    const attempts = Array.from({ length: 5 }, () => attempt({ problemId: 'e1' }));
    expect(eligibleDifficulties(attempts, 'bfs', problems)).toEqual(['easy', 'medium']);
  });

  it('unlocks hard once medium also reaches 80% over 3+ attempts', () => {
    const attempts = [
      ...Array.from({ length: 5 }, () => attempt({ problemId: 'e1' })),
      ...Array.from({ length: 5 }, () => attempt({ problemId: 'm1' })),
    ];
    expect(eligibleDifficulties(attempts, 'bfs', problems)).toEqual(['easy', 'medium', 'hard']);
  });
});

describe('selectProblem', () => {
  it('picks never-seen problems before previously seen ones', () => {
    const problems = [
      problem({ id: 'a', difficulty: 'easy' }),
      problem({ id: 'b', difficulty: 'easy' }),
    ];
    const attempts = [attempt({ problemId: 'a', date: '2026-07-09' })];
    expect(selectProblem(attempts, 'bfs', problems).id).toBe('b');
  });

  it('picks the least-recently-seen problem when all have been seen', () => {
    const problems = [
      problem({ id: 'a', difficulty: 'easy' }),
      problem({ id: 'b', difficulty: 'easy' }),
    ];
    const attempts = [
      attempt({ problemId: 'a', date: '2026-07-01' }),
      attempt({ problemId: 'b', date: '2026-07-09' }),
    ];
    expect(selectProblem(attempts, 'bfs', problems).id).toBe('a');
  });

  it('falls back to any difficulty when the ramp excludes every problem', () => {
    const problems = [problem({ id: 'h1', difficulty: 'hard' })];
    expect(selectProblem([], 'bfs', problems).id).toBe('h1');
  });
});

describe('answerOptions', () => {
  it('returns the correct pattern plus its 4 distractors', () => {
    const options = answerOptions(problem({}), () => 0.99);
    expect(options).toHaveLength(5);
    expect(new Set(options)).toEqual(new Set(['bfs', 'dfs', 'two-pointers', 'greedy', 'trie']));
  });
});

describe('buildSession', () => {
  it('returns 10 problems from 10 different patterns', () => {
    const problems = PATTERNS.map((p, i) => problem({ id: `p${i}`, pattern: p }));
    const session = buildSession([], problems, '2026-07-10', rand);
    expect(session).toHaveLength(10);
    expect(new Set(session.map((p) => p.pattern)).size).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- scheduler`
Expected: FAIL — new functions not exported.

- [ ] **Step 3: Implement** — append to `src/lib/scheduler.ts` (extend the type import with `Difficulty, Problem`):

```ts
const RAMP_MIN_ATTEMPTS = 3;
const RAMP_ACCURACY = 0.8;

export function eligibleDifficulties(
  attempts: Attempt[],
  pattern: PatternId,
  problems: Problem[],
): Difficulty[] {
  const difficultyById = new Map(problems.map((p) => [p.id, p.difficulty]));
  const accuracy = (difficulty: Difficulty): number => {
    const relevant = attempts.filter(
      (a) => a.pattern === pattern && difficultyById.get(a.problemId) === difficulty,
    );
    if (relevant.length < RAMP_MIN_ATTEMPTS) return 0;
    return relevant.filter((a) => a.correct).length / relevant.length;
  };
  if (accuracy('easy') < RAMP_ACCURACY) return ['easy'];
  if (accuracy('medium') < RAMP_ACCURACY) return ['easy', 'medium'];
  return ['easy', 'medium', 'hard'];
}

export function selectProblem(
  attempts: Attempt[],
  pattern: PatternId,
  problems: Problem[],
): Problem {
  const lastSeen = new Map<string, string>();
  for (const a of attempts) lastSeen.set(a.problemId, a.date);
  const eligible = eligibleDifficulties(attempts, pattern, problems);
  let pool = problems.filter((p) => p.pattern === pattern && eligible.includes(p.difficulty));
  if (pool.length === 0) pool = problems.filter((p) => p.pattern === pattern);
  return [...pool].sort((a, b) => {
    const seenA = lastSeen.get(a.id) ?? '';
    const seenB = lastSeen.get(b.id) ?? '';
    return seenA === seenB ? a.id.localeCompare(b.id) : seenA.localeCompare(seenB);
  })[0];
}

export function buildSession(
  attempts: Attempt[],
  problems: Problem[],
  today: string,
  rand: () => number = Math.random,
): Problem[] {
  return selectSessionPatterns(attempts, today, rand).map((pattern) =>
    selectProblem(attempts, pattern, problems),
  );
}

export function answerOptions(problem: Problem, rand: () => number = Math.random): PatternId[] {
  const options = [problem.pattern, ...(Object.keys(problem.whyNotOthers) as PatternId[])];
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  return options;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: difficulty ramp, LRS problem selection, session build, answer shuffle"
```

---

### Task 8: Stats — mastery, streak, date helpers

**Files:**
- Create: `src/lib/stats.ts`
- Test: `src/lib/stats.test.ts`

**Interfaces:**
- Consumes: `Attempt`, `PatternId` from `src/types.ts`.
- Produces:
  - `type Mastery = 'learning' | 'solid' | 'mastered'`
  - `patternMastery(attempts: Attempt[], pattern: PatternId): Mastery`
  - `currentStreak(sessionDates: string[], today: string): number`
  - `todayStr(): string` — local date as `YYYY-MM-DD`
  - `addDays(date: string, delta: number): string`

**Thresholds (exact):** mastered = ≥10 attempts AND ≥90% accuracy AND average time ≤ 30s; solid = ≥5 attempts AND ≥70% accuracy; else learning. Streak counts consecutive session days ending today, or ending yesterday if today's session isn't done yet.

- [ ] **Step 1: Write the failing tests** — `src/lib/stats.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { Attempt } from '../types';
import { addDays, currentStreak, patternMastery } from './stats';

function attempt(overrides: Partial<Attempt>): Attempt {
  return {
    problemId: 'p1',
    pattern: 'bfs',
    correct: true,
    timeMs: 10_000,
    date: '2026-07-01',
    ...overrides,
  };
}

describe('addDays', () => {
  it('crosses month boundaries in both directions', () => {
    expect(addDays('2026-07-01', -1)).toBe('2026-06-30');
    expect(addDays('2026-06-30', 1)).toBe('2026-07-01');
  });
});

describe('currentStreak', () => {
  it('is 0 with no sessions', () => {
    expect(currentStreak([], '2026-07-10')).toBe(0);
  });

  it('counts consecutive days ending today', () => {
    expect(currentStreak(['2026-07-08', '2026-07-09', '2026-07-10'], '2026-07-10')).toBe(3);
  });

  it('keeps the streak alive when today is not done yet but yesterday is', () => {
    expect(currentStreak(['2026-07-08', '2026-07-09'], '2026-07-10')).toBe(2);
  });

  it('breaks on a gap', () => {
    expect(currentStreak(['2026-07-07', '2026-07-10'], '2026-07-10')).toBe(1);
  });
});

describe('patternMastery', () => {
  it('is learning with no attempts', () => {
    expect(patternMastery([], 'bfs')).toBe('learning');
  });

  it('is solid at 5+ attempts and 70%+ accuracy', () => {
    expect(patternMastery(Array.from({ length: 5 }, () => attempt({})), 'bfs')).toBe('solid');
  });

  it('is mastered at 10+ attempts, 90%+ accuracy, and average under 30s', () => {
    const attempts = Array.from({ length: 10 }, () => attempt({ timeMs: 20_000 }));
    expect(patternMastery(attempts, 'bfs')).toBe('mastered');
  });

  it('stays solid when accuracy is high but average time is too slow', () => {
    const attempts = Array.from({ length: 10 }, () => attempt({ timeMs: 45_000 }));
    expect(patternMastery(attempts, 'bfs')).toBe('solid');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- stats`
Expected: FAIL — `./stats` does not exist.

- [ ] **Step 3: Implement** — `src/lib/stats.ts`:

```ts
import type { Attempt, PatternId } from '../types';

export type Mastery = 'learning' | 'solid' | 'mastered';

const MASTERED_ATTEMPTS = 10;
const MASTERED_ACCURACY = 0.9;
const MASTERED_AVG_MS = 30_000;
const SOLID_ATTEMPTS = 5;
const SOLID_ACCURACY = 0.7;

export function todayStr(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function addDays(date: string, delta: number): string {
  const d = new Date(date + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function patternMastery(attempts: Attempt[], pattern: PatternId): Mastery {
  const past = attempts.filter((a) => a.pattern === pattern);
  if (past.length === 0) return 'learning';
  const accuracy = past.filter((a) => a.correct).length / past.length;
  const avgMs = past.reduce((sum, a) => sum + a.timeMs, 0) / past.length;
  if (past.length >= MASTERED_ATTEMPTS && accuracy >= MASTERED_ACCURACY && avgMs <= MASTERED_AVG_MS) {
    return 'mastered';
  }
  if (past.length >= SOLID_ATTEMPTS && accuracy >= SOLID_ACCURACY) return 'solid';
  return 'learning';
}

export function currentStreak(sessionDates: string[], today: string): number {
  const days = new Set(sessionDates);
  let cursor = days.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: mastery levels, streak computation, date helpers"
```

---

### Task 9: Storage — load/save, corrupt-state backup, export/import

**Files:**
- Create: `src/lib/storage.ts`
- Test: `src/lib/storage.test.ts`

**Interfaces:**
- Consumes: `AppState`, `PATTERNS` from `src/types.ts`.
- Produces:
  - `STORAGE_KEY = 'pattern-drill-state-v1'`
  - `interface KV { getItem(key: string): string | null; setItem(key: string, value: string): void }`
  - `freshState(): AppState`
  - `loadState(store?: KV): AppState` — corrupt data is copied to a `pattern-drill-backup-<timestamp>` key, then fresh state returned
  - `saveState(state: AppState, store?: KV): void`
  - `exportState(state: AppState): string`
  - `importState(json: string): AppState` — throws on invalid input (caller decides UX)

- [ ] **Step 1: Write the failing tests** — `src/lib/storage.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { KV } from './storage';
import {
  exportState,
  freshState,
  importState,
  loadState,
  saveState,
  STORAGE_KEY,
} from './storage';

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const store: KV & { keys(): string[] } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    keys: () => [...map.keys()],
  };
  return store;
}

describe('loadState', () => {
  it('returns fresh state when nothing is stored', () => {
    expect(loadState(fakeStore())).toEqual(freshState());
  });

  it('round-trips through saveState', () => {
    const store = fakeStore();
    const state = {
      ...freshState(),
      attempts: [
        { problemId: 'p1', pattern: 'bfs' as const, correct: true, timeMs: 5000, date: '2026-07-10' },
      ],
      sessionDates: ['2026-07-10'],
    };
    saveState(state, store);
    expect(loadState(store)).toEqual(state);
  });

  it('backs up corrupt JSON and starts fresh instead of crashing', () => {
    const store = fakeStore({ [STORAGE_KEY]: '{not json' });
    expect(loadState(store)).toEqual(freshState());
    expect(store.keys().some((k) => k.startsWith('pattern-drill-backup-'))).toBe(true);
  });

  it('backs up structurally invalid state and starts fresh', () => {
    const store = fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 99 }) });
    expect(loadState(store)).toEqual(freshState());
    expect(store.keys().some((k) => k.startsWith('pattern-drill-backup-'))).toBe(true);
  });
});

describe('importState', () => {
  it('accepts a valid export', () => {
    expect(importState(exportState(freshState()))).toEqual(freshState());
  });

  it('throws on invalid JSON', () => {
    expect(() => importState('nope')).toThrow();
  });

  it('throws on valid JSON with the wrong shape', () => {
    expect(() => importState('{"version":2}')).toThrow();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- storage`
Expected: FAIL — `./storage` does not exist.

- [ ] **Step 3: Implement** — `src/lib/storage.ts`:

```ts
import type { AppState } from '../types';
import { PATTERNS } from '../types';

export const STORAGE_KEY = 'pattern-drill-state-v1';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function freshState(): AppState {
  return { version: 1, attempts: [], sessionDates: [] };
}

function isValidState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 1) return false;
  if (!Array.isArray(v.attempts) || !Array.isArray(v.sessionDates)) return false;
  const patterns = new Set<string>(PATTERNS);
  const attemptsOk = v.attempts.every((a: unknown) => {
    if (typeof a !== 'object' || a === null) return false;
    const r = a as Record<string, unknown>;
    return (
      typeof r.problemId === 'string' &&
      typeof r.pattern === 'string' &&
      patterns.has(r.pattern) &&
      typeof r.correct === 'boolean' &&
      typeof r.timeMs === 'number' &&
      typeof r.date === 'string'
    );
  });
  return attemptsOk && v.sessionDates.every((d: unknown) => typeof d === 'string');
}

export function loadState(store: KV = localStorage): AppState {
  const raw = store.getItem(STORAGE_KEY);
  if (raw === null) return freshState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) throw new Error('invalid state shape');
    return parsed;
  } catch {
    store.setItem(`pattern-drill-backup-${Date.now()}`, raw);
    return freshState();
  }
}

export function saveState(state: AppState, store: KV = localStorage): void {
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed: unknown = JSON.parse(json);
  if (!isValidState(parsed)) throw new Error('Invalid PatternDrill backup');
  return parsed;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib
git commit -m "feat: localStorage persistence with corrupt-state backup and export/import"
```

---

### Task 10: Session component (question round, timer, feedback screen)

**Files:**
- Create: `src/components/Session.tsx`

**Interfaces:**
- Consumes: `answerOptions` from `src/lib/scheduler.ts`; `Problem`, `PatternId`, `PATTERN_NAMES`, `RoundResult` from `src/types.ts`.
- Produces: `default export Session({ problems, onComplete }: { problems: Problem[]; onComplete: (results: RoundResult[]) => void })`. Task 13 renders it.

Behavior: 60s countdown per question; expiry records `chosen: null`, `correct: false`, `timeMs: 60000`. Feedback screen shows verdict, correct pattern name, statement with the tell wrapped in `<mark>`, the four `whyNotOthers` rebuttals, and complexity. Last feedback's button reads "Finish session" and calls `onComplete`.

- [ ] **Step 1: Implement** — `src/components/Session.tsx`:

```tsx
import { useEffect, useMemo, useState } from 'react';
import { answerOptions } from '../lib/scheduler';
import type { PatternId, Problem, RoundResult } from '../types';
import { PATTERN_NAMES } from '../types';

const ROUND_SECONDS = 60;

interface SessionProps {
  problems: Problem[];
  onComplete: (results: RoundResult[]) => void;
}

function highlightTell(statement: string, tell: string) {
  const i = statement.indexOf(tell);
  if (i === -1) return <>{statement}</>;
  return (
    <>
      {statement.slice(0, i)}
      <mark>{tell}</mark>
      {statement.slice(i + tell.length)}
    </>
  );
}

export default function Session({ problems, onComplete }: SessionProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [phase, setPhase] = useState<'question' | 'feedback'>('question');
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const problem = problems[index];
  const options = useMemo(() => answerOptions(problem), [problem]);
  const lastResult = results[results.length - 1];

  useEffect(() => {
    if (phase !== 'question') return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, index]);

  useEffect(() => {
    if (phase === 'question' && secondsLeft <= 0) answer(null);
  });

  function answer(chosen: PatternId | null) {
    const timeMs = chosen === null ? ROUND_SECONDS * 1000 : Date.now() - startedAt;
    setResults((prev) => [
      ...prev,
      { problem, chosen, correct: chosen === problem.pattern, timeMs },
    ]);
    setPhase('feedback');
  }

  function next() {
    if (index + 1 >= problems.length) {
      onComplete(results);
      return;
    }
    setIndex(index + 1);
    setPhase('question');
    setSecondsLeft(ROUND_SECONDS);
    setStartedAt(Date.now());
  }

  if (phase === 'feedback' && lastResult) {
    return (
      <main className="screen feedback">
        <p className={lastResult.correct ? 'verdict correct' : 'verdict incorrect'}>
          {lastResult.correct ? 'Correct' : lastResult.chosen === null ? "Time's up" : 'Incorrect'}
        </p>
        <h2>{PATTERN_NAMES[problem.pattern]}</h2>
        <p className="statement">{highlightTell(problem.statement, problem.tell)}</p>
        <ul className="why-not">
          {(Object.entries(problem.whyNotOthers) as [PatternId, string][]).map(([p, why]) => (
            <li key={p}>
              <strong>Not {PATTERN_NAMES[p]}:</strong> {why}
            </li>
          ))}
        </ul>
        <p className="complexity">{problem.complexity}</p>
        <button className="primary" onClick={next}>
          {index + 1 >= problems.length ? 'Finish session' : 'Next'}
        </button>
      </main>
    );
  }

  return (
    <main className="screen question">
      <header className="round-header">
        <span>
          {index + 1} / {problems.length}
        </span>
        <span className={secondsLeft <= 10 ? 'timer low' : 'timer'}>{secondsLeft}s</span>
      </header>
      <p className="statement">{problem.statement}</p>
      <div className="options">
        {options.map((p) => (
          <button key={p} onClick={() => answer(p)}>
            {PATTERN_NAMES[p]}
          </button>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: clean build (component not yet rendered — that's Task 13).

- [ ] **Step 3: Commit**

```bash
git add src/components
git commit -m "feat: session component with round timer and feedback screen"
```

---

### Task 11: Summary component

**Files:**
- Create: `src/components/Summary.tsx`

**Interfaces:**
- Consumes: `RoundResult`, `PATTERN_NAMES` from `src/types.ts`.
- Produces: `default export Summary({ results, onDone }: { results: RoundResult[]; onDone: () => void })`. Task 13 renders it.

- [ ] **Step 1: Implement** — `src/components/Summary.tsx`:

```tsx
import type { RoundResult } from '../types';
import { PATTERN_NAMES } from '../types';

interface SummaryProps {
  results: RoundResult[];
  onDone: () => void;
}

export default function Summary({ results, onDone }: SummaryProps) {
  const score = results.filter((r) => r.correct).length;
  const missedPatterns = [
    ...new Set(results.filter((r) => !r.correct).map((r) => PATTERN_NAMES[r.problem.pattern])),
  ];

  return (
    <main className="screen summary">
      <h1>
        {score} / {results.length}
      </h1>
      <ul className="result-list">
        {results.map((r, i) => (
          <li key={i} className={r.correct ? 'correct' : 'incorrect'}>
            {r.correct ? '✓' : '✗'} {PATTERN_NAMES[r.problem.pattern]}
            {!r.correct && r.chosen && <span className="chose"> — you chose {PATTERN_NAMES[r.chosen]}</span>}
          </li>
        ))}
      </ul>
      {missedPatterns.length > 0 && <p className="weakest">Focus next: {missedPatterns.join(', ')}</p>}
      <button className="primary" onClick={onDone}>
        Done
      </button>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components
git commit -m "feat: session summary with per-pattern breakdown"
```

---

### Task 12: Progress component (mastery grid + streak calendar)

**Files:**
- Create: `src/components/Progress.tsx`

**Interfaces:**
- Consumes: `patternMastery`, `currentStreak`, `todayStr`, `addDays` from `src/lib/stats.ts`; `AppState`, `PATTERNS`, `PATTERN_NAMES` from `src/types.ts`.
- Produces: `default export Progress({ state, onBack }: { state: AppState; onBack: () => void })`. Task 13 renders it.

- [ ] **Step 1: Implement** — `src/components/Progress.tsx`:

```tsx
import { addDays, currentStreak, patternMastery, todayStr } from '../lib/stats';
import type { AppState } from '../types';
import { PATTERNS, PATTERN_NAMES } from '../types';

interface ProgressProps {
  state: AppState;
  onBack: () => void;
}

export default function Progress({ state, onBack }: ProgressProps) {
  const today = todayStr();
  const done = new Set(state.sessionDates);
  const last28 = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));

  return (
    <main className="screen progress">
      <h1>Progress</h1>
      <p className="streak">🔥 {currentStreak(state.sessionDates, today)}-day streak</p>
      <div className="calendar">
        {last28.map((day) => (
          <div key={day} className={done.has(day) ? 'day done' : 'day'} title={day} />
        ))}
      </div>
      <ul className="mastery-grid">
        {PATTERNS.map((pattern) => {
          const mastery = patternMastery(state.attempts, pattern);
          return (
            <li key={pattern} className={`mastery ${mastery}`}>
              <span>{PATTERN_NAMES[pattern]}</span>
              <span className="level">{mastery}</span>
            </li>
          );
        })}
      </ul>
      <button onClick={onBack}>Back</button>
    </main>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: clean build.

- [ ] **Step 3: Commit**

```bash
git add src/components
git commit -m "feat: progress screen with mastery grid and 28-day calendar"
```

---

### Task 13: App shell, Home screen, styles — wire everything together

**Files:**
- Create: `src/components/Home.tsx`
- Modify: `src/App.tsx` (replace placeholder)
- Modify: `src/styles.css` (replace placeholder)

**Interfaces:**
- Consumes: everything — `buildSession` (Task 7), `loadState`/`saveState`/`exportState`/`importState` (Task 9), `currentStreak`/`todayStr` (Task 8), `Session` (Task 10), `Summary` (Task 11), `Progress` (Task 12), `problems.json` (Tasks 2–5).
- Produces: the complete running app.

- [ ] **Step 1: Implement Home** — `src/components/Home.tsx`:

```tsx
import { useRef } from 'react';
import { currentStreak, todayStr } from '../lib/stats';
import { exportState, importState } from '../lib/storage';
import type { AppState } from '../types';

interface HomeProps {
  state: AppState;
  onStart: () => void;
  onShowProgress: () => void;
  onReplaceState: (next: AppState) => void;
}

export default function Home({ state, onStart, onShowProgress, onReplaceState }: HomeProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const today = todayStr();
  const streak = currentStreak(state.sessionDates, today);
  const doneToday = state.sessionDates.includes(today);

  function handleExport() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattern-drill-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    try {
      onReplaceState(importState(await file.text()));
      alert('Import complete.');
    } catch {
      alert('Invalid backup file — nothing was changed.');
    }
  }

  return (
    <main className="screen home">
      <h1>PatternDrill</h1>
      <p className="streak">
        🔥 {streak}-day streak{doneToday ? ' — done today' : ''}
      </p>
      <button className="primary" onClick={onStart}>
        {doneToday ? 'Extra practice session' : "Start today's session"}
      </button>
      <button onClick={onShowProgress}>Progress</button>
      <div className="data-row">
        <button onClick={handleExport}>Export data</button>
        <button onClick={() => fileInput.current?.click()}>Import data</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            e.target.value = '';
          }}
        />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Replace `src/App.tsx`**:

```tsx
import { useState } from 'react';
import Home from './components/Home';
import Progress from './components/Progress';
import Session from './components/Session';
import Summary from './components/Summary';
import problemsData from './content/problems.json';
import { buildSession } from './lib/scheduler';
import { todayStr } from './lib/stats';
import { loadState, saveState } from './lib/storage';
import type { AppState, Problem, RoundResult } from './types';

type View =
  | { kind: 'home' }
  | { kind: 'session'; problems: Problem[] }
  | { kind: 'summary'; results: RoundResult[] }
  | { kind: 'progress' };

const allProblems = problemsData as unknown as Problem[];

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>({ kind: 'home' });

  function replaceState(next: AppState) {
    setState(next);
    saveState(next);
  }

  function startSession() {
    setView({ kind: 'session', problems: buildSession(state.attempts, allProblems, todayStr()) });
  }

  function completeSession(results: RoundResult[]) {
    const today = todayStr();
    replaceState({
      version: 1,
      attempts: [
        ...state.attempts,
        ...results.map((r) => ({
          problemId: r.problem.id,
          pattern: r.problem.pattern,
          correct: r.correct,
          timeMs: r.timeMs,
          date: today,
        })),
      ],
      sessionDates: state.sessionDates.includes(today)
        ? state.sessionDates
        : [...state.sessionDates, today],
    });
    setView({ kind: 'summary', results });
  }

  switch (view.kind) {
    case 'home':
      return (
        <Home
          state={state}
          onStart={startSession}
          onShowProgress={() => setView({ kind: 'progress' })}
          onReplaceState={replaceState}
        />
      );
    case 'session':
      return <Session problems={view.problems} onComplete={completeSession} />;
    case 'summary':
      return <Summary results={view.results} onDone={() => setView({ kind: 'home' })} />;
    case 'progress':
      return <Progress state={state} onBack={() => setView({ kind: 'home' })} />;
  }
}
```

- [ ] **Step 3: Replace `src/styles.css`** (mobile-first, covers all classes used above):

```css
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: #0f1115;
  color: #e8eaed;
}

.screen {
  max-width: 34rem;
  margin: 0 auto;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-height: 100dvh;
}

h1,
h2 {
  margin: 0;
}

button {
  font: inherit;
  padding: 0.9rem 1rem;
  border-radius: 0.6rem;
  border: 1px solid #3a3f4b;
  background: #1c2027;
  color: inherit;
  cursor: pointer;
  text-align: left;
}

button:active {
  background: #262b34;
}

button.primary {
  background: #2f6fed;
  border-color: #2f6fed;
  color: #fff;
  text-align: center;
  font-weight: 600;
}

.home,
.summary {
  justify-content: center;
  text-align: center;
}

.home button,
.summary button {
  text-align: center;
}

.streak {
  color: #f5a623;
  font-weight: 600;
}

.data-row {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
}

.data-row button {
  font-size: 0.85rem;
  padding: 0.5rem 0.75rem;
}

.round-header {
  display: flex;
  justify-content: space-between;
  font-variant-numeric: tabular-nums;
  color: #9aa0a6;
}

.timer.low {
  color: #ff5c5c;
  font-weight: 700;
}

.statement {
  font-size: 1.05rem;
  line-height: 1.6;
}

mark {
  background: #f5a62333;
  color: #f5c623;
  padding: 0 0.15em;
  border-radius: 0.2em;
}

.options {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.verdict {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}

.verdict.correct {
  color: #34c759;
}

.verdict.incorrect {
  color: #ff5c5c;
}

.why-not {
  margin: 0;
  padding-left: 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  color: #b7bcc4;
  font-size: 0.92rem;
}

.complexity {
  font-family: ui-monospace, monospace;
  color: #9aa0a6;
}

.result-list {
  list-style: none;
  margin: 0;
  padding: 0;
  text-align: left;
}

.result-list .incorrect {
  color: #ff8a8a;
}

.result-list .correct {
  color: #8ee6a1;
}

.chose {
  color: #9aa0a6;
  font-size: 0.9em;
}

.weakest {
  color: #f5a623;
}

.calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.35rem;
}

.calendar .day {
  aspect-ratio: 1;
  border-radius: 0.25rem;
  background: #1c2027;
}

.calendar .day.done {
  background: #2f6fed;
}

.mastery-grid {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.mastery {
  display: flex;
  justify-content: space-between;
  padding: 0.55rem 0.75rem;
  border-radius: 0.5rem;
  background: #1c2027;
}

.mastery .level {
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.mastery.learning .level {
  color: #9aa0a6;
}

.mastery.solid .level {
  color: #f5a623;
}

.mastery.mastered .level {
  color: #34c759;
}
```

- [ ] **Step 4: Verify build and tests**

Run: `npm test && npm run build`
Expected: all tests PASS, clean build.

- [ ] **Step 5: Manual smoke test**

Run: `npm run dev` and open the printed URL. Verify:
1. Home shows streak 0 and "Start today's session".
2. A session runs 10 questions; the timer counts down; answering shows the feedback screen with highlighted tell.
3. Letting the timer hit 0 records "Time's up" feedback.
4. Finishing shows the summary; Done returns home with "done today" and streak 1.
5. Progress shows the calendar square for today filled and mastery levels.
6. Export downloads a JSON file; importing it back succeeds; importing a garbage file shows the error alert.
7. Reload the page — state persists.

- [ ] **Step 6: Commit**

```bash
git add src
git commit -m "feat: wire app shell, home screen, and full stylesheet"
```

---

### Task 14: GitHub Pages deploy

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `README.md`

**Interfaces:**
- Consumes: the complete app from Task 13.
- Produces: live site at `https://<github-user>.github.io/pattern-drill/`.

- [ ] **Step 1: Write the workflow** — `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v4
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Write `README.md`**:

```markdown
# PatternDrill

Daily 10-question drills for recognizing algorithm patterns from problem
statements. Read a problem, name the pattern in under 60 seconds, learn the
"tell" you should have spotted.

- `npm run dev` — local dev server
- `npm test` — unit + content schema tests
- `npm run build` — production build

All progress is stored in localStorage; use Export/Import on the home screen
to move it between devices. Deployed to GitHub Pages on push to `main`.
```

- [ ] **Step 3: Commit**

```bash
git add .github README.md
git commit -m "ci: GitHub Pages deploy workflow and README"
```

- [ ] **Step 4: Create the GitHub repo and push**

```bash
gh repo create pattern-drill --public --source . --push
gh api -X POST "repos/{owner}/pattern-drill/pages" -f build_type=workflow || true
```

(The `gh api` call pre-enables Pages with workflow builds; if it errors because Pages is already enabled, that's fine.)

- [ ] **Step 5: Verify the deploy**

Run: `gh run watch` (or `gh run list --limit 1` until complete)
Expected: workflow SUCCESS. Then open `https://<github-user>.github.io/pattern-drill/` and confirm the home screen loads and a session starts.

- [ ] **Step 6: Final verification**

Run: `npm test && npm run build`
Expected: everything green. The app is live.
