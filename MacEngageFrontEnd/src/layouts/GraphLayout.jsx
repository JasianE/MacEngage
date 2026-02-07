export default function GraphLayout({ title, children }) {
  return (
    <section className="w-[60%] p-12 flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        {children}
      </div>
    </section>
  );
}
