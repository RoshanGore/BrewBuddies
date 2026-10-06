import React, { useState } from "react";
import { QrCode, Edit2, CheckCircle2, AlertCircle } from "lucide-react";
import { useTable } from "../../context/TableContext";

const TableBanner = () => {
  const { tableNumber, setTableNumber, cafe, tableError } = useTable();
  const [isEditing, setIsEditing] = useState(false);
  const [tempNum, setTempNum] = useState(tableNumber || 1);

  const handleSave = (e) => {
    e.preventDefault();
    if (tempNum > 0) {
      setTableNumber(tempNum);
      setIsEditing(false);
    }
  };

  return (
    <div className="space-y-2 mb-5">
      {tableError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{tableError}</span>
        </div>
      )}
      <div className="bg-gradient-to-r from-stone-900 via-amber-950 to-stone-900 text-stone-100 rounded-2xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                  {cafe?.name || "BrewBuddies Cafe"} • Dine-In
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              </div>
              <p className="text-lg font-bold text-white leading-tight">
                {tableNumber ? `Table #${tableNumber}` : "No Table Selected"}
              </p>
            </div>
          </div>

        <div>
          {isEditing ? (
            <form onSubmit={handleSave} className="flex items-center gap-1.5">
              <input
                type="number"
                min="1"
                max="50"
                value={tempNum}
                onChange={(e) => setTempNum(e.target.value)}
                className="w-16 px-2 py-1 text-sm bg-stone-800 text-white rounded border border-amber-500/50 focus:outline-none"
                autoFocus
              />
              <button
                type="submit"
                className="p-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded font-medium text-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => {
                setTempNum(tableNumber || 1);
                setIsEditing(true);
              }}
              className="text-xs flex items-center gap-1 bg-white/10 hover:bg-white/20 text-stone-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Edit2 className="w-3 h-3 text-amber-300" />
              <span>Change</span>
            </button>
          )}
        </div>
      </div>
    </div>
  </div>
);
};

export default TableBanner;
