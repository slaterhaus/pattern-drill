# Pattern Reference Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-pattern reference card (original pseudo-code template + book references) collapsed on the feedback screen and expandable from the Progress grid.

**Architecture:** One new content file (`src/content/patterns.json`, 20 entries) with a schema test, one new presentational component (`PatternCard`), embedded via native `<details>` in Session (feedback) and Progress (mastery rows). No state, no routing, no scheduling/storage changes.

**Tech Stack:** Existing stack only — Vite + React 19 + TS, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-12-pattern-reference-cards-design.md`

## Global Constraints

- `pseudocode` is **original text** — never transcribed from CLRS or any book; language-neutral; 8–25 lines; expresses the pattern's canonical *general* form, not any specific problem's solution.
- `references`: 1–3 per pattern. `source` names book + edition (e.g. "CLRS (4th ed)", "ADM (Skiena, 3rd ed)"); `where` is a real chapter/section. **Never invent section numbers.** Cite at chapter granularity unless the exact section is verified (web-search the published table of contents). Patterns neither book covers get an honest nearest-topic pointer or a well-known free reference (e.g. "NeetCode roadmap — Sliding Window").
- Exactly 20 entries, one per `PatternId` in `src/types.ts`.
- Native `<details>`/`<summary>` only — no new state, no new views. Feedback card collapsed by default.
- `<pre>` scrolls horizontally inside its container; page must never scroll horizontally.
- Runtime deps unchanged (react, react-dom only).

---

### Task 1: Pattern content — types, schema test, patterns.json

**Files:**
- Modify: `src/types.ts` (append two interfaces)
- Create: `src/content/patterns.json`
- Test: `src/content/patterns.test.ts`

**Interfaces:**
- Consumes: `PATTERNS`, `PatternId` from `src/types.ts`.
- Produces: `PatternReference { source: string; where: string }` and `PatternInfo { pattern: PatternId; pseudocode: string; references: PatternReference[] }` exported from `src/types.ts`; `src/content/patterns.json` as `PatternInfo[]`. Task 2's component imports both.

- [ ] **Step 1: Append to `src/types.ts`**

```ts
export interface PatternReference {
  source: string;
  where: string;
}

export interface PatternInfo {
  pattern: PatternId;
  /** Original, language-neutral template — never book-transcribed. */
  pseudocode: string;
  /** 1-3 entries; real chapter/section numbers only. */
  references: PatternReference[];
}
```

- [ ] **Step 2: Write the failing test** — `src/content/patterns.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { PatternInfo } from '../types';
import { PATTERNS } from '../types';
import patternsData from './patterns.json';

const patterns = patternsData as unknown as PatternInfo[];

