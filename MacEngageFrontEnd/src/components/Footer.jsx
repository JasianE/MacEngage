
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-slate-500 py-3 px-8 text-[9px] font-black uppercase tracking-[0.4em] flex justify-between items-center shrink-0">
      <div className="flex gap-6">
        <span>EngageMint Core v4.1.0</span>
        <span className="hidden sm:inline border-l border-slate-800 pl-6 text-slate-600">React Component Engine</span>
      </div>
      <div className="flex items-center gap-2 text-slate-300">
        <span className="w-2 h-2 bg-success rounded-full"></span>
        System Synchronized
      </div>
    </footer>
  );
};

export default Footer;
