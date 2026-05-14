"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";

import { useLocalStorage } from "@/hooks/useLocalStorage";
import { QCMSession } from "@/types";

interface SessionWithMetrics extends QCMSession {
  percentage: number;
  passed: boolean;
  durationSeconds: number;
}

const CHART_WIDTH = 800;
const CHART_HEIGHT = 300;
const PADDING_TOP = 20;
const PADDING_RIGHT = 20;
const PADDING_BOTTOM = 40;
const PADDING_LEFT = 40;

const chartWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
const chartHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

const formatShortDate = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getDate()}/${date.getMonth() + 1}`;
};

const formatDuration = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s.toString().padStart(2, "0")}s`;
};

const getSessionPercentage = (session: QCMSession): number => {
  if (typeof session.percentage === "number" && Number.isFinite(session.percentage)) {
    return Math.min(Math.max(Math.round(session.percentage), 0), 100);
  }

  if (session.total <= 0) {
    return 0;
  }

  return Math.round((session.score / session.total) * 100);
};

const normalizeSession = (session: QCMSession): SessionWithMetrics => {
  const durationSeconds =
    typeof session.durationSeconds === "number" && Number.isFinite(session.durationSeconds)
      ? Math.max(0, Math.floor(session.durationSeconds))
      : 0;

  return {
    ...session,
    percentage: getSessionPercentage(session),
    passed: session.passed === true,
    durationSeconds,
  };
};

