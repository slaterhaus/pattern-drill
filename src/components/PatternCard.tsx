import patternsData from '../content/patterns.json';
import type { PatternId, PatternInfo } from '../types';

const patterns = patternsData as unknown as PatternInfo[];
const byId = new Map(patterns.map((p) => [p.pattern, p]));

interface PatternCardProps {
  pattern: PatternId;
}

export default function PatternCard({ pattern }: PatternCardProps) {
  const info = byId.get(pattern)!;
  return (
    <div className="pattern-card">
      <pre className="pseudocode">{info.pseudocode}</pre>
      <ul className="references">
        {info.references.map((r) => (
          <li key={r.source + r.where}>
            {r.source} — {r.where}
          </li>
        ))}
      </ul>
    </div>
  );
}
