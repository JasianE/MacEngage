// SessionPage.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { LineChart } from "@mui/x-charts/LineChart";
import StatTracker from "../components/StatTracker";

function SessionPage() {
  const { sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [newComment, setNewComment] = useState("");

  // Mock fetching session
  useEffect(() => {
    const mockSessions = {
      "abc123": {
        title: "Math Lesson 3",
        overallScore: 82,
        comments: ["Good pacing", "Students engaged"],
        liveData: [
          { "time-since-session-started": 10, "engagement-score": 70 },
          { "time-since-session-started": 20, "engagement-score": 75 },
          { "time-since-session-started": 30, "engagement-score": 80 },
        ],
      },
      "def456": {
        title: "Science Lesson 1",
        overallScore: 90,
        comments: ["Very interactive"],
        liveData: [
          { "time-since-session-started": 5, "engagement-score": 85 },
          { "time-since-session-started": 15, "engagement-score": 88 },
        ],
      },
    };

    const data = mockSessions[sessionId];
    setSession(mockSessions["abc123"]);
  }, [sessionId]);

  if (!session) return <p className="p-8 text-gray-300">Loading session...</p>;

  function handleAddComment() {
    if (!newComment.trim()) return;
    const updatedComments = [...session.comments, newComment];
    setSession((prev) => ({ ...prev, comments: updatedComments }));
    setNewComment("");
  }

  const chartX = session.liveData.map((d) => d["time-since-session-started"]);
  const chartY = session.liveData.map((d) => d["engagement-score"]);

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      {/* Header */}
      <h1 className="text-4xl font-bold mb-2 text-blue-800">{session.title}</h1>
      <p className="text-xl mb-6">Overall Engagement Score: {session.overallScore}</p>

      {/* Live Data Chart */}
      <div className="mb-8 bg-slate-800 p-4 rounded shadow-lg">
        <StatTracker />
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
            className="bg-blue-700 hover:bg-blue-800 transition text-white px-4 py-2 rounded cursor-pointer"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}

export default SessionPage;
