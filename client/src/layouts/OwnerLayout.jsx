import React from "react";
import { Outlet, Navigate } from "react-router-dom";
import OwnerSidebar from "../components/owner/OwnerSidebar";
import { useAuth } from "../context/AuthContext";

const OwnerLayout = () => {
  const { user, isStaffOrOwner, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-amber-500">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs font-semibold uppercase tracking-wider text-stone-400">Loading Cafe Hub...</span>
        </div>
      </div>
    );
  }

  if (!user || !isStaffOrOwner) {
    return <Navigate to="/owner/login" replace />;
  }


  return (
    <div className="flex min-h-screen bg-[#f8f6f2] text-stone-800">
      <OwnerSidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

export default OwnerLayout;
