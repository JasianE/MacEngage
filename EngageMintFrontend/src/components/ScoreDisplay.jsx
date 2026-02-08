import { useState, useEffect } from "react";

export default function ScoreDisplay({score}) {
  return (
    <div>
      <h2 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
        Engagement Score
      </h2>

      <div className="flex items-baseline gap-4">
        <span className="text-[6rem] font-black leading-none tracking-tighter">
          {score} {/**Live score */}
        </span>
        <span className="text-2xl font-black text-slate-400">/ 100</span>
      </div>
    </div>
  );
}
