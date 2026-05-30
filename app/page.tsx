import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Toyota Smart Incentive Calculator | Dealership Portal",
  description: "Internal dealer portal for Toyota sales incentives and inventory configuration.",
};

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center justify-center min-h-screen bg-[#0d0d0f] text-white overflow-hidden font-sans">
      {/* Decorative Brand Gradient Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#EB0A1E]/15 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#EB0A1E]/10 rounded-full blur-[120px]" />
      
      {/* Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      <main className="relative flex flex-col items-center max-w-5xl w-full px-6 py-12 z-10">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-12 gap-3 text-center">
          <div className="bg-[#EB0A1E] text-white text-xs font-bold uppercase tracking-[0.3em] px-4 py-1.5 rounded-full shadow-lg shadow-[#EB0A1E]/30 animate-pulse">
            Toyota Internal Tool
          </div>
          
          {/* Logo Symbol (Constructed via CSS for modern tech look) */}
          <div className="flex items-center gap-2 mt-4">
            <span className="text-3xl font-black tracking-tighter text-[#EB0A1E]">TOYOTA</span>
            <span className="text-zinc-500 font-light">|</span>
            <span className="text-lg tracking-widest text-zinc-400 font-medium uppercase">Dealerships</span>
          </div>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white max-w-2xl leading-none">
            Smart <span className="text-[#EB0A1E] bg-gradient-to-r from-[#EB0A1E] to-red-400 bg-clip-text text-transparent">Incentive</span> Calculator
          </h1>
          <p className="max-w-xl mt-4 text-base sm:text-lg text-zinc-400 font-normal">
            Automate monthly sales volume payouts, configure custom incentive thresholds, and track performance targets in real time.
          </p>
        </div>

        {/* Portal Entry Selector (Responsive Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mt-4">
          
          {/* Sales Officer Portal Card */}
          <Link href="/login/officer" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-[#EB0A1E]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-[#EB0A1E]/10 overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#EB0A1E]/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-[#EB0A1E] group-hover:bg-[#EB0A1E] group-hover:text-white transition-all duration-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors duration-300">
                Sales Officer Portal
              </h2>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Log monthly vehicle sales volume, view dynamic slab adjustments instantly, and track progress toward your next high-tier payout rate.
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-[#EB0A1E] group-hover:translate-x-2 transition-transform duration-300">
              <span>Enter Sales Dashboard</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>

          {/* Admin Configuration Portal Card */}
          <Link href="/login/admin" className="group relative flex flex-col justify-between p-8 rounded-3xl bg-zinc-900/60 border border-zinc-800 hover:border-[#EB0A1E]/40 transition-all duration-500 hover:shadow-2xl hover:shadow-[#EB0A1E]/10 overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#EB0A1E]/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div>
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-zinc-800/80 border border-zinc-700 text-red-500 group-hover:bg-[#EB0A1E] group-hover:text-white transition-all duration-500 mb-6">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-white group-hover:text-red-400 transition-colors duration-300">
                Admin Settings Portal
              </h2>
              <p className="mt-3 text-sm text-zinc-400 leading-relaxed">
                Configure Toyota vehicle models in active inventory, manage dynamic slab thresholds, and edit payout tiers without any code redeployments.
              </p>
            </div>
            
            <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-[#EB0A1E] group-hover:translate-x-2 transition-transform duration-300">
              <span>Enter Admin Dashboard</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
          
        </div>

        {/* Brand Footer */}
        <footer className="mt-20 text-xs text-zinc-500 tracking-wider font-light text-center">
          &copy; {new Date().getFullYear()} Toyota Dealership Network. All Rights Reserved. Confidential Internal System.
        </footer>
      </main>
    </div>
  );
}
