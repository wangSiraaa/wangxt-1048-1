import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  PlugZap,
  ShieldCheck,
  Gauge,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { UserRole } from "@/types/enums";

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
}

const items: NavItem[] = [
  { to: "/", label: "总览", icon: <LayoutDashboard size={20} />, roles: Object.values(UserRole) },
  { to: "/operation", label: "运营", icon: <ClipboardList size={20} />, roles: [UserRole.OPERATION] },
  { to: "/merchant", label: "申请", icon: <ShoppingBag size={20} />, roles: [UserRole.MERCHANT, UserRole.OPERATION] },
  { to: "/electrician", label: "接电", icon: <PlugZap size={20} />, roles: [UserRole.ELECTRICIAN, UserRole.OPERATION] },
  { to: "/inspection", label: "巡检", icon: <ShieldCheck size={20} />, roles: [UserRole.INSPECTOR, UserRole.OPERATION] },
  { to: "/capacity", label: "监控", icon: <Gauge size={20} />, roles: [UserRole.OPERATION, UserRole.ELECTRICIAN, UserRole.INSPECTOR] },
];

export default function MobileNav() {
  const { currentRole = UserRole.OPERATION } = useAuthStore();
  const loc = useLocation();
  const visible = items.filter((i) => i.roles.includes(currentRole)).slice(0, 5);

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-industrial-100 safe-area-pb">
      <div className="flex justify-around items-center h-16 px-2">
        {visible.map((item) => {
          const active = item.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(item.to);
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${
                active ? "text-industrial-700" : "text-industrial-400 hover:text-industrial-600"
              }`}
            >
              <div className={`${active ? "text-industrial-700" : ""}`}>{item.icon}</div>
              <span className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}>
                {item.label}
              </span>
              {active && (
                <span className="absolute top-0 h-0.5 w-8 rounded-b bg-industrial-700" />
              )}
            </NavLink>
          );
        })}
      </div>
    </div>
  );
}
