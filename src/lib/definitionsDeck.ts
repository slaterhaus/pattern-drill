import patternsData from '../content/patterns.json';
import type { Card, Deck } from '../deck-engine';
import type { PatternId, PatternInfo } from '../types';

export const DEFINITIONS_DECK_ID = 'definitions';
const CARD_PREFIX = 'def-';

export interface DefinitionBack {
  definition: string;
  whenToUse: string[];
  complexity: string;
}

const patterns = patternsData as unknown as PatternInfo[];

export function buildDefinitionsDeck(): Deck {
  const cards: Card[] = patterns.map((p) => ({
    id: `${CARD_PREFIX}${p.pattern}`,
    deckId: DEFINITIONS_DECK_ID,
    front: p.pattern,
    back: { definition: p.definition, whenToUse: p.whenToUse, complexity: p.complexity },
  }));
  return { id: DEFINITIONS_DECK_ID, title: 'Definitions', cards, sessionSize: 10 };
}

export function cardPattern(cardId: string): PatternId {
  return cardId.slice(CARD_PREFIX.length) as PatternId;
}
