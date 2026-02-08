import React from 'react';

const CONFIGS = {
  DIP: { bg: 'bg-warning', text: 'text-white', icon: '📉' },
  RECOVERY: { bg: 'bg-primary', text: 'text-white', icon: '✅' },
  SYSTEM: { bg: 'bg-slate-900', text: 'text-white', icon: '⚙️' },
  THRESHOLD: { bg: 'bg-danger', text: 'text-white', icon: '⚠️' }
};

const AlertCard = ({ alert }) => {
  const style = CONFIGS[alert.type] || CONFIGS.SYSTEM;

  return (
    <div
      className="
        bg-slate-900/80
        border border-slate-700
        p-4
        rounded-lg
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
            ${style.bg} ${style.text}
            px-2 py-0.5
            text-[8px]
            font-black
            uppercase
            tracking-widest
            rounded
            border border-slate-900
          `}
        >
          {alert.type}
        </span>

        <span className="text-[9px] font-bold text-slate-400 font-mono tracking-tight">
          {alert.timestamp}
        </span>
      </div>

      {/* Message */}
      <p className="text-sm font-extrabold leading-snug text-slate-100">
        {alert.message}
      </p>

      {/* Meta */}
      {alert.meta && (
        <div className="mt-2 text-[8px] font-black text-slate-500 uppercase tracking-[0.18em] flex items-center gap-1.5">
          <span className="text-xs">{style.icon}</span>
          {alert.meta}
        </div>
      )}
    </div>
  );
};

export default AlertCard;
