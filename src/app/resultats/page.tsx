"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { Answer, QCMSession, Question, UserAnswer } from "@/types";

interface CurrentSessionResult {
  questions: Question[];
  userAnswers: UserAnswer[];
  score: number;
  total: number;
  percentage: number;
  passed: boolean;
  durationSeconds: number;
}

const ANSWER_ORDER: Answer[] = ["A", "B", "C", "D"];

const formatFrenchDate = (dateValue: string): string => {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));
};

const formatDuration = (durationSeconds: number): string => {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return `${minutes}min ${seconds.toString().padStart(2, "0")}s`;
};

const getResultEmoji = (percentage: number): string => {
  if (percentage >= 80) {
    return "🏆";
  }
  if (percentage >= 50) {
    return "👍";
  }
  return "💪";
};

const getEncouragementText = (percentage: number): string => {
  if (percentage >= 80) {
    return "Excellent ! Vous êtes prêt(e) pour l&apos;entretien.";
  }
  if (percentage >= 50) {
    return "Bien ! Continuez à réviser pour progresser.";
  }
  return "Courage ! Chaque session vous rapproche de l'objectif.";
};

const getProgressBarClassName = (percentage: number): string => {
  if (percentage >= 80) {
    return "bg-green-500";
  }
  if (percentage >= 50) {
    return "bg-yellow-500";
  }
  return "bg-red-500";
};

type FilterKey = "all" | "correct" | "incorrect";

interface CorrectedQuestion {
  question: Question;
  userAnswer: Answer | null;
  isCorrect: boolean;
}

