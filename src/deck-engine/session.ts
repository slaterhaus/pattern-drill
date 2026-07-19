import type { Card, Deck, Review } from './types';

const RECENT_WINDOW = 5;

// `reviews` must be in chronological order (oldest first) — the recency
// window and tie-break read the tail of each card's history as most recent.
export function buildSession(deck: Deck, reviews: Review[]): Card[] {
  const byCard = new Map<string, Review[]>();
  for (const r of reviews) {
    if (r.deckId !== deck.id) continue;
    const list = byCard.get(r.cardId) ?? [];
    list.push(r);
    byCard.set(r.cardId, list);
  }

  const unseen = deck.cards.filter((c) => !byCard.has(c.id));
  const seen = deck.cards
    .filter((c) => byCard.has(c.id))
    .map((card) => {
      const history = byCard.get(card.id)!;
      const recent = history.slice(-RECENT_WINDOW);
      const passRate = recent.filter((r) => r.grade === 'pass').length / recent.length;
      return { card, passRate, lastDate: history[history.length - 1].date };
    })
    .sort((a, b) =>
      a.passRate === b.passRate ? a.lastDate.localeCompare(b.lastDate) : a.passRate - b.passRate,
    )
    .map((entry) => entry.card);

  return [...unseen, ...seen].slice(0, deck.sessionSize);
}
