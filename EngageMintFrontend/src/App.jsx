import { Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SignUp from "./pages/SignUp";
import Landing from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";
import SessionPage from "./pages/SessionPage";
import Analysis from "./pages/Analysis";

function App() {
  //Fetch data and have a component that handles the various alert popups
  return (
    <>
    <Routes>
      <Route path='/' element = {<Landing/>} />
      <Route path="/live-session" element={<Home />} /> {/*Live session here */}
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/analysis" element={<Analysis />} />
      <Route path ="/login" element={<LoginPage />} />
      <Route path ="/signup" element={<SignUp />} />
      <Route path="/session/:sessionId" element={<SessionPage />} />
      <Route path="*" element={<Landing />} />
    </Routes>
    </>
  );
}

export default App;
