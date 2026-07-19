import { useState } from 'react';
import Home from './components/Home';
import Progress from './components/Progress';
import Session from './components/Session';
import Summary from './components/Summary';
import problemsData from './content/problems.json';
import { buildSession } from './lib/scheduler';
import { todayStr } from './lib/stats';
import { loadState, saveState } from './lib/storage';
import type { AppState, Problem, RoundResult } from './types';

type View =
  | { kind: 'home' }
  | { kind: 'session'; problems: Problem[]; startedOn: string }
  | { kind: 'summary'; results: RoundResult[] }
  | { kind: 'progress' };

const allProblems = problemsData as unknown as Problem[];

export default function App() {
  const [state, setState] = useState<AppState>(() => loadState());
  const [view, setView] = useState<View>({ kind: 'home' });

  function replaceState(next: AppState) {
    setState(next);
    saveState(next);
  }

  function startSession() {
    const today = todayStr();
    setView({ kind: 'session', problems: buildSession(state.attempts, allProblems, today), startedOn: today });
  }

  function completeSession(results: RoundResult[], today: string) {
    replaceState({
      version: 2,
      attempts: [
        ...state.attempts,
        ...results.map((r) => ({
          problemId: r.problem.id,
          pattern: r.problem.pattern,
          correct: r.correct,
          timeMs: r.timeMs,
          date: today,
        })),
      ],
      sessionDates: state.sessionDates.includes(today)
        ? state.sessionDates
        : [...state.sessionDates, today],
      reviews: state.reviews,
    });
    setView({ kind: 'summary', results });
  }

  switch (view.kind) {
    case 'home':
      return (
        <Home
          state={state}
          onStart={startSession}
          onShowProgress={() => setView({ kind: 'progress' })}
          onReplaceState={replaceState}
        />
      );
    case 'session':
      return (
        <Session
          problems={view.problems}
          onComplete={(results) => completeSession(results, view.startedOn)}
        />
      );
    case 'summary':
      return <Summary results={view.results} onDone={() => setView({ kind: 'home' })} />;
    case 'progress':
      return <Progress state={state} onBack={() => setView({ kind: 'home' })} />;
  }
}
