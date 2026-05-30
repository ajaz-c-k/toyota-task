"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role: "admin" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-800 px-4 sm:px-6 font-sans antialiased">
      <div className="w-full max-w-sm p-5 sm:p-8 rounded-xl bg-white border border-slate-200 shadow-none flex flex-col items-stretch">
        
        {/* Back Link */}
        <Link 
          href="/" 
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-850 transition-colors duration-200 mb-8 self-start font-medium"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back</span>
        </Link>

        {/* Brand Header */}
        <div className="mb-6 flex flex-col items-start">
          <div className="flex items-center gap-1.5 text-xs text-[#EB0A1E] font-semibold tracking-wider uppercase mb-1">
            Toyota Admin Settings
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Sign In</h1>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs mb-5 font-medium flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 shrink-0 text-red-650" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Input Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@toyota.com"
              required
              className="w-full h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors duration-150 shadow-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-10 px-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 text-xs focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors duration-150 shadow-xs"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-10 mt-6 rounded-lg bg-[#EB0A1E] text-white font-semibold text-xs transition-colors duration-200 hover:bg-red-700 active:bg-red-800 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            {loading ? "Signing In..." : "Sign In as Admin"}
          </button>
        </form>

        {/* Route Transition */}
        <div className="mt-8 text-center text-xs text-slate-500 border-t border-slate-200 pt-6">
          Are you a Sales Officer?{" "}
          <Link 
            href="/login/officer" 
            className="font-semibold text-slate-750 hover:text-[#EB0A1E] hover:underline transition-colors duration-200"
          >
            Sign in here
          </Link>
        </div>

      </div>
    </div>
  );
}
