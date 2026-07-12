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
