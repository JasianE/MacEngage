export default function AlertLayout({
  title = "Alerts",
  badge = "LIVE",
  children,
  footer,
}) {
  return (
    <section className="w-[60%] p-12 flex flex-col">
      <div className="flex-1 flex flex-col items-start gap-6 overflow-y-auto">
        {children}
      </div>
    </section>
  );
}
