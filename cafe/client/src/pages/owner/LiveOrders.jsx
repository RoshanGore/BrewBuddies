import React, { useEffect, useState } from "react";
import {
  Bell,
  Clock,
  CheckCircle2,
  ChefHat,
  UtensilsCrossed,
  XCircle,
  RefreshCw,
  Phone,
  MessageSquare,
  AlertCircle,
} from "lucide-react";
import OwnerHeader from "../../components/owner/OwnerHeader";
import api from "../../services/api";

const LiveOrders = () => {
  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    try {
      const res = await api.getAllOrders();
      if (res.success) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.warn("[LiveOrders] Error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusChange = async (orderId, nextStatus) => {
    try {
      await api.updateOrderStatus(orderId, { status: nextStatus });
      fetchOrders();
      window.dispatchEvent(new Event("bb:orders-updated"));
    } catch (err) {
      alert("Failed to update status: " + err.message);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pending") return order.status === "pending" || order.status === "placed";
    return order.status === activeFilter;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
      case "placed":
        return "bg-rose-100 text-rose-800 border-rose-200 animate-pulse";
      case "accepted":
        return "bg-amber-100 text-amber-900 border-amber-200";
      case "preparing":
        return "bg-blue-100 text-blue-900 border-blue-200";
      case "ready":
        return "bg-purple-100 text-purple-900 border-purple-200";
      case "served":
        return "bg-emerald-100 text-emerald-900 border-emerald-200";
      default:
        return "bg-stone-100 text-stone-700 border-stone-200";
    }
  };

  return (
    <div className="p-8 space-y-6">
      <OwnerHeader
        title="Live Dine-In Orders"
        subtitle="Manage kitchen queue and serve tables seamlessly"
        actions={
          <button
            onClick={() => {
              setRefreshing(true);
              fetchOrders();
            }}
            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh Queue</span>
          </button>
        }
      />

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-200">
        {[
          { key: "all", label: "All Orders", count: orders.length },
          { key: "pending", label: "Pending", count: orders.filter((o) => o.status === "pending" || o.status === "placed").length },
          { key: "accepted", label: "Accepted", count: orders.filter((o) => o.status === "accepted").length },
          { key: "preparing", label: "Preparing", count: orders.filter((o) => o.status === "preparing").length },
          { key: "ready", label: "Ready", count: orders.filter((o) => o.status === "ready").length },
          { key: "served", label: "Served", count: orders.filter((o) => o.status === "served").length },
          { key: "cancelled", label: "Cancelled", count: orders.filter((o) => o.status === "cancelled").length },
        ].map((tab) => (

          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeFilter === tab.key
                ? "bg-amber-900 text-white shadow-xs"
                : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200"
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                activeFilter === tab.key ? "bg-amber-800 text-amber-200" : "bg-stone-100 text-stone-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Orders Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-64 bg-stone-200/70 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center text-stone-400">
          <UtensilsCrossed className="w-10 h-10 mx-auto text-stone-300 mb-2" />
          <p className="text-sm font-semibold text-stone-700">No orders in this category</p>
          <p className="text-xs text-stone-400 mt-0.5">Orders placed by customers at tables will appear here</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredOrders.map((order) => (
            <div
              key={order._id}
              className="bg-white rounded-3xl border border-stone-200/90 shadow-sm p-5 flex flex-col justify-between"
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-stone-100 pb-3 mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-950 font-extrabold text-sm flex flex-col items-center justify-center border border-amber-300 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-amber-800 leading-none">
                        Table
                      </span>
                      <span className="text-base font-serif">#{order.tableNumber}</span>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs font-bold text-stone-900">
                          #{order.orderNumber}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-stone-800 mt-0.5">
                        {order.customerName}
                      </p>
                      <p className="text-[10px] text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${getStatusBadge(
                      order.status
                    )}`}
                  >
                    {order.status}
                  </span>
                </div>

                {/* Items List */}
                <div className="space-y-2 py-1 text-xs">
                  {order.items?.map((item, i) => (
                    <div key={i} className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-bold text-stone-900 mr-1.5">{item.quantity}x</span>
                        <span className="text-stone-800">{item.name}</span>
                        {item.notes && (
                          <p className="text-[11px] text-amber-900 bg-amber-50 px-2 py-0.5 rounded-md mt-0.5 italic flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            <span>{item.notes}</span>
                          </p>
                        )}
                      </div>
                      <span className="font-semibold text-stone-700 whitespace-nowrap">
                        ₹{Number((item.price ?? 0) * (item.quantity ?? 1)).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Card Footer with Price & Actions */}
              <div className="pt-4 border-t border-stone-100 mt-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-stone-500">Order Total</span>
                  <span className="text-base font-bold text-stone-900 font-serif">
                    ₹{Number(order.total ?? order.totalAmount ?? 0).toFixed(2)}
                  </span>
                </div>

                {/* Workflow Buttons */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  {(order.status === "pending" || order.status === "placed") && (
                    <button
                      onClick={() => handleStatusChange(order._id, "accepted")}
                      className="col-span-2 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Accept Order</span>
                    </button>
                  )}

                  {order.status === "accepted" && (
                    <button
                      onClick={() => handleStatusChange(order._id, "preparing")}
                      className="col-span-2 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>Start Preparing</span>
                    </button>
                  )}

                  {order.status === "preparing" && (
                    <button
                      onClick={() => handleStatusChange(order._id, "ready")}
                      className="col-span-2 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Mark Ready to Serve</span>
                    </button>
                  )}

                  {order.status === "ready" && (
                    <button
                      onClick={() => handleStatusChange(order._id, "served")}
                      className="col-span-2 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors"
                    >
                      <UtensilsCrossed className="w-3.5 h-3.5" />
                      <span>Mark Order Served</span>
                    </button>
                  )}

                  {order.status !== "served" && order.status !== "cancelled" && (
                    <button
                      onClick={() => {
                        if (confirm("Are you sure you want to cancel this order?")) {
                          handleStatusChange(order._id, "cancelled");
                        }
                      }}
                      className="col-span-2 py-1.5 bg-stone-100 hover:bg-rose-50 text-stone-500 hover:text-rose-600 rounded-xl text-[11px] font-medium transition-colors"
                    >
                      Cancel Order
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveOrders;
