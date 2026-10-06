import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, Plus, Minus, Tag, Check, Sparkles, AlertCircle, ShoppingBag, ArrowRight } from "lucide-react";
import confetti from "canvas-confetti";
import { useCart } from "../../context/CartContext";
import { useTable } from "../../context/TableContext";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";

const Cart = () => {
  const navigate = useNavigate();
  const {
    cart,
    updateQuantity,
    removeItem,
    clearCart,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount,
    appliedOffer,
    applyOffer,
    removeOffer,
    appliedReward,
    removeReward,
  } = useCart();

  const { tableNumber, setTableNumber, tableToken, tableId, cafe } = useTable();
  const { user, setCustomerSession } = useAuth();

  const [customerName, setCustomerName] = useState(user?.name || "");
  const [customerPhone, setCustomerPhone] = useState(user?.phone || "");
  const [promoCode, setPromoCode] = useState("");
  const [promoError, setPromoError] = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState("");

  const handleApplyPromo = async (e) => {
    e.preventDefault();
    setPromoError("");
    setPromoSuccess("");

    if (!promoCode.trim()) return;

    try {
      const res = await api.validateOffer({
        code: promoCode,
        subtotal,
        cafeId: cafe?.id || cafe?._id,
      });

      if (res.success) {
        applyOffer({
          code: res.code,
          title: res.title,
          discountAmount: res.discountAmount,
        });
        setPromoSuccess(res.message);
        setPromoCode("");
      }
    } catch (err) {
      setPromoError(err.message);
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setOrderError("");

    if (!tableNumber) {
      setOrderError("Please specify your table number.");
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setOrderError("Please provide your name and phone number for dine-in loyalty.");
      return;
    }

    if (cart.length === 0) {
      setOrderError("Your cart is empty.");
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        tableNumber: Number(tableNumber),
        tableToken: tableToken || undefined,
        tableId: tableId || undefined,
        items: cart.map((item) => ({
          productId: item.product._id,
          product: item.product._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || "",
        })),
        appliedOffer: appliedOffer
          ? { code: appliedOffer.code, discount: discountAmount }
          : null,
        appliedReward: appliedReward
          ? {
              title: appliedReward.title,
              pointsRedeemed: appliedReward.pointsCost,
              discount: discountAmount,
            }
          : null,
        discountAmount,
      };

      const res = await api.createOrder(orderPayload);

      if (res.success && res.order) {
        // Trigger celebration confetti
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 },
          });
        } catch (e) {}

        // Save customer session in auth context
        if (res.order.customer) {
          setCustomerSession(localStorage.getItem("bb_token") || "", {
            id: res.order.customer,
            name: customerName,
            phone: customerPhone,
            loyaltyPoints: res.loyalty?.totalPoints || 0,
            role: "customer",
          });
        }

        // Save last active order id
        localStorage.setItem("bb_last_order", res.order._id);
        clearCart();
        navigate(`/orders?orderId=${res.order._id}`);
      }
    } catch (err) {
      setOrderError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-stone-200 p-8 text-center my-8 shadow-xs">
        <div className="w-16 h-16 bg-amber-50 text-amber-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold font-serif text-stone-900">Your Cart is Empty</h2>
        <p className="text-xs text-stone-500 mt-1 max-w-xs mx-auto">
          Explore our coffee menu, fresh morning pastries, and hot artisan bites!
        </p>
        <Link
          to="/menu"
          className="inline-flex items-center gap-2 mt-5 px-6 py-2.5 rounded-2xl bg-amber-900 hover:bg-amber-800 text-white font-semibold text-xs transition-transform active:scale-95 shadow-sm"
        >
          <span>Browse Menu</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Dine-in Cart</h1>
        <p className="text-xs text-stone-500">Confirm items and table number</p>
      </div>

      {/* Table Confirmation Bar */}
      <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <div>
            <span className="text-[11px] text-amber-800 uppercase tracking-wider font-semibold block leading-none">
              Serving Location
            </span>
            <span className="text-sm font-bold text-stone-900">
              {tableNumber ? `Dine-in at Table #${tableNumber}` : "No Table Selected"}
            </span>
          </div>
        </div>

        <button
          onClick={() => {
            const next = prompt("Enter your table number (1 - 50):", tableNumber || "1");
            if (next && !isNaN(next) && next > 0) setTableNumber(next);
          }}
          className="text-xs font-semibold text-amber-900 underline hover:text-amber-700"
        >
          Change Table
        </button>
      </div>

      {/* Cart Items List */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 divide-y divide-stone-100 shadow-xs">
        {cart.map((item, idx) => (
          <div key={idx} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h4 className="text-xs font-bold text-stone-900 truncate">{item.name}</h4>
              <p className="text-xs font-bold text-amber-900 mt-0.5">
                ₹{(item.price * item.quantity).toFixed(2)}
                <span className="text-[10px] text-stone-400 font-normal ml-1.5">
                  (₹{item.price.toFixed(2)} each)
                </span>
              </p>
              {item.notes && (
                <p className="text-[11px] text-amber-800/80 bg-amber-50 px-2 py-0.5 rounded-md mt-1 italic inline-block">
                  Note: {item.notes}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200/70">
                <button
                  onClick={() => updateQuantity(idx, -1)}
                  className="w-6 h-6 rounded-lg bg-white text-stone-700 flex items-center justify-center text-xs shadow-xs"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="w-6 text-center font-bold text-xs text-stone-900">
                  {item.quantity}
                </span>
                <button
                  onClick={() => updateQuantity(idx, 1)}
                  className="w-6 h-6 rounded-lg bg-white text-stone-700 flex items-center justify-center text-xs shadow-xs"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={() => removeItem(idx)}
                className="p-1.5 text-stone-400 hover:text-rose-600 transition-colors"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Promo Code Input */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs">
        <label className="block text-xs font-bold text-stone-700 mb-2 flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-amber-700" />
          <span>Apply Promo Offer</span>
        </label>

        {appliedOffer ? (
          <div className="flex items-center justify-between bg-amber-50 border border-amber-200 p-2.5 rounded-2xl text-xs">
            <div>
              <span className="font-bold text-amber-900 font-mono">{appliedOffer.code}</span>
              <p className="text-[11px] text-amber-800">
                Saved ₹{discountAmount.toFixed(2)} with coupon!
              </p>
            </div>
            <button
              onClick={removeOffer}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : appliedReward ? (
          <div className="flex items-center justify-between bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl text-xs">
            <div>
              <span className="font-bold text-emerald-900">{appliedReward.title}</span>
              <p className="text-[11px] text-emerald-700">
                Redeemed {appliedReward.pointsCost} loyalty points
              </p>
            </div>
            <button
              onClick={removeReward}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              Remove
            </button>
          </div>
        ) : (
          <form onSubmit={handleApplyPromo} className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. BREWFIRST"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              className="flex-1 uppercase font-mono text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold"
            >
              Apply
            </button>
          </form>
        )}

        {promoError && (
          <p className="text-xs text-rose-600 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{promoError}</span>
          </p>
        )}
        {promoSuccess && (
          <p className="text-xs text-emerald-700 mt-2 flex items-center gap-1">
            <Check className="w-3.5 h-3.5" />
            <span>{promoSuccess}</span>
          </p>
        )}
      </div>

      {/* Customer Contact for Dine-in Loyalty */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div>
          <h3 className="text-xs font-bold text-stone-800 uppercase tracking-wider">
            Diner Information & Loyalty
          </h3>
          <p className="text-[11px] text-stone-500">
            Points will automatically credit to this phone number
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Your Name</label>
            <input
              type="text"
              placeholder="e.g. Alex"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-stone-600 mb-1">Phone Number</label>
            <input
              type="tel"
              placeholder="e.g. 9876543210"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
              required
            />
          </div>
        </div>
      </div>

      {/* Price Summary */}
      <div className="bg-white rounded-3xl border border-stone-200 p-4 shadow-xs space-y-2 text-xs">
        <div className="flex justify-between text-stone-600">
          <span>Subtotal</span>
          <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-emerald-700 font-medium">
            <span>Discount</span>
            <span>-₹{discountAmount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-stone-600">
          <span>Dine-In Tax (5%)</span>
          <span className="font-semibold">₹{taxAmount.toFixed(2)}</span>
        </div>
        <div className="pt-2 border-t border-stone-100 flex justify-between text-base font-bold text-stone-900 font-serif">
          <span>Total</span>
          <span className="text-amber-900">₹{totalAmount.toFixed(2)}</span>
        </div>

        <div className="pt-1 text-[11px] text-amber-800 bg-amber-50/70 p-2 rounded-xl flex items-center justify-between">
          <span className="flex items-center gap-1 font-medium">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>You will earn:</span>
          </span>
          <span className="font-bold">{Math.floor(totalAmount * 10)} Loyalty Points</span>
        </div>
      </div>

      {orderError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{orderError}</span>
        </div>
      )}

      {/* Checkout Button */}
      <button
        onClick={handlePlaceOrder}
        disabled={submitting}
        className="w-full py-3.5 px-4 bg-amber-900 hover:bg-amber-800 disabled:bg-stone-400 text-white rounded-2xl font-bold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <span>Sending order to kitchen...</span>
        ) : (
          <>
            <span>Place Dine-in Order (₹{totalAmount.toFixed(2)})</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </div>
  );
};

export default Cart;
