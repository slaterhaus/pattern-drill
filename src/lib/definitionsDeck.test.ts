import { describe, expect, it } from 'vitest';
import { PATTERNS } from '../types';
import type { DefinitionBack } from './definitionsDeck';
import { buildDefinitionsDeck, cardPattern, DEFINITIONS_DECK_ID } from './definitionsDeck';

describe('buildDefinitionsDeck', () => {
  const deck = buildDefinitionsDeck();

  it('has one card per pattern with sessionSize 10', () => {
    expect(deck.id).toBe(DEFINITIONS_DECK_ID);
    expect(deck.cards).toHaveLength(PATTERNS.length);
    expect(deck.sessionSize).toBe(10);
  });

  it('round-trips pattern ids through card ids', () => {
    for (const card of deck.cards) {
      expect(PATTERNS).toContain(cardPattern(card.id));
      expect(card.deckId).toBe(DEFINITIONS_DECK_ID);
    }
    expect(new Set(deck.cards.map((c) => c.id)).size).toBe(PATTERNS.length);
  });

  it('carries definition content on every back', () => {
    for (const card of deck.cards) {
      const back = card.back as DefinitionBack;
      expect(back.definition.length).toBeGreaterThan(0);
      expect(back.whenToUse.length).toBeGreaterThan(0);
      expect(back.complexity.length).toBeGreaterThan(0);
    }
  });
});
