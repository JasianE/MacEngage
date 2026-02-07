import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import ScoreDisplay from "../components/ScoreDisplay.jsx";
import StatTracker from "../components/StatTracker.jsx";
import GraphLayout from "../layouts/GraphLayout.jsx";
import AlertLayout from "../layouts/AlertLayout.jsx";

export default function Home() {
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
        </AlertLayout>
      </main>

      <Footer />
    </div>
  );
}
