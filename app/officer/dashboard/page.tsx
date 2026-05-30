"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface Car {
  _id: string;
  modelName: string;
  baseSuffix: string;
  variant: string;
}

interface Slab {
  _id: string;
  minCars: number;
  maxCars: number | null;
  incentivePerCar: number;
}

interface SalesItem {
  carId: string;
  quantity: number;
}

export default function OfficerDashboard() {
  const router = useRouter();

  // Selected Month state: YYYY-MM (Defaulting to May 2026 as per PRD local time metadata)
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  
  // Data from backend
  const [cars, setCars] = useState<Car[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Local sales counter state: Record of carId -> quantity
  const [salesQuantities, setSalesQuantities] = useState<Record<string, number>>({});
  
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchSalesData();
  }, [selectedMonth]);

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/officer/sales?month=${selectedMonth}`);
      const data = await res.json();

      if (data.success) {
        setCars(data.cars);
        setSlabs(data.slabs);

        // Build current quantities map
        const qtyMap: Record<string, number> = {};
        
        // Initialize all active cars to 0
        data.cars.forEach((car: Car) => {
          qtyMap[car._id] = 0;
        });

        // Overlay with saved quantities if exist
        if (data.record && data.record.sales) {
          data.record.sales.forEach((item: any) => {
            if (qtyMap[item.carId] !== undefined) {
              qtyMap[item.carId] = item.quantity;
            }
          });
        }

        setSalesQuantities(qtyMap);
      } else {
        triggerNotification("Failed to fetch monthly metrics", "error");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Connection error, please reload page", "error");
    } finally {
      setLoading(false);
    }
  };

  const triggerNotification = (msg: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMsg(msg);
      setTimeout(() => setSuccessMsg(""), 4000);
    } else {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(""), 5000);
    }
  };

  // Safe quantity handlers
  const updateQuantity = (carId: string, value: string) => {
    const qty = value === "" ? 0 : Math.max(0, parseInt(value, 10));
    setSalesQuantities((prev) => ({
      ...prev,
      [carId]: isNaN(qty) ? 0 : qty,
    }));
  };

  const incrementQty = (carId: string) => {
    setSalesQuantities((prev) => ({
      ...prev,
      [carId]: (prev[carId] || 0) + 1,
    }));
  };

  const decrementQty = (carId: string) => {
    setSalesQuantities((prev) => ({
      ...prev,
      [carId]: Math.max(0, (prev[carId] || 0) - 1),
    }));
  };

  // --- REAL-TIME CALCULATOR ENGINE ---
  // Calculates live sums, qualified slab rate, dynamic payout, and target achievements
  const calculations = useMemo(() => {
    // 1. Sum up all quantities
    let totalCars = 0;
    Object.values(salesQuantities).forEach((qty) => {
      totalCars += qty;
    });

    // 2. Identify qualified slab
    let qualifiedSlab: Slab | null = null;
    let rate = 0;

    for (const slab of slabs) {
      const isAboveMin = totalCars >= slab.minCars;
      const isBelowMax = slab.maxCars === null || totalCars <= slab.maxCars;

      if (isAboveMin && isBelowMax) {
        qualifiedSlab = slab;
        rate = slab.incentivePerCar;
        break;
      }
    }

    const totalPayout = totalCars * rate;

    // 3. Next Slab milestone calculations
    // Find the first slab whose minCars is strictly greater than our totalCars
    const sortedSlabs = [...slabs].sort((a, b) => a.minCars - b.minCars);
    const nextSlab = sortedSlabs.find((slab) => slab.minCars > totalCars) || null;

    let carsNeeded = 0;
    let progressPercentage = 100;
    let slabMessage = "";

    if (nextSlab) {
      carsNeeded = nextSlab.minCars - totalCars;
      const prevMin = qualifiedSlab ? qualifiedSlab.minCars : 0;
      const currentSegment = totalCars - prevMin;
      const neededSegment = nextSlab.minCars - prevMin;
      
      progressPercentage = neededSegment > 0 
        ? Math.min(100, Math.max(0, (currentSegment / neededSegment) * 100))
        : 0;

      slabMessage = `You need ${carsNeeded} more car${carsNeeded > 1 ? "s" : ""} to reach the next incentive tier (₹${nextSlab.incentivePerCar.toLocaleString("en-IN")}/car).`;
    } else if (slabs.length > 0 && totalCars >= slabs[slabs.length - 1].minCars) {
      progressPercentage = 100;
      slabMessage = "Congratulations! You have reached the highest incentive tier.";
    } else {
      progressPercentage = 0;
      slabMessage = "No incentive slabs configured. Admin configuration required.";
    }

    return {
      totalCars,
      qualifiedSlab,
      rate,
      totalPayout,
      nextSlab,
      carsNeeded,
      progressPercentage,
      slabMessage,
    };
  }, [salesQuantities, slabs]);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login/officer");
      router.refresh();
    } catch (err) {
      triggerNotification("Logout failed", "error");
    }
  };

  // Submit Logger snapshot
  const handleSaveRecord = async () => {
    setSaving(true);
    try {
      // Build array format required by API
      const salesPayload = Object.entries(salesQuantities).map(([carId, quantity]) => ({
        carId,
        quantity,
      }));

      const response = await fetch("/api/officer/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: selectedMonth,
          sales: salesPayload,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to persist sales counters");

      triggerNotification(`Performance snapshot saved successfully for ${selectedMonth}!`, "success");
    } catch (err: any) {
      triggerNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-[#0d0d0f] text-white min-h-screen font-sans relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#EB0A1E]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[#EB0A1E]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative w-full z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tighter text-[#EB0A1E]">TOYOTA</span>
          <span className="text-zinc-600">|</span>
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Sales Officer Panel</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-zinc-400">Dealership Officer</span>
            <span className="text-[10px] text-zinc-500 font-light">Real-Time Tracker</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-300 active:scale-95"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 py-8 z-10">
        
        {/* Floating Toasts */}
        {successMsg && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-4 rounded-xl bg-emerald-950 border border-emerald-900 text-emerald-400 text-xs font-semibold shadow-2xl animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-4 rounded-xl bg-red-950 border border-red-900 text-red-400 text-xs font-semibold shadow-2xl animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Dashboard Title & Month Selector */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Sales & Incentive Payouts</h1>
            <p className="text-sm text-zinc-400 mt-2">Log monthly car sales volume and view real-time calculated incentive slab rates.</p>
          </div>
          
          {/* Month Selector Form element */}
          <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-2.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">Target Month</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-0 text-white font-bold text-sm focus:outline-none focus:ring-0 cursor-pointer"
            />
          </div>
        </div>

        {loading ? (
          /* Loading Skeleton */
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-t-red-600 border-zinc-800 rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Retrieving Fleet Metrics...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* COLUMN 1: Active vehicle logs form */}
            <section className="lg:col-span-7 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
              <div className="flex items-center justify-between border-b border-zinc-800/85 pb-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Monthly Sales entry</h2>
                  <p className="text-xs text-zinc-500 mt-1">Specify quantity sold for each active Toyota model.</p>
                </div>
                
                {/* Save Snapshots */}
                <button
                  onClick={handleSaveRecord}
                  disabled={saving || cars.length === 0}
                  className="h-10 px-5 rounded-xl bg-[#EB0A1E] hover:bg-red-700 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300 font-semibold text-xs flex items-center gap-1.5 active:scale-95 shadow-md shadow-[#EB0A1E]/10"
                >
                  {saving ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-t-white border-zinc-800 rounded-full animate-spin" />
                      <span>Saving snapshot...</span>
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      <span>Save Record</span>
                    </>
                  )}
                </button>
              </div>

              {cars.length === 0 ? (
                <div className="text-center py-16 border border-dashed border-zinc-800 rounded-2xl">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-zinc-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="text-xs text-zinc-500 font-medium block">No car models available</span>
                  <span className="text-[10px] text-zinc-600 mt-1 block">Inventory must be seeded or configured by Admin first.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {cars.map((car) => (
                    <div
                      key={car._id}
                      className="p-5 rounded-2xl bg-zinc-950 border border-zinc-850 hover:border-zinc-800 transition-all duration-300 flex items-center justify-between"
                    >
                      <div>
                        <h3 className="font-bold text-white text-base">{car.modelName}</h3>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] text-zinc-400 font-medium px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            {car.baseSuffix}
                          </span>
                          <span className="text-[10px] text-zinc-500 font-light">{car.variant}</span>
                        </div>
                      </div>

                      {/* Counter Controls */}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => decrementQty(car._id)}
                          className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center font-bold text-white text-lg transition-colors duration-200 active:scale-90"
                        >
                          &minus;
                        </button>
                        
                        <input
                          type="number"
                          min="0"
                          value={salesQuantities[car._id] === 0 ? "" : salesQuantities[car._id]}
                          onChange={(e) => updateQuantity(car._id, e.target.value)}
                          placeholder="0"
                          className="w-16 h-10 bg-zinc-950 border border-zinc-800 rounded-xl text-center font-extrabold text-sm text-[#EB0A1E] focus:outline-none focus:border-[#EB0A1E] appearance-none"
                        />
                        
                        <button
                          type="button"
                          onClick={() => incrementQty(car._id)}
                          className="w-10 h-10 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 flex items-center justify-center font-bold text-white text-lg transition-colors duration-200 active:scale-90"
                        >
                          &#43;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* COLUMN 2: Real-time calculation insights */}
            <section className="lg:col-span-5 flex flex-col gap-6">
              
              {/* Card 1: Payout Breakdown */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-gradient-to-bl from-[#EB0A1E]/10 to-transparent rounded-bl-full pointer-events-none" />
                
                <h2 className="text-xl font-bold tracking-tight mb-5">Incentive Breakdown Panel</h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                    <span className="text-xs text-zinc-400">Total Cars Sold</span>
                    <span className="text-lg font-extrabold text-white">{calculations.totalCars} Cars</span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                    <span className="text-xs text-zinc-400">Qualified Slab Range</span>
                    <span className="text-xs font-bold px-2.5 py-1 rounded bg-[#EB0A1E]/15 border border-[#EB0A1E]/30 text-red-400">
                      {calculations.qualifiedSlab 
                        ? `${calculations.qualifiedSlab.minCars}${calculations.qualifiedSlab.maxCars === null ? "+" : `–${calculations.qualifiedSlab.maxCars}`} Cars`
                        : "No slab tier met"
                      }
                    </span>
                  </div>

                  <div className="flex items-center justify-between pb-3 border-b border-zinc-800/60">
                    <span className="text-xs text-zinc-400">Incentive Rate per Car</span>
                    <span className="text-sm font-extrabold text-white">
                      ₹{calculations.rate.toLocaleString("en-IN")}
                    </span>
                  </div>

                  <div className="pt-4 flex flex-col gap-1.5">
                    <span className="text-xs text-zinc-400 block">Total Calculated Payout</span>
                    <div className="text-4xl sm:text-5xl font-black text-[#EB0A1E] tracking-tight">
                      ₹{calculations.totalPayout.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Progress Tracker */}
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm">
                <h2 className="text-xl font-bold tracking-tight mb-4">Progress Tracker</h2>
                
                <div className="space-y-4">
                  {/* Message Banner */}
                  <p className="text-xs text-zinc-300 leading-relaxed font-medium">
                    {calculations.slabMessage}
                  </p>

                  {/* Animated Progress Bar wrapper */}
                  <div className="w-full h-2.5 rounded-full bg-zinc-950 border border-zinc-850 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#EB0A1E] to-red-500 shadow-md shadow-[#EB0A1E]/30 transition-all duration-700 ease-out"
                      style={{ width: `${calculations.progressPercentage}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-zinc-500 font-bold uppercase tracking-wider">
                    <span>{calculations.totalCars} sold</span>
                    <span>
                      {calculations.nextSlab 
                        ? `Target: ${calculations.nextSlab.minCars} cars`
                        : "Highest Tier Met"
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 3: Dynamic Slab Table Reference */}
              <div className="bg-zinc-900/20 border border-zinc-850/80 rounded-3xl p-6">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 mb-3.5">Active Payout slab References</h3>
                <div className="space-y-2">
                  {slabs.map((slab) => {
                    const isActive = calculations.qualifiedSlab?._id === slab._id;
                    return (
                      <div
                        key={slab._id}
                        className={`flex items-center justify-between text-xs p-2.5 rounded-xl transition-all duration-300 ${
                          isActive 
                            ? "bg-[#EB0A1E]/10 border border-[#EB0A1E]/30 text-white font-bold" 
                            : "bg-zinc-950/60 border border-zinc-900 text-zinc-400"
                        }`}
                      >
                        <span>
                          {slab.minCars}{slab.maxCars === null ? "+" : `–${slab.maxCars}`} Cars
                        </span>
                        <span>₹{slab.incentivePerCar.toLocaleString("en-IN")} / car</span>
                      </div>
                    );
                  })}
                </div>
              </div>

            </section>

          </div>
        )}
      </main>
    </div>
  );
}
