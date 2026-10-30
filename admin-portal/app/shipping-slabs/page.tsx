"use client";

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../services/api';

interface ShippingSlab {
  id: string;
  name: string;
  minWeight: number;
  maxWeight: number;
  destinationRegion: string;
  rate: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function ShippingSlabsDashboard() {
  const [slabs, setSlabs] = useState<ShippingSlab[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Test Calculator State
  const [testWeight, setTestWeight] = useState<number>(0.85);
  const [testRegion, setTestRegion] = useState<string>('National');
  const [calcResult, setCalcResult] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    minWeight: 0,
    maxWeight: 1.0,
    destinationRegion: 'National',
    rate: 69,
    isActive: true,
  });

  useEffect(() => {
    loadSlabs();
  }, []);

  const loadSlabs = async () => {
    try {
      const data = await fetchWithAuth('/shipping-slabs');
      if (Array.isArray(data)) {
        setSlabs(data);
      }
    } catch (err: any) {
      console.error('Failed to fetch shipping slabs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSlab = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a slab name');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const payload = {
        name: formData.name.trim(),
        minWeight: Number(formData.minWeight),
        maxWeight: Number(formData.maxWeight),
        destinationRegion: formData.destinationRegion.trim(),
        rate: Number(formData.rate),
        isActive: formData.isActive,
      };

      const created = await fetchWithAuth('/shipping-slabs', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setFeedbackMsg({ type: 'success', text: `Shipping slab "${created.name}" created successfully!` });
      setShowCreateModal(false);
      setFormData({
        name: '',
        minWeight: 0,
        maxWeight: 1.0,
        destinationRegion: 'National',
        rate: 69,
        isActive: true,
      });

      await loadSlabs();
    } catch (err: any) {
      console.error('Failed to create slab:', err);
      setFeedbackMsg({ type: 'error', text: err.message || 'Failed to create shipping slab.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      await fetchWithAuth(`/shipping-slabs/${id}/toggle`, { method: 'PATCH' });
      setSlabs(prev =>
        prev.map(s => (s.id === id ? { ...s, isActive: !s.isActive } : s))
      );
      setFeedbackMsg({ type: 'success', text: 'Shipping slab status updated.' });
    } catch (err: any) {
      console.error('Failed to toggle status:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to update status.' });
    }
  };

  const deleteSlab = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await fetchWithAuth(`/shipping-slabs/${id}`, { method: 'DELETE' });
      setSlabs(prev => prev.filter(s => s.id !== id));
      setFeedbackMsg({ type: 'success', text: `Slab "${name}" deleted.` });
    } catch (err: any) {
      console.error('Failed to delete slab:', err);
      setFeedbackMsg({ type: 'error', text: 'Failed to delete shipping slab.' });
    }
  };

  const runTestCalculation = async () => {
    setIsCalculating(true);
    setCalcResult(null);
    try {
      const result = await fetchWithAuth('/shipping-slabs/calculate', {
        method: 'POST',
        body: JSON.stringify({
          weight: Number(testWeight),
          destinationRegion: testRegion,
        }),
      });
      setCalcResult(result);
    } catch (err: any) {
      alert('Calculation failed: ' + err.message);
    } finally {
      setIsCalculating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-500 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
        Loading dynamic shipping slabs...
      </div>
    );
  }

  const activeSlabsCount = slabs.filter(s => s.isActive).length;
  const avgRate = slabs.length > 0 ? (slabs.reduce((acc, s) => acc + s.rate, 0) / slabs.length).toFixed(0) : '0';

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-zinc-200">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Dynamic Shipping Rate Slabs</h1>
            <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2.5 py-1 rounded-full">
              PostgreSQL Connected
            </span>
          </div>
          <p className="text-sm text-zinc-500 mt-1">
            Configure tiered weight ranges, zonal routing, and dynamic delivery fees evaluated at checkout.
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95"
        >
          <span className="text-lg leading-none">+</span> Add Shipping Slab
        </button>
      </div>

