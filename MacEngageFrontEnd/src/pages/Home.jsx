/* Utils + Libs */
import { useState, useEffect, useRef } from "react";
import { getLiveData } from "../utils/fetchResponseData.js";

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
  console.log(recent)

  // Calculate drop over recent trend
  const highestRecent = Math.max(...recent);
  const dropFromRecentHigh = highestRecent - currentValue;

  const prevState = engagementStateRef.current;
  console.log(currentValue)

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
    const interval = setInterval(() => {
      (async () => {
        const liveData = await getLiveData();

        const rawValue = liveData.engagementValue;

        let smoothedValue;
        if (lastSmoothedRef.current === null) {
          smoothedValue = rawValue;
        } else {
          smoothedValue =
            ALPHA * rawValue +
            (1 - ALPHA) * lastSmoothedRef.current;
        }

        const event = detectEngagementEvent(smoothedValue, liveData.time);

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

        lastSmoothedRef.current = smoothedValue;

        setEngagementArray(prev => [...prev, smoothedValue]);
        setTimeArray(prev => [...prev, prev.length + liveData.time]);
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
          <ScoreDisplay score={3}/>
          {alerts.map((item) => {
            return <AlertCard alert={item}  key = {item.id}/>
          })}
        </AlertLayout>
      </main>

      <Footer />
    </div>
  );
}
