# Pattern Reference Cards — Design Spec

**Date:** 2026-07-12
**Status:** Approved

## One-liner

Add a per-pattern reference card — an original pseudo-code template plus book
references (CLRS / Algorithm Design Manual) — surfaced collapsed on the
feedback screen and expandable from the Progress grid.

## Goal & rationale

The feedback screen teaches recognition but gives no path to the mechanism.
A pattern-level card cements the learning with the canonical code skeleton
and pointers into the standard texts. Content is pattern-level (20 entries),
not problem-level: pseudo-code and book chapters are facts about the pattern,
so per-problem copies would be pure duplication.

Explicitly cut during design (YAGNI): when-to-use recap bullets, worked
micro-examples, per-problem references.

## Content

New file `src/content/patterns.json` — a JSON array of exactly 20 entries,
one per `PatternId` in `src/types.ts`:

```json
{
  "pattern": "sliding-window",
  "pseudocode": "left = 0\nfor right in 0..n-1:\n  add a[right] to window\n  while window violates constraint:\n    remove a[left]; left += 1\n  update best from window",
  "references": [
    { "source": "ADM (Skiena, 3rd ed)", "where": "§..." }
  ]
}
```

Rules:

- `pseudocode` is **original text** (never transcribed from CLRS or any
  book), language-neutral, 8–25 lines, newline-separated, and expresses the
  pattern's canonical *general* form — not any specific problem's solution.
- `references`: 1–3 entries. `source` names the book and edition (e.g.
  "CLRS (4th ed)", "ADM (Skiena, 3rd ed)"); `where` is a real chapter/section
  (e.g. "Ch. 22.2 — Breadth-first search"). Section numbers must be accurate
  to the named edition — verified at review time against the books' tables of
  contents. Patterns the books don't cover (e.g. sliding window, cyclic sort,
  two heaps) get whichever book sections genuinely apply, or an honest
  nearest-topic pointer — never an invented section number. Where neither
  book covers the pattern at all, a well-known free reference (e.g. a
  NeetCode/Grokking topic name) is acceptable as `source`.

## UI

One new component: `src/components/PatternCard.tsx`

- Props: `{ pattern: PatternId }`.
- Renders: the pseudo-code in a `<pre className="pseudocode">`, then the
  references as a short list ("source — where").
- Looks up its entry from `patterns.json` directly (content import, same as
  App does for problems).

Surfaces:

1. **Feedback screen** (`src/components/Session.tsx`): after the complexity
   line, a native `<details className="study"><summary>Study this
   pattern</summary><PatternCard …/></details>` — collapsed by default so
   drill pace is untouched. No component state.
2. **Progress grid** (`src/components/Progress.tsx`): each mastery row
   becomes a `<details className="mastery …">` with the existing row content
   as its `<summary>` and `<PatternCard …/>` inside. No routing, no new
   views.

CSS: extend `src/styles.css` with `.pseudocode` (monospace, scrollable if
wide, background panel), `.study`/`summary` affordances, and spacing for the
card inside mastery rows. Mobile-first as elsewhere; `<pre>` must scroll
horizontally inside its container rather than widening the page.

## Testing

Extend the content test suite with `src/content/patterns.test.ts`:

- exactly one entry per `PATTERNS` id, no extras, no duplicates;
- `pseudocode` non-empty, ≤ 25 lines;
- 1–3 `references`, each with non-empty `source` and `where`.

Reference **accuracy** (correct section numbers) is a review-gate check, not
an automated test.

No component tests (consistent with the project's testing stance); UI
verified manually — feedback card collapsed by default and expandable,
progress rows expandable, pre scrolls on narrow viewports.

## Error handling

`PatternCard` looks up by pattern id; the schema test guarantees every id is
present, so no runtime fallback is needed beyond TypeScript's typing.

## Out of scope

- When-to-use recaps, worked micro-examples.
- Per-problem references.
- Any changes to scheduling, storage, or session flow.
