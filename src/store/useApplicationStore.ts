import { create } from "zustand";
import { persist } from "zustand/middleware";
import { ElectricityApplication, DeviceItem } from "@/types";
import { ApplicationStatus, StallStatus } from "@/types/enums";
import { seedApplications } from "@/data/seed";
import { genId } from "@/utils/id";
import { nowISO } from "@/utils/time";
import { useStallStore } from "./useStallStore";
import { useAuthStore } from "./useAuthStore";

interface AppState {
  applications: ElectricityApplication[];
  submit: (
    data: Omit<ElectricityApplication, "id" | "createdAt" | "status" | "devices">,
    devices: Omit<DeviceItem, "id" | "applicationId">[]
  ) => { id: string };
  approve: (id: string, opinion?: string) => boolean;
  reject: (id: string, opinion?: string) => boolean;
  withdraw: (id: string) => boolean;
  markConnected: (id: string) => void;
  reset: () => void;
}

export const useApplicationStore = create<AppState>()(
  persist(
    (set, get) => ({
      applications: [...seedApplications],
      submit: (data, devices) => {
        const appId = genId("app");
        const newApp: ElectricityApplication = {
          ...data,
          id: appId,
          status: ApplicationStatus.PENDING,
          createdAt: nowISO(),
          devices: devices.map((d) => ({
            ...d,
            id: genId("dev"),
            applicationId: appId,
          })),
        };
        set((s) => ({ applications: [...s.applications, newApp] }));
        useStallStore.getState().setStatus(data.stallId, StallStatus.APPLYING);
        return { id: appId };
      },
      approve: (id, opinion) => {
        const s = get();
        const app = s.applications.find((a) => a.id === id);
        if (!app || app.status !== ApplicationStatus.PENDING) return false;
        const { currentUserName } = useAuthStore.getState();
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: ApplicationStatus.APPROVED,
                  approverName: currentUserName,
                  approvalOpinion: opinion || "同意接入",
                  approvedAt: nowISO(),
                }
              : a
          ),
        }));
        return true;
      },
      reject: (id, opinion) => {
        const s = get();
        const app = s.applications.find((a) => a.id === id);
        if (!app || app.status !== ApplicationStatus.PENDING) return false;
        const { currentUserName } = useAuthStore.getState();
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id
              ? {
                  ...a,
                  status: ApplicationStatus.REJECTED,
                  approverName: currentUserName,
                  approvalOpinion: opinion || "不符合接入要求",
                  approvedAt: nowISO(),
                }
              : a
          ),
        }));
        useStallStore.getState().setStatus(app.stallId, StallStatus.IDLE);
        return true;
      },
      withdraw: (id) => {
        const s = get();
        const app = s.applications.find((a) => a.id === id);
        if (!app || app.status !== ApplicationStatus.PENDING) return false;
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id
              ? { ...a, status: ApplicationStatus.WITHDRAWN, withdrawnAt: nowISO() }
              : a
          ),
        }));
        useStallStore.getState().setStatus(app.stallId, StallStatus.IDLE);
        return true;
      },
      markConnected: (id) => {
        const s = get();
        const app = s.applications.find((a) => a.id === id);
        if (!app) return;
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, status: ApplicationStatus.CONNECTED } : a
          ),
        }));
        useStallStore.getState().setStatus(app.stallId, StallStatus.CONNECTED);
        useStallStore.getState().setLocked(app.stallId, true);
        useStallStore.getState().setOccupied(app.stallId, app.peakPower);
      },
      reset: () => set({ applications: [...seedApplications] }),
    }),
    { name: "market-applications" }
  )
);
