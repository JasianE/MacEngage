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
    <header className="border-b-4 border-slate-900 bg-slate-900 px-8 py-5 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
          EngageMint
        </h1>
      </div>

      {/* End Session Button */}
      <button
        onClick={handleEndSession}
        className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow transition cursor-pointer"
      >
        End Session
      </button>
    </header>
  );
};

export default Header;
