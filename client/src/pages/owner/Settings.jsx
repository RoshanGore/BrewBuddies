import React, { useEffect, useState } from "react";
import { Settings as SettingsIcon, Save, Check, Coffee, Shield, Wifi, Percent } from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";

const Settings = () => {
  const { isOwner } = useAuth();
  const [formData, setFormData] = useState({
    cafeName: "BrewBuddies Cafe",
    tagline: "Artisan Coffee & Cozy Moments",
    currency: "₹",
    taxRate: 5,
    pointsPerDollar: 10,
    pointsRedemptionRatio: 100,
    wifiSsid: "BrewBuddies_Guest",
    wifiPassword: "CoffeeVibes2026",
    address: "124 Artisan Alley, Downtown",
    phone: "+1 (555) 345-BREW",
  });

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await api.getSettings();
        if (res.success && res.settings) {
          setFormData(res.settings);
        }
      } catch (err) {
        console.warn("[Settings] Error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOwner) {
      setError("Forbidden: Only cafe owners can modify cafe settings.");
      return;
    }
    setError("");
    setSaved(false);

    try {
      await api.updateSettings({
        ...formData,
        taxRate: Number(formData.taxRate),
        pointsPerDollar: Number(formData.pointsPerDollar),
        pointsRedemptionRatio: Number(formData.pointsRedemptionRatio),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Cafe & Platform Settings"
        subtitle="Configure cafe branding, tax rates, loyalty points rules, and guest Wi-Fi"
      />

      <form onSubmit={handleSubmit} className="max-w-2xl bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-5 text-xs">
        {!isOwner && (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Read-Only Staff View</p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Access Restricted: Only cafe owners can modify cafe branding, tax rates, loyalty points rules, and Wi-Fi credentials.
              </p>
            </div>
          </div>
        )}

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">Settings updated successfully!</span>
          </div>
        )}

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700">
            {error}
          </div>
        )}

        <fieldset disabled={!isOwner} className="space-y-5 disabled:opacity-85">

        {/* Section 1: Cafe Identity */}
        <div>
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Coffee className="w-4 h-4 text-amber-700" />
            <span>Cafe Branding</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Cafe Name</label>
              <input
                type="text"
                value={formData.cafeName}
                onChange={(e) => setFormData({ ...formData, cafeName: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="block font-semibold text-stone-700 mb-1">Tagline</label>
              <input
                type="text"
                value={formData.tagline}
                onChange={(e) => setFormData({ ...formData, tagline: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Loyalty Rules */}
        <div className="pt-4 border-t border-stone-100">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Percent className="w-4 h-4 text-amber-700" />
            <span>Taxes & Loyalty Point Rules</span>
          </h3>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Dine-in Tax (%)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={formData.taxRate}
                onChange={(e) => setFormData({ ...formData, taxRate: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Pts Earned per ₹10</label>
              <input
                type="number"
                min="1"
                value={formData.pointsPerDollar}
                onChange={(e) => setFormData({ ...formData, pointsPerDollar: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Pts for ₹10 Value</label>
              <input
                type="number"
                min="1"
                value={formData.pointsRedemptionRatio}
                onChange={(e) => setFormData({ ...formData, pointsRedemptionRatio: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
                required
              />
            </div>
          </div>
        </div>

        {/* Section 3: Guest Wi-Fi */}
        <div className="pt-4 border-t border-stone-100">
          <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Wifi className="w-4 h-4 text-amber-700" />
            <span>Table Guest Wi-Fi (Printed on QR Cards)</span>
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Wi-Fi Network Name (SSID)</label>
              <input
                type="text"
                value={formData.wifiSsid}
                onChange={(e) => setFormData({ ...formData, wifiSsid: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Wi-Fi Password</label>
              <input
                type="text"
                value={formData.wifiPassword}
                onChange={(e) => setFormData({ ...formData, wifiPassword: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Contact & Address */}
        <div className="pt-4 border-t border-stone-100">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-stone-700 mb-1">Cafe Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-stone-700 mb-1">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl"
              />
            </div>
          </div>
        </div>
        </fieldset>

        {isOwner && (
          <div className="pt-4 border-t border-stone-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-amber-900 hover:bg-amber-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Cafe Settings</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

export default Settings;
