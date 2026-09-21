import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Coffee, ShoppingBag, QrCode, Sparkles } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useTable } from "../../context/TableContext";

const Navbar = () => {
  const { totalItemsCount } = useCart();
  const { tableNumber } = useTable();
  const location = useLocation();

  return (
    <header className="sticky top-0 z-40 bg-[#faf8f5]/95 backdrop-blur border-b border-stone-200/80 px-4 py-3">
      <div className="max-w-5xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-2xl bg-amber-900 text-amber-100 flex items-center justify-center shadow-md shadow-amber-900/10 group-hover:scale-105 transition-transform">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xl font-bold font-serif tracking-tight text-stone-900 block leading-none">
              BrewBuddies
            </span>
            <span className="text-[11px] font-medium tracking-wide uppercase text-amber-800">
              Dine-In & Loyalty
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1 bg-stone-100/80 p-1 rounded-2xl border border-stone-200">
          <Link
            to="/"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === "/" ? "bg-white text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Home
          </Link>
          <Link
            to="/menu"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === "/menu" ? "bg-white text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Menu
          </Link>
          <Link
            to="/orders"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === "/orders" ? "bg-white text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Orders
          </Link>
          <Link
            to="/rewards"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === "/rewards" ? "bg-white text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Rewards
          </Link>
          <Link
            to="/offers"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === "/offers" ? "bg-white text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Offers
          </Link>
          <Link
            to="/profile"
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              location.pathname === "/profile" ? "bg-white text-stone-950 shadow-xs" : "text-stone-600 hover:text-stone-900"
            }`}
          >
            Profile
          </Link>
        </nav>

        {/* Table Badge & Cart / Owner Link */}
        <div className="flex items-center gap-2.5">
          {tableNumber ? (
            <div className="flex items-center gap-1.5 bg-amber-100/80 text-amber-900 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-300/60 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Table #{tableNumber}</span>
            </div>
          ) : (
            <Link
              to="/?select-table=true"
              className="flex items-center gap-1 text-xs font-medium text-stone-600 hover:text-amber-800 bg-stone-100 hover:bg-stone-200 px-3 py-1.5 rounded-full transition-colors"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-700" />
              <span>Select Table</span>
            </Link>
          )}

          <Link
            to="/cart"
            className="relative p-2 rounded-full bg-stone-100 hover:bg-amber-100/60 text-stone-800 hover:text-amber-900 transition-colors"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalItemsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">
                {totalItemsCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
