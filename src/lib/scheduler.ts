import type { Attempt, Difficulty, PatternId, Problem } from '../types';
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
