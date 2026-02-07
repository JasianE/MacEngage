export default function AlertLayout({
  title = "Alerts",
  badge = "LIVE",
  children,
  footer
}) {
  return (
    <section className="w-[60%] p-12 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
    </section>
  );
}
