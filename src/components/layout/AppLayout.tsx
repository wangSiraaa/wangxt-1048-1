import React from "react";
import { Outlet } from "react-router-dom";
import Header from "./Header";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-emerald-50/40 via-white to-amber-50/30">
      <Header />
      <div className="flex-1 container mx-auto px-4 py-6 flex gap-6 pb-24 lg:pb-6">
        <Sidebar />
        <main className="flex-1 min-w-0 space-y-6 animate-fade-in-up">
          <Outlet />
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
