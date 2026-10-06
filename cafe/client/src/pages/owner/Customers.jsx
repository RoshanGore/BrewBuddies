import React, { useEffect, useState } from "react";
import { Users, Search, Award, DollarSign, ShoppingBag, Phone, Mail, X, Clock, Calendar, Gift, RefreshCw } from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modal State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const fetchCustomers = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const res = await api.getCustomers({ search });
      if (res.success) setCustomers(res.customers);
    } catch (err) {
      console.warn("[Customers] Error:", err.message);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCustomers();

    // Auto-refresh when tab/window gains focus or orders are updated elsewhere
    const handleSync = () => fetchCustomers();
    window.addEventListener("focus", handleSync);
    window.addEventListener("bb:orders-updated", handleSync);

    return () => {
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("bb:orders-updated", handleSync);
    };
  }, [search]);

  const handleOpenDetail = async (customer) => {
    setSelectedCustomer(customer);
    setLoadingDetail(true);
    try {
      const res = await api.getCustomerById(customer._id);
      if (res.success) {
        setDetailData(res);
        if (res.customer) {
          setSelectedCustomer(res.customer);
          setCustomers((prev) =>
            prev.map((c) => (c._id === res.customer._id ? { ...c, ...res.customer } : c))
          );
        }
      }
    } catch (err) {
      alert("Error loading customer details: " + err.message);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getTier = (points) => {
    const pts = points || 0;
    if (pts >= 300) return { label: "Gold Diner", color: "bg-amber-100 text-amber-900 border-amber-300" };
    if (pts >= 150) return { label: "Silver Diner", color: "bg-slate-100 text-slate-800 border-slate-300" };
    return { label: "Bronze Diner", color: "bg-orange-50 text-orange-900 border-orange-200" };
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Dine-in Customers & Loyalty"
        subtitle="Track customer visit frequencies, lifetime spend, and loyalty balances"
        actions={
          <button
            onClick={() => fetchCustomers(true)}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Customers</span>
          </button>
        }
      />

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by customer name, phone, or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white rounded-2xl border border-stone-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-xs"
        />
      </div>

      {/* Customer Directory Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-stone-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
            {customers.length} Registered Diners
          </span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-xs text-stone-400">Loading customer list...</div>
        ) : customers.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs">
            <Users className="w-8 h-8 mx-auto text-stone-300 mb-2" />
            No customers found. Customers will be listed here after placing dine-in orders.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Phone / Contact</th>
                  <th className="py-3 px-4">Loyalty Tier</th>
                  <th className="py-3 px-4">Points Balance</th>
                  <th className="py-3 px-4">Total Orders</th>
                  <th className="py-3 px-4">Total Spend</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {customers.map((c) => {
                  const pts = c.points ?? c.loyaltyPoints ?? 0;
                  const tier = getTier(pts);
                  return (
                    <tr key={c._id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-stone-900">
                        {c.name || "Dine-in Guest"}
                      </td>
                      <td className="py-3.5 px-4 text-stone-600 font-mono">
                        {c.phone || c.email || "No contact"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${tier.color}`}>
                          {tier.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-amber-900 font-serif text-sm">
                          {pts}
                        </span>{" "}
                        <span className="text-[10px] text-stone-400">pts</span>
                      </td>
                      <td className="py-3.5 px-4 text-stone-700 font-medium">
                        {c.ordersCount || 0} visits
                      </td>
                      <td className="py-3.5 px-4 font-bold text-stone-900 font-serif">
                        ₹{(c.totalSpent || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleOpenDetail(c)}
                          className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div>
                <h3 className="text-base font-bold font-serif text-stone-900">
                  {selectedCustomer.name || "Customer Profile"}
                </h3>
                <p className="text-stone-400 text-[11px]">
                  Phone: {selectedCustomer.phone || "N/A"} • Email: {selectedCustomer.email || "N/A"}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => selectedCustomer && handleOpenDetail(selectedCustomer)}
                  title="Refresh Details"
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingDetail ? "animate-spin" : ""}`} />
                </button>
                <button
                  onClick={() => {
                    setSelectedCustomer(null);
                    setDetailData(null);
                  }}
                  className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingDetail ? (
              <div className="py-12 text-center text-stone-400">Loading customer history...</div>
            ) : (
              <div className="space-y-5">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                    <span className="text-[10px] text-amber-800 font-bold uppercase block">Loyalty Points</span>
                    <span className="text-lg font-bold text-amber-950 font-serif">
                      {detailData?.customer?.points ?? selectedCustomer.points ?? 0}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl">
                    <span className="text-[10px] text-blue-800 font-bold uppercase block">Total Visits</span>
                    <span className="text-lg font-bold text-blue-950 font-serif">
                      {detailData?.customer?.ordersCount ?? selectedCustomer.ordersCount ?? 0}
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                    <span className="text-[10px] text-emerald-800 font-bold uppercase block">Total Spend</span>
                    <span className="text-lg font-bold text-emerald-950 font-serif">
                      ₹{(detailData?.customer?.totalSpent ?? selectedCustomer.totalSpent ?? 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                    <ShoppingBag className="w-3.5 h-3.5 text-amber-700" />
                    <span>Order History ({detailData?.orders?.length || 0})</span>
                  </h4>

                  {(!detailData?.orders || detailData.orders.length === 0) ? (
                    <p className="text-stone-400 py-2">No past orders found.</p>
                  ) : (
                    <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl max-h-48 overflow-y-auto">
                      {detailData.orders.map((o) => (
                        <div key={o._id} className="p-2.5 flex items-center justify-between">
                          <div>
                            <span className="font-mono font-bold text-stone-900">#{o.orderNumber}</span>
                            <span className="text-stone-400 ml-2">Table #{o.tableNumber}</span>
                            <span className="text-stone-500 block text-[11px]">
                              {o.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-stone-900">₹{(o.total || 0).toFixed(2)}</span>
                            <span className="block text-[10px] capitalize text-amber-800 font-semibold">{o.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Points Transactions */}
                <div>
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-amber-700" />
                    <span>Points Transactions ({detailData?.pointsTransactions?.length || 0})</span>
                  </h4>

                  {(!detailData?.pointsTransactions || detailData.pointsTransactions.length === 0) ? (
                    <p className="text-stone-400 py-2">No point transactions recorded.</p>
                  ) : (
                    <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl max-h-40 overflow-y-auto">
                      {detailData.pointsTransactions.map((tx) => (
                        <div key={tx._id} className="p-2.5 flex items-center justify-between text-[11px]">
                          <div>
                            <span className="font-medium text-stone-800">{tx.description || tx.type}</span>
                            <span className="text-stone-400 block text-[10px]">
                              {new Date(tx.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <span
                            className={`font-bold font-mono ${
                              tx.type === "earned" ? "text-emerald-700" : "text-rose-700"
                            }`}
                          >
                            {tx.type === "earned" ? `+${tx.points}` : `-${tx.points}`} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Rewards Redeemed */}
                <div>
                  <h4 className="font-bold text-stone-800 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-700" />
                    <span>Redeemed Rewards ({detailData?.redemptions?.length || 0})</span>
                  </h4>

                  {(!detailData?.redemptions || detailData.redemptions.length === 0) ? (
                    <p className="text-stone-400 py-2">No rewards redeemed yet.</p>
                  ) : (
                    <div className="divide-y divide-stone-100 border border-stone-100 rounded-2xl max-h-36 overflow-y-auto">
                      {detailData.redemptions.map((r) => (
                        <div key={r._id} className="p-2.5 flex items-center justify-between text-[11px]">
                          <span className="font-medium text-stone-800">{r.rewardId?.name || r.rewardId?.title || "Loyalty Perk"}</span>
                          <span className="text-amber-900 font-bold font-mono">{r.pointsSpent || 0} pts</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;