export default function ProgressionPage() {
  const router = useRouter();
  const [rawSessions] = useLocalStorage<QCMSession[]>("qcm_sessions", []);

  const sessions = useMemo<SessionWithMetrics[]>(() => {
    return rawSessions.map(normalizeSession);
  }, [rawSessions]);

  const sessionsAsc = useMemo<SessionWithMetrics[]>(() => {
    return [...sessions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [sessions]);

  const sessionsDesc = useMemo<SessionWithMetrics[]>(() => {
    return [...sessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [sessions]);

  const totalSessions = sessions.length;
  const bestScore = totalSessions > 0 ? Math.max(...sessions.map((session) => session.percentage)) : 0;
  const averageScore =
    totalSessions > 0
      ? Math.round(
          sessions.reduce((sum, session) => sum + session.percentage, 0) / totalSessions
        )
      : 0;
  const successRate =
    totalSessions > 0
      ? Math.round(
          (sessions.filter((session) => session.passed === true).length / totalSessions) * 100
        )
      : 0;

  const xStep = chartWidth / Math.max(sessionsAsc.length - 1, 1);
  const toX = useCallback((index: number): number => PADDING_LEFT + index * xStep, [xStep]);
  const toY = useCallback(
    (percentage: number): number => PADDING_TOP + chartHeight - (percentage / 100) * chartHeight,
    []
  );

  const linePath = useMemo<string>(() => {
    if (sessionsAsc.length === 0) {
      return "";
    }

    return sessionsAsc
      .map((session, index) => {
        const x = toX(index);
        const y = toY(session.percentage);
        return `${index === 0 ? "M" : "L"} ${x},${y}`;
      })
      .join(" ");
  }, [sessionsAsc, toX, toY]);

  const areaPath = useMemo<string>(() => {
    if (sessionsAsc.length === 0) {
      return "";
    }

    const firstX = toX(0);
    const lastX = toX(sessionsAsc.length - 1);
    const baselineY = PADDING_TOP + chartHeight;
    const linePoints = sessionsAsc
      .map((session, index) => `L ${toX(index)},${toY(session.percentage)}`)
      .join(" ");

    return `M ${firstX},${toY(sessionsAsc[0].percentage)} ${linePoints} L ${lastX},${baselineY} L ${firstX},${baselineY} Z`;
  }, [sessionsAsc, toX, toY]);

  const shouldShowAllXLabels = sessionsAsc.length <= 10;

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        {/* En-tête */}
        <header className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-md sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex w-fit items-center rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
          >
            ← Retour à l&apos;accueil
          </button>
          <h1 className="text-2xl font-bold text-blue-700 sm:text-3xl">Ma Progression</h1>
        </header>

        {totalSessions === 0 ? (
          /* État vide */
          <section className="rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-5xl" aria-hidden>
              📊
            </p>
            <p className="mt-4 text-xl font-bold text-gray-900">Aucune session enregistrée</p>
            <p className="mt-2 text-gray-600">
              Commencez votre premier QCM pour voir votre progression
            </p>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="mt-6 rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              Démarrer un QCM
            </button>
          </section>
        ) : (
          <>
            {/* Bloc statistiques globales */}
            <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Sessions totales</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{totalSessions}</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Meilleur score</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{bestScore}%</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Moyenne générale</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{averageScore}%</p>
              </article>
              <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <p className="text-sm text-gray-500">Taux de réussite</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{successRate}%</p>
              </article>
            </section>

            {/* Courbe d'évolution (SVG natif) */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Évolution des scores</h2>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <svg viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="h-[300px] w-full">
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>

                    {[0, 25, 50, 75, 100].map((value) => (
                      <g key={value}>
                        <line
                          x1={PADDING_LEFT}
                          y1={toY(value)}
                          x2={CHART_WIDTH - PADDING_RIGHT}
                          y2={toY(value)}
                          stroke="#e5e7eb"
                          strokeDasharray="4"
                        />
                        <text
                          x={PADDING_LEFT - 8}
                          y={toY(value)}
                          textAnchor="end"
                          fontSize={11}
                          fill="#9ca3af"
                          dominantBaseline="middle"
                        >
                          {value}%
                        </text>
                      </g>
                    ))}

                    <line
                      x1={PADDING_LEFT}
                      y1={toY(75)}
                      x2={CHART_WIDTH - PADDING_RIGHT}
                      y2={toY(75)}
                      stroke="#ef4444"
                      strokeDasharray="6,3"
                      strokeWidth={1.5}
                    />
                    <text x={CHART_WIDTH - PADDING_RIGHT + 4} y={toY(75)} fontSize={11} fill="#ef4444">
                      Seuil 75%
                    </text>

                    <path d={areaPath} fill="url(#areaGradient)" opacity={0.3} />
                    <path
                      d={linePath}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                    />

                    {sessionsAsc.map((session, index) => (
                      <circle
                        key={session.id}
                        cx={toX(index)}
                        cy={toY(session.percentage)}
                        r={5}
                        fill={session.passed ? "#22c55e" : "#ef4444"}
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}

                    {sessionsAsc.map((session, index) => {
                      const showLabel =
                        shouldShowAllXLabels || index % 2 === 0 || index === sessionsAsc.length - 1;
                      if (!showLabel) {
                        return null;
                      }

                      return (
                        <text
                          key={`${session.id}-x-label`}
                          x={toX(index)}
                          y={CHART_HEIGHT - 10}
                          textAnchor="middle"
                          fontSize={11}
                          fill="#6b7280"
                        >
                          {formatShortDate(session.date)}
                        </text>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </section>

            {/* Tableau historique des sessions */}
            <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <h2 className="mb-4 text-lg font-bold text-gray-900">Historique des sessions</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-gray-600">
                    <tr>
                      <th className="px-3 py-3 font-semibold">#</th>
                      <th className="px-3 py-3 font-semibold">Date</th>
                      <th className="px-3 py-3 font-semibold">Score</th>
                      <th className="px-3 py-3 font-semibold">%</th>
                      <th className="px-3 py-3 font-semibold">Durée</th>
                      <th className="px-3 py-3 font-semibold">Résultat</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionsDesc.map((session, index) => (
                      <tr key={session.id} className="border-b border-gray-100 last:border-b-0">
                        <td className="px-3 py-3 font-medium text-gray-900">{index + 1}</td>
                        <td className="px-3 py-3 text-gray-700">
                          {new Date(session.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td className="px-3 py-3 text-gray-700">
                          {session.score} / {session.total}
                        </td>
                        <td className="px-3 py-3 font-semibold text-gray-900">{session.percentage}%</td>
                        <td className="px-3 py-3 text-gray-700">{formatDuration(session.durationSeconds)}</td>
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              session.passed
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {session.passed ? "✓ Réussi" : "✗ Échoué"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
