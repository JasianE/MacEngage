/* Utils + Libs */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getLiveData } from "../utils/fetchResponseData.js";
import { startMachine, endMachine } from "../utils/postRequests.js";

/* Layout Components */
import Header from "../components/Header.jsx";

/* Molecules */
import ScoreDisplay from "../components/ScoreDisplay.jsx";
import StatTracker from "../components/StatTracker.jsx";

export default function Home() {
  const navigate = useNavigate();
  const [engagementArray, setEngagementArray] = useState([0]);
  const [timeArray, setTimeArray] = useState([0]);
  const [score, setScore] = useState(0);
  const [selectedRange, setSelectedRange] = useState("30m");
  const [showStartModal, setShowStartModal] = useState(true);
  const [sessionName, setSessionName] = useState("");
  const [startError, setStartError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [hasStartedSession, setHasStartedSession] = useState(false);

  const RANGE_TO_SECONDS = useRef({
    "5m": 5 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
  });

  async function handleStartSession() {
    const trimmedName = sessionName.trim();
    if (!trimmedName) {
      setStartError("Class name is required.");
      return;
    }

    try {
      setIsStarting(true);
      setStartError("");
      await startMachine(trimmedName);
      setHasStartedSession(true);
      setShowStartModal(false);
    } catch (error) {
      console.error("Failed to start live session:", error);
      setStartError(error.message || "Failed to start session.");
    } finally {
      setIsStarting(false);
    }
  }

  useEffect(() => {
    return () => {
      if (!hasStartedSession) return;
      endMachine().catch((error) => {
        console.error("Failed to end live session on exit:", error);
      });
    };
  }, [hasStartedSession]);

  useEffect(() => {
    if (!hasStartedSession) {
      return undefined;
    }

    const interval = setInterval(async () => {
      try {
        const { data } = await getLiveData();
        const liveDataArray = data.liveData;

        if (!liveDataArray?.length) {
          setScore(0);
          return;
        }

        const latestTime =
          liveDataArray[liveDataArray.length - 1]?.timeSinceStart ?? 0;

        // True 3-second moving average over the current session timeline.
        // Keep only ticks whose timeSinceStart falls within [latestTime - 2, latestTime].
        const threeSecondWindow = liveDataArray.filter(
          item =>
            typeof item.timeSinceStart === "number" &&
            typeof item.engagementScore === "number" &&
            latestTime - item.timeSinceStart <= 2 &&
            latestTime - item.timeSinceStart >= 0
        );

        const movingAverage =
          threeSecondWindow.reduce((sum, item) => sum + item.engagementScore, 0) /
          (threeSecondWindow.length || 1);

        const roundedValue = Math.round(movingAverage);
        setScore(roundedValue);

        setEngagementArray(prev => [...prev.slice(-3600), roundedValue]);
        setTimeArray(prev => [...prev.slice(-3600), latestTime]);
      } catch (err) {
        console.error("Live data error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [hasStartedSession]);

  const latestTime = timeArray[timeArray.length - 1] || 0;
  const windowSeconds = RANGE_TO_SECONDS.current[selectedRange];
  const firstIncludedTime = Math.max(0, latestTime - windowSeconds);

  const pairedPoints = timeArray
    .map((t, idx) => ({ t, y: engagementArray[idx] ?? 0 }))
    .filter((point) => point.t >= firstIncludedTime);

  const displayedTimeArray = pairedPoints.map((p) => p.t);
  const displayedEngagementArray = pairedPoints.map((p) => p.y);

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden relative">
      <Header />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-full">
          <section className="xl:col-span-1 space-y-6">
          <ScoreDisplay score={score} />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-2xl font-bold text-slate-800">
                  {hasStartedSession ? "Active" : "Idle"}
                </p>
                <p className="text-xs text-slate-500 mt-1">Session Status</p>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-2xl font-bold text-slate-800">
                  {Math.floor((timeArray[timeArray.length - 1] || 0) / 60)}:
                  {String((timeArray[timeArray.length - 1] || 0) % 60).padStart(2, "0")}
                </p>
                <p className="text-xs text-slate-500 mt-1">Duration</p>
              </div>
            </div>

          </section>

          <section className="xl:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-sm flex flex-col">
            <div className="flex flex-wrap gap-3 justify-between items-start mb-4">
              <div>
                <h2 className="text-3xl font-bold text-slate-900">Engagement Trend</h2>
                <p className="text-slate-500 text-lg">Real-time tracking over the live session</p>
              </div>

              <div className="flex gap-2">
                {Object.keys(RANGE_TO_SECONDS.current).map((range) => {
                  const isActive = selectedRange === range;
                  return (
                    <button
                      key={range}
                      type="button"
                      onClick={() => setSelectedRange(range)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                        isActive
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {range}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 border border-slate-200 rounded-2xl p-2 md:p-4 bg-gradient-to-b from-white to-slate-50">
              <StatTracker
                engagementArray={displayedEngagementArray}
                timeArray={displayedTimeArray}
                color="#64748b"
              />
            </div>
          </section>
        </div>
      </main>

      {showStartModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
          <div className="w-full max-w-[520px] rounded-2xl border border-white/20 bg-white shadow-2xl overflow-hidden relative">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="pt-10 px-10 pb-2 flex flex-col items-center text-center">
              <div className="size-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6 text-emerald-500 text-2xl">
                🍃
              </div>
              <h1 className="text-4xl font-black text-[#0d1b12] mb-2">Start New Session</h1>
              <p className="text-emerald-700 text-sm max-w-xs leading-relaxed">
                Enter details below to initialize a new class monitoring environment.
              </p>
            </div>

            <div className="p-10 flex flex-col gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-[#0d1b12]" htmlFor="class_name">
                  Class Name
                </label>
                <input
                  id="class_name"
                  type="text"
                  value={sessionName}
                  onChange={(e) => {
                    setSessionName(e.target.value);
                    if (startError) setStartError("");
                  }}
                  placeholder="e.g., Calculus II"
                  className="block w-full px-4 py-3 rounded-lg border border-gray-200 bg-[#f8fcf9] text-[#0d1b12] placeholder:text-gray-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/30 outline-none transition-all"
                />
                {startError ? <p className="text-xs font-medium text-red-500">{startError}</p> : null}
              </div>
            </div>

            <div className="px-10 pb-10 flex flex-col gap-4">
              <button
                type="button"
                onClick={handleStartSession}
                disabled={isStarting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3.5 px-6 rounded-lg transition-colors shadow-lg shadow-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isStarting ? "Starting..." : "▶ Start Monitoring"}
              </button>
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full text-center text-sm font-medium text-gray-500 hover:text-[#0d1b12] transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