describe('patterns.json', () => {
  it('has exactly one entry per pattern id', () => {
    expect(patterns).toHaveLength(PATTERNS.length);
    const ids = patterns.map((p) => p.pattern);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of PATTERNS) {
      expect(ids).toContain(id);
    }
  });

  it('every entry matches the schema', () => {
    for (const p of patterns) {
      expect(p.pseudocode.trim().length, p.pattern).toBeGreaterThan(0);
      expect(p.pseudocode.split('\n').length, p.pattern).toBeLessThanOrEqual(25);
      expect(p.references.length, p.pattern).toBeGreaterThanOrEqual(1);
      expect(p.references.length, p.pattern).toBeLessThanOrEqual(3);
      for (const r of p.references) {
        expect(r.source.trim().length, p.pattern).toBeGreaterThan(0);
        expect(r.where.trim().length, p.pattern).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- patterns`
Expected: FAIL — cannot resolve `./patterns.json`.

- [ ] **Step 4: Author `src/content/patterns.json`** — a JSON array of 20 `PatternInfo` entries, one per pattern id. First entry, verbatim, as the style anchor:

```json
[
  {
    "pattern": "sliding-window",
    "pseudocode": "best = init\nleft = 0\nfor right in 0 .. n-1:\n  add a[right] to window\n  while window violates the constraint:\n    remove a[left] from window\n    left += 1\n  best = better(best, value(window))\nreturn best",
    "references": [
      { "source": "NeetCode roadmap", "where": "Sliding Window topic" },
      { "source": "ADM (Skiena, 3rd ed)", "where": "Ch. 5 — Divide and Conquer (contrast: windows avoid re-scanning)" }
    ]
  }
]
```

Pseudo-code authoring rules per entry:
- The pattern's general skeleton with domain-neutral names (`a`, `window`, `heapLo/heapHi`, `graph`, `dp`), 8–25 lines.
- Show the load-bearing mechanics: e.g. two-pointers shows the converge-and-compare loop; two-heaps shows rebalancing; union-find shows `find` with path compression AND `union`; backtracking shows choose→recurse→undo; knapsack shows the dp table loop with the 0/1 vs unbounded iteration-order difference in ITS variant only.
- Comments sparingly, only where the "why" isn't visible (e.g. `# shrink from the left so the window is minimal`).

Reference anchors — chapter-level citations known to be correct; use these, and web-search the published tables of contents before adding any finer section numbers:

| Pattern | CLRS (4th ed) | ADM (Skiena, 3rd ed) / other |
|---|---|---|
| two-pointers | — | NeetCode roadmap — Two Pointers |
| sliding-window | — | NeetCode roadmap — Sliding Window |
| fast-slow-pointers | — | NeetCode/Grokking — Fast & Slow Pointers (Floyd's cycle detection) |
| merge-intervals | — | Grokking — Merge Intervals; ADM Ch. 4 (sorting as preprocessing) |
| cyclic-sort | — | Grokking — Cyclic Sort |
| linked-list-reversal | Ch. 10 — Elementary Data Structures | ADM Ch. 3 — Data Structures |
| bfs | Ch. 20 — Elementary Graph Algorithms | ADM Ch. 7 — Graph Traversal |
| dfs | Ch. 20 — Elementary Graph Algorithms | ADM Ch. 7 — Graph Traversal |
| two-heaps | Ch. 6 — Heapsort (priority queues) | ADM Ch. 4 — Sorting (heaps) |
| backtracking | — | ADM Ch. 9 — Combinatorial Search (backtracking) |
| modified-binary-search | Ch. 2 (binary search exercise) | ADM Ch. 5 — Divide and Conquer |
| top-k-heap | Ch. 6 — Heapsort (priority queues) | ADM Ch. 4 — Sorting (priority queues) |
| k-way-merge | Ch. 6 (priority queues) | ADM Ch. 4 — Sorting (mergesort) |
| knapsack-01 | Ch. 14 — Dynamic Programming | ADM Ch. 10 — Dynamic Programming |
| knapsack-unbounded | Ch. 14 — Dynamic Programming | ADM Ch. 10 — Dynamic Programming |
| topological-sort | Ch. 20 — Elementary Graph Algorithms | ADM Ch. 7 — Graph Traversal |
| monotonic-stack | — | NeetCode roadmap — Stack (monotonic stack) |
| union-find | Ch. 19 — Data Structures for Disjoint Sets | ADM Ch. 8 — Weighted Graphs (MST/union-find) |
| trie | Problem 12-2 — Radix trees | ADM Ch. 15 (3rd ed) / 12 — string data structures; verify before citing |
| greedy | Ch. 15 — Greedy Algorithms | ADM Ch. 1 (scheduling intro); verify before citing |

Where the table says "verify before citing", either verify via the book's published ToC or fall back to the CLRS/NeetCode column alone.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — full suite green (38 tests: 36 existing + 2 new).

- [ ] **Step 6: Commit**

```bash
git add src/types.ts src/content/patterns.json src/content/patterns.test.ts
git commit -m "content: pattern reference data with pseudocode templates and book refs"
```

---

### Task 2: PatternCard component + Session/Progress integration + styles

**Files:**
- Create: `src/components/PatternCard.tsx`
- Modify: `src/components/Session.tsx` (feedback screen: add collapsed details after complexity line)
- Modify: `src/components/Progress.tsx` (mastery rows become expandable)
- Modify: `src/styles.css` (append card styles)

**Interfaces:**
- Consumes: `PatternInfo`, `PatternId` from `src/types.ts`; `src/content/patterns.json` (Task 1).
- Produces: `default export PatternCard({ pattern }: { pattern: PatternId })`.

- [ ] **Step 1: Create `src/components/PatternCard.tsx`**

```tsx
import patternsData from '../content/patterns.json';
import type { PatternId, PatternInfo } from '../types';

const patterns = patternsData as unknown as PatternInfo[];
const byId = new Map(patterns.map((p) => [p.pattern, p]));

interface PatternCardProps {
  pattern: PatternId;
}

export default function PatternCard({ pattern }: PatternCardProps) {
  const info = byId.get(pattern)!;
  return (
    <div className="pattern-card">
      <pre className="pseudocode">{info.pseudocode}</pre>
      <ul className="references">
        {info.references.map((r) => (
          <li key={r.source + r.where}>
            {r.source} — {r.where}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 2: Modify `src/components/Session.tsx`**

Add the import:

```tsx
import PatternCard from './PatternCard';
```

In the feedback branch, insert between the complexity line and the primary button:

```tsx
        <p className="complexity">{problem.complexity}</p>
        <details className="study">
          <summary>Study this pattern</summary>
          <PatternCard pattern={problem.pattern} />
        </details>
        <button className="primary" onClick={next}>
```

- [ ] **Step 3: Modify `src/components/Progress.tsx`**

Add the import:

```tsx
import PatternCard from './PatternCard';
```

Replace the mastery `<li>` body:

```tsx
            <li key={pattern} className={`mastery ${mastery}`}>
              <details>
                <summary>
                  <span>{PATTERN_NAMES[pattern]}</span>
                  <span className="level">{mastery}</span>
                </summary>
                <PatternCard pattern={pattern} />
              </details>
            </li>
```

- [ ] **Step 4: Append to `src/styles.css`**

```css
.pattern-card {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-top: 0.6rem;
}

.pseudocode {
  margin: 0;
  padding: 0.75rem;
  background: #161a20;
  border: 1px solid #2a2f38;
  border-radius: 0.5rem;
  overflow-x: auto;
  font-family: ui-monospace, monospace;
  font-size: 0.85rem;
  line-height: 1.5;
  text-align: left;
}

.references {
  margin: 0;
  padding-left: 1.1rem;
  font-size: 0.9rem;
  color: #b7bcc4;
  text-align: left;
}

details.study {
  border: 1px solid #2a2f38;
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
}

details.study summary {
  cursor: pointer;
  color: #9aa0a6;
}

.mastery details {
  width: 100%;
}

.mastery summary {
  display: flex;
  justify-content: space-between;
  cursor: pointer;
  list-style: none;
}

.mastery summary::-webkit-details-marker {
  display: none;
}
```

Note: `.mastery` is currently `display: flex; justify-content: space-between;` on the `<li>` — with the `<details>` now the sole child, the summary row carries the flex layout instead. If the row renders doubled-up or misaligned, change `.mastery` to `display: block;` in the same commit.

- [ ] **Step 5: Verify**

Run: `npm test && npm run build`
Expected: 38 tests PASS, clean build.

- [ ] **Step 6: Runtime check**

Start `npm run dev` in the background, confirm the served page returns 200, stop it. (The controller performs the interactive smoke test: feedback card collapsed by default, expands with pseudo-code and refs; Progress rows expand; `<pre>` scrolls horizontally on a narrow viewport.)

- [ ] **Step 7: Commit**

```bash
git add src/components/PatternCard.tsx src/components/Session.tsx src/components/Progress.tsx src/styles.css
git commit -m "feat: pattern reference cards on feedback screen and progress grid"
```
