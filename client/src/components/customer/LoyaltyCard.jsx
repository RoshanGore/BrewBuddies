import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Award, Sparkles, ChevronRight, Gift, Tag } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const LoyaltyCard = () => {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    let isMounted = true;
    api.getPointsSummary()
      .then((res) => {
        if (isMounted && res.success) {
          setSummary(res);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [user?.loyaltyPoints]);

  const points = summary?.points ?? (user?.loyaltyPoints || 0);
  const nextTierGoal = 250;
  const progress = Math.min(100, Math.round((points / nextTierGoal) * 100));

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 text-amber-50 p-5 shadow-lg border border-amber-700/40">
      {/* Decorative watermark glow */}
      <div className="absolute -right-8 -bottom-8 w-36 h-36 rounded-full bg-amber-500/10 blur-xl pointer-events-none"></div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider text-amber-300 font-semibold block leading-none">
                BrewBuddies Club
              </span>
              <span className="text-xs text-stone-300 font-medium">
                {user?.name || "Guest Diner"}
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-amber-400/30">
            <Sparkles className="w-3 h-3" />
            Active Member
          </span>
        </div>

        {/* Balance */}
        <div className="mb-3">
          <span className="text-xs text-amber-200/80 block">Loyalty Points Balance</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold font-serif text-white tracking-tight">
              {points.toLocaleString()}
            </span>
            <span className="text-sm font-semibold text-amber-400">Points</span>
          </div>
        </div>

        {/* Available Rewards & Offers Count Summary */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <Link
            to="/rewards"
            className="p-2 bg-black/30 hover:bg-black/40 rounded-2xl border border-white/10 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Gift className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-stone-300 font-medium">Rewards</span>
            </div>
            <span className="text-xs font-bold text-white">
              {summary?.availableRewardsCount !== undefined ? `${summary.availableRewardsCount} available` : "View"}
            </span>
          </Link>

          <Link
            to="/offers"
            className="p-2 bg-black/30 hover:bg-black/40 rounded-2xl border border-white/10 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[11px] text-stone-300 font-medium">Offers</span>
            </div>
            <span className="text-xs font-bold text-white">
              {summary?.activeOffersCount !== undefined ? `${summary.activeOffersCount} active` : "View"}
            </span>
          </Link>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-[11px] text-stone-300 mb-1.5 font-medium">
            <span>Goal: Free Drink Tier</span>
            <span className="font-semibold text-amber-300">{points}/{nextTierGoal} pts</span>
          </div>
          <div className="w-full h-2 rounded-full bg-black/40 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Quick Link */}
        <Link
          to="/rewards"
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 transition-colors"
        >
          <Gift className="w-3.5 h-3.5 text-amber-300" />
          <span>Explore All Redeemable Perks</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
};

export default LoyaltyCard;
