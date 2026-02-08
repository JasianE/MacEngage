/* Utils + Libs */
import { useState, useEffect, useRef } from "react";
import { getLiveData } from "../utils/fetchResponseData.js";
import { startMachine } from "../utils/postRequests.js";

/* Layout Components */
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import GraphLayout from "../layouts/GraphLayout.jsx";
import AlertLayout from "../layouts/AlertLayout.jsx";

/* Molecules */
import AlertCard from '../components/AlertCard.jsx';
import ScoreDisplay from "../components/ScoreDisplay.jsx";
import StatTracker from "../components/StatTracker.jsx";

export default function Home() {

  const [engagementArray, setEngagementArray] = useState([0])
  const [timeArray, setTimeArray] = useState([0])
  const [alerts, setAlerts] = useState([]);
  const [score, setScore] = useState(0);

  const ALPHA = 0.2;
  const lastSmoothedRef = useRef(null);
  const recentValuesRef = useRef([]);
  const engagementStateRef = useRef("NORMAL"); 
  // NORMAL | DIP | CRITICAL

  function detectEngagementEvent(currentValue, currentTime) {
  // Thresholds (tune these)
  const DIP_THRESHOLD = 60;        // engagement % considered a dip
  const CRITICAL_THRESHOLD = 45;   // engagement % considered critical

  const TREND_WINDOW = 5;          // number of recent points to track
  const DROP_RATE = 10;            // % drop to qualify as a dip

  const recent = recentValuesRef.current;

  // Track recent smoothed values
  recent.push(currentValue);
  if (recent.length > TREND_WINDOW) recent.shift();

  // Calculate drop over recent trend
  const highestRecent = Math.max(...recent);
  const dropFromRecentHigh = highestRecent - currentValue;

  const prevState = engagementStateRef.current;

  // CRITICAL condition
  if (currentValue < CRITICAL_THRESHOLD && prevState !== "CRITICAL") {
    engagementStateRef.current = "CRITICAL";
    return {
      type: "THRESHOLD",
      message: "Critical engagement drop detected.",
    };
  }

  // DIP condition
  if (currentValue < DIP_THRESHOLD && dropFromRecentHigh >= DROP_RATE && prevState === "NORMAL") {
    engagementStateRef.current = "DIP";
    return {
      type: "DIP",
      message: "Engagement has dropped below baseline.",
    };
  }

  // No significant event detected
    return null;
  }
  useEffect(() => {
    startMachine();
  }, [])

  useEffect(() => {
  const interval = setInterval(() => {
    (async () => {
      try {
        const {data} = await getLiveData(); // now returns array of objects
        const liveDataArray = data.liveData;

        // Combine or average all scores for this tick
        const total = liveDataArray.reduce((sum, item) => sum + item.engagementScore, 0);
        const avgScore = total / liveDataArray.length;
        setScore(avgScore);

        // Use the most recent time or pick any representative time
        const latestTime = liveDataArray[liveDataArray.length - 1]?.timeSinceStart ?? 0;

        // Apply smoothing
        let smoothedValue;
        if (lastSmoothedRef.current === null) {
          smoothedValue = avgScore;
        } else {
          smoothedValue = ALPHA * avgScore + (1 - ALPHA) * lastSmoothedRef.current;
        }
        lastSmoothedRef.current = smoothedValue;

        // Detect engagement events
        const event = detectEngagementEvent(smoothedValue, latestTime);

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

          // Add to chart arrays, max 15 points
          setEngagementArray(prev => [...prev.slice(-14), smoothedValue]);
          setTimeArray(prev => [...prev.slice(-14), latestTime]);

        } catch (err) {
          console.error("Error fetching live data:", err);
        }
      })();
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      {/* DASHBOARD ROW */}
      <main className="flex flex-1 overflow-hidden">
        <GraphLayout title="Engagement Trend">
          <StatTracker engagementArray={engagementArray} timeArray={timeArray} color="black"/>
        </GraphLayout>

        <AlertLayout title="Alerts" badge="LIVE">
          <ScoreDisplay score={Math.round(score)}/>
          {alerts.map((item) => {
            return <AlertCard alert={item}  key = {item.id}/>
          })}
        </AlertLayout>
      </main>

      <Footer />
    </div>
  );
}
