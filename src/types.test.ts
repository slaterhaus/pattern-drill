import { describe, expect, it } from 'vitest';
import { PATTERNS, PATTERN_NAMES } from './types';

describe('pattern registry', () => {
  it('defines 20 patterns, each with a display name', () => {
    expect(PATTERNS).toHaveLength(20);
    expect(new Set(PATTERNS).size).toBe(20);
    for (const p of PATTERNS) {
      expect(PATTERN_NAMES[p].length).toBeGreaterThan(0);
    }
  });
});
