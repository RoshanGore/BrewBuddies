import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Tag, Sparkles, Copy, Check, ArrowRight, Calendar, AlertCircle } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useTable } from "../../context/TableContext";
import api from "../../services/api";

const Offers = () => {
  const navigate = useNavigate();
  const { applyOffer, subtotal } = useCart();
  const { cafe } = useTable();

  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoading(true);
        const res = await api.getOffers();
        if (res.success && Array.isArray(res.offers)) {
          // Filter out any offers whose end date is past
          const now = new Date();
          const validOffers = res.offers.filter((offer) => {
            if (!offer.isActive) return false;
            if (offer.endDate && new Date(offer.endDate) < now) return false;
            return true;
          });
          setOffers(validOffers);
        }
      } catch (err) {
        console.warn("[Offers] Load error:", err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchOffers();
  }, []);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  const handleApplyOffer = (offer) => {
    let calculatedDiscount = 0;
    const currentSubtotal = Number(subtotal) || 0;

    if (offer.discountType === "percentage") {
      calculatedDiscount = (currentSubtotal * offer.discountValue) / 100;
      if (offer.maxDiscount) calculatedDiscount = Math.min(calculatedDiscount, offer.maxDiscount);
    } else {
      calculatedDiscount = offer.discountValue;
    }

    applyOffer({
      code: offer.code,
      title: offer.title,
      discountAmount: calculatedDiscount,
    });

    setAppliedCode(offer.code);
    setTimeout(() => {
      navigate("/cart");
    }, 600);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold font-serif text-stone-900">Cafe Offers & Promos</h1>
        <p className="text-xs text-stone-500">
          Exclusive handcrafted specials and dine-in coupon codes
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-36 bg-stone-200/70 rounded-3xl animate-pulse"></div>
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="bg-white rounded-3xl border border-stone-200 p-10 text-center text-xs text-stone-500 space-y-2">
          <Tag className="w-8 h-8 text-stone-300 mx-auto" />
          <p className="font-bold text-stone-700">No active offers right now</p>
          <p className="text-[11px] text-stone-400">
            Check back soon for upcoming weekend specials and holiday promo codes!
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {offers.map((offer) => {
            const endDateStr = offer.endDate
              ? new Date(offer.endDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })
              : null;

            return (
              <div
                key={offer._id}
                className="relative overflow-hidden bg-white rounded-3xl border border-amber-200/90 p-5 shadow-xs flex flex-col justify-between"
              >
                {/* Header: Discount Badge and Promo Code */}
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2.5 py-0.5 rounded-full mb-1.5 border border-amber-300">
                      <Sparkles className="w-2.5 h-2.5 text-amber-700" />
                      {offer.discountType === "percentage"
                        ? `${offer.discountValue}% OFF`
                        : `₹${offer.discountValue} FLAT OFF`}
                    </span>
                    <h3 className="text-sm font-bold text-stone-900">{offer.title}</h3>
                    <p className="text-xs text-stone-500 mt-0.5">
                      {offer.description || "Limited time dine-in coupon."}
                    </p>
                  </div>

                  {/* Promo Code with Copy */}
                  <button
                    onClick={() => handleCopyCode(offer.code)}
                    title="Click to copy promo code"
                    className="group shrink-0 font-mono text-xs font-extrabold px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 border-2 border-dashed border-amber-300 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <span>{offer.code}</span>
                    {copiedCode === offer.code ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-amber-700 opacity-60 group-hover:opacity-100" />
                    )}
                  </button>
                </div>

                {/* Validity and Min Spend */}
                <div className="pt-3 border-t border-stone-100 flex items-center justify-between mt-2 text-[11px]">
                  <div className="space-y-0.5">
                    {endDateStr ? (
                      <span className="text-stone-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-amber-700" />
                        <span>Valid until {endDateStr}</span>
                      </span>
                    ) : (
                      <span className="text-stone-500">Ongoing Offer</span>
                    )}

                    {offer.minOrderAmount > 0 && (
                      <p className="text-[10px] text-stone-400">
                        Min spend: ₹{offer.minOrderAmount}
                      </p>
                    )}
                  </div>

                  {/* Apply / Go to Checkout */}
                  <button
                    onClick={() => handleApplyOffer(offer)}
                    className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-semibold text-xs flex items-center gap-1 shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    {appliedCode === offer.code ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Applied!</span>
                      </>
                    ) : (
                      <>
                        <span>Apply to Cart</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Offers;
