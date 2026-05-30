"use client";

import { useState, useEffect } from "react";
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

interface PayrollItem {
  officerId: string;
  name: string;
  email: string;
  carsSold: number;
  payout: number;
  status: string;
  slabRange: string;
}

interface PayrollMetrics {
  totalCarsSold: number;
  totalPayrollPayout: number;
  totalOfficers: number;
  lockedSubmissions: number;
  reportingRate: number;
}

interface UserHistoryItem {
  _id: string;
  officerId: string | null;
  name: string;
  email: string;
  month: string;
  totalCars: number;
  totalIncentive: number;
  status: string;
  slabRange: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  
  // Navigation Tabs State: 'inventory' | 'slabs' | 'payroll' | 'users'
  const [activeTab, setActiveTab] = useState<"inventory" | "slabs" | "payroll" | "users">("inventory");

  // Configurations Data State
  const [cars, setCars] = useState<Car[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Payroll Tab Data State
  const [selectedPayrollMonth, setSelectedPayrollMonth] = useState("2026-05");
  const [payrollList, setPayrollList] = useState<PayrollItem[]>([]);
  const [payrollMetrics, setPayrollMetrics] = useState<PayrollMetrics | null>(null);
  const [payrollLoading, setPayrollLoading] = useState(false);

  // Users History Tab Data State
  const [historyList, setHistoryList] = useState<UserHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Modals Forms State
  const [carModal, setCarModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Car }>({ open: false, mode: "add" });
  const [carForm, setCarForm] = useState({ modelName: "", baseSuffix: "", variant: "" });
  
  const [slabModal, setSlabModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Slab }>({ open: false, mode: "add" });
  const [slabForm, setSlabForm] = useState({ minCars: "", maxCars: "", incentivePerCar: "" });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: "car" | "slab"; id: string }>({ open: false, type: "car", id: "" });

  // Initial load
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Fetch Payroll on demand
  useEffect(() => {
    if (activeTab === "payroll") {
      fetchPayrollData();
    }
  }, [activeTab, selectedPayrollMonth]);

