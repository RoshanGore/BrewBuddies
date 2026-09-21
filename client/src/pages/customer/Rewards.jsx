import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Gift,
  Award,
  Sparkles,
  Check,
  AlertCircle,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  X,
  Loader2,
  TrendingUp,
  History,
  Tag,
  Coffee,
} from "lucide-react";
import confetti from "canvas-confetti";
import { useAuth } from "../../context/AuthContext";
import { useTable } from "../../context/TableContext";
import api from "../../services/api";

const Rewards = () => {
  const { user, setCustomerSession } = useAuth();
  const { cafe } = useTable();

  const [activeTab, setActiveTab] = useState("available"); // "available" | "history" | "transactions"
  const [pointsSummary, setPointsSummary] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [selectedReward, setSelectedReward] = useState(null);
  const [redeemSuccess, setRedeemSuccess] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");

  const currentPoints = pointsSummary?.points ?? (user?.loyaltyPoints || 0);
  const currencySymbol = pointsSummary?.currency || "₹";
  const pointsRate = pointsSummary?.pointsPerSpend || 10;

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [pointsRes, rewardsRes, historyRes] = await Promise.all([
        api.getPointsSummary().catch(() => ({ success: false })),
        api.getRewards().catch(() => ({ success: false, rewards: [] })),
        api.getRedemptionHistory().catch(() => ({ success: false, redemptions: [] })),
      ]);

      if (pointsRes.success) {
        setPointsSummary(pointsRes);
      }
      if (rewardsRes.success && Array.isArray(rewardsRes.rewards)) {
        setRewards(rewardsRes.rewards);
      }
      if (historyRes.success && Array.isArray(historyRes.redemptions)) {
        setRedemptions(historyRes.redemptions);
      }
    } catch (err) {
      console.warn("[Rewards] Error loading data:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleConfirmRedeem = async () => {
    if (!selectedReward) return;
    setRedeeming(true);
    setErrorMessage("");

    try {
      const res = await api.redeemReward({ rewardId: selectedReward._id });

      if (res.success) {
        // Trigger celebratory confetti effect
        try {
          confetti({
            particleCount: 75,
            spread: 60,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        // Update auth state in memory and localStorage
        if (user && res.newBalance !== undefined) {
          const updated = { ...user, loyaltyPoints: res.newBalance };
          setCustomerSession(localStorage.getItem("bb_token") || "", updated);
        }

        setRedeemSuccess(res.redemption || { title: selectedReward.name, pointsUsed: selectedReward.pointsRequired });
        setSelectedReward(null);

        // Reload data fresh from server
        loadAllData();
      }
    } catch (err) {
      setErrorMessage(err.message || "Failed to redeem reward. Please try again.");
    } finally {
      setRedeeming(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Loyalty & Rewards</h1>
        <p className="text-xs text-stone-500">
          Earn points on handcrafted drinks & bites, and redeem exclusive cafe perks
        </p>
      </div>

      {/* Main Loyalty Points Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-stone-950 via-amber-950 to-stone-900 text-white p-5 shadow-xl border border-amber-800/40">
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>Dine-In Loyalty Account</span>
            </span>
            <span className="text-[11px] font-semibold text-stone-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
              {user?.name || "Guest Diner"}
            </span>
          </div>

          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-4xl font-extrabold font-serif tracking-tight text-white">
              {currentPoints.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-amber-400">Points</span>
          </div>

          {/* Dynamic Cafe Conversion Rule */}
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 text-amber-200 border border-amber-400/30 px-3 py-1 rounded-full text-[11px] font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>
              Earn 1 point for every {currencySymbol}
              {pointsRate} spent dine-in
            </span>
          </div>

          {/* Lifetime Metrics */}
          <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-center">
            <div className="bg-black/25 rounded-2xl p-2">
              <span className="block text-[10px] text-stone-400 uppercase font-medium">Earned</span>
              <span className="text-xs font-bold text-emerald-400">
                +{pointsSummary?.totalEarned?.toLocaleString() || 0}
              </span>
            </div>
            <div className="bg-black/25 rounded-2xl p-2">
              <span className="block text-[10px] text-stone-400 uppercase font-medium">Redeemed</span>
              <span className="text-xs font-bold text-amber-300">
                -{pointsSummary?.totalRedeemed?.toLocaleString() || 0}
              </span>
            </div>
            <div className="bg-black/25 rounded-2xl p-2">
              <span className="block text-[10px] text-stone-400 uppercase font-medium">Perks Claimed</span>
              <span className="text-xs font-bold text-white">
                {pointsSummary?.redemptionsCount || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {redeemSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-3xl text-xs text-emerald-900 flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
              <Check className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-emerald-950">Reward Redeemed Successfully!</p>
              <p className="text-[11px] text-emerald-800 mt-0.5">
                '{redeemSuccess.title}' has been claimed. {redeemSuccess.pointsUsed} points deducted. Show your screen to cafe staff or apply at checkout!
              </p>
            </div>
          </div>
          <button
            onClick={() => setRedeemSuccess(null)}
            className="text-emerald-700 hover:text-emerald-950 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-3xl text-xs text-rose-800 flex items-start gap-2.5 shadow-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold">Redemption Failed</p>
            <p className="text-[11px] text-rose-700 mt-0.5">{errorMessage}</p>
          </div>
          <button
            onClick={() => setErrorMessage("")}
            className="text-rose-600 hover:text-rose-900 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-200/80 rounded-2xl">
        <button
          onClick={() => setActiveTab("available")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "available"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Perks ({rewards.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "history"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Redemptions ({redemptions.length})
        </button>
        <button
          onClick={() => setActiveTab("transactions")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === "transactions"
              ? "bg-white text-stone-900 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          Points Ledger
        </button>
      </div>

      {/* TAB 1: Available Rewards */}
      {activeTab === "available" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Available Cafe Perks
            </h3>
            <span className="text-[11px] text-stone-400">
              {rewards.length} {rewards.length === 1 ? "perk" : "perks"} listed
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-32 bg-stone-200/70 rounded-3xl animate-pulse"></div>
              ))}
            </div>
          ) : rewards.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center text-xs text-stone-500 space-y-2">
              <Gift className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-bold text-stone-700">No active perks found</p>
              <p className="text-[11px] text-stone-400">
                Check back soon as new seasonal rewards and artisan treats are added!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {rewards.map((reward) => {
                const cost = reward.pointsRequired || reward.pointsCost || 0;
                const canAfford = currentPoints >= cost;
                const progressPercent = cost > 0 ? Math.min(100, Math.round((currentPoints / cost) * 100)) : 100;
                const remaining = Math.max(0, cost - currentPoints);

                return (
                  <div
                    key={reward._id}
                    className={`bg-white rounded-3xl border p-4 shadow-xs transition-all ${
                      canAfford
                        ? "border-amber-300 hover:border-amber-400"
                        : "border-stone-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                            <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                            <span>{cost} PTS</span>
                          </span>

                          {reward.rewardType === "fixed_discount" && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              ₹{reward.rewardValue} Discount
                            </span>
                          )}
                          {reward.rewardType === "percentage_discount" && (
                            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              {reward.rewardValue}% OFF
                            </span>
                          )}
                          {reward.rewardType === "free_item" && (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              Complimentary Item
                            </span>
                          )}
                        </div>

                        <h4 className="text-sm font-bold text-stone-900">
                          {reward.name || reward.title}
                        </h4>
                        <p className="text-xs text-stone-500 mt-0.5">
                          {reward.description || "Exclusive loyalty perk for dine-in guests."}
                        </p>
                      </div>

                      <button
                        onClick={() => setSelectedReward(reward)}
                        disabled={!canAfford}
                        className={`shrink-0 px-4 py-2 rounded-2xl text-xs font-bold transition-all shadow-xs ${
                          canAfford
                            ? "bg-amber-900 hover:bg-amber-800 text-white active:scale-95 cursor-pointer"
                            : "bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200"
                        }`}
                      >
                        {canAfford ? "Redeem" : "Locked"}
                      </button>
                    </div>

                    {/* Dynamic Progress Bar */}
                    <div className="mt-3 pt-3 border-t border-stone-100">
                      <div className="flex items-center justify-between text-[11px] mb-1.5 font-medium">
                        <span className="text-stone-500">
                          {currentPoints} / {cost} points
                        </span>
                        <span className={canAfford ? "text-emerald-700 font-bold" : "text-amber-800 font-semibold"}>
                          {canAfford ? "Ready to Redeem!" : `${remaining} points to go`}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-stone-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            canAfford ? "bg-emerald-500" : "bg-amber-600"
                          }`}
                          style={{ width: `${progressPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Redemption History */}
      {activeTab === "history" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Claimed Perks History
            </h3>
            <span className="text-[11px] text-stone-400">
              {redemptions.length} claimed
            </span>
          </div>

          {redemptions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-2">
              <History className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-bold text-stone-700">No rewards redeemed yet.</p>
              <p className="text-[11px] text-stone-400">
                Start earning points from your dine-in orders to claim free drinks & discounts!
              </p>
              <Link
                to="/menu"
                className="inline-block mt-2 px-4 py-2 bg-amber-900 text-white rounded-xl text-xs font-semibold"
              >
                Browse Menu
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5">
              {redemptions.map((redemption) => {
                const rewardItem = redemption.rewardId;
                const dateStr = new Date(redemption.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });

                return (
                  <div
                    key={redemption._id}
                    className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center shrink-0 border border-amber-300">
                        <Gift className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {rewardItem?.name || rewardItem?.title || "Redeemed Perk"}
                        </h4>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span>{redemption.cafeId?.name || "BrewBuddies Cafe"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-extrabold text-amber-900 block font-mono">
                        -{redemption.pointsUsed} pts
                      </span>
                      <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200 mt-0.5">
                        Claimed
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Points Transaction History */}
      {activeTab === "transactions" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-600">
              Points Ledger
            </h3>
            <span className="text-[11px] text-stone-400">
              {pointsSummary?.transactions?.length || 0} records
            </span>
          </div>

          {!pointsSummary?.transactions || pointsSummary.transactions.length === 0 ? (
            <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center text-xs text-stone-500 space-y-2">
              <TrendingUp className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="font-bold text-stone-700">No points transactions yet.</p>
              <p className="text-[11px] text-stone-400">
                Order handcrafted food & drinks to earn points automatically when served!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pointsSummary.transactions.map((tx) => {
                const isEarned = tx.type === "earned";
                const isRedeemed = tx.type === "redeemed";
                const dateStr = new Date(tx.createdAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                });

                return (
                  <div
                    key={tx._id}
                    className="bg-white rounded-2xl border border-stone-200 p-3.5 shadow-xs flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                          isEarned
                            ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                            : isRedeemed
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-600 border-blue-200"
                        }`}
                      >
                        {isEarned ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : (
                          <ArrowUpRight className="w-4 h-4" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-stone-800 truncate">
                          {tx.description || (isEarned ? "Dine-In Order Points" : "Reward Redemption")}
                        </p>
                        <p className="text-[10px] text-stone-400 mt-0.5">{dateStr}</p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`font-mono text-xs font-extrabold ${
                          isEarned ? "text-emerald-700" : "text-amber-900"
                        }`}
                      >
                        {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      {selectedReward && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-stone-200 max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-900 flex items-center justify-center mx-auto border border-amber-300">
              <Gift className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold font-serif text-stone-900">
                Redeem {selectedReward.name || selectedReward.title}?
              </h3>
              <p className="text-xs text-stone-500">
                {selectedReward.pointsRequired || selectedReward.pointsCost} points will be deducted from your balance.
              </p>
            </div>

            {/* Balance Preview Card */}
            <div className="bg-stone-50 rounded-2xl p-3 border border-stone-200 text-xs space-y-1.5">
              <div className="flex justify-between text-stone-600">
                <span>Current Balance:</span>
                <span className="font-semibold text-stone-800">{currentPoints} pts</span>
              </div>
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>Points to Deduct:</span>
                <span>-{selectedReward.pointsRequired || selectedReward.pointsCost} pts</span>
              </div>
              <div className="pt-1.5 border-t border-stone-200 flex justify-between font-bold text-stone-900">
                <span>Remaining Balance:</span>
                <span className="font-mono text-amber-900">
                  {currentPoints - (selectedReward.pointsRequired || selectedReward.pointsCost)} pts
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedReward(null)}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-xl border border-stone-300 text-stone-700 text-xs font-bold hover:bg-stone-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRedeem}
                disabled={redeeming}
                className="flex-1 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-75"
              >
                {redeeming ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Redeeming...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Redeem Reward</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rewards;
