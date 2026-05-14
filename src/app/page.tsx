"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";

import { PASSING_PERCENTAGE } from "@/constants";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { QCMSession } from "@/types";

const THEMES: string[] = [
  "La Marseillaise",
  "Les symboles de la République",
  "Les valeurs de la République",
  "L'Union Européenne",
  "Les institutions françaises",
  "Vivre dans la société française",
];

interface SessionStats {
  sessionsCount: number;
  bestScore: number;
  successRate: number;
  lastSession: QCMSession | null;
}

const getSessionPercentage = (session: QCMSession): number => {
  if (session.total === 0) {
    return 0;
  }

  return Math.round((session.score / session.total) * 100);
};

const getSessionPassed = (session: QCMSession): boolean => {
  if (typeof session.passed === "boolean") {
    return session.passed;
  }

  return getSessionPercentage(session) >= PASSING_PERCENTAGE;
};

const getSessionTimestamp = (session: QCMSession): number => {
  const idAsNumber = Number(session.id);
  if (!Number.isNaN(idAsNumber)) {
    return idAsNumber;
  }

  return new Date(session.date).getTime();
};

const formatFrenchDate = (dateValue: string): string => {
  const isSimpleDate = /^\d{4}-\d{2}-\d{2}$/.test(dateValue);
  const normalizedDate = isSimpleDate ? `${dateValue}T00:00:00` : dateValue;

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(normalizedDate));
};

export default function Home() {
  const router = useRouter();
  const [sessions] = useLocalStorage<QCMSession[]>("qcm_sessions", []);

  const stats = useMemo<SessionStats>(() => {
    if (sessions.length === 0) {
      return {
        sessionsCount: 0,
        bestScore: 0,
        successRate: 0,
        lastSession: null,
      };
    }

    const sessionsCount = sessions.length;
    const bestScore = sessions.reduce((currentBest, session) => {
      return Math.max(currentBest, getSessionPercentage(session));
    }, 0);

    const passedSessions = sessions.filter((session) => getSessionPassed(session)).length;
    const successRate = Math.round((passedSessions / sessionsCount) * 100);

    const lastSession = sessions.reduce((latest, session) => {
      if (!latest) {
        return session;
      }

      return getSessionTimestamp(session) > getSessionTimestamp(latest) ? session : latest;
    }, null as QCMSession | null);

    return {
      sessionsCount,
      bestScore,
      successRate,
      lastSession,
    };
  }, [sessions]);

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        {/* Header / Hero */}
        <section className="rounded-2xl bg-white p-8 text-center shadow-md sm:p-10">
          <div className="mb-3 text-5xl sm:text-6xl" aria-hidden>
            🇫🇷
          </div>
          <h1 className="text-3xl font-bold text-blue-700 sm:text-4xl">
            Préparez votre entretien de naturalisation
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-gray-700 sm:text-lg">
            Testez vos connaissances sur la France avec 40 questions tirées aléatoirement
          </p>
        </section>

        {/* Bloc statistiques */}
        {sessions.length > 0 && (
          <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <article className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-sm text-gray-500">🎯 Meilleur score</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{stats.bestScore}%</p>
            </article>
            <article className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-sm text-gray-500">📝 Sessions effectuées</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{stats.sessionsCount}</p>
            </article>
            <article className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-sm text-gray-500">✅ Taux de réussite</p>
              <p className="mt-2 text-2xl font-bold text-blue-700">{stats.successRate}%</p>
            </article>
            <article className="rounded-xl bg-white p-5 shadow-md">
              <p className="text-sm text-gray-500">📅 Dernière session</p>
              {stats.lastSession && (
                <p className="mt-2 text-base font-semibold text-blue-700">
                  {formatFrenchDate(stats.lastSession.date)} — {getSessionPercentage(stats.lastSession)}%
                </p>
              )}
            </article>
          </section>
        )}

        {/* Call to action principal */}
        <section className="rounded-2xl bg-white p-8 text-center shadow-md sm:p-10">
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              type="button"
              className="w-full rounded-lg bg-blue-700 px-6 py-3 text-base font-semibold text-white transition hover:bg-blue-800 sm:w-auto"
              onClick={() => router.push("/qcm")}
            >
              Démarrer le QCM
            </button>
            {sessions.length > 0 && (
              <button
                type="button"
                className="w-full rounded-lg border border-blue-700 px-6 py-3 text-base font-semibold text-blue-700 transition hover:bg-blue-50 sm:w-auto"
                onClick={() => router.push("/progression")}
              >
                Voir ma progression
              </button>
            )}
          </div>
        </section>

        {/* Bloc informatif "Comment ça marche ?" */}
        <section className="rounded-2xl bg-white p-8 shadow-md sm:p-10">
          <h2 className="text-2xl font-bold text-blue-700">Comment ça marche ?</h2>
          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <article className="rounded-xl border border-gray-100 p-5">
              <p className="text-2xl text-red-600">1️⃣</p>
              <p className="mt-3 text-gray-700">
                40 questions tirées aléatoirement parmi tous les thèmes
              </p>
            </article>
            <article className="rounded-xl border border-gray-100 p-5">
              <p className="text-2xl text-red-600">2️⃣</p>
              <p className="mt-3 text-gray-700">
                Répondez à votre rythme, le temps est mesuré
              </p>
            </article>
            <article className="rounded-xl border border-gray-100 p-5">
              <p className="text-2xl text-red-600">3️⃣</p>
              <p className="mt-3 text-gray-700">
                Consultez votre score et les corrections détaillées
              </p>
            </article>
          </div>
        </section>

        {/* Bloc thèmes couverts */}
        <section className="rounded-2xl bg-white p-8 shadow-md sm:p-10">
          <h2 className="text-2xl font-bold text-blue-700">Thèmes couverts</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {THEMES.map((theme) => (
              <span
                key={theme}
                className="rounded-full bg-blue-100 px-4 py-2 text-sm font-medium text-blue-800"
              >
                {theme}
              </span>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
