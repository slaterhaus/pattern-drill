import type { Review } from '../deck-engine';
import { cardPattern } from '../lib/definitionsDeck';
import { PATTERN_NAMES } from '../types';

interface FlashcardSummaryProps {
  reviews: Review[];
  onDone: () => void;
}

export default function FlashcardSummary({ reviews, onDone }: FlashcardSummaryProps) {
  const passed = reviews.filter((r) => r.grade === 'pass').length;
  const missed = [
    ...new Set(reviews.filter((r) => r.grade === 'fail').map((r) => PATTERN_NAMES[cardPattern(r.cardId)])),
  ];

  return (
    <main className="screen summary">
      <h1>
        {passed} / {reviews.length}
      </h1>
      <ul className="result-list">
        {reviews.map((r, i) => (
          <li key={i} className={r.grade === 'pass' ? 'correct' : 'incorrect'}>
            {r.grade === 'pass' ? '✓' : '✗'} {PATTERN_NAMES[cardPattern(r.cardId)]}
          </li>
        ))}
      </ul>
      {missed.length > 0 && <p className="weakest">Review next: {missed.join(', ')}</p>}
      <button className="primary" onClick={onDone}>
        Done
      </button>
    </main>
  );
}
