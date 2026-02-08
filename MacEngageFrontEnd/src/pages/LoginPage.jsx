// src/pages/Login.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { linkDeviceOwner } from "../utils/postRequests";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("https://us-central1-macengage2026.cloudfunctions.net/api/login", {
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
    <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900">
      <form
        onSubmit={handleLogin}
        className="bg-white dark:bg-slate-800 p-8 rounded shadow-md w-full max-w-sm flex flex-col gap-4"
      >
        <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-white">
          Login
        </h2>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="p-2 rounded border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
        />

        <button
        type="submit"
        disabled={loading}
        className="
            bg-slate-700      /* new default color */
            text-white
            font-bold
            py-2
            rounded
            hover:bg-primary  /* blue on hover */
            transition-colors
            disabled:opacity-50
            disabled:cursor-not-allowed
            cursor-pointer
            hover:bg-sky-700
        "
        >
        {loading ? "Logging in..." : "Login"}
        </button>

        <p className="text-sm text-slate-500 dark:text-slate-300 text-center">
          Don’t have an account?{" "}
          <span
            className="text-primary cursor-pointer hover:underline"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </span>
        </p>
      </form>
    </div>
  );
}
