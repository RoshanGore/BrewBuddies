import React, { useEffect, useState } from "react";
import { Plus, Trash2, Gift, Sparkles, AlertCircle } from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";

const Rewards = () => {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    pointsCost: 100,
    rewardType: "fixed_discount",
    discountValue: 5,
  });

  const fetchRewards = async () => {
    try {
      const res = await api.getRewards();
      if (res.success) setRewards(res.rewards);
    } catch (err) {
      console.warn("[OwnerRewards] Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  const handleDelete = async (id) => {
    if (confirm("Delete this loyalty reward?")) {
      try {
        await api.deleteReward(id);
        fetchRewards();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createReward({
        title: formData.title,
        description: formData.description,
        pointsCost: Number(formData.pointsCost),
        rewardType: formData.rewardType,
        discountValue: Number(formData.discountValue),
      });
      setShowAddModal(false);
      setFormData({
        title: "",
        description: "",
        pointsCost: 100,
        rewardType: "fixed_discount",
        discountValue: 5,
      });
      fetchRewards();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Loyalty Rewards Management"
        subtitle="Configure redeemable perks and point thresholds for diners"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Reward</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-stone-400">Loading rewards...</div>
        ) : rewards.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400 text-xs">
            <Gift className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            No rewards created yet. Click "Create New Reward" to configure one.
          </div>
        ) : (
          rewards.map((reward) => (
            <div
              key={reward._id}
              className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="text-sm font-bold text-stone-900">{reward.title}</h4>
                  <span className="font-mono text-xs font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 shrink-0">
                    {reward.pointsCost} pts
                  </span>
                </div>
                <p className="text-xs text-stone-500">{reward.description || "No description."}</p>

                <div className="mt-3 text-[11px] text-stone-400">
                  <span className="font-semibold text-stone-700 capitalize">
                    {reward.rewardType.replace("_", " ")}
                  </span>
                  <span> • Value: ₹{reward.discountValue}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 mt-4 flex justify-end">
                <button
                  onClick={() => handleDelete(reward._id)}
                  className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                  title="Delete Reward"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold font-serif text-stone-900 mb-3">Create Loyalty Reward</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Reward Title</label>
                <input
                  type="text"
                  placeholder="e.g. Free Classic Cappuccino"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Points Cost</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.pointsCost}
                    onChange={(e) => setFormData({ ...formData, pointsCost: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Discount Value (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Details on what customer receives..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl resize-none"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-stone-600 font-semibold hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-900 hover:bg-amber-800 text-white font-semibold rounded-xl"
                >
                  Save Reward
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
