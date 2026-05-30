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

  // Navigation Tabs State: 'sales' | 'history'
  const [activeTab, setActiveTab] = useState<"sales" | "history">("sales");

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
        triggerNotification("Unable to load sales data.", "error");
      }
    } catch (err) {
      console.error(err);
      triggerNotification("Connection error. Please refresh the page.", "error");
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
        slabMessage: "This month's sales submission is locked. Payout rate is frozen.",
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

  const handleLoadMonth = (monthStr: string) => {
    setSelectedMonth(monthStr);
    setActiveTab("sales");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      
      {/* Left Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter text-slate-900">TOYOTA</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Sales Portal</span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {[
            { id: "sales", label: "Submit Sales" },
            { id: "history", label: "Sales History" },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full text-left px-4 py-3 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer ${
                  isActive 
                    ? "bg-red-50 text-[#EB0A1E]" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer / Logout */}
        <div className="p-6 border-t border-slate-200 flex flex-col gap-3">
          <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider text-center">
            Monthly Calculator
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 font-medium transition-all duration-150 cursor-pointer text-center"
          >
            Log Out
          </button>
        </div>

      </aside>

      {/* Main Workspace Area */}
      <main className="flex-1 min-w-0 px-6 md:px-10 py-8 space-y-6">
        
        {/* Toast Alerts (Float) */}
        {(successMsg || errorMsg) && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs font-semibold shadow-lg max-w-md animate-fade-in bg-white border-slate-250 text-slate-800">
            {successMsg ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{successMsg}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{errorMsg}</span>
              </>
            )}
          </div>
        )}

        {/* Dashboard Title & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex flex-col items-start">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {activeTab === "sales" ? "Submit Sales" : "Sales History"}
              </h1>
              
              {/* Status Badge */}
              <span className={`text-[9px] uppercase tracking-wider px-2.5 py-0.5 rounded-lg font-bold border ${
                isSubmitted 
                  ? "bg-green-50 border-green-200 text-green-800" 
                  : isCurrentMonth
                    ? "bg-amber-50 border-amber-200 text-amber-800"
                    : "bg-slate-100 border-slate-200 text-slate-600"
              }`}>
                {isSubmitted ? "Locked" : isCurrentMonth ? "Draft" : "Read-Only"}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Enter monthly vehicle sales.</p>
          </div>
          
          {/* Month Selector */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 self-start shadow-none">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Month</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent border-none text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
            />
          </div>
        </div>

        {/* Notification Banners */}
        {!loading && (
          <div className="space-y-4">
            {isSubmitted && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-800 font-medium">
                🔒 This month's sales submission is finalized and locked. Payout calculations are frozen.
              </div>
            )}
            {!isSubmitted && isPastMonth && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 font-medium">
                ⚠️ Past months are read-only.
              </div>
            )}
            {!isSubmitted && isFutureMonth && (
              <div className="p-4 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 font-medium">
                Future months cannot be edited.
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <div className="w-6 h-6 border-2 border-t-slate-600 border-slate-200 rounded-full animate-spin" />
            <span className="text-[11px] text-slate-400">Retrieving parameters...</span>
          </div>
        ) : (
          <div className="space-y-6">
            
            {/* --- TAB 1: MONTHLY SALES ENTRY & CALCULATIONS --- */}
            {activeTab === "sales" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* COLUMN 1: Active vehicle logs form */}
                <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-8 shadow-none space-y-6">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">Vehicle Sales</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Enter sales numbers for each model.</p>
                    </div>
                    
                    {canEdit && (
                      <div className="flex gap-2">
                        <button
                          onClick={handleSaveRecord}
                          disabled={saving || cars.length === 0}
                          className="h-9 px-4 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-350 transition-colors font-semibold text-xs text-slate-700 cursor-pointer shadow-none active:scale-[0.98]"
                        >
                          {saving ? "Saving..." : "Save Draft"}
                        </button>
                        
                        <button
                          onClick={() => setSubmitConfirmOpen(true)}
                          disabled={submitting || cars.length === 0}
                          className="h-9 px-4 rounded-lg bg-[#EB0A1E] hover:bg-red-700 transition-colors font-semibold text-xs text-white cursor-pointer shadow-none active:scale-[0.98]"
                        >
                          {submitting ? "Submitting..." : "Submit Sales"}
                        </button>
                      </div>
                    )}
                  </div>

                  {cars.length === 0 ? (
                    <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                      <span className="text-xs text-slate-400 font-medium">No active vehicle models listed.</span>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {cars.map((car) => (
                        <div
                          key={car._id}
                          className="p-5 rounded-xl bg-slate-50/50 border border-slate-200 hover:border-slate-350 hover:bg-slate-50 transition-colors flex items-center justify-between"
                        >
                          <div>
                            <h3 className="font-bold text-slate-900 text-xs">{car.modelName}</h3>
                            <div className="flex items-center gap-2 mt-1.5 text-[10px]">
                              <span className="text-slate-600 font-semibold px-2 py-0.5 rounded bg-white border border-slate-200">
                                {car.baseSuffix}
                              </span>
                              <span className="text-slate-500 font-medium">{car.variant}</span>
                            </div>
                          </div>

                          {/* Item Counters */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => decrementQty(car._id)}
                              className="w-10 h-10 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-slate-800 text-base shadow-none transition-colors cursor-pointer"
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
                              className="w-16 h-10 bg-white border border-slate-300 text-slate-900 rounded-lg text-center font-bold text-xs focus:outline-none focus:border-slate-500 disabled:opacity-50 appearance-none shadow-none"
                            />
                            
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => incrementQty(car._id)}
                              className="w-10 h-10 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center font-bold text-slate-800 text-base shadow-none transition-colors cursor-pointer"
                            >
                              &#43;
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* COLUMN 2: Real-time calculations */}
                <section className="lg:col-span-5 flex flex-col gap-6">
                  
                  {/* Payout breakdown card */}
                  <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-none space-y-6">
                    <h2 className="text-base font-bold text-slate-900">Incentive Payout</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs text-slate-500">Cars Mapped</span>
                        <span className="text-sm font-bold text-slate-900">{calculations.totalCars}</span>
                      </div>

                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs text-slate-500">Qualified Slab</span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-slate-700">
                          {calculations.qualifiedSlab}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                        <span className="text-xs text-slate-500">Incentive per Car</span>
                        <span className="text-xs font-bold text-slate-900">
                          ₹{calculations.rate.toLocaleString("en-IN")}
                        </span>
                      </div>

                      <div className="pt-2 flex flex-col gap-1.5">
                        <span className="text-xs text-slate-500 block">Total Payout</span>
                        <div className="text-3xl font-extrabold text-[#EB0A1E] tracking-tight">
                          ₹{calculations.totalPayout.toLocaleString("en-IN")}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Progress tracker */}
                  <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-none space-y-4">
                    <h2 className="text-base font-bold text-slate-900">Current Incentive</h2>
                    
                    <div className="space-y-4">
                      <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                        {calculations.slabMessage}
                      </p>

                      {/* Minimal progress bar */}
                      <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                        <div
                          className="h-full bg-[#EB0A1E] transition-all duration-300"
                          style={{ width: `${calculations.progressPercentage}%` }}
                        />
                      </div>

                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold uppercase tracking-wider">
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
                  <div className="bg-slate-50/50 border border-slate-200 rounded-xl p-6 space-y-4">
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">Incentive Rate</h3>
                    <div className="space-y-2">
                      {slabs.map((slab) => {
                        const rangeLabel = `${slab.minCars}${slab.maxCars === null ? "+" : `–${slab.maxCars}`}`;
                        const isActive = !isSubmitted && calculations.qualifiedSlab === rangeLabel;
                        return (
                          <div
                            key={slab._id}
                            className={`flex items-center justify-between text-xs p-3 rounded-lg border transition-all duration-150 ${
                              isActive 
                                ? "bg-white border-slate-350 shadow-xs text-slate-900 font-bold" 
                                : "bg-transparent border-transparent text-slate-500"
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
            )}

            {/* --- TAB 2: DETAILED SALES HISTORY LOG --- */}
            {activeTab === "history" && (
              <section className="bg-white border border-slate-200 rounded-xl p-8 shadow-none space-y-6">
                <div className="border-b border-slate-200 pb-4">
                  <h2 className="text-base font-bold text-slate-900">Sales History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">History of monthly sales submissions and drafts.</p>
                </div>

                {history.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-xs text-slate-400 font-medium">No past monthly logs found.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <th className="pb-4 font-bold">Reporting Month</th>
                          <th className="pb-4 font-bold">Cars Sold</th>
                          <th className="pb-4 font-bold">Qualified Slab</th>
                          <th className="pb-4 font-bold">Total Payout</th>
                          <th className="pb-4 font-bold">Status</th>
                          <th className="pb-4 text-right font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {history.map((recordItem) => {
                          const recMonth = recordItem.month;
                          const isLoaded = selectedMonth === recMonth;
                          
                          const badgeStyle = recordItem.status === "submitted"
                            ? "bg-green-50 border-green-200 text-green-800"
                            : "bg-amber-50 border-amber-200 text-amber-800";
                          
                          const slabLabel = recordItem.status === "submitted"
                            ? recordItem.qualifiedSlabRangeAtSubmission || "None"
                            : "Draft (Unsubmitted)";

                          return (
                            <tr key={recordItem._id} className={`hover:bg-slate-50/80 transition-colors ${isLoaded ? "bg-slate-50/50" : ""}`}>
                              <td className="py-4 font-bold text-slate-900 uppercase">{recMonth}</td>
                              <td className="py-4 text-slate-900 font-semibold">{recordItem.totalCars}</td>
                              <td className="py-4">
                                <span className="px-2.5 py-1 rounded-lg text-[10px] border border-slate-200 text-slate-700 bg-slate-100">
                                  {slabLabel}
                                </span>
                              </td>
                              <td className="py-4 text-[#EB0A1E] font-bold text-sm">
                                ₹{recordItem.totalIncentive.toLocaleString("en-IN")}
                              </td>
                              <td className="py-4">
                                <span className={`px-2.5 py-1 rounded-lg text-[10px] border font-bold ${badgeStyle}`}>
                                  {recordItem.status === "submitted" ? "Locked" : "Draft"}
                                </span>
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => handleLoadMonth(recMonth)}
                                  className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors duration-150 cursor-pointer ${
                                    isLoaded 
                                      ? "bg-slate-100 text-slate-900 border border-slate-300" 
                                      : "text-slate-500 hover:text-slate-900"
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
            )}

          </div>
        )}
      </main>

      {/* --- SUBMIT CONFIRMATION MODAL --- */}
      {submitConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-8 rounded-xl bg-white border border-slate-250 shadow-xl relative text-center animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-2">Submit Sales</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Are you sure you want to submit this monthly record? Once submitted, the record is locked and cannot be edited. The payout rate will be locked and will not change if slab settings are updated.
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setSubmitConfirmOpen(false)}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-850 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="px-5 py-2 bg-[#EB0A1E] hover:bg-red-700 text-white font-semibold text-xs rounded-lg active:scale-[0.98] cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
