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

interface RecordData {
  _id: string;
  month: string;
  sales: { carId: string; quantity: number }[];
  totalCars: number;
  totalIncentive: number;
  qualifiedSlabId: string | null;
  status: "draft" | "submitted";
  qualifiedSlabRateAtSubmission: number;
  qualifiedSlabRangeAtSubmission: string;
}

export default function OfficerDashboard() {
  const router = useRouter();

  // Month state (defaults to May 2026)
  const [selectedMonth, setSelectedMonth] = useState("2026-05");
  const [currentMonth, setCurrentMonth] = useState("2026-05");
  
  const [cars, setCars] = useState<Car[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [record, setRecord] = useState<RecordData | null>(null);
  const [history, setHistory] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Submit confirmation dialog
  const [submitConfirmOpen, setSubmitConfirmOpen] = useState(false);

  // local counters
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
        setCurrentMonth(data.currentMonth);
        setRecord(data.record);
        if (data.history) {
          setHistory(data.history);
        }

        const qtyMap: Record<string, number> = {};
        
        data.cars.forEach((car: Car) => {
          qtyMap[car._id] = 0;
        });

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

  // Status checks
  const isSubmitted = record?.status === "submitted";
  const isCurrentMonth = selectedMonth === currentMonth;
  const isPastMonth = selectedMonth < currentMonth;
  const isFutureMonth = selectedMonth > currentMonth;
  const canEdit = isCurrentMonth && !isSubmitted;

  // Real-time calculations or Immutable past calculations
  const calculations = useMemo(() => {
    if (isSubmitted && record) {
      return {
        totalCars: record.totalCars,
        qualifiedSlab: record.qualifiedSlabRangeAtSubmission || "None",
        rate: record.qualifiedSlabRateAtSubmission || 0,
        totalPayout: record.totalIncentive,
        progressPercentage: 100,
        slabMessage: "This month is locked. Payout rate is frozen and immune to dynamic slab changes.",
        nextSlab: null,
      };
    }

    let totalCars = 0;
    Object.values(salesQuantities).forEach((qty) => {
      totalCars += qty;
    });

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

      slabMessage = `Sell ${carsNeeded} more car${carsNeeded > 1 ? "s" : ""} to reach the next slab (₹${nextSlab.incentivePerCar}/car).`;
    } else if (slabs.length > 0 && totalCars >= slabs[slabs.length - 1].minCars) {
      progressPercentage = 100;
      slabMessage = "Highest slab rate unlocked.";
    } else {
      progressPercentage = 0;
      slabMessage = "Define slabs in Admin Panel to calculate incentive thresholds.";
    }

    return {
      totalCars,
      qualifiedSlab: qualifiedSlab ? `${qualifiedSlab.minCars}${qualifiedSlab.maxCars === null ? "+" : `–${qualifiedSlab.maxCars}`}` : "None",
      rate,
      totalPayout,
      progressPercentage,
      slabMessage,
      nextSlab,
    };
  }, [salesQuantities, slabs, record, isSubmitted]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login/officer");
      router.refresh();
    } catch (err) {
      triggerNotification("Logout failed", "error");
    }
  };

  const handleSaveRecord = async () => {
    if (!canEdit) return;
    setSaving(true);
    try {
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
          submit: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save draft");

      setRecord(data.record);
      // Refresh history log list
      if (data.record) {
        setHistory(prev => {
          const index = prev.findIndex(h => h.month === selectedMonth);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = data.record;
            return copy;
          }
          return [data.record, ...prev];
        });
      }
      triggerNotification("Draft saved successfully.", "success");
    } catch (err: any) {
      triggerNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitConfirmOpen(false);
    setSubmitting(true);
    try {
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
          submit: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to submit performance log");

      setRecord(data.record);
      // Refresh history list
      if (data.record) {
        setHistory(prev => {
          const index = prev.findIndex(h => h.month === selectedMonth);
          if (index !== -1) {
            const copy = [...prev];
            copy[index] = data.record;
            return copy;
          }
          return [data.record, ...prev];
        });
      }
      triggerNotification(`Month ${selectedMonth} submitted and permanently locked.`, "success");
    } catch (err: any) {
      triggerNotification(err.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  // Quick select helper
  const handleLoadMonth = (monthStr: string) => {
    setSelectedMonth(monthStr);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-200 font-sans antialiased">
      
      {/* Top Navbar */}
      <header className="w-full border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tighter text-white">TOYOTA</span>
          <span className="text-zinc-800">|</span>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Sales Portal</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500 font-medium">Monthly Calculator</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700 transition-all duration-150 cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        
        {/* Toast Alerts */}
        {(successMsg || errorMsg) && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded border text-xs font-medium shadow-lg max-w-md animate-fade-in bg-zinc-900 border-zinc-800">
            {successMsg ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">{successMsg}</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-zinc-300">{errorMsg}</span>
              </>
            )}
          </div>
        )}

        {/* Dashboard Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 border-b border-zinc-900 pb-6">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold text-white tracking-tight">Sales & Incentive Payouts</h1>
              
              {/* Status Badge */}
              <span className={`text-[9px] uppercase tracking-wider px-2 py-0.5 rounded font-bold border ${
                isSubmitted 
                  ? "bg-red-950/20 border-red-900/50 text-red-400" 
                  : isCurrentMonth
                    ? "bg-zinc-900 border-zinc-800 text-zinc-400"
                    : "bg-amber-950/20 border-amber-900/40 text-amber-500"
              }`}>
                {isSubmitted ? "Locked" : isCurrentMonth ? "Draft" : "Read-Only"}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">Log monthly sales and calculate corresponding dynamic incentive rates.</p>
          </div>
          
          {/* Month Input element */}
          <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 self-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Notification Banners */}
        {!loading && (
          <div className="mb-6">
            {isSubmitted && (
              <div className="p-3 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-500">
                🔒 This month's performance log is submitted and locked. Payout calculations are frozen.
              </div>
            )}
            {!isSubmitted && isPastMonth && (
              <div className="p-3 rounded bg-amber-950/10 border border-amber-900/20 text-xs text-amber-500">
                ⚠️ Past months are read-only.
              </div>
            )}
            {!isSubmitted && isFutureMonth && (
              <div className="p-3 rounded bg-zinc-950 border border-zinc-900 text-xs text-zinc-650">
                Future months cannot be edited.
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <div className="w-5 h-5 border-2 border-t-zinc-400 border-zinc-900 rounded-full animate-spin" />
            <span className="text-[11px] text-zinc-600">Retrieving monthly parameters...</span>
          </div>
        ) : (
          <div className="space-y-8">
            
            {/* Top Workspace Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* COLUMN 1: Active vehicle logs form */}
              <section className="lg:col-span-7 bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                <div className="flex items-center justify-between border-b border-zinc-900 pb-4 mb-6">
                  <div>
                    <h2 className="text-sm font-medium text-white">Monthly Sales</h2>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Specify sales metrics per active model.</p>
                  </div>
                  
                  {canEdit && (
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveRecord}
                        disabled={saving || cars.length === 0}
                        className="h-8 px-3 rounded bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 hover:border-zinc-700 transition-colors font-medium text-xs text-zinc-300 active:scale-[0.98] cursor-pointer"
                      >
                        {saving ? "Saving..." : "Save Draft"}
                      </button>
                      
                      <button
                        onClick={() => setSubmitConfirmOpen(true)}
                        disabled={submitting || cars.length === 0}
                        className="h-8 px-3 rounded bg-[#EB0A1E] hover:bg-red-700 transition-colors font-medium text-xs text-white active:scale-[0.98] cursor-pointer"
                      >
                        {submitting ? "Submitting..." : "Submit Log"}
                      </button>
                    </div>
                  )}
                </div>

                {cars.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-zinc-800 rounded">
                    <span className="text-xs text-zinc-600">No active vehicle models listed.</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cars.map((car) => (
                      <div
                        key={car._id}
                        className="p-4 rounded bg-zinc-900/30 border border-zinc-850 hover:border-zinc-800 transition-colors flex items-center justify-between"
                      >
                        <div>
                          <h3 className="font-semibold text-white text-xs">{car.modelName}</h3>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                            <span className="text-zinc-400 font-semibold px-1.5 py-0.5 rounded bg-zinc-950 border border-zinc-850">
                              {car.baseSuffix}
                            </span>
                            <span className="text-zinc-500 font-light">{car.variant}</span>
                          </div>
                        </div>

                        {/* Item Counters */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => decrementQty(car._id)}
                            className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-850 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-zinc-300 text-xs transition-colors cursor-pointer"
                          >
                            &minus;
                        </button>
                          
                          <input
                            type="number"
                            min="0"
                            disabled={!canEdit}
                            value={salesQuantities[car._id] === 0 ? "" : salesQuantities[car._id]}
                            onChange={(e) => updateQuantity(car._id, e.target.value)}
                            placeholder="0"
                            className="w-14 h-8 bg-zinc-950 border border-zinc-800 rounded text-center font-bold text-xs text-white focus:outline-none focus:border-zinc-700 disabled:opacity-50 appearance-none"
                          />
                          
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => incrementQty(car._id)}
                            className="w-8 h-8 rounded bg-zinc-950 border border-zinc-800 hover:border-zinc-850 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-zinc-300 text-xs transition-colors cursor-pointer"
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
                
                {/* Payout breakdown card */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                  <h2 className="text-sm font-medium text-white mb-5">Incentive</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                      <span className="text-xs text-zinc-500">Cars Sold</span>
                      <span className="text-sm font-semibold text-white">{calculations.totalCars}</span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                      <span className="text-xs text-zinc-500">Qualified Slab</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-zinc-900 border border-zinc-850 text-zinc-300">
                        {calculations.qualifiedSlab}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                      <span className="text-xs text-zinc-500">Incentive per Car</span>
                      <span className="text-xs font-semibold text-white">
                        ₹{calculations.rate.toLocaleString("en-IN")}
                      </span>
                    </div>

                    <div className="pt-2 flex flex-col gap-1">
                      <span className="text-xs text-zinc-500 block">Total Payout</span>
                      <div className="text-3xl font-bold text-[#EB0A1E] tracking-tight">
                        ₹{calculations.totalPayout.toLocaleString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress tracker */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                  <h2 className="text-sm font-medium text-white mb-4">Slab Settings Tracker</h2>
                  
                  <div className="space-y-4">
                    <p className="text-xs text-zinc-400 font-medium">
                      {calculations.slabMessage}
                    </p>

                    {/* Minimal progress bar */}
                    <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden">
                      <div
                        className="h-full bg-[#EB0A1E] transition-all duration-300"
                        style={{ width: `${calculations.progressPercentage}%` }}
                      />
                    </div>

                    <div className="flex justify-between items-center text-[9px] text-zinc-600 font-semibold uppercase tracking-wider">
                      <span>{calculations.totalCars} sold</span>
                      <span>
                        {isSubmitted 
                          ? "Locked" 
                          : calculations.nextSlab 
                            ? `Target: ${calculations.nextSlab.minCars} cars`
                            : "Maxed"
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Slab reference quick-table */}
                <div className="bg-zinc-950/40 border border-zinc-900/60 rounded-lg p-5">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-3 block">Slab References</h3>
                  <div className="space-y-2">
                    {slabs.map((slab) => {
                      const rangeLabel = `${slab.minCars}${slab.maxCars === null ? "+" : `–${slab.maxCars}`}`;
                      const isActive = !isSubmitted && calculations.qualifiedSlab === rangeLabel;
                      return (
                        <div
                          key={slab._id}
                          className={`flex items-center justify-between text-xs p-2 rounded transition-colors ${
                            isActive 
                              ? "bg-zinc-900 border border-zinc-800 text-white font-medium" 
                              : "bg-transparent text-zinc-500"
                          }`}
                        >
                          <span>
                            {slab.minCars}{slab.maxCars === null ? "+" : `–${slab.maxCars}`} Cars
                          </span>
                          <span className={isActive ? "text-[#EB0A1E]" : ""}>₹{slab.incentivePerCar.toLocaleString("en-IN")} / car</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </section>

            </div>

            {/* --- DETAILED SALES HISTORY TAB SECTION --- */}
            <section className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
              <div className="border-b border-zinc-900 pb-4 mb-6">
                <h2 className="text-sm font-medium text-white">Sales History</h2>
                <p className="text-[11px] text-zinc-600 mt-0.5">Chronological summary of submitted monthly records and drafts.</p>
              </div>

              {history.length === 0 ? (
                <div className="text-center py-8 border border-dashed border-zinc-800 rounded">
                  <span className="text-xs text-zinc-600">No past monthly logs found.</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Reporting Month</th>
                        <th className="pb-3 font-semibold">Cars Sold</th>
                        <th className="pb-3 font-semibold">Qualified Slab</th>
                        <th className="pb-3 font-semibold">Total Payout</th>
                        <th className="pb-3 font-semibold">Status</th>
                        <th className="pb-3 text-right font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {history.map((recordItem) => {
                        const recMonth = recordItem.month;
                        const isLoaded = selectedMonth === recMonth;
                        
                        // Parse status label and visual classes
                        const badgeStyle = recordItem.status === "submitted"
                          ? "bg-red-950/20 border-red-900/50 text-red-400"
                          : "bg-zinc-900 border-zinc-850 text-zinc-400";
                        
                        const slabLabel = recordItem.status === "submitted"
                          ? recordItem.qualifiedSlabRangeAtSubmission || "None"
                          : "Draft (Unsubmitted)";

                        return (
                          <tr key={recordItem._id} className={`hover:bg-zinc-900/10 transition-colors ${isLoaded ? "bg-zinc-900/10" : ""}`}>
                            <td className="py-3.5 font-bold text-white uppercase">{recMonth}</td>
                            <td className="py-3.5 text-zinc-450">{recordItem.totalCars}</td>
                            <td className="py-3.5 text-zinc-500">
                              <span className="px-2 py-0.5 rounded text-[10px] border border-zinc-850 text-zinc-450">
                                {slabLabel}
                              </span>
                            </td>
                            <td className="py-3.5 text-[#EB0A1E] font-semibold">
                              ₹{recordItem.totalIncentive.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] border font-bold ${badgeStyle}`}>
                                {recordItem.status === "submitted" ? "Locked" : "Draft"}
                              </span>
                            </td>
                            <td className="py-3.5 text-right">
                              <button
                                onClick={() => handleLoadMonth(recMonth)}
                                className={`text-xs font-semibold px-2 py-1 rounded transition-colors duration-150 cursor-pointer ${
                                  isLoaded 
                                    ? "bg-zinc-850 text-white border border-zinc-700" 
                                    : "text-zinc-500 hover:text-white"
                                }`}
                              >
                                {isLoaded ? "Loaded" : "Load Month"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* --- SUBMIT CONFIRMATION MODAL --- */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded bg-zinc-900 border border-zinc-800 shadow-xl relative text-center">
            <h3 className="text-sm font-semibold text-white mb-2">Submit Monthly Performance Log</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to submit? This month will be permanently locked. You will not be able to edit quantities or save new drafts, and dynamic slab changes by admins will not modify your payout.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubmitConfirmOpen(false)}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-4 py-1.5 bg-[#EB0A1E] hover:bg-red-700 text-white font-medium text-xs rounded active:scale-[0.98] cursor-pointer"
              >
                Confirm Submission
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
