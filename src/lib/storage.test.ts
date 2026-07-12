import { describe, expect, it } from 'vitest';
import type { KV } from './storage';
import {
  backupState,
  exportState,
  freshState,
  importState,
  loadState,
  saveState,
  STORAGE_KEY,
} from './storage';

function fakeStore(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  const store: KV & { keys(): string[] } = {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => void map.set(k, v),
    keys: () => [...map.keys()],
  };
  return store;
}

describe('loadState', () => {
  it('returns fresh state when nothing is stored', () => {
    expect(loadState(fakeStore())).toEqual(freshState());
  });

  it('round-trips through saveState', () => {
    const store = fakeStore();
    const state = {
      ...freshState(),
      attempts: [
        { problemId: 'p1', pattern: 'bfs' as const, correct: true, timeMs: 5000, date: '2026-07-10' },
      ],
      sessionDates: ['2026-07-10'],
    };
    saveState(state, store);
    expect(loadState(store)).toEqual(state);
  });

  it('backs up corrupt JSON and starts fresh instead of crashing', () => {
    const store = fakeStore({ [STORAGE_KEY]: '{not json' });
    expect(loadState(store)).toEqual(freshState());
    expect(store.keys().some((k) => k.startsWith('pattern-drill-backup-'))).toBe(true);
  });

  it('backs up structurally invalid state and starts fresh', () => {
    const store = fakeStore({ [STORAGE_KEY]: JSON.stringify({ version: 99 }) });
    expect(loadState(store)).toEqual(freshState());
    expect(store.keys().some((k) => k.startsWith('pattern-drill-backup-'))).toBe(true);
  });
});

describe('backupState', () => {
  it('writes a pattern-drill-backup- key with JSON that round-trips', () => {
    const store = fakeStore();
    const state = {
      ...freshState(),
      attempts: [
        { problemId: 'p1', pattern: 'bfs' as const, correct: true, timeMs: 5000, date: '2026-07-10' },
      ],
      sessionDates: ['2026-07-10'],
    };
    backupState(state, store);
    const key = store.keys().find((k) => k.startsWith('pattern-drill-backup-'));
    expect(key).toBeDefined();
    expect(JSON.parse(store.getItem(key!)!)).toEqual(state);
  });
});

describe('importState', () => {
  it('accepts a valid export', () => {
    expect(importState(exportState(freshState()))).toEqual(freshState());
  });

  it('throws on invalid JSON', () => {
    expect(() => importState('nope')).toThrow();
  });

  it('throws on valid JSON with the wrong shape', () => {
    expect(() => importState('{"version":2}')).toThrow();
  });
});
