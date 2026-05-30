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

      // Redirect upon successful login
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex flex-col flex-1 items-center justify-center min-h-screen bg-[#0d0d0f] text-white px-6 font-sans">
      {/* Decorative Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EB0A1E]/10 rounded-full blur-[120px]" />
      
      {/* Container Card */}
      <div className="relative w-full max-w-md p-8 sm:p-10 rounded-3xl bg-zinc-900/80 border border-zinc-800 shadow-2xl shadow-[#EB0A1E]/5 backdrop-blur-md z-10">
        
        {/* Back Link */}
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-white transition-colors duration-300 mb-6 group">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 group-hover:-translate-x-0.5 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          <span>Back to Portal Home</span>
        </Link>

        {/* Title */}
        <div className="mb-6">
          <span className="text-xs font-bold tracking-[0.2em] text-[#EB0A1E] uppercase">Dealership Configuration</span>
          <h2 className="text-3xl font-black tracking-tight text-white mt-1">Admin Login</h2>
          <p className="text-sm text-zinc-400 mt-2">
            Enter your credentials to manage car fleets and dynamic slabs.
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 p-4 rounded-xl bg-red-950/40 border border-red-900/50 text-red-400 text-xs mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@toyota.com"
              required
              className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#EB0A1E]/80 transition-colors duration-300"
            />
          </div>

          <div>
            <label className="block text-xs font-bold tracking-wider text-zinc-400 uppercase mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-12 px-4 rounded-xl bg-zinc-950 border border-zinc-800 text-white placeholder-zinc-600 text-sm focus:outline-none focus:border-[#EB0A1E]/80 transition-colors duration-300"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-6 rounded-xl bg-[#EB0A1E] text-white font-semibold text-sm transition-all duration-300 hover:bg-red-700 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-[#EB0A1E]/20"
          >
            {loading ? "Authenticating Admin..." : "Access Admin Panel"}
          </button>
        </form>

        {/* Transition Link */}
        <div className="mt-8 text-center text-xs text-zinc-500 border-t border-zinc-800/80 pt-6">
          Are you a Sales Officer?{" "}
          <Link href="/login/officer" className="font-semibold text-white hover:text-red-400 transition-colors duration-300">
            Sign in here
          </Link>
        </div>

      </div>
    </div>
  );
}
