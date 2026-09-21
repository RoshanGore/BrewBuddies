import React from "react";
import { NavLink } from "react-router-dom";
import { Home, Utensils, ShoppingBag, Receipt, Gift, Tag, User } from "lucide-react";
import { useCart } from "../../context/CartContext";

const BottomNav = () => {
  const { totalItemsCount } = useCart();

  const navItems = [
    { label: "Home", to: "/", icon: Home, exact: true },
    { label: "Menu", to: "/menu", icon: Utensils },
    { label: "Cart", to: "/cart", icon: ShoppingBag, badge: totalItemsCount },
    { label: "Orders", to: "/orders", icon: Receipt },
    { label: "Rewards", to: "/rewards", icon: Gift },
    { label: "Offers", to: "/offers", icon: Tag },
    { label: "Profile", to: "/profile", icon: User },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-stone-200/90 py-1.5 px-2 shadow-lg">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.label}
              to={item.to}
              end={item.exact}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all ${
                  isActive
                    ? "text-amber-900 font-semibold scale-105"
                    : "text-stone-500 hover:text-stone-800"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative">
                    <Icon
                      className={`w-5 h-5 ${
                        isActive ? "text-amber-800 stroke-[2.5]" : "stroke-[1.8]"
                      }`}
                    />
                    {item.badge > 0 && (
                      <span className="absolute -top-1.5 -right-2 bg-amber-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
