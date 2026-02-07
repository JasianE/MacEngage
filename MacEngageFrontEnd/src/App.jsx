import { Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";
import LoginPage from "./pages/LoginPage";
import SignUp from "./pages/SignUp";
import Landing from "./pages/LandingPage";

function App() {
  //Fetch data and have a component that handles the various alert popups
  return (
    <>
    <Routes>
      <Route path='/' element = {<Landing/>} />
      <Route path="/dashboard" element={<Home />} />
      <Route path ="/login" element={<LoginPage />} />
      <Route path ="/signup" element={<SignUp />} />
    </Routes>
    </>
  );
}

export default App;
