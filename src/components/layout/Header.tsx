import React from "react";
import { Zap, LayoutDashboard } from "lucide-react";
import RoleSwitcher from "./RoleSwitcher";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-industrial-100 shadow-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-industrial-600 to-industrial-800 flex items-center justify-center shadow-panel">
            <Zap className="text-white" size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold text-industrial-800 leading-tight tracking-wide">
              露天市集摊位用电管理
            </h1>
            <p className="text-[11px] text-industrial-500 leading-tight mt-0.5">
              Open Market Power Distribution System
            </p>
          </div>
        </div>
        <RoleSwitcher />
      </div>
    </header>
  );
}
