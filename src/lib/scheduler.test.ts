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
