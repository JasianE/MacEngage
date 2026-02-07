export default function TrendChart() {
  const bars = [65, 70, 55, 45, 80, 85, 90, 75, 82, 88, 72, 82];

  return (
    <div className="mt-12">
      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 mb-6">
        Recent Trend (Last 10 mins)
      </h3>

      <div className="h-48 w-full flex items-end gap-2 relative">
        {bars.map((h, i) => (
          <div
            key={i}
            className={`flex-1 bg-slate-900 dark:bg-primary ${
              i === bars.length - 1 ? "animate-pulse" : ""
            }`}
            style={{ height: `${h}%` }}
          />
        ))}

        <div className="absolute bottom-0 w-full h-1 bg-slate-900 dark:bg-white" />
      </div>
    </div>
  );
}
