import { useEffect, useMemo, useState } from 'react';
import { answerOptions } from '../lib/scheduler';
import type { PatternId, Problem, RoundResult } from '../types';
import { PATTERN_NAMES } from '../types';
import PatternCard from './PatternCard';

const ROUND_SECONDS = 60;

interface SessionProps {
  problems: Problem[];
  onComplete: (results: RoundResult[]) => void;
}

function highlightTell(statement: string, tell: string) {
  const i = statement.indexOf(tell);
  if (i === -1) return <>{statement}</>;
  return (
    <>
      {statement.slice(0, i)}
      <mark>{tell}</mark>
      {statement.slice(i + tell.length)}
    </>
  );
}

export default function Session({ problems, onComplete }: SessionProps) {
  const [index, setIndex] = useState(0);
  const [results, setResults] = useState<RoundResult[]>([]);
  const [phase, setPhase] = useState<'question' | 'feedback'>('question');
  const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
  const [startedAt, setStartedAt] = useState(() => Date.now());

  const problem = problems[index];
  const options = useMemo(() => answerOptions(problem), [problem]);
  const lastResult = results[results.length - 1];

  useEffect(() => {
    if (phase !== 'question') return;
    const timer = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [phase, index]);

  useEffect(() => {
    if (phase === 'question' && secondsLeft <= 0) answer(null);
  });

  function answer(chosen: PatternId | null) {
    const timeMs =
      chosen === null ? ROUND_SECONDS * 1000 : Math.min(Date.now() - startedAt, ROUND_SECONDS * 1000);
    setResults((prev) => [
      ...prev,
      { problem, chosen, correct: chosen === problem.pattern, timeMs },
    ]);
    setPhase('feedback');
  }

  function next() {
    if (index + 1 >= problems.length) {
      onComplete(results);
      return;
    }
    setIndex(index + 1);
    setPhase('question');
    setSecondsLeft(ROUND_SECONDS);
    setStartedAt(Date.now());
  }

  if (phase === 'feedback' && lastResult) {
    return (
      <main className="screen feedback">
        <p className={lastResult.correct ? 'verdict correct' : 'verdict incorrect'}>
          {lastResult.correct ? 'Correct' : lastResult.chosen === null ? "Time's up" : 'Incorrect'}
        </p>
        <h2>{PATTERN_NAMES[problem.pattern]}</h2>
        <p className="statement">{highlightTell(problem.statement, problem.tell)}</p>
        <ul className="why-not">
          {(Object.entries(problem.whyNotOthers) as [PatternId, string][]).map(([p, why]) => (
            <li key={p}>
              <strong>Not {PATTERN_NAMES[p]}:</strong> {why}
            </li>
          ))}
        </ul>
        <p className="complexity">{problem.complexity}</p>
        <details className="study">
          <summary>Study this pattern</summary>
          <PatternCard pattern={problem.pattern} />
        </details>
        <button className="primary" onClick={next}>
          {index + 1 >= problems.length ? 'Finish session' : 'Next'}
        </button>
      </main>
    );
  }

  return (
    <main className="screen question">
      <header className="round-header">
        <span>
          {index + 1} / {problems.length}
        </span>
        <span className={secondsLeft <= 10 ? 'timer low' : 'timer'}>{secondsLeft}s</span>
      </header>
      <p className="statement">{problem.statement}</p>
      <div className="options">
        {options.map((p) => (
          <button key={p} onClick={() => answer(p)}>
            {PATTERN_NAMES[p]}
          </button>
        ))}
      </div>
    </main>
  );
}
