import type { Attempt, PatternId } from '../types';
import { PATTERNS } from '../types';

export const SESSION_SIZE = 10;
const RECENT_WINDOW = 10;
const STALE_DAYS = 14;

export function daysBetween(earlier: string, later: string): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / 86_400_000);
}

// `attempts` must be in chronological order (oldest first) — the recency
// window and staleness math read the tail of the array as most recent.
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
