import React, { useState } from "react";
import { Link } from "react-router-dom";
import { User, Phone, Award, Shield, LogIn, Check, Coffee, LogOut } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import LoyaltyCard from "../../components/customer/LoyaltyCard";

const Profile = () => {
  const { user, setCustomerSession, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    setCustomerSession(localStorage.getItem("bb_token") || "", {
      ...user,
      name,
      phone,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSignOut = () => {
    logout();
    setName("");
    setPhone("");
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Your Profile</h1>
        <p className="text-xs text-stone-500">Manage loyalty identity & preferences</p>
      </div>

      {/* Loyalty Status Card */}
      <LoyaltyCard />

      {/* Account Info Form */}
      <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
        <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-2">
          <User className="w-4 h-4 text-amber-700" />
          <span>Diner Contact Details</span>
        </h3>

        <form onSubmit={handleSave} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Alex Rivera"
              className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-600 mb-1">Phone Number</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9876543210"
              className="w-full text-xs px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <p className="text-[11px] text-stone-400 mt-1">
              Used to identify your loyalty points whenever you dine in.
            </p>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Update Profile</span>
            )}
          </button>

          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full py-2.5 rounded-xl border border-rose-200 bg-rose-50/60 hover:bg-rose-100/80 text-rose-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out / Switch Customer Account</span>
            </button>
          )}
        </form>
      </div>

      {/* Cafe Staff / Owner Portal Access */}
      <div className="bg-stone-100 rounded-3xl p-5 border border-stone-200 text-center">
        <Shield className="w-6 h-6 text-stone-500 mx-auto mb-1.5" />
        <h4 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
          Cafe Owner or Staff?
        </h4>
        <p className="text-xs text-stone-500 mt-0.5 max-w-xs mx-auto mb-3">
          Manage live kitchen orders, menu items, table QR codes, and cafe analytics.
        </p>
        <Link
          to="/owner/login"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Open Staff Portal</span>
        </Link>
      </div>
    </div>
  );
};

export default Profile;