  // Fetch Chronological History on demand
  useEffect(() => {
    if (activeTab === "users") {
      fetchUsersHistory();
    }
  }, [activeTab]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [carsRes, slabsRes] = await Promise.all([
        fetch("/api/admin/cars"),
        fetch("/api/admin/slabs"),
      ]);

      const carsData = await carsRes.json();
      const slabsData = await slabsRes.json();

      if (carsData.success) setCars(carsData.cars);
      if (slabsData.success) setSlabs(slabsData.slabs);
    } catch (err) {
      console.error(err);
      triggerToast("Error loading panel configuration", "error");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayrollData = async () => {
    try {
      setPayrollLoading(true);
      const res = await fetch(`/api/admin/payroll?month=${selectedPayrollMonth}`);
      const data = await res.json();
      if (data.success) {
        setPayrollList(data.payroll);
        setPayrollMetrics(data.metrics);
      } else {
        triggerToast("Failed to compile payroll metrics", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to compile payroll metrics", "error");
    } finally {
      setPayrollLoading(false);
    }
  };

  const fetchUsersHistory = async () => {
    try {
      setHistoryLoading(true);
      const res = await fetch("/api/admin/users/history");
      const data = await res.json();
      if (data.success) {
        setHistoryList(data.history);
      } else {
        triggerToast("Failed to retrieve chronological logs", "error");
      }
    } catch (err) {
      console.error(err);
      triggerToast("Failed to retrieve chronological logs", "error");
    } finally {
      setHistoryLoading(false);
    }
  };

  const triggerToast = (msg: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login/admin");
      router.refresh();
    } catch (err) {
      triggerToast("Logout failed", "error");
    }
  };

  // --- CAR ACTIONS ---
  const openAddCar = () => {
    setCarForm({ modelName: "", baseSuffix: "", variant: "" });
    setCarModal({ open: true, mode: "add" });
  };

  const openEditCar = (car: Car) => {
    setCarForm({ modelName: car.modelName, baseSuffix: car.baseSuffix, variant: car.variant });
    setCarModal({ open: true, mode: "edit", data: car });
  };

  const submitCar = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const url = carModal.mode === "add" ? "/api/admin/cars" : `/api/admin/cars/${carModal.data?._id}`;
      const method = carModal.mode === "add" ? "POST" : "PUT";
      
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(carForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save car");

      triggerToast(
        carModal.mode === "add" ? "Vehicle model created" : "Vehicle model updated",
        "success"
      );
      setCarModal({ open: false, mode: "add" });
      fetchDashboardData();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // --- SLAB ACTIONS ---
  const openAddSlab = () => {
    setSlabForm({ minCars: "", maxCars: "", incentivePerCar: "" });
    setSlabModal({ open: true, mode: "add" });
  };

  const openEditSlab = (slab: Slab) => {
    setSlabForm({
      minCars: slab.minCars.toString(),
      maxCars: slab.maxCars === null ? "" : slab.maxCars.toString(),
      incentivePerCar: slab.incentivePerCar.toString(),
    });
    setSlabModal({ open: true, mode: "edit", data: slab });
  };

  const submitSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const min = Number(slabForm.minCars);
      const max = slabForm.maxCars === "" ? null : Number(slabForm.maxCars);
      const incentive = Number(slabForm.incentivePerCar);

      const url = slabModal.mode === "add" ? "/api/admin/slabs" : `/api/admin/slabs/${slabModal.data?._id}`;
      const method = slabModal.mode === "add" ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minCars: min, maxCars: max, incentivePerCar: incentive }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save slab");

      triggerToast(
        slabModal.mode === "add" ? "Incentive slab configured" : "Incentive slab updated",
        "success"
      );
      setSlabModal({ open: false, mode: "add" });
      fetchDashboardData();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  // --- DELETE CONFIRMS ---
  const triggerDelete = (type: "car" | "slab", id: string) => {
    setDeleteConfirm({ open: true, type, id });
  };

  const confirmDelete = async () => {
    setActionLoading(true);
    try {
      const url = deleteConfirm.type === "car"
        ? `/api/admin/cars/${deleteConfirm.id}`
        : `/api/admin/slabs/${deleteConfirm.id}`;

      const response = await fetch(url, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Deletion failed");

      triggerToast(
        deleteConfirm.type === "car" ? "Vehicle model deleted" : "Incentive slab deleted",
        "success"
      );
      setDeleteConfirm({ open: false, type: "car", id: "" });
      fetchDashboardData();
    } catch (err: any) {
      triggerToast(err.message, "error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#09090b] text-zinc-200 font-sans antialiased">
      
      {/* Top Navbar */}
      <header className="w-full border-b border-zinc-900 bg-zinc-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold tracking-tighter text-white">TOYOTA</span>
          <span className="text-zinc-800">|</span>
          <span className="text-xs uppercase tracking-widest text-zinc-500 font-semibold">Admin Panel</span>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-zinc-500 font-medium">Confidential Console</span>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-850 hover:border-zinc-700 transition-all duration-150 cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Screen tabs Sub-Header */}
      <nav className="w-full bg-zinc-950 border-b border-zinc-900 flex px-6 py-1 gap-2 z-10">
        {[
          { id: "inventory", label: "Vehicle Models" },
          { id: "slabs", label: "Slab Settings" },
          { id: "payroll", label: "Total Payroll" },
          { id: "users", label: "Users History" },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-3.5 text-xs font-semibold border-b-2 transition-all duration-150 cursor-pointer ${
                isActive 
                  ? "border-[#EB0A1E] text-white" 
                  : "border-transparent text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* Main Workspace */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        
        {/* Toast Alerts */}
        {(successMessage || errorMessage) && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 rounded border text-xs font-medium shadow-lg max-w-md animate-fade-in bg-zinc-900 border-zinc-800">
            {successMessage ? (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">{successMessage}</span>
              </>
            ) : (
              <>
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                <span className="text-zinc-300">{errorMessage}</span>
              </>
            )}
          </div>
        )}

        {/* --- SCREEN 1: VEHICLE MODELS (INVENTORY) --- */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight font-sans">Vehicle Models</h1>
                <p className="text-xs text-zinc-500 mt-1">Configure active car models available for sales entries.</p>
              </div>
              <button
                onClick={openAddCar}
                className="h-9 px-4 rounded bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-150 font-medium text-xs text-white active:scale-[0.98] cursor-pointer"
              >
                Add Model
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-5 h-5 border-2 border-t-zinc-400 border-zinc-900 rounded-full animate-spin" />
                <span className="text-[11px] text-zinc-600">Retrieving catalog...</span>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                {cars.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded">
                    <span className="text-xs text-zinc-600">No vehicle models listed.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Model Name</th>
                          <th className="pb-3 font-semibold">Suffix</th>
                          <th className="pb-3 font-semibold">Variant</th>
                          <th className="pb-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {cars.map((car) => (
                          <tr key={car._id} className="hover:bg-zinc-900/10 transition-colors">
                            <td className="py-3.5 font-medium text-white">{car.modelName}</td>
                            <td className="py-3.5 text-zinc-400">{car.baseSuffix}</td>
                            <td className="py-3.5 text-zinc-550">
                              <span className="px-2 py-0.5 rounded bg-zinc-900 text-[10px] border border-zinc-800 text-zinc-400 font-medium">
                                {car.variant}
                              </span>
                            </td>
                            <td className="py-3.5 text-right space-x-3">
                              <button
                                onClick={() => openEditCar(car)}
                                className="text-zinc-500 hover:text-white transition-colors duration-150 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => triggerDelete("car", car._id)}
                                className="text-red-500 hover:text-red-400 transition-colors duration-150 cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- SCREEN 2: SLAB SETTINGS --- */}
        {activeTab === "slabs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight font-sans">Slab Settings</h1>
                <p className="text-xs text-zinc-500 mt-1">Configure volume boundaries and dynamic incentive payouts.</p>
              </div>
              <button
                onClick={openAddSlab}
                className="h-9 px-4 rounded bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-150 font-medium text-xs text-white active:scale-[0.98] cursor-pointer"
              >
                Add Slab
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-5 h-5 border-2 border-t-zinc-400 border-zinc-900 rounded-full animate-spin" />
                <span className="text-[11px] text-zinc-600">Retrieving slab settings...</span>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                {slabs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded">
                    <span className="text-xs text-zinc-600">No slabs configured.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Volume Range</th>
                          <th className="pb-3 font-semibold">Incentive Per Car</th>
                          <th className="pb-3 text-right font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {slabs.map((slab) => (
                          <tr key={slab._id} className="hover:bg-zinc-900/10 transition-colors">
                            <td className="py-3.5 font-medium text-white">
                              {slab.minCars} {slab.maxCars === null ? "+ Cars" : `to ${slab.maxCars} Cars`}
                            </td>
                            <td className="py-3.5 text-zinc-300 font-semibold">
                              ₹{slab.incentivePerCar.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 text-right space-x-3">
                              <button
                                onClick={() => openEditSlab(slab)}
                                className="text-zinc-500 hover:text-white transition-colors duration-150 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => triggerDelete("slab", slab._id)}
                                className="text-red-500 hover:text-red-400 transition-colors duration-150 cursor-pointer"
                              >
                                Delete
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* --- SCREEN 3: TOTAL PAYROLL BREAKDOWN --- */}
        {activeTab === "payroll" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-6">
              <div>
                <h1 className="text-xl font-semibold text-white tracking-tight font-sans">Total Payroll</h1>
                <p className="text-xs text-zinc-500 mt-1">Review dealership performance metrics and aggregated incentive payouts.</p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-850 rounded px-3 py-1.5 self-start">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Select Month</span>
                <input
                  type="month"
                  value={selectedPayrollMonth}
                  onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                  className="bg-transparent border-none text-white text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {payrollLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-5 h-5 border-2 border-t-zinc-400 border-zinc-900 rounded-full animate-spin" />
                <span className="text-[11px] text-zinc-600">Compiling payroll ledger...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Aggregate Metrics Grid */}
                {payrollMetrics && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 rounded border border-zinc-900 bg-zinc-950">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Total Payout</span>
                      <div className="text-2xl font-bold text-[#EB0A1E] tracking-tight">
                        ₹{payrollMetrics.totalPayrollPayout.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-4 rounded border border-zinc-900 bg-zinc-950">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Cars Sold (Dealership)</span>
                      <div className="text-2xl font-bold text-white tracking-tight">
                        {payrollMetrics.totalCarsSold} Cars
                      </div>
                    </div>
                    <div className="p-4 rounded border border-zinc-900 bg-zinc-950">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Active Officers</span>
                      <div className="text-2xl font-bold text-white tracking-tight">
                        {payrollMetrics.totalOfficers} Officers
                      </div>
                    </div>
                    <div className="p-4 rounded border border-zinc-900 bg-zinc-950">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Locked Submissions</span>
                      <div className="text-2xl font-bold text-white tracking-tight">
                        {payrollMetrics.lockedSubmissions} / {payrollMetrics.totalOfficers}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payroll Ledger Table */}
                <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                  <h3 className="text-sm font-medium text-white mb-4">Monthly Sales Ledger</h3>
                  
                  {payrollList.length === 0 ? (
                    <div className="text-center py-12">
                      <span className="text-xs text-zinc-650">No dealership logs registered.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                            <th className="pb-3 font-semibold">Officer</th>
                            <th className="pb-3 font-semibold">Email</th>
                            <th className="pb-3 font-semibold">Cars Sold</th>
                            <th className="pb-3 font-semibold">Qualified Slab</th>
                            <th className="pb-3 font-semibold">Total Payout</th>
                            <th className="pb-3 text-right font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-900">
                          {payrollList.map((item) => (
                            <tr key={item.officerId} className="hover:bg-zinc-900/10 transition-colors">
                              <td className="py-3.5 font-bold text-white">{item.name}</td>
                              <td className="py-3.5 text-zinc-450">{item.email}</td>
                              <td className="py-3.5 text-zinc-300 font-semibold">{item.carsSold}</td>
                              <td className="py-3.5">
                                <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-850 text-zinc-400">
                                  {item.slabRange}
                                </span>
                              </td>
                              <td className="py-3.5 font-bold text-[#EB0A1E]">
                                ₹{item.payout.toLocaleString("en-IN")}
                              </td>
                              <td className="py-3.5 text-right">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                  item.status === "Locked"
                                    ? "bg-red-950/20 border-red-900/50 text-red-400"
                                    : item.status === "Draft"
                                      ? "bg-zinc-900 border-zinc-800 text-zinc-400"
                                      : "bg-zinc-950 border-transparent text-zinc-650"
                                }`}>
                                  {item.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- SCREEN 4: CHRONOLOGICAL USERS HISTORY --- */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="border-b border-zinc-900 pb-6">
              <h1 className="text-xl font-semibold text-white tracking-tight font-sans">Users History</h1>
              <p className="text-xs text-zinc-500 mt-1">Chronological audit ledger of all monthly submissions across the dealership.</p>
            </div>

            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-5 h-5 border-2 border-t-zinc-400 border-zinc-900 rounded-full animate-spin" />
                <span className="text-[11px] text-zinc-600">Retrieving system ledger...</span>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-6">
                {historyList.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded">
                    <span className="text-xs text-zinc-600">No transaction logs logged.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-900 text-zinc-500 font-semibold text-[10px] uppercase tracking-wider">
                          <th className="pb-3 font-semibold">Timestamp</th>
                          <th className="pb-3 font-semibold">Officer Name</th>
                          <th className="pb-3 font-semibold">Email</th>
                          <th className="pb-3 font-semibold">Month</th>
                          <th className="pb-3 font-semibold">Cars Sold</th>
                          <th className="pb-3 font-semibold">Qualified Slab</th>
                          <th className="pb-3 font-semibold">Total Payout</th>
                          <th className="pb-3 text-right font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900">
                        {historyList.map((log) => (
                          <tr key={log._id} className="hover:bg-zinc-900/10 transition-colors">
                            <td className="py-3.5 text-zinc-550 text-[10px]">
                              {new Date(log.updatedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-3.5 font-bold text-white">{log.name}</td>
                            <td className="py-3.5 text-zinc-450">{log.email}</td>
                            <td className="py-3.5 text-zinc-400 font-semibold uppercase">{log.month}</td>
                            <td className="py-3.5 text-zinc-350">{log.totalCars}</td>
                            <td className="py-3.5">
                              <span className="px-2 py-0.5 rounded text-[10px] bg-zinc-900 border border-zinc-850 text-zinc-450 font-medium">
                                {log.slabRange}
                              </span>
                            </td>
                            <td className="py-3.5 font-bold text-[#EB0A1E]">
                              ₹{log.totalIncentive.toLocaleString("en-IN")}
                            </td>
                            <td className="py-3.5 text-right">
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                                log.status === "submitted"
                                  ? "bg-red-950/20 border-red-900/50 text-red-400"
                                  : "bg-zinc-900 border-zinc-800 text-zinc-400"
                              }`}>
                                {log.status === "submitted" ? "Locked" : "Draft"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* --- CAR CREATION/EDIT MODAL --- */}
      {carModal.open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded bg-zinc-900 border border-zinc-800 shadow-xl relative">
            <h3 className="text-sm font-semibold text-white mb-1">
              {carModal.mode === "add" ? "Add Vehicle Model" : "Edit Vehicle Details"}
            </h3>
            <p className="text-[11px] text-zinc-500 mb-6">Enter vehicle taxonomy data.</p>
            
            <form onSubmit={submitCar} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Model Name</label>
                <input
                  type="text"
                  required
                  value={carForm.modelName}
                  onChange={(e) => setCarForm({ ...carForm, modelName: e.target.value })}
                  placeholder="e.g. Camry"
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-650"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Base Suffix</label>
                <input
                  type="text"
                  required
                  value={carForm.baseSuffix}
                  onChange={(e) => setCarForm({ ...carForm, baseSuffix: e.target.value })}
                  placeholder="e.g. SE"
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Variant</label>
                <input
                  type="text"
                  required
                  value={carForm.variant}
                  onChange={(e) => setCarForm({ ...carForm, variant: e.target.value })}
                  placeholder="e.g. Gas"
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-650"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => setCarModal({ open: false, mode: "add" })}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4.5 py-1.5 bg-[#EB0A1E] text-white hover:bg-red-700 transition-colors font-medium text-xs rounded active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INCENTIVE SLAB CREATION/EDIT MODAL --- */}
      {slabModal.open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded bg-zinc-900 border border-zinc-800 shadow-xl relative">
            <h3 className="text-sm font-semibold text-white mb-1">
              {slabModal.mode === "add" ? "Configure Slab" : "Modify Slab"}
            </h3>
            <p className="text-[11px] text-zinc-500 mb-6">Configure dynamic incentive threshold constraints.</p>
            
            <form onSubmit={submitSlab} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Minimum Cars</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={slabForm.minCars}
                  onChange={(e) => setSlabForm({ ...slabForm, minCars: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-650"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Maximum Cars (Leave blank for Unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={slabForm.maxCars}
                  onChange={(e) => setSlabForm({ ...slabForm, maxCars: e.target.value })}
                  placeholder="Leave empty for unlimited (+)"
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-650"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5">Incentive Per Car (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={slabForm.incentivePerCar}
                  onChange={(e) => setSlabForm({ ...slabForm, incentivePerCar: e.target.value })}
                  placeholder="e.g. 1000"
                  className="w-full h-9 px-3 bg-zinc-950 border border-zinc-800 rounded text-xs text-white focus:outline-none focus:border-zinc-650"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => setSlabModal({ open: false, mode: "add" })}
                  className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4.5 py-1.5 bg-[#EB0A1E] text-white hover:bg-red-700 transition-colors font-medium text-xs rounded active:scale-[0.98] disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE DIALOG --- */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xs p-6 rounded bg-zinc-900 border border-zinc-800 shadow-xl relative text-center">
            <h3 className="text-sm font-semibold text-white mb-2">Delete Item</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed mb-6">
              Delete this {deleteConfirm.type === "car" ? "vehicle model" : "incentive slab"}?
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm({ open: false, type: "car", id: "" })}
                className="px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-medium text-xs rounded active:scale-[0.98] disabled:opacity-50 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
