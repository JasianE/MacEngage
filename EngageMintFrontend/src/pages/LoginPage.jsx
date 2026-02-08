// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE, linkDeviceOwner } from "../utils/postRequests";
import engagementLogoText from "../assets/engagement_logo_text.png";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const payload = await res.json();
      if (!res.ok || payload?.ok === false) {
        throw new Error(payload?.message || "Login failed");
      }

      const uid = payload?.data?.uid;
      if (!uid) {
        throw new Error("Login succeeded but no user id was returned.");
      }

      localStorage.setItem("userUUID", uid);

      try {
        await linkDeviceOwner(uid);
      } catch (ownerError) {
        console.warn("Failed to link default device owner:", ownerError);
      }

      // Redirect to dashboard
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#edf1f4] bg-[radial-gradient(circle_at_15%_50%,rgba(20,184,166,0.08),transparent_25%),radial-gradient(circle_at_85%_30%,rgba(16,185,129,0.08),transparent_25%)]">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-[400px] bg-white border border-gray-100 rounded-2xl shadow-xl shadow-gray-300/40 px-8 py-8"
      >
        <div className="flex flex-col items-center pt-1 pb-2">
          <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center text-teal-600 mb-5 shadow-sm overflow-hidden">
            <img
              src={engagementLogoText}
              alt="Engagement logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <h1 className="text-[38px] leading-none font-extrabold tracking-tight text-slate-900 uppercase">
            ENGAGEMINT
          </h1>
          <p className="text-xs font-medium text-gray-500 mt-1 uppercase tracking-wider">
            Authentication
          </p>
        </div>

        <div className="flex border-b border-gray-100 mt-4 mb-6">
          <button
            type="button"
            className="flex-1 pb-3 text-sm font-medium text-emerald-600 border-b-2 border-emerald-500"
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => navigate("/signup")}
            className="flex-1 pb-3 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
          >
            Sign Up
          </button>
        </div>

        <div className="space-y-4">
          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-11 px-3 rounded-lg border border-gray-200 bg-gray-50 text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-800 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-11 px-3 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-slate-900 placeholder:text-gray-400 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Toggle password visibility"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
                </svg>
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg transition-all shadow-md shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Logging in..." : "Login to Dashboard"}
          </button>
        </div>
      </form>
    </div>
  );
}
