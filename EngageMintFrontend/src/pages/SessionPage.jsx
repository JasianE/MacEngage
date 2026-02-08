import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import StatTracker from "../components/StatTracker";
import { getSessionInfo, getSessionLiveData } from "../utils/fetchResponseData";
import { writeComment } from "../utils/postRequests";

function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError("");

        const [sessionInfoResponse, liveDataResponse] = await Promise.all([
          getSessionInfo(sessionId),
          getSessionLiveData(sessionId),
        ]);

        const sessionInfo = sessionInfoResponse?.data ?? {};
        const liveData = liveDataResponse?.data?.liveData ?? [];

        setSession({
          id: sessionInfo.id || sessionId,
          title: sessionInfo.title || `Session ${String(sessionId).slice(0, 8)}`,
          courseCode: sessionInfo.courseCode || sessionInfo.course || "",
          startedAt: sessionInfo.startedAt || sessionInfo.createdAt || null,
          endedAt: sessionInfo.endedAt || null,
          overallScore:
            typeof sessionInfo.overallScore === "number"
              ? Math.round(sessionInfo.overallScore)
              : 0,
          comments: Array.isArray(sessionInfo.comments) ? sessionInfo.comments : [],
          liveData,
        });
      } catch (error) {
        console.error("Fetch error:", error);
        setError(error.message || "Failed to load session.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <p className="text-gray-300">Loading session...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 bg-slate-900 min-h-screen text-white">
        <button
          onClick={() => navigate("/dashboard")}
          className="mb-4 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition cursor-pointer"
        >
          &larr; Back to Dashboard
        </button>
        <p className="text-red-400">{error}</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-8">
        <p className="text-gray-300">Session not found.</p>
      </div>
    );
  }

  async function handleAddComment() {
    const commentText = newComment.trim();
    if (!commentText || submittingComment) return;

    try {
      setSubmittingComment(true);
      const updatedComments = [...(session.comments || []), commentText];
      const response = await writeComment(session.id || sessionId, updatedComments);
      const updatedSession = response?.data || {};

      setSession((prev) => ({
        ...prev,
        comments: Array.isArray(updatedSession.comments)
          ? updatedSession.comments
          : updatedComments,
      }));
      setNewComment("");
    } catch (err) {
      console.log(err);
      setError(err.message || "Failed to add comment.");
    } finally {
      setSubmittingComment(false);
    }
  }

  const chartX = (session.liveData || []).map((d) => d.timeSinceStart ?? d["time-since-session-started"] ?? 0);
  const chartY = (session.liveData || []).map((d) => d.engagementScore ?? d["engagement-score"] ?? 0);

  function formatSessionDate(rawValue) {
    if (!rawValue) return "Date unavailable";
    const parsed = new Date(rawValue);
    if (Number.isNaN(parsed.getTime())) return "Date unavailable";

    return new Intl.DateTimeFormat(undefined, {
      month: "long",
      day: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(parsed);
  }

  const sessionMeta = formatSessionDate(session.startedAt);

  return (
    <div className="min-h-screen bg-[#f9fafb] text-gray-900 font-sans">
      <aside className="fixed left-0 top-0 z-30 flex h-screen w-64 flex-col justify-between border-r border-gray-200 bg-white">
        <div>
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
        </div>
      </aside>

      <div className="ml-64 flex min-h-screen flex-col">
        <header className="sticky top-0 z-20 flex h-20 items-center border-b border-gray-200 bg-white px-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/dashboard")}
              className="rounded-md p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
              aria-label="Back to dashboard"
            >
              ←
            </button>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-gray-900">{session.title}</h1>
                {session.courseCode ? (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-black uppercase text-gray-500">
                    {session.courseCode}
                  </span>
                ) : null}
              </div>
              <p className="text-sm text-gray-500">{sessionMeta}</p>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl space-y-6 p-8">
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <article className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm lg:col-span-2">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h2 className="text-4xl font-black text-gray-900">Session Timeline</h2>
                  <p className="text-sm text-gray-500">Real-time student attention tracking</p>
                </div>
                <div className="text-sm font-bold text-emerald-600">Avg {session.overallScore}%</div>
              </div>

              <div className="rounded-2xl bg-white">
                <StatTracker engagementArray={chartY} timeArray={chartX} color="#6b7280" />
              </div>
            </article>

            <article className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6">
              <h2 className="mb-4 text-3xl font-black text-gray-900">AI Summary</h2>

              <div className="space-y-5">
                <section>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-700">Key Insights</h3>
                  <p className="rounded-2xl border border-emerald-100 bg-white/70 p-4 text-sm text-gray-700">
                    AI-generated session insights are coming soon. This panel will summarize engagement trends and teaching moments.
                  </p>
                </section>

                <section>
                  <h3 className="mb-2 text-xs font-black uppercase tracking-wider text-emerald-700">Recommendations</h3>
                  <div className="rounded-2xl border border-emerald-100 bg-white/70 p-4 text-sm text-gray-700">
                    Placeholder: recommended actions will appear here once AI summary generation is enabled.
                  </div>
                </section>
              </div>
            </article>
          </section>

          <section className="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-3xl font-black text-gray-900">Session Notes</h2>
              <p className="text-sm text-gray-400">Private to instructors</p>
            </div>

            <div className="flex-1">
              <div className="relative">
                <textarea
                  placeholder="Add a note about this session..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="h-24 w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-emerald-400"
                />
                <button
                  onClick={handleAddComment}
                  disabled={submittingComment}
                  className="absolute bottom-3 right-3 rounded-lg bg-emerald-500 px-3 py-1.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {submittingComment ? "Saving..." : "Send"}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {session.comments && session.comments.length > 0 ? (
                  session.comments.map((c, i) => (
                    <div key={i}>
                      <p className="text-sm font-semibold text-gray-800">Comment {i + 1}</p>
                      <p className="text-sm text-gray-600">{c}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-sm italic text-gray-400">No comments yet.</p>
                )}
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default SessionPage;
