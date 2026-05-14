"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { QUESTIONS_PER_SESSION } from "@/constants";
import { useQCM } from "@/hooks/useQCM";
import { Answer, Question, UserAnswer } from "@/types";

const ANSWER_ORDER: Answer[] = ["A", "B", "C", "D"];

interface CurrentSessionResult {
  completedAt: string;
  durationSeconds: number;
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  userAnswers: UserAnswer[];
  questions: Question[];
}

const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = (durationSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function QCMPage() {
  const router = useRouter();
  const {
    questions,
    currentIndex,
    userAnswers,
    isFinished,
    durationSeconds,
    answerQuestion,
    getCurrentQuestion,
    getScore,
  } = useQCM();

  // États locaux de sélection / validation.
  const [selectedAnswer, setSelectedAnswer] = useState<Answer | null>(null);
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);

  // États d'affichage pour conserver la question corrigée jusqu'au clic suivant.
  const [answeredQuestion, setAnsweredQuestion] = useState<Question | null>(null);
  const [answeredQuestionNumber, setAnsweredQuestionNumber] = useState<number>(1);
  const [wasAnswerCorrect, setWasAnswerCorrect] = useState<boolean>(false);

  // État local de modale d'abandon.
  const [isQuitModalOpen, setIsQuitModalOpen] = useState<boolean>(false);

  const hasRedirectedRef = useRef<boolean>(false);

  const currentQuestion = getCurrentQuestion();
  const questionToDisplay = hasAnswered ? answeredQuestion : currentQuestion;
  const displayedQuestionNumber = hasAnswered
    ? answeredQuestionNumber
    : Math.min(currentIndex + 1, QUESTIONS_PER_SESSION);

  const progressPercentage = useMemo(() => {
    return Math.min((displayedQuestionNumber / QUESTIONS_PER_SESSION) * 100, 100);
  }, [displayedQuestionNumber]);

  // Redirection automatique vers la page résultats quand la session est terminée.
  useEffect(() => {
    if (!isFinished || hasRedirectedRef.current) {
      return;
    }

    hasRedirectedRef.current = true;

    const score = getScore();
    const sessionResult: CurrentSessionResult = {
      completedAt: new Date().toISOString(),
      durationSeconds,
      score: score.score,
      total: score.total,
      percentage: score.percentage,
      passed: score.passed,
      userAnswers,
      questions,
    };

    window.localStorage.setItem("current_session_result", JSON.stringify(sessionResult));
    router.push("/resultats");
  }, [durationSeconds, getScore, isFinished, questions, router, userAnswers]);

  // Validation de la réponse courante + affichage immédiat du feedback.
  const handleValidateAnswer = (): void => {
    if (!selectedAnswer || !currentQuestion) {
      return;
    }

    setAnsweredQuestion(currentQuestion);
    setAnsweredQuestionNumber(currentIndex + 1);
    setWasAnswerCorrect(selectedAnswer === currentQuestion.correctAnswer);
    answerQuestion(selectedAnswer);
    setHasAnswered(true);
  };

  // Passage à la question suivante avec reset des états locaux de réponse.
  const handleNextQuestion = (): void => {
    setSelectedAnswer(null);
    setHasAnswered(false);
    setAnsweredQuestion(null);
    setWasAnswerCorrect(false);
  };

  // Gestion d'état initial pendant l'initialisation de session.
  if (!questionToDisplay) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl bg-white p-6 text-center shadow-md">
            <p className="text-gray-600">Chargement du QCM...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 pb-10">
      {/* Header fixe */}
      <header className="fixed inset-x-0 top-0 z-20 bg-white shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            onClick={() => setIsQuitModalOpen(true)}
          >
            <span aria-hidden>✕</span>
            <span>Abandonner</span>
          </button>

          <p className="text-sm font-semibold text-gray-700 sm:text-base">
            {formatDuration(durationSeconds)}
          </p>

          <p className="text-sm font-semibold text-gray-700 sm:text-base">
            Question {displayedQuestionNumber} / {QUESTIONS_PER_SESSION}
          </p>
        </div>

        {/* Barre de progression */}
        <div className="h-2 w-full bg-gray-200">
          <div
            className="h-2 bg-blue-700 transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 pt-28 sm:px-6">
        {/* Bloc question */}
        <section className="rounded-2xl bg-white p-6 shadow-md">
          <p className="mb-3 text-sm text-gray-500">Question {displayedQuestionNumber}</p>
          <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-800">
            {questionToDisplay.theme}
          </span>
          <h1 className="mt-4 text-xl font-bold text-gray-900 sm:text-2xl">
            {questionToDisplay.question}
          </h1>
        </section>

        {/* Grille des options de réponse */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {ANSWER_ORDER.map((option) => {
            const isSelected = selectedAnswer === option;
            const isCorrectOption = option === questionToDisplay.correctAnswer;
            const isWrongSelected = hasAnswered && isSelected && !isCorrectOption;

            const optionStateClasses = hasAnswered
              ? isCorrectOption
                ? "bg-green-50 border-green-600 text-green-800"
                : isWrongSelected
                  ? "bg-red-50 border-red-600 text-red-800"
                  : "bg-gray-50 border-gray-200 text-gray-400"
              : isSelected
                ? "bg-blue-50 border-blue-700"
                : "bg-white border-gray-200 hover:border-blue-700 hover:bg-blue-50";

            const badgeClasses = hasAnswered
              ? isCorrectOption
                ? "bg-green-600 text-white"
                : isWrongSelected
                  ? "bg-red-600 text-white"
                  : "bg-gray-300 text-gray-600"
              : isSelected
                ? "bg-blue-700 text-white"
                : "bg-blue-100 text-blue-800";

            const badgeContent = hasAnswered ? (isCorrectOption ? "✓" : isWrongSelected ? "✗" : option) : option;

            return (
              <button
                key={option}
                type="button"
                disabled={hasAnswered}
                onClick={() => setSelectedAnswer(option)}
                className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition ${optionStateClasses} ${hasAnswered ? "cursor-not-allowed" : "cursor-pointer"}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${badgeClasses}`}
                >
                  {badgeContent}
                </span>
                <span className="text-sm font-medium text-current sm:text-base">
                  {questionToDisplay.options[option]}
                </span>
              </button>
            );
          })}
        </section>

        {/* Bloc feedback */}
        {hasAnswered ? (
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <div
              className={`rounded-lg border p-4 text-sm font-semibold ${
                wasAnswerCorrect
                  ? "border-green-600 bg-green-50 text-green-800"
                  : "border-red-600 bg-red-50 text-red-800"
              }`}
            >
              {wasAnswerCorrect ? "✓ Bonne réponse !" : "✗ Mauvaise réponse"}
            </div>

            {questionToDisplay.explanation && (
              <p className="mt-4 text-sm text-gray-700 sm:text-base">{questionToDisplay.explanation}</p>
            )}

            <button
              type="button"
              onClick={handleNextQuestion}
              className="mt-5 w-full rounded-lg bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
            >
              {displayedQuestionNumber === QUESTIONS_PER_SESSION
                ? "Voir mes résultats →"
                : "Question suivante →"}
            </button>
          </section>
        ) : (
          // Bouton de validation
          <section className="rounded-2xl bg-white p-6 shadow-md">
            <button
              type="button"
              disabled={!selectedAnswer}
              onClick={handleValidateAnswer}
              className={`w-full rounded-lg px-4 py-3 text-sm font-semibold transition sm:w-auto ${
                selectedAnswer
                  ? "bg-blue-700 text-white hover:bg-blue-800"
                  : "cursor-not-allowed bg-gray-200 text-gray-400"
              }`}
            >
              Valider ma réponse
            </button>
          </section>
        )}
      </div>

      {/* Modale de confirmation d'abandon */}
      {isQuitModalOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900">Abandonner le QCM ?</h2>
            <p className="mt-2 text-sm text-gray-600">
              Votre progression sera perdue. Êtes-vous sûr de vouloir quitter ?
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsQuitModalOpen(false)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
              >
                Continuer le QCM
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Abandonner
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
