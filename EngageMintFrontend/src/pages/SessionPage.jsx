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

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mb-4 bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition cursor-pointer"
      >
        &larr; Back to Dashboard
      </button>

      {/* Header */}
      <h1 className="text-4xl font-bold mb-2 text-blue-300">{session.title}</h1>
      <p className="text-xl mb-6">Overall Engagement Score: {session.overallScore}</p>

      {/* Live Data Chart */}
      <div className="mb-8 bg-slate-800 p-4 rounded shadow-lg">
        <StatTracker engagementArray={chartY} timeArray={chartX} color="#f8fafc" />
      </div>

      {/* Comments Section */}
      <div className="bg-slate-800 p-4 rounded shadow-lg">
        <h2 className="text-2xl font-semibold mb-2 text-blue-200">Comments</h2>

        {session.comments && session.comments.length > 0 ? (
          <ul className="list-disc ml-6 space-y-1">
            {session.comments.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        ) : (
          <p className="ml-6 italic text-gray-400">No comments yet.</p>
        )}

        {/* Add Comment */}
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            placeholder="Add Comment"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            className="flex-1 bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddComment}
            disabled={submittingComment}
            className="bg-blue-700 hover:bg-blue-800 transition text-white px-4 py-2 rounded"
          >
            {submittingComment ? "Saving..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;
