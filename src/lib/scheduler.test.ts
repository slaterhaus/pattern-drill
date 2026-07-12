import { describe, expect, it } from 'vitest';
import type { Attempt, Problem } from '../types';
import { PATTERNS } from '../types';
import { patternScore, selectSessionPatterns, eligibleDifficulties, selectProblem, buildSession, answerOptions } from './scheduler';

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