      {/* Notifications */}
      {feedbackMsg && (
        <div
          className={`mb-6 p-4 rounded-lg flex items-center justify-between text-sm ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-semibold text-zinc-400">Total Defined Slabs</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">{slabs.length} Slabs</div>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-bold text-xl">
            📦
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-semibold text-zinc-400">Active Live Slabs</div>
            <div className="text-2xl font-bold text-emerald-600 mt-1">{activeSlabsCount} Active</div>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-bold text-xl">
            ⚡
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-zinc-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs uppercase font-semibold text-zinc-400">Average Shipping Fee</div>
            <div className="text-2xl font-bold text-zinc-900 mt-1">₹{avgRate}</div>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-bold text-xl">
            ₹
          </div>
        </div>
      </div>

      {/* Live Rate Testing Sandbox */}
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 text-white rounded-2xl p-6 mb-8 shadow-md border border-zinc-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-semibold">
              <span>●</span> Live Rate Calculator Sandbox
            </div>
            <h3 className="text-lg font-bold">Simulate Checkout Shipping Fee</h3>
            <p className="text-xs text-zinc-400">
              Input parcel weight & destination to test the exact slab matched by the backend algorithm.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-semibold uppercase">Dead Wt (KG)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={testWeight}
                onChange={e => setTestWeight(parseFloat(e.target.value) || 0.1)}
                className="w-28 px-3 py-1.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] text-zinc-400 mb-1 font-semibold uppercase">Destination / Zone</label>
              <select
                value={testRegion}
                onChange={e => setTestRegion(e.target.value)}
                className="w-36 px-3 py-1.5 bg-zinc-800 border border-zinc-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="National">National (All India)</option>
                <option value="North India">North India</option>
                <option value="South India">South India</option>
                <option value="West India">West India</option>
                <option value="East India">East India</option>
              </select>
            </div>

            <div className="self-end">
              <button
                onClick={runTestCalculation}
                disabled={isCalculating}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-1.5 rounded-lg text-sm shadow transition disabled:opacity-50"
              >
                {isCalculating ? 'Evaluating...' : 'Test Slab'}
              </button>
            </div>
          </div>
        </div>

        {calcResult && (
          <div className="mt-4 pt-4 border-t border-zinc-700/80 flex flex-wrap items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <span className="text-emerald-400 font-bold">✔ Matched Slab:</span>
              <span className="bg-zinc-800 px-2.5 py-1 rounded text-zinc-200 font-mono">
                {calcResult.slabName}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2 sm:mt-0">
              <span className="text-zinc-400">Calculated Shipping Fee:</span>
              <span className="text-xl font-extrabold text-amber-400">₹{calcResult.rate}</span>
            </div>
          </div>
        )}
      </div>

      {/* Slabs Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Slab Name
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Weight Range
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Destination Region
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Shipping Fee
              </th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200 text-sm">
            {slabs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                  No shipping slabs found. Add your first slab above!
                </td>
              </tr>
            ) : (
              slabs.map(slab => (
                <tr key={slab.id} className="hover:bg-zinc-50/70 transition">
                  <td className="px-6 py-4 font-semibold text-zinc-900">
                    {slab.name}
                  </td>
                  <td className="px-6 py-4 text-zinc-600">
                    <span className="font-mono bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-md text-xs font-medium">
                      {slab.minWeight} kg - {slab.maxWeight} kg
                    </span>
                  </td>
                  <td className="px-6 py-4 text-zinc-600 font-medium">
                    {slab.destinationRegion}
                  </td>
                  <td className="px-6 py-4 font-extrabold text-indigo-700">
                    ₹{slab.rate}
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => toggleStatus(slab.id)}
                      className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full cursor-pointer transition ${
                        slab.isActive
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                      title="Click to toggle status"
                    >
                      {slab.isActive ? 'Active' : 'Inactive'}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-right space-x-3">
                    <button
                      onClick={() => toggleStatus(slab.id)}
                      className="text-zinc-600 hover:text-zinc-900 font-medium text-xs hover:underline"
                    >
                      {slab.isActive ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => deleteSlab(slab.id, slab.name)}
                      className="text-rose-600 hover:text-rose-800 font-medium text-xs hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create Slab Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Add New Shipping Slab</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSlab} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">
                  Slab Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Express Air - South Zone"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">
                    Min Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.minWeight}
                    onChange={e => setFormData({ ...formData, minWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">
                    Max Weight (kg) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={formData.maxWeight}
                    onChange={e => setFormData({ ...formData, maxWeight: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">
                    Destination Region *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. National, North India"
                    value={formData.destinationRegion}
                    onChange={e => setFormData({ ...formData, destinationRegion: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">
                    Delivery Rate (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    placeholder="79"
                    value={formData.rate}
                    onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveSlab"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="isActiveSlab" className="text-sm text-zinc-700 font-medium">
                  Active (immediately applicable to live checkouts)
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-zinc-300 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Slab to Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
