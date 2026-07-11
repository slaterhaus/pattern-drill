import { describe, expect, it } from 'vitest';
import type { Problem } from '../types';
import { PATTERNS, PATTERN_NAMES } from '../types';
import problemsData from './problems.json';

const problems = problemsData as unknown as Problem[];
const DIFFICULTIES = ['easy', 'medium', 'hard'];

describe('problems.json', () => {
  it('has at least one problem', () => {
    expect(problems.length).toBeGreaterThan(0);
  });

  it('has unique ids', () => {
    const ids = problems.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every problem matches the schema', () => {
    for (const p of problems) {
      expect(PATTERNS, p.id).toContain(p.pattern);
      expect(DIFFICULTIES, p.id).toContain(p.difficulty);
      expect(p.statement.length, p.id).toBeGreaterThan(120);
      expect(p.statement, p.id).toContain(p.tell);
      expect(
        p.statement.toLowerCase(),
        `${p.id}: statement leaks its own pattern name`,
      ).not.toContain(PATTERN_NAMES[p.pattern].toLowerCase());
      const distractors = Object.keys(p.whyNotOthers);
      expect(distractors, p.id).toHaveLength(4);
      for (const d of distractors) {
        expect(PATTERNS, p.id).toContain(d);
        expect(d, p.id).not.toBe(p.pattern);
        expect((p.whyNotOthers as Record<string, string>)[d].length, p.id).toBeGreaterThan(20);
      }
      expect(p.complexity, p.id).toContain('O(');
    }
  });

  it('has exactly 10 problems per pattern (4 easy, 4 medium, 2 hard)', () => {
    for (const pattern of PATTERNS) {
      const ofPattern = problems.filter((p) => p.pattern === pattern);
      expect(ofPattern, pattern).toHaveLength(10);
      expect(ofPattern.filter((p) => p.difficulty === 'easy'), pattern).toHaveLength(4);
      expect(ofPattern.filter((p) => p.difficulty === 'medium'), pattern).toHaveLength(4);
      expect(ofPattern.filter((p) => p.difficulty === 'hard'), pattern).toHaveLength(2);
    }
  });
});
