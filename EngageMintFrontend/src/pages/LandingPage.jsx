import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import engagementLogoText from "../assets/engagement_logo_text.png";

export default function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    document.documentElement.classList.remove("dark");

    const savedUUID = localStorage.getItem("userUUID");

    if (savedUUID && savedUUID !== "undefined") {
      navigate("/dashboard");
    }
  }, [navigate]);

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
            <img
              src={engagementLogoText}
              alt="Engagement logo"
              className="h-10 w-10 rounded-xl object-contain"
            />
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
          <img
            src={engagementLogoText}
            alt="Engagement logo"
            className="mb-7 h-16 w-16 rounded-2xl object-contain"
          />

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
      </main>
    </div>
  );
}