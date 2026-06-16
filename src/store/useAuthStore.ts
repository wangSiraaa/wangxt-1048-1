import { create } from "zustand";
import { persist } from "zustand/middleware";
import { UserRole, UserRoleLabel } from "@/types/enums";

interface AuthState {
  currentRole: UserRole;
  currentUserName: string;
  setRole: (role: UserRole, userName?: string) => void;
}

const defaultUserName: Record<UserRole, string> = {
  [UserRole.OPERATION]: "李运营",
  [UserRole.MERCHANT]: "陈商户",
  [UserRole.ELECTRICIAN]: "王电工",
  [UserRole.INSPECTOR]: "刘巡检",
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      currentRole: UserRole.OPERATION,
      currentUserName: defaultUserName[UserRole.OPERATION],
      setRole: (role, userName) =>
        set({
          currentRole: role,
          currentUserName: userName || defaultUserName[role],
        }),
    }),
    { name: "market-auth" }
  )
);

export { UserRoleLabel };
