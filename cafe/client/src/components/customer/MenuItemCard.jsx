import React, { useState } from "react";
import { Plus, Minus, Clock, Sparkles, Check, MessageSquare } from "lucide-react";
import { useCart } from "../../context/CartContext";

const MenuItemCard = ({ product }) => {
  const { cart, addItem, updateQuantity } = useCart();
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [notes, setNotes] = useState("");

  // Check if this product is already in cart
  const cartItems = cart.filter((item) => item.product._id === product._id);
  const totalQuantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const handleQuickAdd = () => {
    addItem(product, 1, "");
  };

  const handleCustomAdd = (e) => {
    e.preventDefault();
    addItem(product, 1, notes);
    setNotes("");
    setShowNotesModal(false);
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200/70 p-3.5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
      <div>
        {/* Image & Badges */}
        <div className="relative aspect-[4/3] w-full rounded-xl overflow-hidden bg-stone-100 mb-3">
          <img
            src={product.image || "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=600&q=80"}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Tags */}
          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
            {product.isVegetarian && (
              <span className="bg-emerald-500/90 backdrop-blur-sm text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                Veg
              </span>
            )}
            {product.tags && product.tags[0] && (
              <span className="bg-amber-500/90 backdrop-blur-sm text-stone-950 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow-sm">
                <Sparkles className="w-2.5 h-2.5" />
                {product.tags[0]}
              </span>
            )}
          </div>

          {!product.isAvailable && (
            <div className="absolute inset-0 bg-stone-900/70 backdrop-blur-[2px] flex items-center justify-center">
              <span className="bg-rose-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                Sold Out
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-semibold text-stone-900 text-sm leading-snug line-clamp-1">
            {product.name}
          </h3>
          <span className="text-sm font-bold text-amber-900 whitespace-nowrap">
            ₹{product.price.toFixed(2)}
          </span>
        </div>

        <p className="text-stone-500 text-xs line-clamp-2 leading-relaxed mb-3">
          {product.description || "Crafted fresh with premium ingredients."}
        </p>
      </div>

      {/* Footer / Add Action */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
        <div className="flex items-center gap-1 text-[11px] text-stone-400">
          <Clock className="w-3 h-3" />
          <span>{product.preparationTimeMinutes || 5} min</span>
        </div>

        {product.isAvailable ? (
          totalQuantity > 0 ? (
            <div className="flex items-center gap-1.5 bg-amber-50 rounded-xl p-1 border border-amber-200">
              <button
                onClick={() => {
                  const itemIndex = cart.findIndex((i) => i.product._id === product._id);
                  if (itemIndex > -1) updateQuantity(itemIndex, -1);
                }}
                className="w-7 h-7 rounded-lg bg-white text-stone-700 hover:bg-amber-100 flex items-center justify-center font-bold text-xs shadow-xs"
                aria-label="Decrease quantity"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="w-5 text-center font-bold text-xs text-amber-900">
                {totalQuantity}
              </span>
              <button
                onClick={() => handleQuickAdd()}
                className="w-7 h-7 rounded-lg bg-amber-600 text-white hover:bg-amber-700 flex items-center justify-center font-bold text-xs shadow-xs"
                aria-label="Increase quantity"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNotesModal(true)}
                title="Add special instructions"
                className="p-2 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleQuickAdd}
                className="px-3.5 py-1.5 rounded-xl bg-amber-900 hover:bg-amber-800 text-white font-medium text-xs flex items-center gap-1 shadow-sm transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          )
        ) : (
          <span className="text-[11px] text-stone-400 font-medium italic">Unavailable</span>
        )}
      </div>

      {/* Special Instruction Modal */}
      {showNotesModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl animate-in fade-in zoom-in-95">
            <h4 className="text-base font-bold text-stone-900 mb-1">Customize Item</h4>
            <p className="text-xs text-stone-500 mb-3">{product.name} (₹{product.price.toFixed(2)})</p>

            <form onSubmit={handleCustomAdd}>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Special Instructions / Preferences
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Oat milk, extra hot, less sugar, no ice..."
                rows={3}
                className="w-full text-xs p-2.5 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-amber-500 mb-4 resize-none"
                autoFocus
              ></textarea>

              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowNotesModal(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-stone-600 hover:bg-stone-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-amber-900 hover:bg-amber-800 text-white"
                >
                  Add to Cart
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuItemCard;
