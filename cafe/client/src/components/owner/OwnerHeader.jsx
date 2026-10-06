import React from "react";
import { Coffee, ShieldCheck } from "lucide-react";

const OwnerHeader = ({ title, subtitle, actions }) => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="bg-white border-b border-stone-200/80 px-8 py-4 sticky top-0 z-30 flex items-center justify-between">
      <div>
        <h1 className="text-xl font-bold font-serif text-stone-900 leading-tight">
          {title}
        </h1>
        <p className="text-xs text-stone-500 mt-0.5">{subtitle || today}</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 px-3 py-1 rounded-full text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Cafe System Live</span>
        </div>
        {actions}
      </div>
    </header>
  );
};

export default OwnerHeader;
