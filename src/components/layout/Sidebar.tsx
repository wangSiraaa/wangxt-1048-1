import React from "react";
import { NavLink } from "react-router-dom";
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

const navItems: NavItem[] = [
  {
    to: "/",
    label: "配电总览",
    icon: <LayoutDashboard size={18} />,
    roles: [UserRole.OPERATION, UserRole.MERCHANT, UserRole.ELECTRICIAN, UserRole.INSPECTOR],
  },
  {
    to: "/operation",
    label: "运营工作台",
    icon: <ClipboardList size={18} />,
    roles: [UserRole.OPERATION],
  },
  {
    to: "/merchant",
    label: "商户用电申请",
    icon: <ShoppingBag size={18} />,
    roles: [UserRole.MERCHANT, UserRole.OPERATION],
  },
  {
    to: "/electrician",
    label: "电工接电台",
    icon: <PlugZap size={18} />,
    roles: [UserRole.ELECTRICIAN, UserRole.OPERATION],
  },
  {
    to: "/inspection",
    label: "安全巡检台",
    icon: <ShieldCheck size={18} />,
    roles: [UserRole.INSPECTOR, UserRole.OPERATION],
  },
  {
    to: "/capacity",
    label: "容量监控中心",
    icon: <Gauge size={18} />,
    roles: [UserRole.OPERATION, UserRole.ELECTRICIAN, UserRole.INSPECTOR],
  },
];

export default function Sidebar() {
  const { currentRole = UserRole.OPERATION } = useAuthStore();
  const visible = navItems.filter((item) => item.roles.includes(currentRole));

  return (
    <aside className="w-60 shrink-0 hidden lg:block">
      <div className="sticky top-[72px] p-4 space-y-1">
        <div className="px-2 pb-2 mb-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-industrial-400">
            工作导航
          </p>
        </div>
        {visible.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) =>
              isActive ? "nav-item-active" : "nav-item-inactive"
            }
          >
            {item.icon}
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}
        <div className="divider" />
        <div className="px-2 py-3 rounded-lg bg-industrial-50 border border-industrial-100">
          <p className="text-[11px] font-semibold text-industrial-500 mb-1">
            ⚠️ 容量使用提醒
          </p>
          <p className="text-xs text-industrial-600 leading-relaxed">
            申请用电前请确认剩余容量，超载将触发安全预警并可能被巡检暂停。
          </p>
        </div>
      </div>
    </aside>
  );
}
