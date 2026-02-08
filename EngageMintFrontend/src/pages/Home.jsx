/* Utils + Libs */
import { useState, useEffect, useRef } from "react";
import { getLiveData } from "../utils/fetchResponseData.js";
import { startMachine, endMachine } from "../utils/postRequests.js";

/* Layout Components */
import Header from "../components/Header.jsx";

/* Molecules */
import ScoreDisplay from "../components/ScoreDisplay.jsx";
import StatTracker from "../components/StatTracker.jsx";

export default function Home() {
  const [engagementArray, setEngagementArray] = useState([0]);
  const [timeArray, setTimeArray] = useState([0]);
  const [score, setScore] = useState(0);
  const [selectedRange, setSelectedRange] = useState("30m");

  const RANGE_TO_SECONDS = useRef({
    "5m": 5 * 60,
    "30m": 30 * 60,
    "1h": 60 * 60,
  });

  useEffect(() => {
    let active = true;

    const start = async () => {
      try {
        await startMachine();
      } catch (error) {
        console.error("Failed to start live session:", error);
      }
    };

    start();

    return () => {
      if (!active) return;
      active = false;
      endMachine().catch((error) => {
        console.error("Failed to end live session on exit:", error);
      });
    };
  }, []);

  useEffect(() => {
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
  }, []);

  const latestTime = timeArray[timeArray.length - 1] || 0;
  const windowSeconds = RANGE_TO_SECONDS.current[selectedRange];
  const firstIncludedTime = Math.max(0, latestTime - windowSeconds);

  const pairedPoints = timeArray
    .map((t, idx) => ({ t, y: engagementArray[idx] ?? 0 }))
    .filter((point) => point.t >= firstIncludedTime);

  const displayedTimeArray = pairedPoints.map((p) => p.t);
  const displayedEngagementArray = pairedPoints.map((p) => p.y);

  return (
    <div className="h-screen flex flex-col bg-slate-100 text-slate-900 overflow-hidden">
      <Header />

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 min-h-full">
          <section className="xl:col-span-1 space-y-6">
          <ScoreDisplay score={score} />

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                <p className="text-2xl font-bold text-slate-800">
                  {score > 0 ? "Active" : "Idle"}
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
    </div>
  );
}
