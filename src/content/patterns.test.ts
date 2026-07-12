import { describe, expect, it } from 'vitest';
import type { PatternInfo } from '../types';
import { PATTERNS } from '../types';
import patternsData from './patterns.json';

const patterns = patternsData as unknown as PatternInfo[];

describe('patterns.json', () => {
  it('has exactly one entry per pattern id', () => {
    expect(patterns).toHaveLength(PATTERNS.length);
    const ids = patterns.map((p) => p.pattern);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of PATTERNS) {
      expect(ids).toContain(id);
    }
  });

  it('every entry matches the schema', () => {
    for (const p of patterns) {
      expect(p.pseudocode.trim().length, p.pattern).toBeGreaterThan(0);
      expect(p.pseudocode.split('\n').length, p.pattern).toBeLessThanOrEqual(25);
      expect(p.pseudocode.split('\n').length, p.pattern).toBeGreaterThanOrEqual(8);
      expect(p.references.length, p.pattern).toBeGreaterThanOrEqual(1);
      expect(p.references.length, p.pattern).toBeLessThanOrEqual(3);
      for (const r of p.references) {
        expect(r.source.trim().length, p.pattern).toBeGreaterThan(0);
        expect(r.where.trim().length, p.pattern).toBeGreaterThan(0);
      }
    }
  });
});
