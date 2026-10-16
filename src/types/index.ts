// ============================================================
// Cogni AI — local-first type definitions
// ============================================================

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  hint?: string;
}

export interface StudySet {
  id: string;
  title: string;
  description?: string;
  coverColor: string;
  cards: Flashcard[];
  createdAt: string;
  lastStudiedAt?: string;
}

// Ratings for Easy/Medium/Hard in study session
export type CardRating = 'easy' | 'medium' | 'hard';

export interface SessionResult {
  setId: string;
  totalCards: number;
  ratings: Record<CardRating, number>;
  durationSeconds: number;
}
