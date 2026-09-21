import React from "react";

const StatCard = ({ title, value, subtext, icon: Icon, color = "amber" }) => {
  const colorMap = {
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    emerald: "bg-emerald-100 text-emerald-900 border-emerald-200",
    blue: "bg-blue-100 text-blue-900 border-blue-200",
    rose: "bg-rose-100 text-rose-900 border-rose-200",
  };

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs flex items-center justify-between">
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-stone-900 mt-1 font-serif">{value}</h3>
        {subtext && <p className="text-xs text-stone-400 mt-0.5">{subtext}</p>}
      </div>

      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
};

export default StatCard;
