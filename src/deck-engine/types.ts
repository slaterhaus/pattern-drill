export type Grade = 'pass' | 'fail';

export interface Card {
  id: string;
  deckId: string;
  /** Opaque to the engine; the host renders it. */
  front: unknown;
  back: unknown;
}

export interface Review {
  cardId: string;
  deckId: string;
  grade: Grade;
  date: string; // YYYY-MM-DD, local timezone
  timeMs?: number;
}

export interface Deck {
  id: string;
  title: string;
  cards: Card[];
  sessionSize: number;
}
