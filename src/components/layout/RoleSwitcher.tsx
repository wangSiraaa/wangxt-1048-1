import React from "react";
import { UserRole, UserRoleLabel } from "@/types/enums";
import { useAuthStore } from "@/store/useAuthStore";
import { Settings, Users } from "lucide-react";

const roleIcons: Record<UserRole, string> = {
  [UserRole.OPERATION]: "🏢",
  [UserRole.MERCHANT]: "🛒",
  [UserRole.ELECTRICIAN]: "⚡",
  [UserRole.INSPECTOR]: "🛡️",
};

export default function RoleSwitcher() {
  const { currentRole = UserRole.OPERATION, currentUserName = "系统用户", setRole } = useAuthStore();

  return (
    <div className="flex items-center gap-4">
      <div className="hidden md:flex items-center gap-2 text-sm text-industrial-500">
        <Users size={16} />
        <span>切换角色模拟：</span>
      </div>
      <div className="flex items-center bg-white rounded-lg border border-industrial-200 p-1 shadow-sm">
        {(Object.keys(UserRoleLabel) as UserRole[]).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              currentRole === r
                ? "bg-industrial-700 text-white shadow"
                : "text-industrial-600 hover:bg-industrial-50"
            }`}
            title={UserRoleLabel[r]}
          >
            <span className="text-sm">{roleIcons[r]}</span>
            <span className="hidden sm:inline">{UserRoleLabel[r]}</span>
          </button>
        ))}
      </div>
      <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-industrial-50 rounded-lg border border-industrial-100">
        <Settings size={14} className="text-industrial-500" />
        <span className="text-sm text-industrial-700 font-medium">{currentUserName}</span>
      </div>
    </div>
  );
}
