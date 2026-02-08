import React from 'react';

const CONFIGS = {
  DIP: { badge: 'bg-amber-100 text-amber-700 border-amber-200', icon: '📉' },
  RECOVERY: { badge: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: '✅' },
  SYSTEM: { badge: 'bg-slate-100 text-slate-700 border-slate-200', icon: '⚙️' },
  THRESHOLD: { badge: 'bg-rose-100 text-rose-700 border-rose-200', icon: '⚠️' }
};

const AlertCard = ({ alert }) => {
  const style = CONFIGS[alert.type] || CONFIGS.SYSTEM;

  return (
    <div
      className="
        bg-slate-50
        border border-slate-200
        p-4
        rounded-xl
        shadow-sm
        transition-transform
        hover:-translate-y-0.5
        animate-in slide-in-from-right duration-300
      "
      style={{ opacity: alert.opacity }}
    >
      {/* Header row */}
      <div className="flex justify-between items-start mb-2">
        <span
          className={`
            ${style.badge}
            px-2.5 py-1
            text-[10px]
            font-bold
            uppercase
            tracking-wide
            rounded-md
            border
          `}
        >
          {alert.type}
        </span>

        <span className="text-[10px] font-semibold text-slate-400 font-mono tracking-tight">
          {alert.timestamp}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm font-semibold leading-snug text-slate-700">
        {alert.message}
      </p>

      {/* Meta */}
      {alert.meta && (
        <div className="mt-2 text-[10px] font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
          <span className="text-xs">{style.icon}</span>
          {alert.meta}
        </div>
      )}
    </div>
  );
};

export default AlertCard;
