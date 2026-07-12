import type { RoundResult } from '../types';
import { PATTERN_NAMES } from '../types';

interface SummaryProps {
  results: RoundResult[];
  onDone: () => void;
}

export default function Summary({ results, onDone }: SummaryProps) {
  const score = results.filter((r) => r.correct).length;
  const missedPatterns = [
    ...new Set(results.filter((r) => !r.correct).map((r) => PATTERN_NAMES[r.problem.pattern])),
  ];

  return (
    <main className="screen summary">
      <h1>
        {score} / {results.length}
      </h1>
      <ul className="result-list">
        {results.map((r, i) => (
          <li key={i} className={r.correct ? 'correct' : 'incorrect'}>
            {r.correct ? '✓' : '✗'} {PATTERN_NAMES[r.problem.pattern]}
            {!r.correct && r.chosen && <span className="chose"> — you chose {PATTERN_NAMES[r.chosen]}</span>}
          </li>
        ))}
      </ul>
      {missedPatterns.length > 0 && <p className="weakest">Focus next: {missedPatterns.join(', ')}</p>}
      <button className="primary" onClick={onDone}>
        Done
      </button>
    </main>
  );
}
