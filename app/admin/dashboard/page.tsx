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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased flex flex-col md:flex-row">
      
      {/* Left Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col shrink-0">
        
        {/* Sidebar Brand Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tighter text-slate-900">TOYOTA</span>
            <span className="text-slate-300">|</span>
            <span className="text-xs uppercase tracking-widest text-slate-500 font-bold">Admin Portal</span>
          </div>
        </div>

        {/* Sidebar Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-1.5">
          {[
            { id: "payroll", label: "Total Sales" },
            { id: "inventory", label: "Active Models" },
            { id: "slabs", label: "Incentive Rate" },
            { id: "users", label: "Pending Approvals" },
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
            Confidential Console
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
        {(successMessage || errorMessage) && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg border text-xs font-semibold shadow-lg max-w-md animate-fade-in bg-white border-slate-250 text-slate-800">
            {successMessage ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>{successMessage}</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>{errorMessage}</span>
              </>
            )}
          </div>
        )}

        {/* --- SCREEN 1: ACTIVE MODELS (INVENTORY) --- */}
        {activeTab === "inventory" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Active Models</h1>
                <p className="text-xs text-slate-500 mt-1">Configure active car models available for sales entries.</p>
              </div>
              <button
                onClick={openAddCar}
                className="h-10 px-5 rounded-lg bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-150 font-semibold text-xs text-white cursor-pointer shadow-none active:scale-[0.98]"
              >
                Add Model
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-6 h-6 border-2 border-t-slate-600 border-slate-200 rounded-full animate-spin" />
                <span className="text-[11px] text-slate-400">Retrieving catalog...</span>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-none">
                {cars.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-xs text-slate-400 font-medium">No vehicle models listed.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <th className="pb-4 font-bold">Model Name</th>
                          <th className="pb-4 font-bold">Suffix</th>
                          <th className="pb-4 font-bold">Variant</th>
                          <th className="pb-4 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {cars.map((car) => (
                          <tr key={car._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 font-semibold text-slate-900">{car.modelName}</td>
                            <td className="py-4 text-slate-600">{car.baseSuffix}</td>
                            <td className="py-4">
                              <span className="px-2.5 py-1 rounded bg-slate-100 text-[10px] border border-slate-200 text-slate-700 font-semibold">
                                {car.variant}
                              </span>
                            </td>
                            <td className="py-4 text-right space-x-4">
                              <button
                                onClick={() => openEditCar(car)}
                                className="text-slate-500 hover:text-slate-900 font-semibold hover:underline transition-colors duration-150 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => triggerDelete("car", car._id)}
                                className="text-red-600 hover:text-red-850 font-semibold hover:underline transition-colors duration-150 cursor-pointer"
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

        {/* --- SCREEN 2: INCENTIVE RATE (SLABS) --- */}
        {activeTab === "slabs" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Incentive Rate</h1>
                <p className="text-xs text-slate-500 mt-1">Configure volume boundaries and dynamic incentive payouts.</p>
              </div>
              <button
                onClick={openAddSlab}
                className="h-10 px-5 rounded-lg bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-150 font-semibold text-xs text-white cursor-pointer shadow-none active:scale-[0.98]"
              >
                Add Slab
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-6 h-6 border-2 border-t-slate-600 border-slate-200 rounded-full animate-spin" />
                <span className="text-[11px] text-slate-400">Retrieving slab settings...</span>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-none">
                {slabs.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-xs text-slate-400 font-medium">No slabs configured.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <th className="pb-4 font-bold">Volume Range</th>
                          <th className="pb-4 font-bold">Incentive Per Car</th>
                          <th className="pb-4 text-right font-bold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {slabs.map((slab) => (
                          <tr key={slab._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 font-semibold text-slate-900">
                              {slab.minCars} {slab.maxCars === null ? "+ Cars" : `to ${slab.maxCars} Cars`}
                            </td>
                            <td className="py-4 text-slate-900 font-bold text-sm">
                              ₹{slab.incentivePerCar.toLocaleString("en-IN")}
                            </td>
                            <td className="py-4 text-right space-x-4">
                              <button
                                onClick={() => openEditSlab(slab)}
                                className="text-slate-500 hover:text-slate-900 font-semibold hover:underline transition-colors duration-150 cursor-pointer"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => triggerDelete("slab", slab._id)}
                                className="text-red-600 hover:text-red-850 font-semibold hover:underline transition-colors duration-150 cursor-pointer"
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

        {/* --- SCREEN 3: TOTAL SALES (PAYROLL) --- */}
        {activeTab === "payroll" && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Total Sales</h1>
                <p className="text-xs text-slate-500 mt-1">Review dealership performance metrics and aggregated incentive payouts.</p>
              </div>

              {/* Month Selector */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-4 py-2 self-start shadow-none">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Select Month</span>
                <input
                  type="month"
                  value={selectedPayrollMonth}
                  onChange={(e) => setSelectedPayrollMonth(e.target.value)}
                  className="bg-transparent border-none text-slate-900 text-xs font-semibold focus:outline-none cursor-pointer"
                />
              </div>
            </div>

            {payrollLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-6 h-6 border-2 border-t-slate-600 border-slate-200 rounded-full animate-spin" />
                <span className="text-[11px] text-slate-400">Compiling payroll ledger...</span>
              </div>
            ) : (
              <div className="space-y-6">
                
                {/* Aggregate Metrics Grid */}
                {payrollMetrics && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-none">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Total Payout</span>
                      <div className="text-2xl font-bold text-[#EB0A1E] tracking-tight">
                        ₹{payrollMetrics.totalPayrollPayout.toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-none">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Cars Sold (Dealership)</span>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        {payrollMetrics.totalCarsSold} Cars
                      </div>
                    </div>
                    <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-none">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Active Officers</span>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        {payrollMetrics.totalOfficers} Officers
                      </div>
                    </div>
                    <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-none">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">Locked Submissions</span>
                      <div className="text-2xl font-bold text-slate-900 tracking-tight">
                        {payrollMetrics.lockedSubmissions} / {payrollMetrics.totalOfficers}
                      </div>
                    </div>
                  </div>
                )}

                {/* Payroll Ledger Table */}
                <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-none">
                  <h3 className="text-sm font-bold text-slate-900 mb-6">Monthly Sales Ledger</h3>
                  
                  {payrollList.length === 0 ? (
                    <div className="text-center py-16">
                      <span className="text-xs text-slate-400 font-medium">No dealership logs registered.</span>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                            <th className="pb-4 font-bold">Officer</th>
                            <th className="pb-4 font-bold">Email</th>
                            <th className="pb-4 font-bold">Cars Sold</th>
                            <th className="pb-4 font-bold">Qualified Slab</th>
                            <th className="pb-4 font-bold">Total Payout</th>
                            <th className="pb-4 text-right font-bold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {payrollList.map((item) => (
                            <tr key={item.officerId} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-4 font-bold text-slate-900">{item.name}</td>
                              <td className="py-4 text-slate-500">{item.email}</td>
                              <td className="py-4 text-slate-900 font-semibold">{item.carsSold}</td>
                              <td className="py-4">
                                <span className="px-2.5 py-1 rounded-lg text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                                  {item.slabRange}
                                </span>
                              </td>
                              <td className="py-4 font-bold text-[#EB0A1E] text-sm">
                                ₹{item.payout.toLocaleString("en-IN")}
                              </td>
                              <td className="py-4 text-right">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border ${
                                  item.status === "Locked"
                                    ? "bg-green-50 border-green-200 text-green-800"
                                    : "bg-amber-50 border-amber-200 text-amber-800"
                                  }`}>
                                  {item.status === "Locked" ? "Locked" : "Draft"}
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

        {/* --- SCREEN 4: PENDING APPROVALS (USERS HISTORY) --- */}
        {activeTab === "users" && (
          <div className="space-y-6">
            <div className="border-b border-slate-200 pb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Pending Approvals</h1>
              <p className="text-xs text-slate-500 mt-1">Chronological audit ledger of all monthly submissions across the dealership.</p>
            </div>

            {historyLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <div className="w-6 h-6 border-2 border-t-slate-600 border-slate-200 rounded-full animate-spin" />
                <span className="text-[11px] text-slate-400">Retrieving system ledger...</span>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-none">
                {historyList.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                    <span className="text-xs text-slate-400 font-medium">No transaction logs logged.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500 font-bold text-[10px] uppercase tracking-wider">
                          <th className="pb-4 font-bold">Timestamp</th>
                          <th className="pb-4 font-bold">Officer Name</th>
                          <th className="pb-4 font-bold">Email</th>
                          <th className="pb-4 font-bold">Month</th>
                          <th className="pb-4 font-bold">Cars Sold</th>
                          <th className="pb-4 font-bold">Qualified Slab</th>
                          <th className="pb-4 font-bold">Total Payout</th>
                          <th className="pb-4 text-right font-bold">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {historyList.map((log) => (
                          <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="py-4 text-slate-500 text-[10px]">
                              {new Date(log.updatedAt).toLocaleString("en-US", {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td className="py-4 font-bold text-slate-900">{log.name}</td>
                            <td className="py-4 text-slate-500">{log.email}</td>
                            <td className="py-4 text-slate-800 font-semibold uppercase">{log.month}</td>
                            <td className="py-4 text-slate-900 font-semibold">{log.totalCars}</td>
                            <td className="py-4">
                              <span className="px-2.5 py-1 rounded-lg text-[10px] bg-slate-100 border border-slate-200 text-slate-700 font-semibold">
                                {log.slabRange}
                              </span>
                            </td>
                            <td className="py-4 font-bold text-[#EB0A1E] text-sm">
                              ₹{log.totalIncentive.toLocaleString("en-IN")}
                            </td>
                            <td className="py-4 text-right">
                              <span className={`px-2.5 py-1 rounded-lg text-[9px] font-bold border ${
                                log.status === "submitted"
                                  ? "bg-green-50 border-green-200 text-green-800"
                                  : "bg-amber-50 border-amber-200 text-amber-800"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-xl bg-white border border-slate-250 shadow-xl relative animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Vehicle Details
            </h3>
            <p className="text-xs text-slate-500 mb-6">Enter details for the vehicle model.</p>
            
            <form onSubmit={submitCar} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Model Name</label>
                <input
                  type="text"
                  required
                  value={carForm.modelName}
                  onChange={(e) => setCarForm({ ...carForm, modelName: e.target.value })}
                  placeholder="e.g. Camry"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors shadow-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Base Suffix</label>
                <input
                  type="text"
                  required
                  value={carForm.baseSuffix}
                  onChange={(e) => setCarForm({ ...carForm, baseSuffix: e.target.value })}
                  placeholder="e.g. SE"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Variant</label>
                <input
                  type="text"
                  required
                  value={carForm.variant}
                  onChange={(e) => setCarForm({ ...carForm, variant: e.target.value })}
                  placeholder="e.g. Gas"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150 mt-6">
                <button
                  type="button"
                  onClick={() => setCarModal({ open: false, mode: "add" })}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#EB0A1E] text-white hover:bg-red-700 transition-colors font-semibold text-xs rounded-lg shadow-none active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-xl bg-white border border-slate-250 shadow-xl relative animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-1">
              Incentive Rules
            </h3>
            <p className="text-xs text-slate-500 mb-6">Set the sales ranges and incentive rates.</p>
            
            <form onSubmit={submitSlab} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Minimum Cars</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={slabForm.minCars}
                  onChange={(e) => setSlabForm({ ...slabForm, minCars: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors shadow-xs"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Maximum Cars (Leave blank for Unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={slabForm.maxCars}
                  onChange={(e) => setSlabForm({ ...slabForm, maxCars: e.target.value })}
                  placeholder="Leave empty for unlimited (+)"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Incentive Per Car (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={slabForm.incentivePerCar}
                  onChange={(e) => setSlabForm({ ...slabForm, incentivePerCar: e.target.value })}
                  placeholder="e.g. 1000"
                  className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 transition-colors shadow-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-150 mt-6">
                <button
                  type="button"
                  onClick={() => setSlabModal({ open: false, mode: "add" })}
                  className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-[#EB0A1E] text-white hover:bg-red-700 transition-colors font-semibold text-xs rounded-lg shadow-none active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-8 rounded-xl bg-white border border-slate-250 shadow-xl relative text-center animate-fade-in">
            <h3 className="text-base font-bold text-slate-900 mb-2">Delete Item</h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              Delete this {deleteConfirm.type === "car" ? "vehicle model" : "incentive slab"}?
            </p>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setDeleteConfirm({ open: false, type: "car", id: "" })}
                className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-lg active:scale-[0.98] disabled:opacity-50 cursor-pointer"
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
