import type { AppState } from '../types';
import { PATTERNS } from '../types';

export const STORAGE_KEY = 'pattern-drill-state-v1';

export interface KV {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function freshState(): AppState {
  return { version: 1, attempts: [], sessionDates: [] };
}

function isValidState(value: unknown): value is AppState {
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

export function loadState(store: KV = localStorage): AppState {
  const raw = store.getItem(STORAGE_KEY);
  if (raw === null) return freshState();
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isValidState(parsed)) throw new Error('invalid state shape');
    return parsed;
  } catch {
    store.setItem(`pattern-drill-backup-${Date.now()}`, raw);
    return freshState();
  }
}

export function saveState(state: AppState, store: KV = localStorage): void {
  store.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function exportState(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importState(json: string): AppState {
  const parsed: unknown = JSON.parse(json);
  if (!isValidState(parsed)) throw new Error('Invalid PatternDrill backup');
  return parsed;
}
