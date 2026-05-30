import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Toyota Dealer Portal",
  description: "Internal dealer portal for vehicle inventory and incentive calculations.",
};

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-zinc-200 font-sans antialiased">
      <main className="w-full max-w-xl px-6 py-12 flex flex-col items-stretch">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-xl font-bold tracking-tighter text-white">TOYOTA</span>
            <span className="text-zinc-700">|</span>
            <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Dealer Portal</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">Incentive Calculator</h1>
          <p className="mt-2 text-sm text-zinc-500 max-w-sm">
            Internal application for logging vehicle sales and configuring incentive slabs.
          </p>
        </div>

        {/* Portal Options */}
        <div className="flex flex-col gap-4">
          
          {/* Sales Card */}
          <Link 
            href="/login/officer" 
            className="group flex flex-col p-5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 hover:bg-zinc-900/60"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white group-hover:text-[#EB0A1E] transition-colors duration-200">
                Sales Officer Portal
              </h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Log monthly sales and track slab progress in real time.
            </p>
          </Link>

          {/* Admin Card */}
          <Link 
            href="/login/admin" 
            className="group flex flex-col p-5 rounded-lg bg-zinc-900/40 border border-zinc-800/80 hover:border-zinc-700 transition-all duration-200 hover:bg-zinc-900/60"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-white group-hover:text-[#EB0A1E] transition-colors duration-200">
                Admin Portal
              </h2>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <p className="mt-2 text-xs text-zinc-500 leading-relaxed">
              Configure car models and adjust dynamic incentive slabs.
            </p>
          </Link>

        </div>

        {/* Footer */}
        <footer className="mt-16 text-center text-[10px] text-zinc-600 uppercase tracking-widest font-medium">
          &copy; {new Date().getFullYear()} Toyota Dealership Network
        </footer>

      </main>
    </div>
  );
}
