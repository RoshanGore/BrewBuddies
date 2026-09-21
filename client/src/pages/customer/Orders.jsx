import React, { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  ChefHat,
  Bell,
  UtensilsCrossed,
  Receipt,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const Orders = () => {
  const [searchParams] = useSearchParams();
  const orderIdFromUrl = searchParams.get("orderId");
  const { user } = useAuth();

  const [activeOrder, setActiveOrder] = useState(null);
  const [pastOrders, setPastOrders] = useState([]);
  const [phoneLookup, setPhoneLookup] = useState(user?.phone || "");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Status mapping
  const steps = [
    { key: "pending", label: "Pending", icon: Clock },
    { key: "accepted", label: "Accepted", icon: CheckCircle2 },
    { key: "preparing", label: "Preparing", icon: ChefHat },
    { key: "ready", label: "Ready", icon: Bell },
    { key: "served", label: "Served", icon: UtensilsCrossed },
  ];

  const getStepIndex = (status) => {
    switch (status) {
      case "pending":
      case "placed": return 0;
      case "accepted": return 1;
      case "preparing": return 2;
      case "ready": return 3;
      case "served": return 4;
      default: return 0;
    }
  };

  const fetchOrders = async () => {
    try {
      // 1. Fetch single active order if ID is known
      const targetOrderId = orderIdFromUrl || localStorage.getItem("bb_last_order");
      if (targetOrderId) {
        const singleRes = await api.trackOrder(targetOrderId);
        if (singleRes.success && singleRes.order) {
          setActiveOrder(singleRes.order);
        }
      }

      // 2. Fetch order history by phone if available
      const searchPhone = phoneLookup || user?.phone;
      if (searchPhone) {
        const listRes = await api.getMyOrders(searchPhone);
        if (listRes.success) {
          setPastOrders(listRes.orders);
        }
      }
    } catch (err) {
      console.warn("[Orders] Fetch error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    // Auto-poll active order status every 4 seconds
    const interval = setInterval(() => {
      fetchOrders();
    }, 4000);

    return () => clearInterval(interval);
  }, [orderIdFromUrl, phoneLookup]);

  const currentStep = activeOrder ? getStepIndex(activeOrder.status) : 0;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-serif text-stone-900">Your Orders</h1>
          <p className="text-xs text-stone-500">Live dine-in tracking & receipts</p>
        </div>
        <button
          onClick={() => {
            setRefreshing(true);
            fetchOrders();
          }}
          className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Active Dine-in Live Status Tracker */}
      {activeOrder ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-stone-900">
                  #{activeOrder.orderNumber}
                </span>
                <span className="bg-amber-100 text-amber-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300">
                  Table #{activeOrder.tableNumber}
                </span>
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Placed {new Date(activeOrder.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs font-semibold capitalize px-2.5 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                {activeOrder.status}
              </span>
            </div>
          </div>

          {/* Stepper Visual Pipeline */}
          <div className="pt-2">
            <div className="relative flex items-center justify-between">
              {/* Connecting line */}
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-stone-100 -z-0">
                <div
                  className="h-full bg-amber-600 transition-all duration-500"
                  style={{ width: `${(currentStep / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>

              {steps.map((step, idx) => {
                const isPassed = idx <= currentStep;
                const isCurrent = idx === currentStep;
                const StepIcon = step.icon;

                return (
                  <div key={step.key} className="relative z-10 flex flex-col items-center">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-xs ${
                        isCurrent
                          ? "bg-amber-900 text-white ring-4 ring-amber-200 scale-110"
                          : isPassed
                          ? "bg-amber-600 text-white"
                          : "bg-stone-200 text-stone-400"
                      }`}
                    >
                      <StepIcon className="w-3.5 h-3.5" />
                    </div>
                    <span
                      className={`text-[10px] mt-1.5 font-medium ${
                        isCurrent ? "text-amber-900 font-bold" : isPassed ? "text-stone-700" : "text-stone-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Status Message Box */}
          <div className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 text-xs text-amber-950">
            {(activeOrder.status === "pending" || activeOrder.status === "placed") && "☕ Order placed! Waiting for cafe staff to accept."}
            {activeOrder.status === "accepted" && "✅ Order accepted! Sending to the barista & kitchen."}
            {activeOrder.status === "preparing" && "🔥 Barista is crafting your order right now!"}
            {activeOrder.status === "ready" && "🎉 Your order is ready! Staff is bringing it to Table #" + activeOrder.tableNumber}
            {activeOrder.status === "served" && "✨ Enjoy your meal & coffee! Thank you for dining with BrewBuddies."}
            {activeOrder.status === "cancelled" && "❌ This order has been cancelled by staff."}
          </div>

          {/* Items Preview */}
          <div className="divide-y divide-stone-100 text-xs">
            {activeOrder.items?.map((item, i) => (
              <div key={i} className="py-2 flex justify-between">
                <span>
                  <strong className="text-stone-900">{item.quantity}x</strong> {item.name}
                  {item.notes && <span className="text-stone-400 italic ml-1">({item.notes})</span>}
                </span>
                <span className="font-semibold text-stone-800">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
            <div className="pt-2 flex justify-between font-bold text-stone-900">
              <span>Total Paid / Due</span>
              <span className="text-amber-900 font-serif">₹{Number(activeOrder.total ?? activeOrder.totalAmount ?? 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      ) : null}

      {/* Phone lookup for past orders */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs">
        <label className="block text-xs font-bold text-stone-700 mb-2">
          Lookup Receipts by Phone Number
        </label>
        <div className="flex gap-2">
          <input
            type="tel"
            placeholder="Enter phone number..."
            value={phoneLookup}
            onChange={(e) => setPhoneLookup(e.target.value)}
            className="flex-1 text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          <button
            onClick={fetchOrders}
            className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold flex items-center gap-1"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search</span>
          </button>
        </div>
      </div>

      {/* Past Orders List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold font-serif text-stone-900">Order History</h3>

        {loading ? (
          <div className="space-y-2">
            {[1, 2].map((n) => (
              <div key={n} className="h-20 bg-stone-200/70 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : pastOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-stone-200 p-6 text-center text-xs text-stone-500">
            <Receipt className="w-6 h-6 text-stone-300 mx-auto mb-1.5" />
            No previous orders found for this phone number.
          </div>
        ) : (
          pastOrders.map((order) => (
            <div
              key={order._id}
              onClick={() => setActiveOrder(order)}
              className="bg-white rounded-2xl border border-stone-200 p-3.5 hover:border-amber-300 transition-colors cursor-pointer flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-stone-900">
                    #{order.orderNumber}
                  </span>
                  <span className="text-[10px] bg-stone-100 text-stone-600 px-2 py-0.5 rounded-md font-medium">
                    Table #{order.tableNumber}
                  </span>
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  {order.items?.length || 0} items • {new Date(order.createdAt).toLocaleDateString()}
                </p>
              </div>

              <div className="text-right">
                <span className="text-xs font-bold text-amber-900 font-serif block">
                  ₹{Number(order.total ?? order.totalAmount ?? 0).toFixed(2)}
                </span>
                <span className="text-[10px] uppercase font-bold text-stone-500 capitalize">
                  {order.status}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Orders;
