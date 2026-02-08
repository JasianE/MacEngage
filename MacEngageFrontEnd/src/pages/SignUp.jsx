import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // ✅ Redirect immediately if user is already logged in
  useEffect(() => {
    const uuid = localStorage.getItem("userUUID");
    if (uuid) {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(
        "https://us-central1-macengage2026.cloudfunctions.net/api/login",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      const data = await res.json();

      if (!res.ok) throw new Error(data.message || "Login failed");

      // Store in localStorage
      localStorage.setItem("userUUID", data.uid);

      // Redirect to dashboard
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
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
            bg-slate-700
            text-white
            font-bold
            py-2
            rounded
            hover:bg-primary
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
