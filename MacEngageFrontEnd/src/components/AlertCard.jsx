
import React from 'react';

const CONFIGS = {
  DIP: { bg: 'bg-warning', text: 'text-black', icon: '📉' },
  RECOVERY: { bg: 'bg-primary', text: 'text-white', icon: '✅' },
  SYSTEM: { bg: 'bg-slate-900', text: 'text-white', icon: '⚙️' },
  THRESHOLD: { bg: 'bg-danger', text: 'text-white', icon: '⚠️' }
};

const AlertCard = ({ alert }) => {
  const style = CONFIGS[alert.type] || CONFIGS.SYSTEM;

  return (
    <div 
      className="bg-white dark:bg-slate-900 border-2 border-slate-900 p-6 rounded shadow-[5px_5px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 animate-in slide-in-from-right duration-500" 
      style={{ opacity: alert.opacity }}
    >
      <div className="flex justify-between items-start mb-3">
        <span className={`${style.bg} ${style.text} px-2.5 py-1 text-[9px] font-black uppercase tracking-widest rounded border border-slate-900`}>
          {alert.type}
        </span>
        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter">{alert.timestamp}</span>
      </div>
      <p className="text-lg font-extrabold leading-tight text-slate-900 dark:text-slate-100">{alert.message}</p>
      {alert.meta && (
        <div className="mt-4 text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-2">
          <span className="text-sm">{style.icon}</span> {alert.meta}
        </div>
      )}
    </div>
  );
};

export default AlertCard;
