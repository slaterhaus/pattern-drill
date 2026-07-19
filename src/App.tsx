import { useState } from 'react';
import FlashcardSession from './components/FlashcardSession';
import FlashcardSummary from './components/FlashcardSummary';
import Home from './components/Home';
import Progress from './components/Progress';
import Session from './components/Session';
import Summary from './components/Summary';
import problemsData from './content/problems.json';
import type { Card, Review } from './deck-engine';
import { buildSession as buildDeckSession } from './deck-engine';
import { buildDefinitionsDeck } from './lib/definitionsDeck';
import { buildSession } from './lib/scheduler';
import { todayStr } from './lib/stats';
import { loadState, saveState } from './lib/storage';
import type { AppState, Problem, RoundResult } from './types';

type View =
  | { kind: 'home' }
  | { kind: 'session'; problems: Problem[]; startedOn: string }
  | { kind: 'summary'; results: RoundResult[] }
  | { kind: 'progress' }
  | { kind: 'flashcards'; cards: Card[]; startedOn: string }
  | { kind: 'flashcard-summary'; reviews: Review[] };

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

  function startFlashcards() {
    const today = todayStr();
    setView({
      kind: 'flashcards',
      cards: buildDeckSession(buildDefinitionsDeck(), state.reviews),
      startedOn: today,
    });
  }

  function completeFlashcards(newReviews: Review[], today: string) {
    replaceState({
      ...state,
      reviews: [...state.reviews, ...newReviews],
      sessionDates: state.sessionDates.includes(today)
        ? state.sessionDates
        : [...state.sessionDates, today],
    });
    setView({ kind: 'flashcard-summary', reviews: newReviews });
  }

  switch (view.kind) {
    case 'home':
      return (
        <Home
          state={state}
          onStart={startSession}
          onShowProgress={() => setView({ kind: 'progress' })}
          onReplaceState={replaceState}
          onStartFlashcards={startFlashcards}
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
    case 'flashcards':
      return (
        <FlashcardSession
          cards={view.cards}
          today={view.startedOn}
          onComplete={(reviews) => completeFlashcards(reviews, view.startedOn)}
        />
      );
    case 'flashcard-summary':
      return <FlashcardSummary reviews={view.reviews} onDone={() => setView({ kind: 'home' })} />;
  }
}
