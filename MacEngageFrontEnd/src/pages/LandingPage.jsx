import React from "react";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col md:flex-row h-screen bg-slate-50 dark:bg-slate-900">
      
      {/* Hero Section */}
      <div className="flex-1 flex flex-col justify-center items-center text-center px-8 md:px-16 bg-white dark:bg-slate-800">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white mb-6">
          Welcome to EngageTrack
        </h1>
        <p className="text-slate-600 dark:text-slate-300 mb-12 max-w-md">
          Monitor live engagement scores, track student participation, and stay on top of classroom trends — all in real time.
        </p>

        <div className="flex flex-col md:flex-row gap-4">
          <button
            onClick={() => navigate("/signup")}
            className="bg-primary text-white font-bold py-3 px-8 rounded hover:bg-blue-600 transition-colors cursor-pointer"
          >
            Sign Up
          </button>

          <button
            onClick={() => navigate("/login")}
            className="bg-slate-700 text-white font-bold py-3 px-8 rounded hover:bg-primary transition-colors cursor-pointer"
          >
            Login
          </button>
        </div>
      </div>

      {/* Image / illustration section */}
      <div className="flex-1 hidden md:flex justify-center items-center bg-slate-100 dark:bg-slate-900">
        <img
          src="https://www.famousbirthdays.com/faces/esam-image.jpg"
          alt="Engagement dashboard illustration"
          className="max-w-lg"
        />
      </div>
    </div>
  );
}
