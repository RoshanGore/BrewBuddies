import React from "react";
import { Outlet } from "react-router-dom";
import Navbar from "../components/common/Navbar";
import BottomNav from "../components/common/BottomNav";

const CustomerLayout = () => {
  return (
    <div className="min-h-screen bg-[#faf8f5] text-stone-800 flex flex-col justify-between">
      <Navbar />
      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-4 pb-28">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};

export default CustomerLayout;
