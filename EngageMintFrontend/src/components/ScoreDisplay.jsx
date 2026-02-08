export default function ScoreDisplay({ score }) {
  const boundedScore = Math.max(0, Math.min(100, Number.isFinite(score) ? score : 0));
  const circumference = 2 * Math.PI * 110;
  const strokeDashoffset = circumference - (boundedScore / 100) * circumference;

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 flex flex-col items-center justify-center min-h-[390px]">
      <h2 className="text-slate-500 font-semibold uppercase tracking-[0.12em] text-sm mb-6">
        Current Engagement
      </h2>

      <div className="relative w-64 h-64 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 256 256" fill="none">
          <circle cx="128" cy="128" r="110" stroke="#e2e8f0" strokeWidth="12" />
          <circle
            cx="128"
            cy="128"
            r="110"
            stroke="#10b981"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-extrabold leading-none text-slate-900">
            {boundedScore}
            <span className="text-3xl text-slate-400 font-medium align-top">%</span>
          </div>
        </div>
      </div>

      <p className="mt-7 text-slate-400 text-sm">Live engagement score</p>
    </div>
  );
}
