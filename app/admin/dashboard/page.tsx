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
  
  // States
  const [cars, setCars] = useState<Car[]>([]);
  const [slabs, setSlabs] = useState<Slab[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Modals
  const [carModal, setCarModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Car }>({ open: false, mode: "add" });
  const [carForm, setCarForm] = useState({ modelName: "", baseSuffix: "", variant: "" });
  
  const [slabModal, setSlabModal] = useState<{ open: boolean; mode: "add" | "edit"; data?: Slab }>({ open: false, mode: "add" });
  const [slabForm, setSlabForm] = useState({ minCars: "", maxCars: "", incentivePerCar: "" });

  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; type: "car" | "slab"; id: string }>({ open: false, type: "car", id: "" });

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

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login/admin");
      router.refresh();
    } catch (err) {
      triggerToast("Logout failed", "error");
    }
  };

  // Car Actions
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

  // Slab Actions
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

  // Delete Action
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

      {/* Main Container */}
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

        {/* Dashboard Title */}
        <div className="mb-8 flex flex-col items-start border-b border-zinc-900 pb-6">
          <h1 className="text-xl font-semibold text-white tracking-tight">Configuration Settings</h1>
          <p className="text-xs text-zinc-500 mt-1">
            Manage authorized vehicle models and incentive calculation parameters.
          </p>
        </div>

        {/* Muted Metrics Section */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded border border-zinc-900 bg-zinc-950">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Vehicle Models</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-white tracking-tight">{cars.length}</span>
              <span className="text-[10px] text-zinc-600 font-medium">active in system</span>
            </div>
          </div>
          
          <div className="p-4 rounded border border-zinc-900 bg-zinc-950">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Active Slabs</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold text-[#EB0A1E] tracking-tight">{slabs.length}</span>
              <span className="text-[10px] text-zinc-600 font-medium">configured ranges</span>
            </div>
          </div>
          
          <div className="p-4 rounded border border-zinc-900 bg-zinc-950 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Last Update Check</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-semibold text-white tracking-tight">
                {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
              </span>
              <span className="text-[10px] text-zinc-600 font-medium">Automatic</span>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-2">
            <div className="w-5 h-5 border-2 border-t-zinc-400 border-zinc-900 rounded-full animate-spin" />
            <span className="text-[11px] text-zinc-600">Loading configurations...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Fleet Column */}
            <section className="bg-zinc-950 border border-zinc-900 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-sm font-medium text-white">Vehicle Models</h2>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Active models catalog.</p>
                  </div>
                  <button
                    onClick={openAddCar}
                    className="h-8 px-3 rounded bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-150 font-medium text-xs text-white active:scale-[0.98] cursor-pointer"
                  >
                    Add Model
                  </button>
                </div>

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
                            <td className="py-3.5 text-zinc-500">
                              <span className="px-2 py-0.5 rounded bg-zinc-900 text-[10px] border border-zinc-800 text-zinc-400 font-medium">
                                {car.variant}
                              </span>
                            </td>
                            <td className="py-3.5 text-right space-x-2">
                              <button
                                onClick={() => openEditCar(car)}
                                className="text-zinc-500 hover:text-white transition-colors duration-150 cursor-pointer"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => triggerDelete("car", car._id)}
                                className="text-red-500 hover:text-red-400 transition-colors duration-150 cursor-pointer"
                                title="Delete"
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
            </section>

            {/* Slabs Column */}
            <section className="bg-zinc-950 border border-zinc-900 rounded-lg p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-sm font-medium text-white">Slab Settings</h2>
                    <p className="text-[11px] text-zinc-600 mt-0.5">Range and per-car incentive configurations.</p>
                  </div>
                  <button
                    onClick={openAddSlab}
                    className="h-8 px-3 rounded bg-[#EB0A1E] hover:bg-red-700 transition-colors duration-150 font-medium text-xs text-white active:scale-[0.98] cursor-pointer"
                  >
                    Add Slab
                  </button>
                </div>

                {slabs.length === 0 ? (
                  <div className="text-center py-12 border border-dashed border-zinc-800 rounded">
                    <span className="text-xs text-zinc-600">No incentive slabs configured.</span>
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
                            <td className="py-3.5 text-right space-x-2">
                              <button
                                onClick={() => openEditSlab(slab)}
                                className="text-zinc-500 hover:text-white transition-colors duration-150 cursor-pointer"
                                title="Edit"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => triggerDelete("slab", slab._id)}
                                className="text-red-500 hover:text-red-400 transition-colors duration-150 cursor-pointer"
                                title="Delete"
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
            </section>

          </div>
        )}
      </main>

      {/* Car Modal */}
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

      {/* Slab Modal */}
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

      {/* Delete Confirmation */}
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
