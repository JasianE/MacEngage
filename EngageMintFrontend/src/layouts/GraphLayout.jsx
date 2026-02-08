export default function GraphLayout({ title, children }) {
  return (
    <section className="w-full lg:w-[65%] p-6 md:p-10 lg:p-12 flex flex-col min-h-[360px]">
      <div className="mb-3 text-[11px] md:text-xs font-black uppercase tracking-[0.24em] text-slate-400">
        {title}
      </div>
      <div className="flex-1 flex items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        {children}
      </div>
    </section>
  );
}
