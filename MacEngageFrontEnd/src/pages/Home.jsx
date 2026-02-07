/* Utils + Libs */
import { useState } from "react";

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
  const [alerts, setAlerts] = useState([{
            id: "alert-001",
            type: "DIP",                 // DIP | RECOVERY | SYSTEM | THRESHOLD
            timestamp: "10:42:15",
            message: "Engagement dropped below 60% in the back-left quadrant.",
            meta: "8 students affected",
            opacity: 1                   // 0 → 1 (for fading older alerts)
          },
        {
            id: "alert-001",
            type: "DIP",                 // DIP | RECOVERY | SYSTEM | THRESHOLD
            timestamp: "10:42:15",
            message: "Engagement dropped below 60% in the back-left quadrant.",
            meta: "8 students affected",
            opacity: 1                   // 0 → 1 (for fading older alerts)
          },
        {
            id: "alert-001",
            type: "DIP",                 // DIP | RECOVERY | SYSTEM | THRESHOLD
            timestamp: "10:42:15",
            message: "Engagement dropped below 60% in the back-left quadrant.",
            meta: "8 students affected",
            opacity: 1                   // 0 → 1 (for fading older alerts)
          }]);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      {/* DASHBOARD ROW */}
      <main className="flex flex-1 overflow-hidden">
        <GraphLayout title="Engagement Trend">
          <StatTracker />
        </GraphLayout>

        <AlertLayout title="Alerts" badge="LIVE">
          <ScoreDisplay />
          {alerts.map((item) => {
            return <AlertCard alert={item}  key = {item.id}/>
          })}
        </AlertLayout>
      </main>

      <Footer />
    </div>
  );
}
