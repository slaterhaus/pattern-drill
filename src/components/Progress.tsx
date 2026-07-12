import { addDays, currentStreak, patternMastery, todayStr } from '../lib/stats';
import type { AppState } from '../types';
import { PATTERNS, PATTERN_NAMES } from '../types';
import PatternCard from './PatternCard';

interface ProgressProps {
  state: AppState;
  onBack: () => void;
}

export default function Progress({ state, onBack }: ProgressProps) {
  const today = todayStr();
  const done = new Set(state.sessionDates);
  const last28 = Array.from({ length: 28 }, (_, i) => addDays(today, i - 27));

  return (
    <main className="screen progress">
      <h1>Progress</h1>
      <p className="streak">🔥 {currentStreak(state.sessionDates, today)}-day streak</p>
      <div className="calendar">
        {last28.map((day) => (
          <div key={day} className={done.has(day) ? 'day done' : 'day'} title={day} />
        ))}
      </div>
      <ul className="mastery-grid">
        {PATTERNS.map((pattern) => {
          const mastery = patternMastery(state.attempts, pattern);
          return (
            <li key={pattern} className={`mastery ${mastery}`}>
              <details>
                <summary>
                  <span>{PATTERN_NAMES[pattern]}</span>
                  <span className="level">{mastery}</span>
                </summary>
                <PatternCard pattern={pattern} />
              </details>
            </li>
          );
        })}
      </ul>
      <button onClick={onBack}>Back</button>
    </main>
  );
}
