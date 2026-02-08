import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LineChart } from "@mui/x-charts/LineChart";
import { getAllSessionInfo, getSessionLiveData } from "../utils/fetchResponseData";

const CHART_COLORS = ["#4338ca", "#9333ea", "#0ea5e9", "#10b981", "#f59e0b", "#ef4444"];

function formatSessionDate(rawValue) {
  if (!rawValue) return "Date unavailable";

  const parsed = new Date(rawValue);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(parsed);
}

function getSessionTitle(session, index = 0) {
  return (
    session?.title ||
    session?.name ||
    session?.className ||
    `Session ${String(session?.id || index + 1).slice(0, 8)}`
  );
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

function normalizeLiveDataToMinuteBuckets(liveData = []) {
  const bucketMap = new Map();

  liveData.forEach((point) => {
    const rawSecond = point?.timeSinceStart ?? point?.["time-since-session-started"];
    const rawScore = point?.engagementScore ?? point?.["engagement-score"];

    if (typeof rawSecond !== "number" || typeof rawScore !== "number") return;

    const minute = Math.max(0, Math.floor(rawSecond / 60));
    const previous = bucketMap.get(minute) ?? { total: 0, count: 0 };
    previous.total += rawScore;
    previous.count += 1;
    bucketMap.set(minute, previous);
  });

  const minuteToScore = new Map();
  let maxMinute = 0;

  bucketMap.forEach((value, minute) => {
    const avg = value.count ? Math.round(value.total / value.count) : null;
    if (typeof avg === "number") {
      minuteToScore.set(minute, Math.max(0, Math.min(100, avg)));
      maxMinute = Math.max(maxMinute, minute);
    }
  });

  return { minuteToScore, maxMinute };
}

function buildInsights(selectedSessions, refreshCount) {
  const sessionNames = selectedSessions.map((s, i) => getSessionTitle(s, i));

  if (sessionNames.length === 0) {
    return {
      summary:
        "Select at least one session to generate AI-powered engagement insights. This is currently a placeholder wrapper.",
      recommendations: [
        "Choose sessions with different teaching formats for stronger comparisons.",
        "Use Refresh Insights after updating your selected sessions.",
        "AI-generated intervention recommendations will appear here when enabled.",
      ],
    };
  }

  const headlinePair =
    sessionNames.length === 1
      ? sessionNames[0]
      : `${sessionNames[0]} and ${sessionNames[1]}`;

  return {
    summary:
      refreshCount % 2 === 0
        ? `Placeholder AI summary for ${headlinePair}. This panel will describe when engagement rises or drops across selected sessions, plus which instructional moments appear most effective.`
        : `Placeholder AI summary refreshed for ${headlinePair}. This section will surface cross-session patterns, focus dips, and likely engagement drivers once the AI backend is connected.`,
    recommendations: [
      "Placeholder: suggested timing adjustments will appear here.",
      "Placeholder: suggested activity format swaps will appear here.",
      "Placeholder: suggested recapture strategies will appear here.",
    ],
  };
}

export default function Analysis() {
  const navigate = useNavigate();

  const [sessions, setSessions] = useState([]);
  const [selectedSessionIds, setSelectedSessionIds] = useState([]);
  const [selectedToAdd, setSelectedToAdd] = useState("");
  const [liveDataBySession, setLiveDataBySession] = useState({});
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshCount, setRefreshCount] = useState(0);

  useEffect(() => {
    const userUUID = localStorage.getItem("userUUID");
    if (!userUUID || userUUID === "undefined") {
      navigate("/");
      return;
    }

    const fetchSessions = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await getAllSessionInfo(userUUID);
        const sessionList = response?.data?.sessions ?? [];
        setSessions(sessionList);

        const sorted = [...sessionList].sort((a, b) => {
          const aTime = new Date(a?.startedAt || a?.createdAt || 0).getTime() || 0;
          const bTime = new Date(b?.startedAt || b?.createdAt || 0).getTime() || 0;
          return bTime - aTime;
        });

        const defaults = sorted.slice(0, 2).map((session) => session.id).filter(Boolean);
        setSelectedSessionIds(defaults);
      } catch (err) {
        console.error("Failed to load sessions:", err);
        setError(err.message || "Failed to load sessions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [navigate]);

  useEffect(() => {
    if (selectedSessionIds.length === 0) {
      setLiveDataBySession({});
      return;
    }

    const fetchSelectedLiveData = async () => {
      try {
        setChartLoading(true);
        const responses = await Promise.all(
          selectedSessionIds.map(async (sessionId) => {
            const payload = await getSessionLiveData(sessionId, 500);
            return [sessionId, payload?.data?.liveData ?? []];
          }),
        );

        setLiveDataBySession(Object.fromEntries(responses));
      } catch (err) {
        console.error("Failed to load session live data:", err);
      } finally {
        setChartLoading(false);
      }
    };

    fetchSelectedLiveData();
  }, [selectedSessionIds]);

  const selectedSessions = useMemo(
    () => selectedSessionIds.map((id) => sessions.find((session) => session.id === id)).filter(Boolean),
    [selectedSessionIds, sessions],
  );

  const chartData = useMemo(() => {
    const normalized = selectedSessions.map((session) => {
      const liveData = liveDataBySession[session.id] ?? [];
      return {
        session,
        ...normalizeLiveDataToMinuteBuckets(liveData),
      };
    });

    const maxMinute = normalized.reduce((acc, item) => Math.max(acc, item.maxMinute), 0);
    const xAxisData = Array.from({ length: Math.max(maxMinute + 1, 1) }, (_, i) => i);

    const series = normalized.map((item, index) => ({
      id: item.session.id,
      label: getSessionTitle(item.session, index),
      data: xAxisData.map((minute) => item.minuteToScore.get(minute) ?? null),
      color: CHART_COLORS[index % CHART_COLORS.length],
      showMark: false,
      curve: "catmullRom",
    }));

    return { xAxisData, series };
  }, [selectedSessions, liveDataBySession]);

  const avgScores = useMemo(
    () =>
      selectedSessions.map((session) => {
        const fromSession = getSessionScore(session);
        const fromLiveData = liveDataBySession[session.id]?.length
          ? Math.round(
              liveDataBySession[session.id].reduce((sum, point) => {
                const v = point?.engagementScore ?? point?.["engagement-score"] ?? 0;
                return sum + (typeof v === "number" ? v : 0);
              }, 0) / liveDataBySession[session.id].length,
            )
          : null;

        return {
          session,
          score: fromSession ?? fromLiveData,
        };
      }),
    [selectedSessions, liveDataBySession],
  );

  const insights = useMemo(
    () => buildInsights(selectedSessions, refreshCount),
    [selectedSessions, refreshCount],
  );

  const addableSessions = sessions.filter(
    (session) => session?.id && !selectedSessionIds.includes(session.id),
  );

  const handleAddSession = () => {
    if (!selectedToAdd) return;
    setSelectedSessionIds((prev) => [...prev, selectedToAdd]);
    setSelectedToAdd("");
  };

  const handleRemoveSession = (sessionId) => {
    setSelectedSessionIds((prev) => prev.filter((id) => id !== sessionId));
  };

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
            onClick={() => navigate("/dashboard")}
            className="flex w-full items-center gap-3 px-6 py-4 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700"
          >
            <span className="text-base">▣</span>
            Dashboard
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 border-r-4 border-emerald-500 bg-emerald-50 px-6 py-4 text-sm font-semibold text-emerald-600"
          >
            <span className="text-base">◫</span>
            Analysis
          </button>
        </nav>
      </aside>

      <div className="ml-64 min-h-screen px-8 py-8">
        <header className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <p className="mb-1 text-sm text-gray-500">Analysis / Comparison &amp; AI Insights</p>
            <h1 className="text-4xl font-black text-gray-900">Engagement Analysis and AI Insights</h1>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setRefreshCount((value) => value + 1)}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-emerald-600"
            >
              Refresh Insights
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-gray-500">Loading sessions...</p>
        ) : error ? (
          <p className="text-sm font-medium text-red-500">{error}</p>
        ) : (
          <>
            <section className="mb-8 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-4 border-b border-gray-100 p-6 md:flex-row md:items-start">
                <div>
                  <h2 className="text-3xl font-black text-gray-900">Session Comparison</h2>
                  <p className="text-sm text-gray-500">
                    Overlaying engagement scores across selected sessions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {selectedSessions.map((session, index) => (
                    <span
                      key={session.id}
                      className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-semibold text-gray-700"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      {getSessionTitle(session, index)}
                      <button
                        type="button"
                        onClick={() => handleRemoveSession(session.id)}
                        className="text-gray-400 hover:text-gray-600"
                        aria-label={`Remove ${getSessionTitle(session, index)}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}

                  <select
                    value={selectedToAdd}
                    onChange={(e) => setSelectedToAdd(e.target.value)}
                    className="rounded-full border border-dashed border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-600 outline-none"
                  >
                    <option value="">Add Session</option>
                    {addableSessions.map((session, index) => (
                      <option key={session.id} value={session.id}>
                        {getSessionTitle(session, index)}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={handleAddSession}
                    disabled={!selectedToAdd}
                    className="rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="h-[360px] rounded-2xl border border-gray-200 bg-gradient-to-b from-white to-gray-50 p-2">
                  {chartLoading ? (
                    <p className="p-6 text-sm text-gray-500">Loading comparison chart...</p>
                  ) : chartData.series.length === 0 ? (
                    <p className="p-6 text-sm text-gray-500">
                      Select at least one session to render the comparison chart.
                    </p>
                  ) : (
                    <LineChart
                      margin={{ left: 50, right: 20, top: 16, bottom: 34 }}
                      xAxis={[
                        {
                          data: chartData.xAxisData,
                          valueFormatter: (value) => `${value}m`,
                        },
                      ]}
                      yAxis={[
                        {
                          min: 0,
                          max: 100,
                          valueFormatter: (value) => `${value}%`,
                        },
                      ]}
                      series={chartData.series}
                      grid={{ horizontal: true, vertical: true }}
                      height={340}
                      slotProps={{ legend: { hidden: false } }}
                      sx={{
                        "& .MuiChartsAxis-root text": {
                          fill: "#94a3b8",
                          fontSize: 11,
                          fontWeight: 700,
                        },
                        "& .MuiChartsAxis-line": {
                          stroke: "#e2e8f0",
                        },
                        "& .MuiChartsAxis-tick": {
                          stroke: "#e2e8f0",
                        },
                        "& .MuiChartsGrid-line": {
                          stroke: "#e2e8f0",
                        },
                      }}
                    />
                  )}
                </div>
              </div>
            </section>

            <section className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <article className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h3 className="text-3xl font-black text-gray-900">AI Engagement Summary</h3>
                  <p className="text-xs font-semibold text-gray-500">
                    Placeholder wrapper generated from current comparison data
                  </p>
                </div>

                <p className="mb-4 text-lg leading-relaxed text-gray-700">{insights.summary}</p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Peak Correlation
                    </p>
                    <p className="text-sm font-bold text-gray-900">Placeholder Metric</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Attention Span
                    </p>
                    <p className="text-sm font-bold text-gray-900">Placeholder Metric</p>
                  </div>
                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400">
                      Recapture Rate
                    </p>
                    <p className="text-sm font-bold text-gray-900">Placeholder Metric</p>
                  </div>
                </div>
              </article>

              <article className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6">
                <h3 className="mb-5 text-3xl font-black text-emerald-700">Suggested Improvements</h3>
                <ul className="space-y-3 text-sm text-gray-700">
                  {insights.recommendations.map((item) => (
                    <li key={item} className="rounded-lg bg-white/70 p-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            </section>

            <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Selected Session</th>
                    <th className="px-6 py-4">Average Engagement</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4 text-right">Total Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {avgScores.length === 0 ? (
                    <tr>
                      <td className="px-6 py-5 text-sm text-gray-500" colSpan={4}>
                        No sessions selected.
                      </td>
                    </tr>
                  ) : (
                    avgScores.map(({ session, score }, index) => {
                      const liveData = liveDataBySession[session.id] ?? [];
                      const lastSecond =
                        liveData.length > 0
                          ? liveData[liveData.length - 1]?.timeSinceStart ??
                            liveData[liveData.length - 1]?.["time-since-session-started"] ??
                            0
                          : 0;

                      return (
                        <tr key={session.id} className="hover:bg-gray-50/80">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="font-semibold text-gray-900">
                                {getSessionTitle(session, index)}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-600">
                            {typeof score === "number" ? `${score}%` : "N/A"}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            {formatSessionDate(session?.startedAt || session?.createdAt)}
                          </td>
                          <td className="px-6 py-4 text-right text-sm font-medium text-gray-600">
                            {lastSecond ? `${Math.round(lastSecond / 60)}m` : "N/A"}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </section>
          </>
        )}
      </div>
    </div>
  );
}