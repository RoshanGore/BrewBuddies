import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  DollarSign,
  ShoppingBag,
  Users,
  TrendingUp,
  ArrowRight,
  BellRing,
  Coffee,
  CheckCircle2,
  Clock,
  Award,
  ChefHat,
  Sparkles,
} from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import StatCard from "../../components/owner/StatCard";
import api from "../../services/api";

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [liveOrders, setLiveOrders] = useState([]);
  const [popularItems, setPopularItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumRes, ordersRes, chartsRes] = await Promise.all([
        api.getSummary(),
        api.getLiveOrders(),
        api.getCharts(),
      ]);
      if (sumRes.success) setSummary(sumRes.summary);
      if (ordersRes.success) setLiveOrders(ordersRes.orders.slice(0, 6));
      if (chartsRes.success && chartsRes.popularItems) setPopularItems(chartsRes.popularItems.slice(0, 4));
    } catch (err) {
      console.warn("[Dashboard] Load error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvanceStatus = async (orderId, nextStatus) => {
    try {
      await api.updateOrderStatus(orderId, { status: nextStatus });
      fetchDashboardData();
      window.dispatchEvent(new Event("bb:orders-updated"));
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Cafe Management Dashboard"
        subtitle="Live snapshot of dine-in kitchen queues, sales KPIs, and customer activity"
      />

      {/* 8 Real MongoDB KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-3.5">
        <StatCard
          title="Today's Sales"
          value={`₹${(summary?.todaySales ?? summary?.todayRevenue ?? 0).toFixed(2)}`}
          subtext="Total dine-in revenue today"
          icon={DollarSign}
          color="emerald"
        />
        <StatCard
          title="Today's Orders"
          value={summary?.todayOrders ?? summary?.todayOrdersCount ?? 0}
          subtext="Orders placed today"
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          title="Pending Orders"
          value={summary?.pendingOrders ?? 0}
          subtext="Awaiting staff acceptance"
          icon={Clock}
          color="rose"
        />
        <StatCard
          title="Preparing Orders"
          value={summary?.preparingOrders ?? 0}
          subtext="In kitchen queue"
          icon={ChefHat}
          color="blue"
        />
        <StatCard
          title="Ready to Serve"
          value={summary?.readyOrders ?? 0}
          subtext="Prepared at kitchen counter"
          icon={BellRing}
          color="purple"
        />
        <StatCard
          title="Served Orders"
          value={summary?.servedOrders ?? 0}
          subtext="Completed table orders"
          icon={CheckCircle2}
          color="emerald"
        />
        <StatCard
          title="Total Customers"
          value={summary?.totalCustomers ?? 0}
          subtext="Registered diner accounts"
          icon={Users}
          color="blue"
        />
        <StatCard
          title="Loyalty Points Issued"
          value={summary?.loyaltyPointsIssued ?? 0}
          subtext="Earned across completed orders"
          icon={Award}
          color="amber"
        />
      </div>

      {/* Status Pipeline Summary */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="font-bold text-stone-700 uppercase tracking-wider text-[11px]">
          Kitchen Pipeline:
        </span>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl font-semibold">
            {summary?.pendingOrders || 0} Pending
          </span>
          <span className="px-3 py-1 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl font-semibold">
            {summary?.preparingOrders || 0} Preparing
          </span>
          <span className="px-3 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-xl font-semibold">
            {summary?.readyOrders || 0} Ready
          </span>
          <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-semibold">
            {summary?.servedOrders || 0} Served
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Live Orders Queue (8 Cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-stone-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <div>
                <h2 className="text-base font-bold font-serif text-stone-900 leading-tight">
                  Active Table Queue
                </h2>
                <p className="text-xs text-stone-400">Live dine-in orders</p>
              </div>
            </div>

            <Link
              to="/owner/orders"
              className="text-xs font-semibold text-amber-900 hover:text-amber-700 flex items-center gap-1"
            >
              <span>View All Orders</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {liveOrders.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs">
              <Coffee className="w-8 h-8 mx-auto text-stone-300 mb-2" />
              No active orders right now. Ready for dine-in orders!
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {liveOrders.map((order) => {
                let nextStatus = "accepted";
                let btnLabel = "Accept";
                if (order.status === "accepted") {
                  nextStatus = "preparing";
                  btnLabel = "Prepare";
                } else if (order.status === "preparing") {
                  nextStatus = "ready";
                  btnLabel = "Mark Ready";
                } else if (order.status === "ready") {
                  nextStatus = "served";
                  btnLabel = "Serve Table";
                }

                return (
                  <div key={order._id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-950 font-extrabold text-sm flex flex-col items-center justify-center border border-amber-300">
                        <span className="text-[9px] uppercase font-bold text-amber-800">Table</span>
                        <span>#{order.tableNumber}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-stone-900">
                            #{order.orderNumber}
                          </span>
                          <span className="text-xs font-semibold text-stone-700">
                            • {order.customerName || "Dine-in Diner"}
                          </span>
                          <span className="text-[10px] capitalize px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-medium">
                            {order.status}
                          </span>
                        </div>

                        <p className="text-xs text-stone-500 mt-0.5">
                          {order.items?.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-stone-900 font-serif">
                        ₹{(order.total ?? order.totalAmount ?? 0).toFixed(2)}
                      </span>

                      {order.status !== "served" && order.status !== "cancelled" && (
                        <button
                          onClick={() => handleAdvanceStatus(order._id, nextStatus)}
                          className="px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{btnLabel}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Popular Items & Quick Shortcuts (4 Cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Popular Products</span>
            </h3>

            {popularItems.length === 0 ? (
              <p className="text-xs text-stone-400 py-3">Popular products will appear as orders are served.</p>
            ) : (
              <div className="space-y-2.5">
                {popularItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 rounded-xl bg-stone-50 border border-stone-100">
                    <span className="font-semibold text-stone-800 truncate mr-2">{item.name}</span>
                    <span className="font-mono text-amber-900 font-bold bg-amber-100/80 px-2 py-0.5 rounded-lg text-[11px] shrink-0">
                      {item.quantity} sold
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Link
              to="/owner/products"
              className="bg-white rounded-2xl border border-stone-200 p-3.5 hover:border-amber-400 transition-colors flex items-center gap-3 shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-900 flex items-center justify-center">
                <Coffee className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Manage Menu Items</h4>
                <p className="text-[10px] text-stone-400">Add products & toggle availability</p>
              </div>
            </Link>

            <Link
              to="/owner/qr-codes"
              className="bg-white rounded-2xl border border-stone-200 p-3.5 hover:border-amber-400 transition-colors flex items-center gap-3 shadow-xs"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-stone-900">Print Table QRs</h4>
                <p className="text-[10px] text-stone-400">Download & print table cards</p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