export default function ResultatsPage() {
  const router = useRouter();
  const [sessionResult, setSessionResult] = useState<CurrentSessionResult | null>(null);
  const [completedAt, setCompletedAt] = useState<string>("");

  // États locaux de la page résultats.
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  // Garde anti double-exécution (React Strict Mode).
  const hasSavedRef = useRef<boolean>(false);

  // Chargement, sauvegarde historique et redirection si accès direct.
  useEffect(() => {
    if (hasSavedRef.current) {
      return;
    }

    const rawSession = window.localStorage.getItem("current_session_result");
    if (!rawSession) {
      router.push("/");
      return;
    }

    let parsedSession: CurrentSessionResult;

    try {
      parsedSession = JSON.parse(rawSession) as CurrentSessionResult;
    } catch {
      router.push("/");
      return;
    }

    const historyRaw = window.localStorage.getItem("qcm_sessions");
    const history = historyRaw ? (JSON.parse(historyRaw) as QCMSession[]) : [];
    const nowIso = new Date().toISOString();

    const nextSession: QCMSession = {
      id: crypto.randomUUID(),
      date: nowIso,
      score: parsedSession.score,
      total: parsedSession.total,
      passed: parsedSession.passed,
      answers: parsedSession.userAnswers,
    };

    window.localStorage.setItem("qcm_sessions", JSON.stringify([...history, nextSession]));
    window.localStorage.removeItem("current_session_result");

    queueMicrotask(() => {
      setSessionResult(parsedSession);
      setCompletedAt(nowIso);
    });
    hasSavedRef.current = true;
  }, [router]);

  // Accordéon: un seul item ouvert à la fois.
  const handleToggleQuestion = (questionId: number): void => {
    setExpandedQuestion((previous) => (previous === questionId ? null : questionId));
  };

  const correctedQuestions = useMemo<CorrectedQuestion[]>(() => {
    if (!sessionResult) {
      return [];
    }

    const answerMap = new Map<number, UserAnswer>(
      sessionResult.userAnswers.map((userAnswer) => [userAnswer.questionId, userAnswer])
    );

    return sessionResult.questions.map((question) => {
      const userAnswer = answerMap.get(question.id);
      return {
        question,
        userAnswer: userAnswer?.userAnswer ?? null,
        isCorrect: userAnswer?.isCorrect ?? false,
      };
    });
  }, [sessionResult]);

  const correctCount = useMemo<number>(() => {
    return correctedQuestions.filter((item) => item.isCorrect).length;
  }, [correctedQuestions]);

  const incorrectCount = useMemo<number>(() => {
    return correctedQuestions.length - correctCount;
  }, [correctCount, correctedQuestions.length]);

  const filteredQuestions = useMemo<CorrectedQuestion[]>(() => {
    if (activeFilter === "correct") {
      return correctedQuestions.filter((item) => item.isCorrect);
    }
    if (activeFilter === "incorrect") {
      return correctedQuestions.filter((item) => !item.isCorrect);
    }
    return correctedQuestions;
  }, [activeFilter, correctedQuestions]);

  if (!sessionResult) {
    return (
      <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto w-full max-w-6xl rounded-2xl bg-white p-8 text-center shadow-md">
          <p className="text-gray-600">Chargement des résultats...</p>
        </div>
      </main>
    );
  }

  const dateLabel = completedAt ? formatFrenchDate(completedAt) : "";
  const durationLabel = formatDuration(sessionResult.durationSeconds);
  const resultEmoji = getResultEmoji(sessionResult.percentage);
  const encouragementText = getEncouragementText(sessionResult.percentage);
  const progressBarClassName = getProgressBarClassName(sessionResult.percentage);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* Header */}
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex w-fit items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ← Retour à l&apos;accueil
          </button>

          <h1 className="text-2xl font-bold text-blue-700 sm:text-3xl">Résultats du QCM</h1>

          <p className="text-sm font-medium text-gray-600">
            {dateLabel} — {durationLabel}
          </p>
        </header>

        {/* Bloc score principal */}
        <section className="rounded-2xl bg-white p-8 text-center shadow-md">
          <div className="text-6xl" aria-hidden>
            {resultEmoji}
          </div>
          <p className="mt-4 text-5xl font-extrabold text-gray-900 sm:text-6xl">
            {sessionResult.score} / {sessionResult.total}
          </p>
          <p className="mt-2 text-3xl font-bold text-blue-700 sm:text-4xl">{sessionResult.percentage}%</p>
          <div className="mt-4">
            <span
              className={`inline-flex rounded-full border px-4 py-2 text-sm font-semibold ${
                sessionResult.passed
                  ? "border-green-200 bg-green-50 text-green-600"
                  : "border-red-200 bg-red-50 text-red-600"
              }`}
            >
              {sessionResult.passed ? "✓ Admissible" : "✗ Non admissible"}
            </span>
          </div>
          <p className="mx-auto mt-4 max-w-2xl text-base text-gray-700">{encouragementText}</p>
        </section>

        {/* Bloc statistiques */}
        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <article className="rounded-xl bg-white p-5 shadow-md">
            <p className="text-sm text-gray-500">✅ Bonnes réponses</p>
            <p className="mt-2 text-2xl font-bold text-green-700">
              {correctCount} / {sessionResult.total}
            </p>
          </article>

          <article className="rounded-xl bg-white p-5 shadow-md">
            <p className="text-sm text-gray-500">❌ Mauvaises réponses</p>
            <p className="mt-2 text-2xl font-bold text-red-700">
              {incorrectCount} / {sessionResult.total}
            </p>
          </article>

          <article className="rounded-xl bg-white p-5 shadow-md">
            <p className="text-sm text-gray-500">⏱️ Temps total</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{durationLabel}</p>
          </article>

          <article className="rounded-xl bg-white p-5 shadow-md">
            <p className="text-sm text-gray-500">📊 Taux de réussite</p>
            <p className="mt-2 text-2xl font-bold text-blue-700">{sessionResult.percentage}%</p>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div
                className={`h-2 rounded-full ${progressBarClassName}`}
                style={{ width: `${sessionResult.percentage}%` }}
              />
            </div>
          </article>
        </section>

        {/* Boutons d'action */}
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => router.push("/qcm")}
            className="w-full rounded-lg bg-blue-700 px-5 py-3 text-base font-semibold text-white transition hover:bg-blue-800"
          >
            🔄 Nouveau QCM
          </button>
          <button
            type="button"
            onClick={() => router.push("/progression")}
            className="w-full rounded-lg border border-blue-700 px-5 py-3 text-base font-semibold text-blue-700 transition hover:bg-blue-50"
          >
            📈 Voir ma progression
          </button>
        </section>

        {/* Section correction détaillée */}
        <section className="rounded-2xl bg-white p-5 shadow-md sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-blue-700 sm:text-2xl">Correction détaillée</h2>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeFilter === "all"
                    ? "border-blue-700 bg-blue-700 text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                Toutes ({sessionResult.total})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("correct")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeFilter === "correct"
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                Correctes ({correctCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("incorrect")}
                className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  activeFilter === "incorrect"
                    ? "border-red-600 bg-red-600 text-white"
                    : "border-gray-300 bg-white text-gray-600"
                }`}
              >
                Incorrectes ({incorrectCount})
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3">
            {filteredQuestions.map(({ question, userAnswer, isCorrect }) => {
              const isExpanded = expandedQuestion === question.id;

              return (
                <article key={question.id} className="rounded-xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleToggleQuestion(question.id)}
                    className="w-full rounded-xl p-4 text-left transition hover:bg-gray-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">Question {question.id}</span>
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                            {question.theme}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 sm:text-base">{question.question}</p>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={`text-xl font-bold ${isCorrect ? "text-green-600" : "text-red-600"}`}
                          aria-label={isCorrect ? "Bonne réponse" : "Mauvaise réponse"}
                        >
                          {isCorrect ? "✓" : "✗"}
                        </span>
                        <span className="text-gray-500">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-200 px-4 pb-4 pt-3">
                      <div className="flex flex-col gap-2">
                        {ANSWER_ORDER.map((option) => {
                          const isCorrectOption = question.correctAnswer === option;
                          const isWrongSelected = userAnswer === option && !isCorrectOption;

                          const optionClassName = isCorrectOption
                            ? "bg-green-50 border-green-400 text-green-800"
                            : isWrongSelected
                              ? "bg-red-50 border-red-400 text-red-800"
                              : "bg-gray-50 border-gray-200 text-gray-600";

                          return (
                            <div
                              key={option}
                              className={`rounded-lg border p-3 text-sm font-medium sm:text-base ${optionClassName}`}
                            >
                              <div className="flex items-start gap-2">
                                <span className="font-bold">
                                  {option} {isCorrectOption ? "✓" : isWrongSelected ? "✗" : ""}
                                </span>
                                <span>{question.options[option]}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-blue-800">
                        <p className="text-sm sm:text-base">
                          <span className="mr-1" aria-hidden>
                            💡
                          </span>
                          {question.explanation ?? "Pas d'explication disponible pour cette question."}
                        </p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
