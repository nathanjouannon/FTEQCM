import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { PASSING_PERCENTAGE, QUESTIONS_PER_SESSION } from "@/constants";
import questionsData from "@/data/questions.json";
import { Answer, QCMSession, Question, UserAnswer } from "@/types";

import { useLocalStorage } from "./useLocalStorage";

interface QuestionsPayload {
  questions: Question[];
}

interface QCMProgress {
  current: number;
  total: number;
}

interface QCMScore {
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
}

interface UseQCMReturn {
  questions: Question[];
  currentIndex: number;
  userAnswers: UserAnswer[];
  isFinished: boolean;
  sessionStartTime: string;
  durationSeconds: number;
  answerQuestion: (answer: Answer) => void;
  getCurrentQuestion: () => Question | null;
  getProgress: () => QCMProgress;
  getScore: () => QCMScore;
  restartQCM: () => void;
}

// Source complète des questions importée depuis le JSON.
const allQuestions = (questionsData as QuestionsPayload).questions;

// Mélange Fisher-Yates puis sélectionne 40 questions sans répétition.
const pickRandomQuestions = (questions: Question[]): Question[] => {
  const shuffled = [...questions];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]];
  }

  return shuffled.slice(0, QUESTIONS_PER_SESSION);
};

// Hook principal de gestion d'une session QCM.
export const useQCM = (): UseQCMReturn => {
  // États de session.
  const [questions, setQuestions] = useState<Question[]>(() => pickRandomQuestions(allQuestions));
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswer[]>([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [sessionStartTime, setSessionStartTime] = useState<string>(() => new Date().toISOString());
  const [durationSeconds, setDurationSeconds] = useState<number>(0);

  // Historique persistant des sessions terminées.
  const [, setSessions] = useLocalStorage<QCMSession[]>("qcm_sessions", []);

  // Référence du timer pour pouvoir l'arrêter proprement.
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Démarre le timer pendant la session active et le nettoie à la fin.
  useEffect(() => {
    if (isFinished) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    timerRef.current = setInterval(() => {
      setDurationSeconds((previousDuration) => previousDuration + 1);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isFinished, sessionStartTime]);

  // Enregistre la réponse, calcule sa validité et avance dans le questionnaire.
  const answerQuestion = useCallback(
    (answer: Answer): void => {
      if (isFinished) {
        return;
      }

      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) {
        return;
      }

      const answerEntry: UserAnswer = {
        questionId: currentQuestion.id,
        userAnswer: answer,
        isCorrect: answer === currentQuestion.correctAnswer,
      };

      setUserAnswers((previousAnswers) => [...previousAnswers, answerEntry]);

      const isLastQuestion =
        currentIndex >= QUESTIONS_PER_SESSION - 1 || currentIndex >= questions.length - 1;

      if (isLastQuestion) {
        setIsFinished(true);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        return;
      }

      setCurrentIndex((previousIndex) => previousIndex + 1);
    },
    [currentIndex, isFinished, questions]
  );

  // Retourne la question affichée actuellement.
  const getCurrentQuestion = useCallback((): Question | null => {
    if (isFinished) {
      return null;
    }

    return questions[currentIndex] ?? null;
  }, [currentIndex, isFinished, questions]);

  // Expose la progression courante sur 40 questions.
  const getProgress = useCallback((): QCMProgress => {
    return {
      current: Math.min(currentIndex + 1, QUESTIONS_PER_SESSION),
      total: QUESTIONS_PER_SESSION,
    };
  }, [currentIndex]);

  // Calcule le score final uniquement si la session est terminée.
  const computedScore = useMemo<QCMScore>(() => {
    if (!isFinished) {
      return {
        score: 0,
        total: QUESTIONS_PER_SESSION,
        percentage: 0,
        passed: false,
      };
    }

    const score = userAnswers.filter((answer) => answer.isCorrect).length;
    const total = questions.length;
    const percentage = total === 0 ? 0 : Math.round((score / total) * 100);

    return {
      score,
      total,
      percentage,
      passed: percentage >= PASSING_PERCENTAGE,
    };
  }, [isFinished, questions.length, userAnswers]);

  // API de score exposée au composant consommateur.
  const getScore = useCallback((): QCMScore => computedScore, [computedScore]);

  // Redémarre une nouvelle session complète avec un nouveau tirage.
  const restartQCM = useCallback((): void => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setQuestions(pickRandomQuestions(allQuestions));
    setCurrentIndex(0);
    setUserAnswers([]);
    setIsFinished(false);
    setSessionStartTime(new Date().toISOString());
    setDurationSeconds(0);
  }, []);

  // Sauvegarde la session dans localStorage dès qu'elle est terminée.
  useEffect(() => {
    if (!isFinished) {
      return;
    }

    const finalScore = userAnswers.filter((answer) => answer.isCorrect).length;
    const completedSession: QCMSession = {
      id: Date.now().toString(),
      date: sessionStartTime.split("T")[0] ?? sessionStartTime,
      score: finalScore,
      total: questions.length,
      passed:
        questions.length === 0
          ? false
          : Math.round((finalScore / questions.length) * 100) >= PASSING_PERCENTAGE,
      answers: userAnswers,
    };

    setSessions((previousSessions) => [...previousSessions, completedSession]);
  }, [isFinished, questions.length, sessionStartTime, setSessions, userAnswers]);

  return {
    questions,
    currentIndex,
    userAnswers,
    isFinished,
    sessionStartTime,
    durationSeconds,
    answerQuestion,
    getCurrentQuestion,
    getProgress,
    getScore,
    restartQCM,
  };
};
