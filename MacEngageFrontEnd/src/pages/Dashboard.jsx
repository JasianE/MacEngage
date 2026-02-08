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


  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow p-6 flex justify-between items-center">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white">
          Dashboard
        </h1>

        {/* Button Group */}
        <div className="flex gap-4">
          <button
            onClick={handleLogout}
            className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-4 rounded transition-colors cursor-pointer"
          >
            Logout
          </button>

          <button
            onClick={() => navigate("/live-session")}
            className="bg-primary text-white font-bold py-2 px-4 rounded hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Start Live Session
          </button>
        </div>
      </header>

      {/* Sessions list */}
      <main className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-4">
          Previous Sessions
        </h2>

        {loading ? (
          <p className="text-slate-500 dark:text-slate-400">Loading previous sessions...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No previous sessions found.
            </p>
          ) : (
            sessions.map((session, index) => {
              const score = getSessionScore(session);
              const scoreBars = [16, 24, 20, 30, 26];
              const activeBars = score == null ? 0 : Math.max(1, Math.ceil(score / 20));

              return (
              <div
                key={session.id}
                onClick={() => navigate(`/session/${session.id}`)}
                className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow p-4 cursor-pointer hover:shadow-lg hover:border-slate-300 dark:hover:border-slate-500 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="font-bold text-xl text-slate-900 dark:text-white leading-tight">
                      {session.title || session.name || `Session ${session.id?.slice(0, 8) || ""}`}
                    </h3>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                      {formatSessionDate(
                        session.startedAt ||
                          session.createdAt ||
                          session.date ||
                          session.seededAt ||
                          session.endedAt,
                      )}
                    </p>
                  </div>

                  <div className="flex flex-col items-end justify-center shrink-0">
                    <span className="text-2xl font-extrabold text-emerald-500 dark:text-emerald-400 leading-none">
                      {score == null ? "--" : `${score}%`}
                    </span>
                    <div className="mt-3 flex items-end gap-1">
                      {scoreBars.map((height, barIndex) => {
                        const isActive = barIndex < activeBars;
                        const adjustedHeight = scoreBars[(barIndex + index) % scoreBars.length];

                        return (
                          <span
                            key={`${session.id || index}-bar-${barIndex}`}
                            className={`w-2.5 rounded-full transition-opacity ${
                              isActive
                                ? "bg-emerald-500 dark:bg-emerald-400"
                                : "bg-emerald-200 dark:bg-emerald-900/60"
                            }`}
                            style={{ height: `${adjustedHeight}px` }}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
            })
          )}
        </div>
        )}
      </main>
    </div>
  );
}
