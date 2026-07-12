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
