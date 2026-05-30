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

export default function AdminDashboard() {
  const router = useRouter();
  
  // Data State
  const [cars, setCars] = useState<Car[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modals & Forms State
  const [carModal, setCarModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Car }>({ open: false, mode: "add" });
  const [carForm, setCarForm] = useState({ modelName: "", baseSuffix: "", variant: "" });
  
  const [slabModal, setSlabModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Slab }>({ open: false, mode: "add" });
  const [slabForm, setSlabForm] = useState({ minCars: "", maxCars: "", incentivePerCar: "" });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: "car" | "slab"; id: string }>({ open: false, type: "car", id: "" });

  // Fetch initial data
  useEffect(() => {
    fetchDashboardData();
  }, []);

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

  const triggerToast = (msg: string, type: "success" | "error") => {
    if (type === "success") {
      setSuccessMessage(msg);
      setTimeout(() => setSuccessMessage(""), 4000);
    } else {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 5000);
    }
  };

  // Logout Handler
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
        carModal.mode === "add" ? "Vehicle model created successfully!" : "Vehicle model updated successfully!",
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
        slabModal.mode === "add" ? "Incentive slab configured successfully!" : "Incentive slab updated successfully!",
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

  // --- DELETE CONFIRMATION ---
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
        deleteConfirm.type === "car" ? "Vehicle deleted successfully!" : "Incentive slab deleted successfully!",
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
    <div className="flex flex-col flex-1 bg-[#0d0d0f] text-white min-h-screen font-sans relative">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-[-5%] right-[-5%] w-[40%] h-[40%] bg-[#EB0A1E]/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-5%] left-[-5%] w-[40%] h-[40%] bg-[#EB0A1E]/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="relative w-full z-20 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl font-black tracking-tighter text-[#EB0A1E]">TOYOTA</span>
          <span className="text-zinc-600">|</span>
          <span className="text-xs uppercase tracking-widest text-zinc-400 font-bold">Admin Console</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-xs font-semibold text-zinc-400">System Administrator</span>
            <span className="text-[10px] text-zinc-500 font-light">Confidential Access</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-semibold hover:bg-zinc-800 hover:border-zinc-700 transition-all duration-300 active:scale-95"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Admin Workspace */}
      <main className="relative flex-1 w-full max-w-7xl mx-auto px-6 py-8 z-10">
        
        {/* Floating Toasts */}
        {successMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-4 rounded-xl bg-emerald-950 border border-emerald-900 text-emerald-400 text-xs font-semibold shadow-2xl animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-5 py-4 rounded-xl bg-red-950 border border-red-900 text-red-400 text-xs font-semibold shadow-2xl animate-bounce">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Dashboard Title */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">Dealership Configurations</h1>
          <p className="text-sm text-zinc-400 mt-2">
            Configure vehicle listings available for sales logs and define dynamic range thresholds for the incentive calculation engine.
          </p>
        </div>

        {/* Metric Cards Grid */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Total Vehicle Models</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-white">{cars.length}</span>
              <span className="text-xs text-zinc-500 font-light">active in fleet</span>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Dynamic Incentive Slabs</span>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-[#EB0A1E]">{slabs.length}</span>
              <span className="text-xs text-zinc-500 font-light">active tiers</span>
            </div>
          </div>
          <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 backdrop-blur-sm">
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-500 block mb-1">Last Config Update</span>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-white">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="text-[10px] text-zinc-500 font-light ml-1">Today</span>
            </div>
          </div>
        </section>

        {loading ? (
          /* Loading Placeholder */
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-10 h-10 border-4 border-t-red-600 border-zinc-800 rounded-full animate-spin" />
            <span className="text-sm text-zinc-500">Syncing Dealership Panel...</span>
          </div>
        ) : (
          /* Dashboard Layout Details */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Column 1: Fleet Management */}
            <section className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Car Inventory</h2>
                    <p className="text-xs text-zinc-500 mt-1">Toyota vehicle inventory for Sales entry.</p>
                  </div>
                  <button
                    onClick={openAddCar}
                    className="h-10 px-4 rounded-xl bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-300 font-semibold text-xs flex items-center gap-1.5 active:scale-95 shadow-md shadow-[#EB0A1E]/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Car</span>
                  </button>
                </div>

                {cars.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                    <span className="text-xs text-zinc-500">No vehicle models configured. Add one to start.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-500 font-semibold">
                          <th className="pb-3">Model Name</th>
                          <th className="pb-3">Base Suffix</th>
                          <th className="pb-3">Variant</th>
                          <th className="pb-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {cars.map((car) => (
                          <tr key={car._id} className="hover:bg-zinc-800/20 transition-colors duration-200">
                            <td className="py-4 font-bold text-white">{car.modelName}</td>
                            <td className="py-4 text-zinc-300">{car.baseSuffix}</td>
                            <td className="py-4 text-zinc-400">
                              <span className="px-2.5 py-1.5 rounded-lg bg-zinc-950 text-[10px] font-medium border border-zinc-800 text-zinc-400">
                                {car.variant}
                              </span>
                            </td>
                            <td className="py-4 text-right space-x-1.5">
                              <button
                                onClick={() => openEditCar(car)}
                                className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors duration-300"
                                title="Edit Vehicle"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => triggerDelete("car", car._id)}
                                className="p-2 rounded-lg bg-red-950/20 border border-red-950/40 text-red-400 hover:bg-[#EB0A1E] hover:text-white hover:border-transparent transition-all duration-300"
                                title="Delete Vehicle"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            {/* Column 2: Incentive Slabs */}
            <section className="lg:col-span-6 bg-zinc-900/40 border border-zinc-800/80 rounded-3xl p-6 sm:p-8 backdrop-blur-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Dynamic Incentive Slabs</h2>
                    <p className="text-xs text-zinc-500 mt-1">Configure slab triggers and payouts per car.</p>
                  </div>
                  <button
                    onClick={openAddSlab}
                    className="h-10 px-4 rounded-xl bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-300 font-semibold text-xs flex items-center gap-1.5 active:scale-95 shadow-md shadow-[#EB0A1E]/10"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Slab</span>
                  </button>
                </div>

                {slabs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded-2xl">
                    <span className="text-xs text-zinc-500">No slabs configured. Define boundaries to calculate payouts.</span>
                  </div>
                ) : (
                  <div>
                    {/* Visual slab timeline */}
                    <div className="flex items-center w-full gap-1 mb-8 overflow-hidden rounded-lg bg-zinc-950 border border-zinc-800 p-1">
                      {slabs.map((slab, idx) => (
                        <div
                          key={slab._id}
                          className="h-6 flex items-center justify-center text-[9px] font-bold text-center text-zinc-400 truncate px-1 rounded transition-colors duration-300 hover:bg-[#EB0A1E]/10 hover:text-white"
                          style={{ flexGrow: slab.maxCars === null ? 3 : (slab.maxCars - slab.minCars + 1) }}
                        >
                          {slab.minCars}{slab.maxCars === null ? "+" : `-${slab.maxCars}`} (₹{slab.incentivePerCar})
                        </div>
                      ))}
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 text-zinc-500 font-semibold">
                            <th className="pb-3">Slab Range</th>
                            <th className="pb-3">Incentive Per Car</th>
                            <th className="pb-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60">
                          {slabs.map((slab) => (
                            <tr key={slab._id} className="hover:bg-zinc-800/20 transition-colors duration-200">
                              <td className="py-4 font-bold text-white">
                                {slab.minCars} {slab.maxCars === null ? "or more Cars" : `to ${slab.maxCars} Cars`}
                              </td>
                              <td className="py-4 text-[#EB0A1E] font-bold text-sm">
                                ₹{slab.incentivePerCar.toLocaleString("en-IN")}
                              </td>
                              <td className="py-4 text-right space-x-1.5">
                                <button
                                  onClick={() => openEditSlab(slab)}
                                  className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors duration-300"
                                  title="Edit Slab"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => triggerDelete("slab", slab._id)}
                                  className="p-2 rounded-lg bg-red-950/20 border border-red-950/40 text-red-400 hover:bg-[#EB0A1E] hover:text-white hover:border-transparent transition-all duration-300"
                                  title="Delete Slab"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </section>

          </div>
        )}
      </main>

      {/* --- CAR CREATION/EDIT MODAL --- */}
      {carModal.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-1">
              {carModal.mode === "add" ? "Add New Vehicle Model" : "Edit Vehicle Details"}
            </h3>
            <p className="text-xs text-zinc-500 mb-6">Specify model taxonomy to activate in fleet entries.</p>
            
            <form onSubmit={submitCar} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Model Name</label>
                <input
                  type="text"
                  required
                  value={carForm.modelName}
                  onChange={(e) => setCarForm({ ...carForm, modelName: e.target.value })}
                  placeholder="e.g. Toyota Camry"
                  className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#EB0A1E]"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Base Suffix</label>
                <input
                  type="text"
                  required
                  value={carForm.baseSuffix}
                  onChange={(e) => setCarForm({ ...carForm, baseSuffix: e.target.value })}
                  placeholder="e.g. SE, LE, XLE"
                  className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#EB0A1E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Variant</label>
                <input
                  type="text"
                  required
                  value={carForm.variant}
                  onChange={(e) => setCarForm({ ...carForm, variant: e.target.value })}
                  placeholder="e.g. Gas, Hybrid, Plug-in Hybrid"
                  className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#EB0A1E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                <button
                  type="button"
                  onClick={() => setCarModal({ open: false, mode: "add" })}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-[#EB0A1E] text-white hover:bg-red-700 transition-colors font-semibold text-xs rounded-xl shadow-md active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Saving Model..." : "Save Vehicle Model"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- INCENTIVE SLAB CREATION/EDIT MODAL --- */}
      {slabModal.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md p-8 rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl relative">
            <h3 className="text-xl font-bold text-white mb-1">
              {slabModal.mode === "add" ? "Configure Incentive Slab" : "Modify Incentive Slab"}
            </h3>
            <p className="text-xs text-zinc-500 mb-6">Map volume thresholds to custom dealer payout rates.</p>
            
            <form onSubmit={submitSlab} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Minimum Cars (Inclusive)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={slabForm.minCars}
                  onChange={(e) => setSlabForm({ ...slabForm, minCars: e.target.value })}
                  placeholder="e.g. 1"
                  className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#EB0A1E]"
                />
              </div>
              
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Maximum Cars (Inclusive / Leave blank for Unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={slabForm.maxCars}
                  onChange={(e) => setSlabForm({ ...slabForm, maxCars: e.target.value })}
                  placeholder="e.g. 3 (leave blank for unlimited)"
                  className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#EB0A1E]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-2">Incentive Per Car (₹)</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={slabForm.incentivePerCar}
                  onChange={(e) => setSlabForm({ ...slabForm, incentivePerCar: e.target.value })}
                  placeholder="e.g. 1000"
                  className="w-full h-11 px-4 bg-zinc-950 border border-zinc-800 rounded-xl text-xs focus:outline-none focus:border-[#EB0A1E]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800/80 mt-6">
                <button
                  type="button"
                  onClick={() => setSlabModal({ open: false, mode: "add" })}
                  className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2.5 bg-[#EB0A1E] text-white hover:bg-red-700 transition-colors font-semibold text-xs rounded-xl shadow-md active:scale-95 disabled:opacity-50"
                >
                  {actionLoading ? "Saving Slab..." : "Save Incentive Slab"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- CONFIRM DELETE DIALOG --- */}
      {deleteConfirm.open && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm p-6 rounded-2xl bg-zinc-900 border border-zinc-800 shadow-2xl relative text-center">
            <div className="w-12 h-12 bg-red-950/40 border border-red-900/50 rounded-full flex items-center justify-center mx-auto text-red-500 mb-4 animate-pulse">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            
            <h3 className="text-lg font-bold text-white mb-2">Delete Confirmation</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-6">
              Are you sure you want to delete this {deleteConfirm.type === "car" ? "vehicle model" : "incentive slab"}? This action is permanent and cannot be undone.
            </p>

            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setDeleteConfirm({ open: false, type: "car", id: "" })}
                className="px-4 py-2.5 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                No, Keep It
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs rounded-xl active:scale-95 disabled:opacity-50"
              >
                Yes, Delete Permanent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
