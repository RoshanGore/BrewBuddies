import React from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BellRing,
  Users,
  Coffee,
  Gift,
  Tag,
  BarChart3,
  QrCode,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const OwnerSidebar = () => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { label: "Dashboard", to: "/owner/dashboard", icon: LayoutDashboard },
    { label: "Orders", to: "/owner/orders", icon: BellRing },
    { label: "Products", to: "/owner/products", icon: Coffee },
    { label: "Customers", to: "/owner/customers", icon: Users },
    { label: "Rewards", to: "/owner/rewards", icon: Gift },
    { label: "Offers", to: "/owner/offers", icon: Tag },
    { label: "QR Codes", to: "/owner/qr-codes", icon: QrCode },
    { label: "Analytics", to: "/owner/analytics", icon: BarChart3 },
    { label: "Settings", to: "/owner/settings", icon: Settings, ownerOnly: true },
  ];


  const handleLogout = () => {
    logout();
    navigate("/owner/login");
  };

  return (
    <aside className="w-64 bg-stone-900 text-stone-300 flex flex-col justify-between shrink-0 h-screen sticky top-0 border-r border-stone-800">
      <div>
        {/* Brand */}
        <div className="p-5 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-stone-950 flex items-center justify-center font-bold shadow-md shadow-amber-500/20">
              <Coffee className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-serif text-white tracking-tight leading-none">
                BrewBuddies
              </h2>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-400">
                Staff & Owner Hub
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="p-3 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-amber-500 text-stone-950 shadow-sm"
                      : "text-stone-400 hover:text-white hover:bg-stone-800/70"
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* User profile & Customer View Switch */}
      <div className="p-4 border-t border-stone-800 space-y-2">
        <Link
          to="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-300 text-xs font-medium transition-colors"
        >
          <span className="flex items-center gap-2">
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Open Customer App</span>
          </span>
          <span className="text-[10px] bg-stone-700 px-1.5 py-0.5 rounded text-stone-400">Preview</span>
        </Link>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-stone-800 border border-stone-700 flex items-center justify-center text-amber-400 font-bold text-xs">
              {user?.name ? user.name[0].toUpperCase() : "O"}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-white truncate leading-none">
                {user?.name || "Owner"}
              </p>
              <span className="text-[10px] text-stone-500 capitalize">{user?.role || "Staff"}</span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Logout"
            className="p-1.5 rounded-lg text-stone-400 hover:text-rose-400 hover:bg-stone-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default OwnerSidebar;
