import { Routes, Route } from "react-router-dom";

// Pages
import Home from "./pages/Home";

function App() {
  //Fetch data and have a component that handles the various alert popups
  return (
    <>
    <Routes>
      <Route path="/" element={<Home />} />
    </Routes>
    </>
  );
}

export default App;
