import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Mock data — replace with API call
const mockSessions = [
  { id: "abc123", name: "CS101 - Room 402", date: "2026-02-07 10:00 AM" },
  { id: "abc123", name: "Math 201 - Room 101", date: "2026-02-06 2:00 PM" },
  { id: "abc123", name: "Physics 105 - Lab 3", date: "2026-02-05 11:00 AM" },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [userUUID, setUserUUID] = useState(null);

  useEffect(() => {
      const savedUUID = localStorage.getItem("userUUID");

      if (!savedUUID || savedUUID === "undefined") {
        navigate('/');
        return; // prevent fetch from running
      }


      setUserUUID(savedUUID);

      const fetchData = async () => {
        try {
          const data = await fetch(`https://us-central1-macengage2026.cloudfunctions.net/api/getAllSessionInfo/${savedUUID}`);
          const process = await data.json();
          const sessions = process.data.sessions;
          setSessions(sessions);
        } catch (error) {
          console.error("Fetch error:", error);
        }
      };

      fetchData();
    }, []);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">
              No previous sessions found.
            </p>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => navigate(`/session/${session.id}`)}
                className="bg-white dark:bg-slate-800 hover:bg-blue-900 border border-slate-200 dark:border-slate-700 rounded shadow p-4 cursor-pointer hover:shadow-lg transition-shadow"
              >
                <h3 className="font-bold text-slate-900 dark:text-white">
                  {session.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {session.date}
                </p>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
