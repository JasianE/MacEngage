import React from 'react';
import { useNavigate } from 'react-router-dom';
import { endMachine } from '../utils/postRequests';

const Header = () => {
  const navigate = useNavigate();

  // Handle ending the session
  const handleEndSession =  async () => {
    if (window.confirm("Are you sure you want to end the session?")) {
      // Optional: save session data here
      navigate("/dashboard"); // redirect to dashboard
      //Add logic and session data
      endMachine();
    }
  };

  return (
    <header className="h-20 border-b border-slate-200 bg-white px-6 md:px-10 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-8 min-w-0">
        <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
          ENGAGE<span className="text-emerald-500">MINT</span>
        </h1>
        <p className="text-3xl leading-none text-slate-300 hidden md:block">|</p>
        <h2 className="text-2xl font-bold text-slate-800 truncate">Live Monitor</h2>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden md:flex items-center px-3.5 py-1.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-sm font-medium">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" />
          Live Session
        </div>

        {/* End Session Button */}
        <button
          onClick={handleEndSession}
          className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-xl shadow-sm transition cursor-pointer font-semibold"
        >
          End Session
        </button>
      </div>
    </header>
  );
};

export default Header;
