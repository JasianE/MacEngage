/* Utils + Libs */
import { useState, useEffect, useRef } from "react";
import { getLiveData } from "../utils/fetchResponseData.js";
import { startMachine, endMachine } from "../utils/postRequests.js";

/* Layout Components */
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import GraphLayout from "../layouts/GraphLayout.jsx";
import AlertLayout from "../layouts/AlertLayout.jsx";

/* Molecules */
import AlertCard from "../components/AlertCard.jsx";
import ScoreDisplay from "../components/ScoreDisplay.jsx";
import StatTracker from "../components/StatTracker.jsx";

export default function Home() {
  const [engagementArray, setEngagementArray] = useState([0]);
  const [timeArray, setTimeArray] = useState([0]);
  const [alerts, setAlerts] = useState([]);
  const [score, setScore] = useState(0);

  const recentValuesRef = useRef([]);
  const engagementStateRef = useRef("NORMAL"); // NORMAL | DIP | CRITICAL

  function detectEngagementEvent(currentValue) {
    const DIP_THRESHOLD = 60;
    const CRITICAL_THRESHOLD = 45;
    const TREND_WINDOW = 5;
    const DROP_RATE = 10;

    const recent = recentValuesRef.current;
    recent.push(currentValue);
    if (recent.length > TREND_WINDOW) recent.shift();

    const highestRecent = Math.max(...recent);
    const dropFromRecentHigh = highestRecent - currentValue;
    const prevState = engagementStateRef.current;

    if (currentValue < CRITICAL_THRESHOLD && prevState !== "CRITICAL") {
      engagementStateRef.current = "CRITICAL";
      return { type: "THRESHOLD", message: "Critical engagement drop detected." };
    }

    if (
      currentValue < DIP_THRESHOLD &&
      dropFromRecentHigh >= DROP_RATE &&
      prevState === "NORMAL"
    ) {
      engagementStateRef.current = "DIP";
      return { type: "DIP", message: "Engagement dip detected." };
    }

    return null;
  }

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

        const event = detectEngagementEvent(roundedValue);

        if (event) {
          setAlerts(prev => [
            {
              id: crypto.randomUUID(),
              type: event.type,
              timestamp: new Date().toLocaleTimeString(),
              message: event.message,
              opacity: 1,
            },
            ...prev.map(a => ({
              ...a,
              opacity: Math.max(0.4, a.opacity - 0.1),
            })),
          ]);
        }

        setEngagementArray(prev => [...prev.slice(-14), roundedValue]);
        setTimeArray(prev => [...prev.slice(-14), latestTime]);
      } catch (err) {
        console.error("Live data error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
      <Header />

      <main className="flex flex-1 min-h-0 flex-col lg:flex-row overflow-auto lg:overflow-hidden">
        <GraphLayout title="Engagement Trend">
          <StatTracker
            engagementArray={engagementArray}
            timeArray={timeArray}
            color="#f1f5f9"
          />
        </GraphLayout>

        <AlertLayout title="Alerts" badge="LIVE">
          <ScoreDisplay score={score} />
          {alerts.map(alert => (
            <AlertCard alert={alert} key={alert.id} />
          ))}
        </AlertLayout>
      </main>

      <Footer />
    </div>
  );
}
