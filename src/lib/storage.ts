import type { AppState } from '../types';
import { PATTERNS } from '../types';

export const STORAGE_KEY = 'pattern-drill-state-v1';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function freshState(): AppState {
  return { version: 2, attempts: [], sessionDates: [], reviews: [] };
}

type V1State = Omit<AppState, 'version' | 'reviews'> & { version: 1 };

function isValidStateV1(value: unknown): value is V1State {
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

function isValidReview(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.cardId === 'string' &&
    typeof r.deckId === 'string' &&
    (r.grade === 'pass' || r.grade === 'fail') &&
    typeof r.date === 'string' &&
    (r.timeMs === undefined || typeof r.timeMs === 'number')
  );
}

function isValidState(value: unknown): value is AppState {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  if (v.version !== 2) return false;
  if (!Array.isArray(v.reviews) || !v.reviews.every(isValidReview)) return false;
  return isValidStateV1({ ...v, version: 1 } as unknown);
}

function migrate(value: unknown): AppState | null {
  if (isValidState(value)) return value;
  if (isValidStateV1(value)) return { ...value, version: 2, reviews: [] };
  return null;
}

export function loadState(store: KV = localStorage): AppState {
  const raw = store.getItem(STORAGE_KEY);
  if (raw === null) return freshState();
  try {
    const parsed: unknown = JSON.parse(raw);
    const migrated = migrate(parsed);
    if (migrated === null) throw new Error('invalid state shape');
    return migrated;
  } catch {
    store.setItem(`pattern-drill-backup-${Date.now()}`, raw);
    return freshState();
  }
}

export function saveState(state: AppState, store: KV = localStorage): void {
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function backupState(state: AppState, store: KV = localStorage): void {
  store.setItem(`pattern-drill-backup-${Date.now()}`, JSON.stringify(state));
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed: unknown = JSON.parse(json);
  const migrated = migrate(parsed);
  if (migrated === null) throw new Error('Invalid PatternDrill backup');
  return migrated;
}
