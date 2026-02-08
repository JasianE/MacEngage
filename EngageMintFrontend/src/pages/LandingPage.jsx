import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

function LogoMark({ className = "" }) {
  return (
    <div
      className={`rounded-2xl bg-[#159A93] shadow-[0_12px_30px_rgba(21,154,147,0.30)] ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-full text-white"
      >
        <path
          d="M7.5 23.5V18.7M12.5 23.5V14.8M17.5 23.5V10.9M22.5 23.5V16.5M7 24.5H25"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.8 14.5L13 10.8L16.7 13.6L22.8 7.8"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const savedUUID = localStorage.getItem("userUUID");

    if (savedUUID && savedUUID !== "undefined") {
      navigate("/dashboard");
    }
  }, [navigate]);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    const nextIsDark = !html.classList.contains("dark");

    if (nextIsDark) {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }

    setIsDark(nextIsDark);
  };

  return (
    <div className="min-h-screen bg-[#EEF2F4] text-[#0f172a] transition-colors duration-300 dark:bg-[#0f172a] dark:text-slate-100">
      <nav className="fixed left-0 right-0 top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md dark:border-slate-700/70 dark:bg-slate-900/80">
        <div className="mx-auto flex h-20 w-full max-w-[1400px] items-center justify-between px-6 md:px-10">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-3"
            aria-label="Go to landing page"
          >
            <LogoMark className="h-10 w-10 p-2 rounded-xl" />
            <span className="text-xl font-extrabold tracking-[-0.04em] leading-none md:text-2xl">
              ENGAGE<span className="text-[#159A93]">MINT</span>
            </span>
          </button>

          <div className="flex items-center gap-5 md:gap-7">
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-[#1e2c4b] transition-colors hover:text-[#159A93] dark:text-slate-200 dark:hover:text-[#44d2c6] md:text-base"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => navigate("/signup")}
              className="rounded-2xl border-2 border-[#159A93]/35 px-5 py-2 text-sm font-semibold text-[#159A93] transition-all hover:border-[#159A93] hover:bg-[#159A93]/5 dark:border-[#44d2c6]/40 dark:text-[#44d2c6] dark:hover:border-[#44d2c6] md:px-6 md:py-2.5 md:text-base"
            >
              Sign Up
            </button>
          </div>
        </div>
      </nav>

      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-24">
        <div className="pointer-events-none absolute left-[-12%] top-[-15%] h-[46%] w-[46%] rounded-full bg-[#159A93]/10 blur-3xl dark:bg-[#159A93]/20" />
        <div className="pointer-events-none absolute bottom-[-15%] right-[-12%] h-[46%] w-[46%] rounded-full bg-[#159A93]/10 blur-3xl dark:bg-[#159A93]/20" />

        <section className="relative z-10 flex w-full max-w-[540px] flex-col items-center text-center">
          <LogoMark className="mb-7 h-16 w-16 p-3.5" />

          <h1 className="text-5xl font-black tracking-[-0.06em] leading-[0.94] text-[#0b1534] dark:text-white md:text-6xl">
            ENGAGE<span className="text-[#159A93]">MINT</span>
          </h1>

          <button
            type="button"
            onClick={() => navigate("/login")}
            className="group mt-8 flex w-full items-center justify-center gap-2.5 rounded-[1.1rem] bg-[#159A93] px-8 py-5 text-xl font-bold text-white shadow-[0_14px_35px_rgba(21,154,147,0.35)] transition-all hover:-translate-y-0.5 hover:bg-[#127f79] active:translate-y-0"
          >
            Launch Dashboard
            <span className="text-2xl transition-transform duration-200 group-hover:translate-x-1">
              →
            </span>
          </button>

          <p className="mt-8 text-sm font-medium tracking-[0.02em] text-[#8294b3] dark:text-slate-400 md:text-base">
            Simplified Engagement Tracking for Educators
          </p>
        </section>

        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="fixed bottom-8 right-8 z-50 flex h-14 w-14 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-[0_10px_22px_rgba(15,23,42,0.15)] transition-all hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {isDark ? (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
              <path d="M21.75 15.5a9.75 9.75 0 1 1-13.2-13.2 1 1 0 0 1 1.28 1.28 7.75 7.75 0 1 0 10.64 10.64 1 1 0 0 1 1.28 1.28Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="currentColor" aria-hidden="true">
              <path d="M12 18a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1Zm6.36-2.95 1.42 1.41a1 1 0 1 1-1.42 1.42l-1.41-1.42a1 1 0 1 1 1.41-1.41ZM6.64 15.05a1 1 0 0 1 0 1.41l-1.42 1.42a1 1 0 0 1-1.41-1.42l1.41-1.41a1 1 0 0 1 1.42 0ZM12 5a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm9 4a1 1 0 1 1 0 2h-2a1 1 0 1 1 0-2h2ZM5 11a1 1 0 1 1 0 2H3a1 1 0 1 1 0-2h2Zm13.36-5.95a1 1 0 0 1 1.41 0 1 1 0 0 1 0 1.42l-1.41 1.41a1 1 0 1 1-1.42-1.41l1.42-1.42ZM5.22 4.99a1 1 0 0 1 1.41 0l1.42 1.42a1 1 0 0 1-1.42 1.41L5.22 6.4a1 1 0 0 1 0-1.41ZM12 1a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0V2a1 1 0 0 1 1-1Z" />
            </svg>
          )}
        </button>
      </main>
    </div>
  );
}