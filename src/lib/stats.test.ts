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
