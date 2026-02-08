export default function AlertLayout({
  title = "Alerts",
  badge = "LIVE",
  children,
  footer,
}) {
  return (
    <section className="w-full lg:w-[35%] p-6 md:p-10 lg:p-12 flex flex-col min-h-[360px]">
      <div className="mb-3 flex items-center gap-2">
        <h2 className="text-[11px] md:text-xs font-black uppercase tracking-[0.24em] text-slate-400">
          {title}
        </h2>
        <span className="px-2 py-0.5 rounded border border-emerald-400/40 bg-emerald-500/10 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-300">
          {badge}
        </span>
      </div>
      <div className="flex-1 min-h-0 w-full rounded-xl border border-slate-800 bg-slate-900/40 p-4 md:p-5 flex flex-col items-start gap-5 overflow-y-auto">
        {children}
      </div>
      {footer ? <div className="mt-3">{footer}</div> : null}
    </section>
  );
}
