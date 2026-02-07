
import React from 'react';

const EngagementScore = ({ score, delta }) => {
  return (
    <div className="mb-12">
      <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 mb-4">Core Engagement Metric</h2>
      <div className="flex items-baseline gap-6 mb-8">
        <span className="text-[9rem] lg:text-[13rem] font-black leading-none tracking-tighter text-slate-900 dark:text-white tabular-nums">
          {score}
        </span>
        <div className="flex flex-col gap-1">
          <span className="text-4xl lg:text-5xl font-black text-slate-200 dark:text-slate-800">/100</span>
          <span className={`text-2xl font-black uppercase italic ${delta >= 0 ? 'text-primary' : 'text-danger'}`}>
            {delta >= 0 ? '↑' : '↓'} {Math.abs(delta).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="relative w-full bg-slate-100 dark:bg-slate-800 border-4 border-slate-900 h-14 rounded-lg overflow-hidden shadow-[6px_6px_0px_0px_rgba(19,127,236,1)]">
        <div className="h-full bg-primary transition-all duration-1000 ease-in-out" style={{ width: `${score}%` }}></div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white mix-blend-difference">Real-time Saturation</span>
        </div>
      </div>
    </div>
  );
};

export default EngagementScore;
