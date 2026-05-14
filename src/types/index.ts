export type Answer = "A" | "B" | "C" | "D";

export interface Question {
  id: number;
  theme: string;        // Ex: "Histoire", "Institutions"
  question: string;
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: Answer;
  explanation?: string; // Optionnel : explication affichée à la correction
}

export interface UserAnswer {
  questionId: number;
  userAnswer: Answer | null; // null si pas répondu
  isCorrect: boolean;
}

export interface QCMSession {
  id: string;           // timestamp en string
  date: string;         // "2024-01-15"
  score: number;
  total: number;
  answers: UserAnswer[];
}