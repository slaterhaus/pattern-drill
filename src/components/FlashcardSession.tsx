import { useState } from 'react';
import type { Card, Grade, Review } from '../deck-engine';
import type { DefinitionBack } from '../lib/definitionsDeck';
import type { PatternId } from '../types';
import { PATTERN_NAMES } from '../types';

interface FlashcardSessionProps {
  cards: Card[];
  today: string;
  onComplete: (reviews: Review[]) => void;
}

export default function FlashcardSession({ cards, today, onComplete }: FlashcardSessionProps) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const card = cards[index];
  const back = card.back as DefinitionBack;

  function grade(g: Grade) {
    const next = [
      ...reviews,
      { cardId: card.id, deckId: card.deckId, grade: g, date: today, timeMs: Date.now() - startedAt },
    ];
    if (index + 1 >= cards.length) {
      onComplete(next);
      return;
    }
    setReviews(next);
    setIndex(index + 1);
    setFlipped(false);
    setStartedAt(Date.now());
  }

  return (
    <main className="screen flashcard">
      <header className="round-header">
        <span>
          {index + 1} / {cards.length}
        </span>
      </header>
      <h2>{PATTERN_NAMES[card.front as PatternId]}</h2>
      {flipped ? (
        <>
          <p className="definition">{back.definition}</p>
          <ul className="when-to-use">
            {back.whenToUse.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
          <p className="complexity">{back.complexity}</p>
          <div className="grade-row">
            <button className="primary" onClick={() => grade('pass')}>
              Got it
            </button>
            <button onClick={() => grade('fail')}>Missed it</button>
          </div>
        </>
      ) : (
        <button className="primary" onClick={() => setFlipped(true)}>
          Reveal
        </button>
      )}
    </main>
  );
}
