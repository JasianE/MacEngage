import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getAllSessionInfo } from "../utils/fetchResponseData";

function formatSessionDate(rawValue) {
  if (!rawValue) return "Date unavailable";

  const formatDate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Date unavailable";
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  };

  if (typeof rawValue === "string") {
    return formatDate(rawValue);
  }

  if (typeof rawValue === "number") {
    // Accept both epoch milliseconds and epoch seconds.
    const timestampMs = rawValue < 1_000_000_000_000 ? rawValue * 1000 : rawValue;
    return formatDate(timestampMs);
  }

  const seconds = rawValue.seconds ?? rawValue._seconds;
  if (typeof seconds === "number") {
    return formatDate(seconds * 1000);
  }

  return "Date unavailable";
}

function getSessionScore(session) {
  const rawScore =
    session?.overallScore ??
    session?.engagementScore ??
    session?.averageEngagement ??
    session?.score;

  if (typeof rawScore !== "number" || Number.isNaN(rawScore)) return null;
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

function getMiniBarHeights(score, seed = 0) {
  const base = [24, 36, 30, 44, 38];
  const minHeight = 14;
  const maxHeight = 56;
  const intensity = typeof score === "number" ? score / 100 : 0;

  return base.map((height, index) => {
    const jitter = ((seed + index) % 3) * 2;
    const scaled = Math.round(height * (0.45 + intensity * 0.55)) + jitter;
    return Math.max(minHeight, Math.min(maxHeight, scaled));
  });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
      const savedUUID = localStorage.getItem("userUUID");

      if (!savedUUID || savedUUID === "undefined") {
        navigate('/');
        return; // prevent fetch from running
      }

      const fetchData = async () => {
        try {
          setLoading(true);
          setError("");
          const response = await getAllSessionInfo(savedUUID);
          const sessionList = response?.data?.sessions ?? [];
          setSessions(sessionList);
        } catch (error) {
          console.error("Fetch error:", error);
          setError(error.message || "Failed to load previous sessions.");
        } finally {
          setLoading(false);
        }
      };

      fetchData();
    }, [navigate]);

    const handleLogout = () => {
      localStorage.removeItem("userUUID"); // clear cached UUID
      navigate("/"); // redirect to landing page
    };

  const sessionsWithScores = sessions
    .map((session) => ({
      session,
      score: getSessionScore(session),
    }))
    .filter((entry) => typeof entry.score === "number");

  const hasGlobalScore = sessionsWithScores.length > 0;
  const globalScore = hasGlobalScore
    ? Math.round(
        sessionsWithScores.reduce((sum, entry) => sum + entry.score, 0) /
          sessionsWithScores.length,
      )
    : null;

  const trendDelta =
    sessionsWithScores.length >= 2
      ? sessionsWithScores[sessionsWithScores.length - 1].score -
        sessionsWithScores[sessionsWithScores.length - 2].score
      : null;

  const chartBars = hasGlobalScore
    ? sessionsWithScores.slice(-7).map((entry) => entry.score)
    : [];

  const paddedChartBars =
    chartBars.length < 7
      ? [...Array(7 - chartBars.length).fill(0), ...chartBars]
      : chartBars;


  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900 font-sans">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col border-r border-gray-200 bg-white">
        <div className="px-6 py-6">
          <h1 className="text-2xl font-extrabold tracking-tight">
            Engage<span className="text-emerald-500">mint</span>
          </h1>
        </div>

        <nav className="flex-1 pt-2">
          <button
            type="button"
            className="flex w-full items-center gap-3 border-r-4 border-emerald-500 bg-emerald-50 px-6 py-4 text-sm font-semibold text-emerald-600"
          >
            <span className="text-base">▣</span>
            Dashboard
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 px-6 py-4 text-sm font-medium text-gray-500"
          >
            <span className="text-base">◫</span>
            Analysis
          </button>
        </nav>

      </aside>

      <div className="ml-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-20 items-center justify-between border-b border-gray-200 bg-white px-8">
          <h2 className="text-xl font-bold text-gray-900">Dashboard</h2>

          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/live-session")}
              className="rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 cursor-pointer"
            >
              New Session
            </button>

            <button
              onClick={handleLogout}
              className="rounded-full border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 cursor-pointer"
            >
              Logout
            </button>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 space-y-8 p-8">
          {!loading && !error && hasGlobalScore && (
            <section className="rounded-3xl border border-gray-100 bg-white p-8 shadow-sm">
              <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
                Global Engagement
              </h3>

              <div className="mb-7 flex items-end gap-3">
                <span className="text-6xl font-black leading-none text-gray-900">
                  {globalScore}
                </span>
                <span className="mb-1 text-2xl font-bold text-gray-400">/100</span>

                {typeof trendDelta === "number" && (
                  <span
                    className={`mb-2 ml-3 rounded-lg px-2 py-1 text-xs font-bold ${
                      trendDelta >= 0
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-rose-50 text-rose-600"
                    }`}
                  >
                    {trendDelta >= 0 ? "+" : ""}
                    {trendDelta}%
                  </span>
                )}
              </div>

              <div className="flex h-44 items-end justify-between gap-2 rounded-2xl bg-gray-50 p-4">
                {paddedChartBars.map((barValue, barIndex) => (
                  <div key={`global-bar-${barIndex}`} className="flex flex-1 justify-center">
                    <span
                      className={`w-7 rounded-t-xl ${
                        barIndex === paddedChartBars.length - 1
                          ? "bg-emerald-500"
                          : "bg-emerald-200"
                      }`}
                      style={{ height: `${Math.max(10, Math.round(barValue * 1.2))}px` }}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="mb-5 text-2xl font-black text-gray-900">Recent Sessions</h3>

            {loading ? (
              <p className="text-sm text-gray-500">Loading recent sessions...</p>
            ) : error ? (
              <p className="text-sm font-medium text-red-500">{error}</p>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-gray-500">No previous sessions found.</p>
            ) : (
              <div className="space-y-4">
                {sessions.map((session, index) => {
                  const score = getSessionScore(session);
                  const miniBars = getMiniBarHeights(score, index);

                  return (
                    <article
                      key={session.id || `session-${index}`}
                      onClick={() => navigate(`/session/${session.id}`)}
                      className="cursor-pointer rounded-3xl border border-gray-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-6">
                        <div className="min-w-0">
                          <h4 className="truncate text-lg font-bold text-gray-900">
                            {session.title ||
                              session.name ||
                              `Session ${session.id?.slice(0, 8) || index + 1}`}
                          </h4>
                          <p className="mt-1 text-xs font-medium text-gray-500">
                            {formatSessionDate(
                              session.startedAt ||
                                session.createdAt ||
                                session.date ||
                                session.seededAt ||
                                session.endedAt,
                            )}
                          </p>
                        </div>

                        {typeof score === "number" && (
                          <div className="flex items-end gap-6">
                            <div className="flex h-14 items-end gap-1">
                              {miniBars.map((height, barIndex) => (
                                <span
                                  key={`session-${session.id || index}-bar-${barIndex}`}
                                  className={`w-2.5 rounded-t-full ${
                                    barIndex >= miniBars.length - 2
                                      ? "bg-emerald-500"
                                      : "bg-emerald-200"
                                  }`}
                                  style={{ height: `${height}px` }}
                                />
                              ))}
                            </div>

                            <span className="text-2xl font-black leading-none text-emerald-500">
                              {score}%
                            </span>
                          </div>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </main>
      </div>
    </div>
  );
}
