"use client";

import { useEffect, useState } from 'react';
import { fetchWithAuth } from '../../services/api';

interface ClubbingRule {
  id: string;
  name: string;
  type: string;
  requiredQuantity: number;
  fixedPrice?: number | null;
  percentageOff?: number | null;
  isActive: boolean;
}

export default function ClubbingRulesDashboard() {
  const [rules, setRules] = useState<ClubbingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form fields
  const [formData, setFormData] = useState({
    name: '',
    type: 'fixed_price_bundle',
    requiredQuantity: 3,
    fixedPrice: 999,
    percentageOff: 20,
    isActive: true,
  });

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const data = await fetchWithAuth('/clubbing-rules');
      if (Array.isArray(data)) {
        setRules(data);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a rule name.');
      return;
    }

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const payload: any = {
        name: formData.name.trim(),
        type: formData.type,
        requiredQuantity: Number(formData.requiredQuantity),
        isActive: formData.isActive,
        applicableProductIds: [],
      };

      if (formData.type === 'fixed_price_bundle') {
        payload.fixedPrice = Number(formData.fixedPrice);
        payload.percentageOff = null;
      } else {
        payload.percentageOff = Number(formData.percentageOff);
        payload.fixedPrice = null;
      }

      const created = await fetchWithAuth('/clubbing-rules', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setFeedbackMsg({ type: 'success', text: `Rule "${created.name}" created successfully!` });
      setShowCreateModal(false);
      setFormData({
        name: '',
        type: 'fixed_price_bundle',
        requiredQuantity: 3,
        fixedPrice: 999,
        percentageOff: 20,
        isActive: true,
      });

      // Reload list
      await loadRules();
    } catch (error: any) {
      console.error('Failed to create rule:', error);
      setFeedbackMsg({ type: 'error', text: error.message || 'Failed to create rule.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this rule?')) return;
    try {
      await fetchWithAuth(`/clubbing-rules/${id}`, { method: 'DELETE' });
      setRules(prev => prev.filter(rule => rule.id !== id));
      setFeedbackMsg({ type: 'success', text: 'Rule deleted successfully.' });
    } catch (error) {
      console.error('Failed to delete rule:', error);
      setFeedbackMsg({ type: 'error', text: 'Failed to delete rule.' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-zinc-500 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3" />
        Loading clubbing rules...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10 max-w-6xl mx-auto font-sans">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b border-zinc-200">
        <div>
          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">Clubbing Rules Management</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure and manage multi-item bundle campaigns & festive pricing.</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="/overview"
            className="inline-flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium px-4 py-2.5 rounded-lg border border-zinc-300 transition"
          >
            ← Dashboard
          </a>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition active:scale-95"
          >
            <span className="text-lg leading-none">+</span> Create New Rule
          </button>
        </div>
      </div>

      {/* Notifications */}
      {feedbackMsg && (
        <div className={`mb-6 p-4 rounded-lg flex items-center justify-between text-sm ${
          feedbackMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold ml-4">✕</button>
        </div>
      )}

      {/* Rules Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-zinc-200">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Rule Name</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Bundle Type</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Trigger Qty</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Benefit</th>
              <th className="px-6 py-3.5 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3.5 text-right text-xs font-semibold text-zinc-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-zinc-200 text-sm">
            {rules.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-zinc-500">
                  No clubbing rules found in database. Create your first rule above!
                </td>
              </tr>
            ) : (
              rules.map((rule) => {
                const isFixed = rule.type === 'fixed_price_bundle';
                const benefitText = isFixed 
                  ? `Flat ₹${rule.fixedPrice ?? 999}` 
                  : `${rule.percentageOff ?? 20}% OFF`;

                return (
                  <tr key={rule.id} className="hover:bg-zinc-50/70 transition">
                    <td className="px-6 py-4 font-semibold text-zinc-900">{rule.name}</td>
                    <td className="px-6 py-4 text-zinc-600 capitalize">
                      {rule.type.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-zinc-600">
                      <span className="font-mono bg-zinc-100 text-zinc-800 px-2.5 py-1 rounded-md text-xs font-medium">
                        Buy {rule.requiredQuantity} items
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-emerald-700">
                      {benefitText}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 inline-flex text-xs leading-4 font-semibold rounded-full ${
                        rule.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-600'
                      }`}>
                        {rule.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteRule(rule.id)}
                        className="text-rose-600 hover:text-rose-800 font-medium text-xs hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Rule Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-zinc-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-zinc-900">Create New Clubbing Rule</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-zinc-400 hover:text-zinc-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">Campaign / Rule Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Diwali Dhamaka Bundle"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">Bundle Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="fixed_price_bundle">Fixed Price Bundle</option>
                    <option value="percentage_off_bundle">Percentage Off</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">Required Qty</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.requiredQuantity}
                    onChange={(e) => setFormData({ ...formData, requiredQuantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {formData.type === 'fixed_price_bundle' ? (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">Fixed Bundle Price (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    placeholder="999"
                    value={formData.fixedPrice}
                    onChange={(e) => setFormData({ ...formData, fixedPrice: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 uppercase mb-1">Discount Percentage (%) *</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    placeholder="20"
                    value={formData.percentageOff}
                    onChange={(e) => setFormData({ ...formData, percentageOff: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2 border border-zinc-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isActiveToggle"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="isActiveToggle" className="text-sm text-zinc-700 font-medium">
                  Active (enable on storefront immediately)
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
                  {isSubmitting ? 'Saving to Database...' : 'Save Rule to PostgreSQL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}