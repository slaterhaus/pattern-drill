import { describe, expect, it } from 'vitest';
import type { Card, Deck, Review } from './index';
import { buildSession } from './index';

function card(id: string): Card {
  return { id, deckId: 'd', front: id, back: id };
}

function deck(cards: Card[], sessionSize = 3): Deck {
  return { id: 'd', title: 'Test', cards, sessionSize };
}

function review(cardId: string, grade: 'pass' | 'fail', date: string): Review {
  return { cardId, deckId: 'd', grade, date };
}

describe('buildSession', () => {
  it('returns cards in deck order when there is no history', () => {
    const d = deck([card('a'), card('b'), card('c'), card('d')], 3);
    expect(buildSession(d, []).map((c) => c.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the whole deck when it is smaller than sessionSize', () => {
    const d = deck([card('a'), card('b')], 10);
    expect(buildSession(d, []).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('puts never-reviewed cards before reviewed ones', () => {
    const d = deck([card('a'), card('b'), card('c')], 3);
    const reviews = [review('a', 'fail', '2026-07-18')];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('orders reviewed cards weakest first by recent pass rate', () => {
    const d = deck([card('a'), card('b'), card('c')], 3);
    const reviews = [
      review('a', 'pass', '2026-07-18'), // a: 100%
      review('b', 'fail', '2026-07-18'), // b: 0%
      review('c', 'pass', '2026-07-18'),
      review('c', 'fail', '2026-07-18'), // c: 50%
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'c', 'a']);
  });

  it('only counts the most recent 5 reviews per card', () => {
    const d = deck([card('a'), card('b')], 2);
    // a: 3 old fails then 5 recent passes -> 100%. b: one fail -> 0%.
    const reviews = [
      review('a', 'fail', '2026-07-01'),
      review('a', 'fail', '2026-07-02'),
      review('a', 'fail', '2026-07-03'),
      review('a', 'pass', '2026-07-10'),
      review('a', 'pass', '2026-07-11'),
      review('a', 'pass', '2026-07-12'),
      review('a', 'pass', '2026-07-13'),
      review('a', 'pass', '2026-07-14'),
      review('b', 'fail', '2026-07-14'),
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('breaks pass-rate ties by least-recently-reviewed first', () => {
    const d = deck([card('a'), card('b')], 2);
    const reviews = [
      review('a', 'pass', '2026-07-14'),
      review('b', 'pass', '2026-07-10'),
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b', 'a']);
  });

  it('ignores reviews belonging to other decks', () => {
    const d = deck([card('a'), card('b')], 2);
    const foreign: Review = { cardId: 'a', deckId: 'other', grade: 'fail', date: '2026-07-14' };
    expect(buildSession(d, [foreign]).map((c) => c.id)).toEqual(['a', 'b']);
  });

  it('truncates to sessionSize after ordering', () => {
    const d = deck([card('a'), card('b'), card('c')], 1);
    const reviews = [
      review('a', 'pass', '2026-07-18'),
      review('b', 'fail', '2026-07-18'),
      review('c', 'pass', '2026-07-18'),
    ];
    expect(buildSession(d, reviews).map((c) => c.id)).toEqual(['b']);
  });
});
