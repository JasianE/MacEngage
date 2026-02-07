
import React from 'react';

const Header = () => {
  return (
    <header className="border-b-4 border-slate-900 bg-white dark:bg-slate-900 px-8 py-5 flex items-center justify-between z-10 shrink-0">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
          Mac-Engage
        </h1>
      </div>
    </header>
  );
};

export default Header;
