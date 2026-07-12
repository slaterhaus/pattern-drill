import { useRef } from 'react';
import { currentStreak, todayStr } from '../lib/stats';
import { backupState, exportState, importState } from '../lib/storage';
import type { AppState } from '../types';

interface HomeProps {
  state: AppState;
  onStart: () => void;
  onShowProgress: () => void;
  onReplaceState: (next: AppState) => void;
}

export default function Home({ state, onStart, onShowProgress, onReplaceState }: HomeProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const today = todayStr();
  const streak = currentStreak(state.sessionDates, today);
  const doneToday = state.sessionDates.includes(today);

  function handleExport() {
    const blob = new Blob([exportState(state)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pattern-drill-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(file: File) {
    try {
      const next = importState(await file.text());
      backupState(state);
      onReplaceState(next);
      alert('Import complete.');
    } catch {
      alert('Invalid backup file — nothing was changed.');
    }
  }

  return (
    <main className="screen home">
      <h1>PatternDrill</h1>
      <p className="streak">
        🔥 {streak}-day streak{doneToday ? ' — done today' : ''}
      </p>
      <button className="primary" onClick={onStart}>
        {doneToday ? 'Extra practice session' : "Start today's session"}
      </button>
      <button onClick={onShowProgress}>Progress</button>
      <div className="data-row">
        <button onClick={handleExport}>Export data</button>
        <button onClick={() => fileInput.current?.click()}>Import data</button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImport(file);
            e.target.value = '';
          }}
        />
      </div>
    </main>
  );
}
