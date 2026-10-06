import React, { useEffect, useState } from "react";
import { Plus, Trash2, Tag, Sparkles } from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";

const Offers = () => {
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    code: "",
    title: "",
    description: "",
    discountType: "percentage",
    discountValue: 20,
    minOrderAmount: 10,
    maxDiscount: 5,
  });

  const fetchOffers = async () => {
    try {
      const res = await api.getOffers();
      if (res.success) setOffers(res.offers);
    } catch (err) {
      console.warn("[OwnerOffers] Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleDelete = async (id) => {
    if (confirm("Delete this promo offer?")) {
      try {
        await api.deleteOffer(id);
        fetchOffers();
      } catch (err) {
        alert(err.message);
      }
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createOffer({
        code: formData.code.trim().toUpperCase(),
        title: formData.title,
        description: formData.description,
        discountType: formData.discountType,
        discountValue: Number(formData.discountValue),
        minOrderAmount: Number(formData.minOrderAmount) || 0,
        maxDiscount: Number(formData.maxDiscount) || 0,
      });
      setShowAddModal(false);
      setFormData({
        code: "",
        title: "",
        description: "",
        discountType: "percentage",
        discountValue: 20,
        minOrderAmount: 10,
        maxDiscount: 5,
      });
      fetchOffers();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Promotional Offers & Coupons"
        subtitle="Create discount codes and seasonal deals for dine-in tables"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Promo Offer</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full p-8 text-center text-xs text-stone-400">Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className="col-span-full bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400 text-xs">
            <Tag className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            No offers currently active. Click "Create Promo Offer" to add one.
          </div>
        ) : (
          offers.map((offer) => (
            <div
              key={offer._id}
              className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs font-extrabold px-3 py-1 rounded-xl bg-amber-50 text-amber-900 border border-amber-300">
                    {offer.code}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                    {offer.discountType === "percentage" ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} FLAT`}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-stone-900 mt-2">{offer.title}</h4>
                <p className="text-xs text-stone-500 mt-0.5">{offer.description || "No description."}</p>

                <div className="mt-3 text-[11px] text-stone-400">
                  <span>Min Order: ₹{offer.minOrderAmount}</span>
                  {offer.maxDiscount > 0 && <span> • Max Cap: ₹{offer.maxDiscount}</span>}
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 mt-4 flex justify-end">
                <button
                  onClick={() => handleDelete(offer._id)}
                  className="text-stone-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                  title="Delete Offer"
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
            <h3 className="text-lg font-bold font-serif text-stone-900 mb-3">Create Promo Offer</h3>

            <form onSubmit={handleCreate} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Coupon Code</label>
                <input
                  type="text"
                  placeholder="e.g. MORNINGBREW"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full uppercase font-mono px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Offer Title</label>
                <input
                  type="text"
                  placeholder="e.g. 20% Off Breakfast & Brews"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Discount Type</label>
                  <select
                    value={formData.discountType}
                    onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.discountValue}
                    onChange={(e) => setFormData({ ...formData, discountValue: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minOrderAmount}
                    onChange={(e) => setFormData({ ...formData, minOrderAmount: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Max Cap (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxDiscount}
                    onChange={(e) => setFormData({ ...formData, maxDiscount: e.target.value })}
                    className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Terms or promo description..."
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
                  Save Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Offers;
